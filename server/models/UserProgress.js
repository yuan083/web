/**
 * 用户学习进度数据模型
 * 用于间隔重复系统(SRS)
 */

const { ObjectId } = require('mongodb');

class UserProgress {
    /**
     * 创建新的进度记录
     * @param {string} userId - 用户ID
     * @param {string} knowledgePointId - 知识点ID
     * @returns {Object} - 进度记录对象
     */
    static createRecord(userId, knowledgePointId) {
        return {
            user: new ObjectId(userId),
            knowledgePoint: new ObjectId(knowledgePointId),
            status: 'new', // new, learning, learned, mastered

            // SRS 核心字段
            nextReviewDate: new Date(),
            lastReviewedDate: null,
            interval: 0, // 复习间隔天数
            easeFactor: 2.5, // 简易度因子
            repetitions: 0, // 复习次数

            // 学习统计字段
            incorrectCount: 0,
            totalAttempts: 0,
            correctAttempts: 0,

            // 时间戳
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * 验证进度记录数据
     * @param {Object} data - 要验证的数据
     * @returns {Object} - 验证结果
     */
    static validate(data) {
        const errors = [];

        if (!data.user || !ObjectId.isValid(data.user)) {
            errors.push('Invalid user ID');
        }

        if (!data.knowledgePoint || !ObjectId.isValid(data.knowledgePoint)) {
            errors.push('Invalid knowledge point ID');
        }

        if (!data.status || !['new', 'learning', 'learned', 'mastered'].includes(data.status)) {
            errors.push('Invalid status');
        }

        if (typeof data.interval !== 'number' || data.interval < 0) {
            errors.push('Invalid interval');
        }

        if (typeof data.easeFactor !== 'number' || data.easeFactor < 1.3 || data.easeFactor > 2.5) {
            errors.push('Invalid ease factor');
        }

        if (typeof data.repetitions !== 'number' || data.repetitions < 0) {
            errors.push('Invalid repetitions');
        }

        if (!(data.nextReviewDate instanceof Date)) {
            errors.push('Invalid next review date');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 创建数据库索引
     * @param {Collection} collection - MongoDB集合对象
     */
    static async createIndexes(collection) {
        try {
            // 用户和知识点的复合索引
            await collection.createIndex(
                { user: 1, knowledgePoint: 1 },
                { unique: true }
            );

            // 下次复习日期索引
            await collection.createIndex({ nextReviewDate: 1 });

            // 用户和状态的复合索引
            await collection.createIndex({ user: 1, status: 1 });

            // 创建时间和更新时间索引
            await collection.createIndex({ createdAt: 1 });
            await collection.createIndex({ updatedAt: 1 });

            console.log('✅ UserProgress 索引创建成功');
        } catch (error) {
            console.error('❌ UserProgress 索引创建失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户今日需要复习的知识点
     * @param {Collection} collection - MongoDB集合对象
     * @param {string} userId - 用户ID
     * @returns {Array} - 需要复习的知识点列表
     */
    static async getTodayReviews(collection, userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return await collection.find({
            user: new ObjectId(userId),
            nextReviewDate: { $gte: today, $lt: tomorrow }
        }).toArray();
    }

    /**
     * 获取用户逾期需要复习的知识点
     * @param {Collection} collection - MongoDB集合对象
     * @param {string} userId - 用户ID
     * @returns {Array} - 逾期知识点列表
     */
    static async getOverdueReviews(collection, userId) {
        const now = new Date();

        return await collection.find({
            user: new ObjectId(userId),
            nextReviewDate: { $lt: now },
            status: { $ne: 'new' }
        }).toArray();
    }

    /**
     * 获取用户的新知识点
     * @param {Collection} collection - MongoDB集合对象
     * @param {string} userId - 用户ID
     * @param {number} limit - 限制数量
     * @returns {Array} - 新知识点列表
     */
    static async getNewKnowledgePoints(collection, userId, limit = 10) {
        return await collection.find({
            user: new ObjectId(userId),
            status: 'new'
        }).limit(limit).toArray();
    }

    /**
     * 获取用户的学习统计信息
     * @param {Collection} collection - MongoDB集合对象
     * @param {string} userId - 用户ID
     * @returns {Object} - 统计信息
     */
    static async getUserStats(collection, userId) {
        const pipeline = [
            { $match: { user: new ObjectId(userId) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAttempts: { $sum: '$totalAttempts' },
                    correctAttempts: { $sum: '$correctAttempts' }
                }
            }
        ];

        const statusStats = await collection.aggregate(pipeline).toArray();

        // 获取今日复习数量
        const todayCount = await this.getTodayReviews(collection, userId);

        // 获取逾期数量
        const overdueCount = await this.getOverdueReviews(collection, userId);

        // 计算总体统计
        const stats = {
            new: 0,
            learning: 0,
            learned: 0,
            mastered: 0,
            todayReview: todayCount.length,
            overdue: overdueCount.length,
            totalAttempts: 0,
            correctAttempts: 0,
            accuracy: 0
        };

        statusStats.forEach(stat => {
            stats[stat._id] = stat.count;
            stats.totalAttempts += stat.totalAttempts;
            stats.correctAttempts += stat.correctAttempts;
        });

        stats.accuracy = stats.totalAttempts > 0
            ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
            : 0;

        return stats;
    }
}

module.exports = UserProgress;