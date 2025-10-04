const express = require('express');
const { getDb } = require('../db');
const { ObjectId } = require('mongodb');
const { authenticateToken } = require('../middleware/auth'); // 导入我们的认证中间件

const router = express.Router();

// --- API: 标记知识点为已学 ---
// POST /api/user/progress/mark-learned
// 这个接口需要登录才能访问，所以我们把 authenticateToken 中间件放在这里
router.post('/progress/mark-learned', authenticateToken, async (req, res, next) => {
  try {
    const { pointId } = req.body;
    const userId = req.user.userId; // 从认证中间件注入的req.user中获取用户ID
    const db = getDb();

    // 1. 验证传入的知识点ID是否有效
    if (!pointId || !ObjectId.isValid(pointId)) {
      return res.status(400).json({ success: false, message: "无效的知识点ID" });
    }

    // 2. 准备要更新或插入的学习记录
    const progressRecord = {
      point_id: new ObjectId(pointId),
      status: "learned",
      last_studied_at: new Date(),
      // 可以在这里添加更多信息，比如学习时长等
    };

    // 3. 更新数据库
    // 使用条件更新：仅在数组中不存在该知识点时才添加，避免重复记录
    const result = await db.collection('users').updateOne(
      {
        _id: new ObjectId(userId),
        'learning_progress.point_id': { $ne: new ObjectId(pointId) } // 仅在数组中不存在该知识点时才添加
      },
      {
        $push: { learning_progress: progressRecord }
      }
    );

    console.log(`✅ 用户 [${userId}] 学习进度更新: ${pointId}`);

    if (result.modifiedCount > 0) {
        res.json({ success: true, message: "学习进度已更新" });
    } else {
        res.json({ success: true, message: "该知识点已标记为学过" });
    }

  } catch (error) {
    console.error('❌ 更新学习进度失败:', error);
    next(error);
  }
});

// --- API: 获取用户学习进度 ---
// GET /api/user/progress
// 获取用户的所有学习进度记录和答题历史
router.get('/progress', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const db = getDb();

    // 查找用户的完整数据
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          learning_progress: 1,
          quiz_history: 1,
          nickname: 1,
          phone: 1
        }
      }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    // 处理学习进度数据
    const learningProgress = user.learning_progress || [];
    const quizHistory = user.quiz_history || [];

    // 计算答题统计
    const totalQuizCount = quizHistory.length;
    const correctQuizCount = quizHistory.filter(quiz => quiz.is_correct).length;
    const quizAccuracy = totalQuizCount > 0 ? Math.round((correctQuizCount / totalQuizCount) * 100) : 0;

    // 计算最近10次答题的正确率
    const recentQuizzes = quizHistory.slice(-10);
    const recentCorrectCount = recentQuizzes.filter(quiz => quiz.is_correct).length;
    const recentAccuracy = recentQuizzes.length > 0 ? Math.round((recentCorrectCount / recentQuizzes.length) * 100) : 0;

    // 按主题分组统计学习进度
    const topicProgress = {};
    learningProgress.forEach(progress => {
      // 这里我们需要关联知识点来获取主题信息
      // 简化处理，后续可以优化
      const topic = "环境保护税"; // 临时处理，实际应该从知识点关联获取
      if (!topicProgress[topic]) {
        topicProgress[topic] = { learned: 0, total: 0 };
      }
      topicProgress[topic].learned++;
    });

    console.log(`✅ 获取用户学习进度: ${user.nickname}`);

    res.json({
      success: true,
      data: {
        user_id: userId,
        nickname: user.nickname,
        phone: user.phone,
        learning_progress: learningProgress,
        quiz_history: quizHistory,
        statistics: {
          total_learned: learningProgress.length,
          total_quizzes: totalQuizCount,
          correct_quizzes: correctQuizCount,
          quiz_accuracy: quizAccuracy,
          recent_accuracy: recentAccuracy,
          recent_quizzes_count: recentQuizzes.length
        },
        topic_progress: topicProgress,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 获取学习进度失败:', error);
    next(error);
  }
});

// --- API: 提交答题记录 ---
// POST /api/user/quiz-history
// 用于保存用户的答题记录
router.post('/quiz-history', authenticateToken, async (req, res, next) => {
  try {
    const { quizId, userAnswer } = req.body;
    const userId = req.user.userId;
    const db = getDb();

    // 1. 验证输入
    if (!quizId || !userAnswer || !Array.isArray(userAnswer)) {
      return res.status(400).json({
        success: false,
        message: "无效的答题数据"
      });
    }

    if (!ObjectId.isValid(quizId)) {
      return res.status(400).json({
        success: false,
        message: "无效的题目ID"
      });
    }

    // 2. 查找题目信息以获取正确答案
    const quiz = await db.collection('quizzes').findOne(
      { _id: new ObjectId(quizId) }
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "题目不存在"
      });
    }

    // 3. 判断答案是否正确
    const isCorrect = checkAnswerCorrectness(userAnswer, quiz.correct_answer);

    // 4. 准备答题记录
    const quizHistoryRecord = {
      quiz_id: new ObjectId(quizId),
      user_answer: userAnswer,
      is_correct: isCorrect,
      attempted_at: new Date(),
      // 可以添加更多信息，比如答题时长等
    };

    // 5. 更新用户的答题历史
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $push: { quiz_history: quizHistoryRecord } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    console.log(`✅ 用户 [${userId}] 答题记录已保存: 题目${quizId}, 正确性: ${isCorrect}`);

    res.json({
      success: true,
      message: "答题记录已保存",
      data: {
        is_correct: isCorrect,
        correct_answer: quiz.correct_answer,
        explanation: quiz.explanation
      }
    });

  } catch (error) {
    console.error('❌ 保存答题记录失败:', error);
    next(error);
  }
});

// --- API: 批量提交答题记录 ---
// POST /api/user/quiz-history/batch
// 用于批量保存练习中的所有答题记录
router.post('/quiz-history/batch', authenticateToken, async (req, res, next) => {
  try {
    const { quizResults } = req.body; // quizResults 是答题记录数组
    const userId = req.user.userId;
    const db = getDb();

    if (!quizResults || !Array.isArray(quizResults) || quizResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: "无效的答题数据"
      });
    }

    // 获取所有题目的正确答案
    const quizIds = quizResults.map(result => new ObjectId(result.quizId));
    const quizzes = await db.collection('quizzes').find(
      { _id: { $in: quizIds } }
    ).toArray();

    const quizMap = new Map();
    quizzes.forEach(quiz => {
      quizMap.set(quiz._id.toString(), quiz);
    });

    // 处理每条答题记录
    const processedResults = quizResults.map(result => {
      const quiz = quizMap.get(result.quizId);
      if (!quiz) return null;

      const isCorrect = checkAnswerCorrectness(result.userAnswer, quiz.correct_answer);

      return {
        quiz_id: new ObjectId(result.quizId),
        user_answer: result.userAnswer,
        is_correct: isCorrect,
        attempted_at: new Date()
      };
    }).filter(Boolean); // 过滤掉无效的记录

    if (processedResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: "没有有效的答题记录"
      });
    }

    // 批量更新用户答题历史
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $push: {
          quiz_history: { $each: processedResults }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

    const correctCount = processedResults.filter(r => r.is_correct).length;
    const totalCount = processedResults.length;

    console.log(`✅ 用户 [${userId}] 批量答题记录已保存: ${correctCount}/${totalCount} 正确`);

    res.json({
      success: true,
      message: "答题记录已批量保存",
      data: {
        total_count: totalCount,
        correct_count: correctCount,
        accuracy: Math.round((correctCount / totalCount) * 100)
      }
    });

  } catch (error) {
    console.error('❌ 批量保存答题记录失败:', error);
    next(error);
  }
});

// 辅助函数：检查答案是否正确
function checkAnswerCorrectness(userAnswer, correctAnswer) {
  if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
    return false;
  }

  if (userAnswer.length !== correctAnswer.length) {
    return false;
  }

  const sortedUser = [...userAnswer].sort();
  const sortedCorrect = [...correctAnswer].sort();

  return sortedUser.every((answer, index) => answer === sortedCorrect[index]);
}

module.exports = router;