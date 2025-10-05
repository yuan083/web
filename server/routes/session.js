const express = require('express');
const { getDb } = require('../db');
const { ObjectId } = require('mongodb');
const { authenticateToken } = require('../middleware/auth');
const SRSAlgorithm = require('../utils/srs');
const UserProgress = require('../models/UserProgress');

const router = express.Router();

// --- API: 开始学习会话 ---
// GET /api/session/start
// 获取一个学习会话的知识点列表（包含到期复习和新知识点）
router.get('/start', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const db = getDb();
        const sessionSize = 10; // 每个会话10个知识点

        console.log(`🎯 为用户 ${userId} 开始学习会话`);

        // 1. 获取到期复习的知识点（包括新学知识点）
        const today = new Date();
        const overdueReviews = await db.collection('user_progress').find({
            user: new ObjectId(userId),
            nextReviewDate: { $lte: today }
        }).sort({ nextReviewDate: 1 }).limit(sessionSize).toArray();

        console.log(`📚 找到 ${overdueReviews.length} 个到期复习的知识点`);

        // 2. 如果复习知识点不足，添加新知识点
        let sessionItems = [...overdueReviews];
        const remainingSlots = sessionSize - sessionItems.length;

        if (remainingSlots > 0) {
            // 获取用户从未学习过的知识点
            const userProgressIds = await db.collection('user_progress').find({
                user: new ObjectId(userId)
            }).project({ knowledgePoint: 1 }).toArray();

            const learnedKnowledgePointIds = userProgressIds.map(p => p.knowledgePoint);

            // 随机选择新知识点
            const newKnowledgePoints = await db.collection('knowledge_points').find({
                _id: { $nin: learnedKnowledgePointIds }
            }).limit(remainingSlots).toArray();

            // 为新知识点创建进度记录
            for (const kp of newKnowledgePoints) {
                const newProgress = UserProgress.createRecord(userId, kp._id.toString());
                const result = await db.collection('user_progress').insertOne(newProgress);

                sessionItems.push({
                    _id: result.insertedId,
                    user: newProgress.user,
                    knowledgePoint: kp._id,
                    status: 'new',
                    nextReviewDate: newProgress.nextReviewDate,
                    lastReviewedDate: null,
                    interval: 0,
                    easeFactor: 2.5,
                    repetitions: 0,
                    incorrectCount: 0,
                    totalAttempts: 0,
                    correctAttempts: 0,
                    createdAt: newProgress.createdAt,
                    updatedAt: newProgress.updatedAt
                });
            }

            console.log(`➕ 添加了 ${newKnowledgePoints.length} 个新知识点`);
        }

        // 3. 获取知识点详细信息
        const knowledgePointIds = sessionItems.map(item => item.knowledgePoint);
        const knowledgePoints = await db.collection('knowledge_points').find({
            _id: { $in: knowledgePointIds }
        }).toArray();

        // 4. 为每个知识点智能选择题目
        const sessionData = [];

        for (const progressItem of sessionItems) {
            const knowledgePoint = knowledgePoints.find(kp =>
                kp._id.equals(progressItem.knowledgePoint)
            );

            if (!knowledgePoint) {
                console.warn(`⚠️ 知识点不存在: ${progressItem.knowledgePoint}`);
                continue;
            }

            // 4.1 根据学习阶段选择合适的题型
            const selectedQuizType = selectQuizTypeByLearningStage(progressItem, knowledgePoint);

            // 4.2 获取该知识点关联的指定类型题目
            const relatedQuizzes = await db.collection('quizzes').find({
                _id: { $in: knowledgePoint.related_quizzes || [] },
                quizType: selectedQuizType
            }).toArray();

            // 4.3 如果没有找到指定类型的题目，则使用任何相关题目
            const fallbackQuizzes = relatedQuizzes.length === 0
                ? await db.collection('quizzes').find({
                    _id: { $in: knowledgePoint.related_quizzes || [] }
                }).toArray()
                : relatedQuizzes;

            // 4.4 策略性选择一道题目
            const selectedQuiz = selectQuizStrategically(fallbackQuizzes, progressItem);

            sessionData.push({
                progressId: progressItem._id.toString(),
                knowledgePoint: {
                    _id: knowledgePoint._id,
                    topic: knowledgePoint.topic,
                    main_topic: knowledgePoint.main_topic,
                    sub_topic: knowledgePoint.sub_topic,
                    content: knowledgePoint.content,
                    key_points: knowledgePoint.key_points,
                    tags: knowledgePoint.tags
                },
                quiz: selectedQuiz ? {
                    _id: selectedQuiz._id,
                    quizType: selectedQuiz.quizType,
                    source: selectedQuiz.source,
                    question_text: selectedQuiz.question_text,
                    options: selectedQuiz.options,
                    correct_answer: selectedQuiz.correct_answer,
                    explanation: selectedQuiz.explanation,
                    difficulty: selectedQuiz.difficulty
                } : null,
                srsData: {
                    status: progressItem.status,
                    interval: progressItem.interval,
                    repetitions: progressItem.repetitions,
                    easeFactor: progressItem.easeFactor,
                    nextReviewDate: progressItem.nextReviewDate,
                    incorrectCount: progressItem.incorrectCount || 0,
                    totalAttempts: progressItem.totalAttempts || 0,
                    correctAttempts: progressItem.correctAttempts || 0
                },
                learningStage: determineLearningStage(progressItem)
            });
        }

        // 5. 随机打乱顺序
        sessionData.sort(() => Math.random() - 0.5);

        console.log(`✅ 学习会话创建成功，包含 ${sessionData.length} 个知识点`);

        res.json({
            success: true,
            data: {
                sessionId: new ObjectId().toString(), // 生成会话ID
                sessionSize: sessionData.length,
                reviewCount: overdueReviews.length,
                newCount: sessionSize - overdueReviews.length,
                items: sessionData,
                createdAt: new Date()
            }
        });

    } catch (error) {
        console.error('❌ 创建学习会话失败:', error);
        next(error);
    }
});

// --- API: 提交答案 ---
// POST /api/session/submit-answer
// 提交用户答案并更新学习进度
router.post('/submit-answer', authenticateToken, async (req, res, next) => {
    try {
        const { progressId, userPerformance } = req.body;
        const userId = req.user.userId;
        const db = getDb();

        console.log(`📝 用户 ${userId} 提交答案: progressId=${progressId}, performance=${userPerformance}`);

        // 1. 验证输入
        if (!progressId || !userPerformance || !['correct_easy', 'correct_hard', 'incorrect'].includes(userPerformance)) {
            return res.status(400).json({
                success: false,
                message: '无效的请求数据'
            });
        }

        // 2. 获取当前进度记录
        const progressRecord = await db.collection('user_progress').findOne({
            _id: new ObjectId(progressId),
            user: new ObjectId(userId)
        });

        if (!progressRecord) {
            return res.status(404).json({
                success: false,
                message: '进度记录不存在'
            });
        }

        // 3. 获取知识点详细信息
        const knowledgePoint = await db.collection('knowledge_points').findOne({
            _id: progressRecord.knowledgePoint
        });

        // 4. 使用SRS算法计算新的进度参数
        const newProgressData = SRSAlgorithm.calculateNextReview(progressRecord, userPerformance);

        // 5. 更新统计信息
        newProgressData.totalAttempts = (progressRecord.totalAttempts || 0) + 1;
        newProgressData.updatedAt = new Date();

        if (userPerformance === 'incorrect') {
            newProgressData.incorrectCount = (progressRecord.incorrectCount || 0) + 1;
        } else {
            newProgressData.correctAttempts = (progressRecord.correctAttempts || 0) + 1;
        }

        // 6. 更新数据库
        await db.collection('user_progress').updateOne(
            { _id: new ObjectId(progressId) },
            { $set: newProgressData }
        );

        console.log(`✅ 进度更新成功: interval=${newProgressData.interval}, repetitions=${newProgressData.repetitions}`);

        // 7. 返回响应
        res.json({
            success: true,
            data: {
                performance: userPerformance,
                wasCorrect: userPerformance !== 'incorrect',
                nextReviewDate: newProgressData.nextReviewDate,
                interval: newProgressData.interval,
                repetitions: newProgressData.repetitions,
                status: newProgressData.status,
                knowledgePoint: {
                    sub_topic: knowledgePoint.sub_topic,
                    content: knowledgePoint.content,
                    key_points: knowledgePoint.key_points
                }
            }
        });

    } catch (error) {
        console.error('❌ 提交答案失败:', error);
        next(error);
    }
});

// --- API: 获取学习统计 ---
// GET /api/session/stats
// 获取用户的学习统计信息
router.get('/stats', authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const db = getDb();

        // 获取用户统计信息
        const stats = await UserProgress.getUserStats(db.collection('user_progress'), userId);

        // 获取今日学习会话统计
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStats = await db.collection('user_progress').aggregate([
            {
                $match: {
                    user: new ObjectId(userId),
                    updatedAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    correctReviews: {
                        $sum: {
                            $cond: [{ $gt: ['$correctAttempts', 0] }, 1, 0]
                        }
                    }
                }
            }
        ]).toArray();

        const todayActivity = todayStats[0] || { totalReviews: 0, correctReviews: 0 };

        res.json({
            success: true,
            data: {
                overall: stats,
                today: {
                    reviews: todayActivity.totalReviews,
                    correct: todayActivity.correctReviews,
                    accuracy: todayActivity.totalReviews > 0
                        ? Math.round((todayActivity.correctReviews / todayActivity.totalReviews) * 100)
                        : 0
                },
                streak: await calculateUserStreak(db, userId)
            }
        });

    } catch (error) {
        console.error('❌ 获取学习统计失败:', error);
        next(error);
    }
});

// 辅助函数：根据学习阶段选择题型
function selectQuizTypeByLearningStage(progressItem, knowledgePoint) {
    const learningStage = determineLearningStage(progressItem);
    const errorRate = progressItem.totalAttempts > 0
        ? (progressItem.incorrectCount || 0) / progressItem.totalAttempts
        : 0;

    console.log(`📊 学习阶段分析: stage=${learningStage}, errorRate=${(errorRate * 100).toFixed(1)}%`);

    // 根据学习阶段和错误率选择题型
    switch (learningStage) {
        case 'new':
            // 新学阶段：优先选择题干更明确的题型
            return errorRate > 0.6 ? 'true_false' : 'multiple_choice';

        case 'learning':
            // 学习阶段：根据掌握程度选择题型
            if (errorRate > 0.5) {
                // 错误率高，使用判断题建立信心
                return 'true_false';
            } else if (errorRate > 0.3) {
                // 中等错误率，使用多选题加深理解
                return 'multiple_response';
            } else {
                // 错误率低，尝试填空题
                return 'fill_in_the_blank';
            }

        case 'review':
            // 复习阶段：使用多样化题型
            const quizTypes = ['multiple_choice', 'multiple_response', 'fill_in_the_blank'];
            if (errorRate < 0.2) {
                // 掌握得很好，加入回想题
                quizTypes.push('recall');
            }
            return quizTypes[Math.floor(Math.random() * quizTypes.length)];

        case 'mastered':
            // 已掌握阶段：使用高难度题型
            const advancedTypes = ['fill_in_the_blank', 'recall', 'multiple_response'];
            return advancedTypes[Math.floor(Math.random() * advancedTypes.length)];

        default:
            return 'multiple_choice';
    }
}

// 辅助函数：确定学习阶段
function determineLearningStage(progressItem) {
    const repetitions = progressItem.repetitions || 0;
    const interval = progressItem.interval || 0;
    const status = progressItem.status;

    if (status === 'new') {
        return 'new';
    } else if (repetitions === 0 && interval === 0) {
        return 'new';
    } else if (repetitions <= 2 && interval <= 7) {
        return 'learning';
    } else if (repetitions <= 6 && interval <= 30) {
        return 'review';
    } else {
        return 'mastered';
    }
}

// 辅助函数：策略性选择题目
function selectQuizStrategically(quizzes, progressItem) {
    if (!quizzes || quizzes.length === 0) {
        console.warn(`⚠️ 没有找到相关题目`);
        return null;
    }

    const learningStage = determineLearningStage(progressItem);
    const errorRate = progressItem.totalAttempts > 0
        ? (progressItem.incorrectCount || 0) / progressItem.totalAttempts
        : 0;

    console.log(`🎯 策略选题: 找到${quizzes.length}道题目, stage=${learningStage}`);

    // 根据不同策略选择题目
    switch (learningStage) {
        case 'new':
            // 新学阶段：选择简单题目，或者最近较少出现的题目
            return selectNewLearningQuiz(quizzes, progressItem);

        case 'learning':
            // 学习阶段：优先选择之前答错的题目类型
            return selectLearningQuiz(quizzes, progressItem, errorRate);

        case 'review':
            // 复习阶段：随机选择，保持新鲜感
            return quizzes[Math.floor(Math.random() * quizzes.length)];

        case 'mastered':
            // 已掌握阶段：优先选择较难的题目
            return selectMasteredQuiz(quizzes);

        default:
            return quizzes[Math.floor(Math.random() * quizzes.length)];
    }
}

// 新学阶段选题策略
function selectNewLearningQuiz(quizzes, progressItem) {
    // 优先选择难度为"easy"的题目
    const easyQuizzes = quizzes.filter(q => q.difficulty === 'easy');
    if (easyQuizzes.length > 0) {
        return easyQuizzes[Math.floor(Math.random() * easyQuizzes.length)];
    }

    // 如果没有简单题，选择判断题（通常较简单）
    const trueFalseQuizzes = quizzes.filter(q => q.quizType === 'true_false');
    if (trueFalseQuizzes.length > 0) {
        return trueFalseQuizzes[Math.floor(Math.random() * trueFalseQuizzes.length)];
    }

    // 默认随机选择
    return quizzes[Math.floor(Math.random() * quizzes.length)];
}

// 学习阶段选题策略
function selectLearningQuiz(quizzes, progressItem, errorRate) {
    if (errorRate > 0.5) {
        // 错误率高，选择判断题建立信心
        const trueFalseQuizzes = quizzes.filter(q => q.quizType === 'true_false');
        if (trueFalseQuizzes.length > 0) {
            return trueFalseQuizzes[Math.floor(Math.random() * trueFalseQuizzes.length)];
        }
    }

    // 默认选择多选题
    const multipleResponseQuizzes = quizzes.filter(q => q.quizType === 'multiple_response');
    if (multipleResponseQuizzes.length > 0) {
        return multipleResponseQuizzes[Math.floor(Math.random() * multipleResponseQuizzes.length)];
    }

    return quizzes[Math.floor(Math.random() * quizzes.length)];
}

// 已掌握阶段选题策略
function selectMasteredQuiz(quizzes) {
    // 优先选择困难题目
    const hardQuizzes = quizzes.filter(q => q.difficulty === 'hard');
    if (hardQuizzes.length > 0) {
        return hardQuizzes[Math.floor(Math.random() * hardQuizzes.length)];
    }

    // 其次选择回想题和填空题
    const challengingQuizzes = quizzes.filter(q =>
        q.quizType === 'recall' || q.quizType === 'fill_in_the_blank'
    );
    if (challengingQuizzes.length > 0) {
        return challengingQuizzes[Math.floor(Math.random() * challengingQuizzes.length)];
    }

    return quizzes[Math.floor(Math.random() * quizzes.length)];
}

// 辅助函数：计算用户连续学习天数
async function calculateUserStreak(db, userId) {
    try {
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { lastSeenDate: 1, streak: 1 } }
        );

        if (!user || !user.lastSeenDate) {
            return 0;
        }

        const lastSeen = new Date(user.lastSeenDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastSeenDay = new Date(lastSeen);
        lastSeenDay.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today - lastSeenDay) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            return user.streak || 1;
        } else if (daysDiff === 1) {
            return user.streak || 1;
        } else {
            return 0; // 中断了连续学习
        }

    } catch (error) {
        console.error('计算连续学习天数失败:', error);
        return 0;
    }
}

module.exports = router;