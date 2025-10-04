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
// 获取用户的所有学习进度记录
router.get('/progress', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const db = getDb();

    // 查找用户的学习进度
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          learning_progress: 1,
          nickname: 1
        }
      }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }

    console.log(`✅ 获取用户学习进度: ${user.nickname}`);

    res.json({
      success: true,
      data: {
        user_id: userId,
        nickname: user.nickname,
        learning_progress: user.learning_progress || [],
        total_learned: (user.learning_progress || []).length
      }
    });

  } catch (error) {
    console.error('❌ 获取学习进度失败:', error);
    next(error);
  }
});

module.exports = router;