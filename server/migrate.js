/**
 * 用户学习进度数据迁移脚本
 * 将现有的 users.learning_progress 数组迁移到新的 UserProgress 集合中
 * 支持间隔重复系统(SRS)
 */

const { connectDb, closeDb, getDb } = require('./db');
const { ObjectId } = require('mongodb');
const UserProgress = require('./models/UserProgress');

class DataMigration {
    /**
     * 执行数据迁移
     * @param {Object} options - 迁移选项
     * @returns {Object} - 迁移结果统计
     */
    static async migrateUserProgress(options = {}) {
        const {
            dryRun = false,
            batchSize = 100,
            overwrite = false
        } = options;

        // 连接数据库
        await connectDb();
        const db = getDb();
        const usersCollection = db.collection('users');
        const progressCollection = db.collection('user_progress');

        console.log('🚀 开始用户学习进度数据迁移...');
        console.log(`📋 迁移选项: dryRun=${dryRun}, batchSize=${batchSize}, overwrite=${overwrite}`);

        try {
            // 1. 检查现有数据结构
            console.log('\n📊 分析现有数据...');
            const totalUsers = await usersCollection.countDocuments({
                learning_progress: { $exists: true, $ne: [] }
            });
            console.log(`👥 发现 ${totalUsers} 个有学习进度的用户`);

            if (totalUsers === 0) {
                console.log('✅ 没有需要迁移的用户，迁移完成');
                return { totalUsers: 0, migratedUsers: 0, totalRecords: 0 };
            }

            // 2. 创建进度集合索引（如果不存在）
            if (!dryRun) {
                console.log('\n🔧 创建 UserProgress 集合索引...');
                try {
                    await UserProgress.createIndexes(progressCollection);
                } catch (indexError) {
                    console.log('⚠️ 索引创建可能已存在，继续迁移...');
                }
            }

            // 3. 分批处理用户数据
            let processedUsers = 0;
            let migratedRecords = 0;
            let skippedUsers = 0;
            let errorUsers = 0;

            const cursor = usersCollection.find({
                learning_progress: { $exists: true, $ne: [] }
            });

            while (await cursor.hasNext()) {
                const user = await cursor.next();
                processedUsers++;

                try {
                    // 检查是否已经迁移过
                    if (!overwrite) {
                        const existingProgress = await progressCollection.countDocuments({
                            user: user._id
                        });
                        if (existingProgress > 0) {
                            console.log(`⏭️ 用户 ${user.phone || user._id} 已有进度记录，跳过`);
                            skippedUsers++;
                            continue;
                        }
                    }

                    // 迁移该用户的学习进度
                    const migrationResult = await this.migrateUserLearningProgress(
                        user,
                        progressCollection,
                        dryRun
                    );

                    migratedRecords += migrationResult.recordCount;

                    if (processedUsers % batchSize === 0) {
                        console.log(`📈 已处理 ${processedUsers}/${totalUsers} 用户，迁移 ${migratedRecords} 条记录`);
                    }

                } catch (userError) {
                    console.error(`❌ 迁移用户 ${user._id} 失败:`, userError.message);
                    errorUsers++;
                }
            }

            // 4. 迁移结果统计
            const migrationStats = {
                totalUsers,
                processedUsers,
                migratedUsers: processedUsers - skippedUsers - errorUsers,
                skippedUsers,
                errorUsers,
                totalRecords: migratedRecords,
                dryRun
            };

            console.log('\n📊 迁移完成，统计结果:');
            console.log(`👥 总用户数: ${migrationStats.totalUsers}`);
            console.log(`✅ 成功迁移: ${migrationStats.migratedUsers}`);
            console.log(`⏭️ 跳过用户: ${migrationStats.skippedUsers}`);
            console.log(`❌ 错误用户: ${migrationStats.errorUsers}`);
            console.log(`📚 迁移记录: ${migrationStats.totalRecords}`);
            console.log(`🧪 试运行模式: ${migrationStats.dryRun ? '是' : '否'}`);

            return migrationStats;

        } catch (error) {
            console.error('❌ 数据迁移失败:', error);
            await closeDb();
            throw error;
        }
    }

    /**
     * 迁移单个用户的学习进度
     * @param {Object} user - 用户文档
     * @param {Collection} progressCollection - UserProgress集合
     * @param {boolean} dryRun - 是否为试运行
     * @returns {Object} - 迁移结果
     */
    static async migrateUserLearningProgress(user, progressCollection, dryRun = false) {
        const learningProgress = user.learning_progress || [];
        const quizHistory = user.quiz_history || [];

        if (learningProgress.length === 0) {
            return { recordCount: 0 };
        }

        console.log(`🔄 迁移用户 ${user.nickname || user.phone} 的 ${learningProgress.length} 条学习记录`);

        // 将学习进度转换为 UserProgress 记录
        const progressRecords = [];

        for (const progress of learningProgress) {
            try {
                // 解析知识点ID
                const pointId = typeof progress.point_id === 'string'
                    ? progress.point_id
                    : progress.point_id?.toString();

                if (!pointId || !ObjectId.isValid(pointId)) {
                    console.warn(`⚠️ 无效的知识点ID: ${pointId}，跳过`);
                    continue;
                }

                // 确定学习状态
                let status = 'new';
                let interval = 0;
                let repetitions = 0;
                let easeFactor = 2.5;
                let nextReviewDate = new Date();
                let lastReviewedDate = progress.last_studied_at ? new Date(progress.last_studied_at) : null;

                if (progress.status === 'learned' || progress.status === 'completed') {
                    status = 'learned';
                    repetitions = 2;
                    interval = 3; // 3天后复习
                    easeFactor = 2.4;

                    if (lastReviewedDate) {
                        nextReviewDate = new Date(lastReviewedDate);
                        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
                    }
                } else if (progress.status === 'mastered') {
                    status = 'mastered';
                    repetitions = 4;
                    interval = 21; // 21天后复习
                    easeFactor = 2.6;

                    if (lastReviewedDate) {
                        nextReviewDate = new Date(lastReviewedDate);
                        nextReviewDate.setDate(nextReviewDate.getDate() + interval);
                    }
                }

                // 计算学习统计
                const userQuizzes = quizHistory.filter(q =>
                    q.quiz_id && progress.related_quizzes?.includes(q.quiz_id.toString())
                );

                const totalAttempts = userQuizzes.length;
                const correctAttempts = userQuizzes.filter(q => q.is_correct).length;
                const incorrectCount = totalAttempts - correctAttempts;

                // 创建进度记录
                const progressRecord = {
                    _id: new ObjectId(),
                    user: user._id,
                    knowledgePoint: new ObjectId(pointId),
                    status,

                    // SRS 核心字段
                    nextReviewDate,
                    lastReviewedDate,
                    interval,
                    easeFactor,
                    repetitions,

                    // 学习统计字段
                    incorrectCount,
                    totalAttempts,
                    correctAttempts,

                    // 时间戳
                    createdAt: progress.created_at || new Date(),
                    updatedAt: progress.updated_at || new Date()
                };

                // 验证记录
                const validation = UserProgress.validate(progressRecord);
                if (!validation.isValid) {
                    console.warn(`⚠️ 进度记录验证失败: ${validation.errors.join(', ')}`);
                    continue;
                }

                progressRecords.push(progressRecord);

            } catch (recordError) {
                console.error(`❌ 处理学习记录失败:`, recordError.message);
            }
        }

        // 批量插入进度记录
        if (progressRecords.length > 0 && !dryRun) {
            try {
                await progressCollection.insertMany(progressRecords, { ordered: false });
                console.log(`✅ 成功插入 ${progressRecords.length} 条进度记录`);
            } catch (insertError) {
                if (insertError.code === 11000) {
                    // 处理重复键错误
                    console.warn(`⚠️ 检测到重复记录，跳过重复项`);
                    const duplicateErrors = insertError.writeErrors?.length || 0;
                    const insertedCount = progressRecords.length - duplicateErrors;
                    console.log(`✅ 成功插入 ${insertedCount} 条进度记录，跳过 ${duplicateErrors} 条重复记录`);
                } else {
                    throw insertError;
                }
            }
        }

        return { recordCount: progressRecords.length };
    }

    /**
     * 验证迁移结果
     * @returns {Object} - 验证结果
     */
    static async validateMigration() {
        // 连接数据库
        await connectDb();
        const db = getDb();
        const usersCollection = db.collection('users');
        const progressCollection = db.collection('user_progress');

        console.log('\n🔍 验证迁移结果...');

        try {
            // 统计用户数量
            const totalUsers = await usersCollection.countDocuments();
            const usersWithProgress = await usersCollection.countDocuments({
                learning_progress: { $exists: true, $ne: [] }
            });
            const usersWithNewProgress = await progressCollection.distinct('user');

            // 统计进度记录
            const totalProgressRecords = await progressCollection.countDocuments();
            const statusStats = await progressCollection.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).toArray();

            // 检查数据一致性
            const inconsistentUsers = [];
            for (const userId of usersWithNewProgress.slice(0, 10)) { // 检查前10个用户
                const userProgressCount = await progressCollection.countDocuments({
                    user: new ObjectId(userId)
                });
                const user = await usersCollection.findOne({
                    _id: new ObjectId(userId),
                    learning_progress: { $exists: true }
                });

                if (user && user.learning_progress.length !== userProgressCount) {
                    inconsistentUsers.push({
                        userId,
                        originalCount: user.learning_progress.length,
                        migratedCount: userProgressCount
                    });
                }
            }

            const validationResult = {
                totalUsers,
                usersWithProgress,
                usersWithNewProgress: usersWithNewProgress.length,
                totalProgressRecords,
                statusDistribution: statusStats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                inconsistentUsers: inconsistentUsers.slice(0, 5), // 只显示前5个不一致的用户
                validationDate: new Date()
            };

            console.log('📊 验证结果:');
            console.log(`👥 总用户数: ${validationResult.totalUsers}`);
            console.log(`📚 有学习进度的用户: ${validationResult.usersWithProgress}`);
            console.log(`🆕 新进度模型用户: ${validationResult.usersWithNewProgress}`);
            console.log(`📝 总进度记录数: ${validationResult.totalProgressRecords}`);
            console.log(`📈 状态分布:`, validationResult.statusDistribution);

            if (validationResult.inconsistentUsers.length > 0) {
                console.log('⚠️ 数据不一致的用户:');
                validationResult.inconsistentUsers.forEach(user => {
                    console.log(`  - 用户${user.userId}: 原始${user.originalCount}条，迁移${user.migratedCount}条`);
                });
            } else {
                console.log('✅ 数据一致性验证通过');
            }

            return validationResult;

        } catch (error) {
            console.error('❌ 验证迁移结果失败:', error);
            await closeDb();
            throw error;
        }
    }

    /**
     * 回滚迁移（删除 user_progress 集合）
     * @param {boolean} confirm - 确认回滚
     * @returns {boolean} - 回滚结果
     */
    static async rollbackMigration(confirm = false) {
        if (!confirm) {
            console.log('⚠️ 请设置 confirm=true 来确认回滚操作');
            return false;
        }

        // 连接数据库
        await connectDb();
        const db = getDb();
        const progressCollection = db.collection('user_progress');

        try {
            console.log('🔄 开始回滚迁移...');

            const count = await progressCollection.countDocuments();
            await progressCollection.drop();

            console.log(`✅ 成功删除 user_progress 集合，删除了 ${count} 条记录`);
            return true;

        } catch (error) {
            console.error('❌ 回滚迁移失败:', error);
            await closeDb();
            return false;
        }
    }
}

// 命令行接口
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        switch (command) {
            case 'migrate':
                const dryRun = args.includes('--dry-run');
                const overwrite = args.includes('--overwrite');
                await DataMigration.migrateUserProgress({ dryRun, overwrite });
                break;

            case 'validate':
                await DataMigration.validateMigration();
                break;

            case 'rollback':
                const confirm = args.includes('--confirm');
                await DataMigration.rollbackMigration(confirm);
                break;

            case 'help':
            default:
                console.log('用户学习进度数据迁移工具');
                console.log('');
                console.log('命令:');
                console.log('  node migrate.js migrate [--dry-run] [--overwrite]  - 执行迁移');
                console.log('  node migrate.js validate                           - 验证迁移结果');
                console.log('  node migrate.js rollback [--confirm]                - 回滚迁移');
                console.log('');
                console.log('选项:');
                console.log('  --dry-run   - 试运行模式，不实际修改数据');
                console.log('  --overwrite - 覆盖已存在的进度记录');
                console.log('  --confirm   - 确认回滚操作');
                break;
        }
    } catch (error) {
        console.error('❌ 执行命令失败:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// 如果直接运行此脚本，则执行命令行接口
if (require.main === module) {
    main();
}

module.exports = DataMigration;