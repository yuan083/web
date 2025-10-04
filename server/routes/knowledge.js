// 知识点API路由
const express = require('express');
const { getDb } = require('../db');
const { ObjectId } = require('mongodb');

const router = express.Router();

// === 路由顺序：具体路由在前，通用路由在后 ===

// 1. 最具体的、固定的路由
// --- 获取所有税种主题 ---
// GET /api/knowledge/topics
router.get('/topics', async (req, res) => {
  try {
    const db = getDb();

    // 聚合查询获取所有主题和章节统计
    const topics = await db.collection('knowledge_points')
      .aggregate([
        {
          $group: {
            _id: {
              topic: '$topic',
              main_topic: '$main_topic'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.topic',
            chapters: {
              $push: {
                name: '$_id.main_topic',
                count: '$count'
              }
            },
            total_points: { $sum: '$count' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
      .toArray();

    console.log(`✅ 获取到 ${topics.length} 个税种主题`);

    res.json({
      success: true,
      data: {
        count: topics.length,
        topics: topics.map(topic => ({
          name: topic._id,
          total_points: topic.total_points,
          chapters: topic.chapters
        }))
      }
    });

  } catch (error) {
    console.error('❌ 获取主题列表失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// --- 搜索知识点 ---
// GET /api/knowledge/search?q=搜索关键词
router.get('/search', async (req, res) => {
  try {
    const db = getDb();
    const { q: query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '搜索关键词不能为空'
      });
    }

    console.log(`🔍 搜索知识点: "${query}"`);

    // 使用全文搜索
    const searchResults = await db.collection('knowledge_points')
      .find({
        $text: { $search: query }
      })
      .project({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .toArray();

    console.log(`✅ 搜索到 ${searchResults.length} 个相关知识点`);

    res.json({
      success: true,
      data: {
        query,
        count: searchResults.length,
        results: searchResults
      }
    });

  } catch (error) {
    console.error('❌ 搜索知识点失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 2. 带有单个动态参数的路由
// --- 获取单个知识点详情 ---
// GET /api/knowledge/point/:id
router.get('/point/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // 验证ObjectId格式
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: '无效的知识点ID格式'
      });
    }

    const knowledgePoint = await db.collection('knowledge_points')
      .findOne({ _id: new ObjectId(id) });

    if (!knowledgePoint) {
      return res.status(404).json({
        success: false,
        error: '知识点不存在'
      });
    }

    console.log(`✅ 获取知识点详情: ${knowledgePoint.sub_topic}`);

    res.json({
      success: true,
      data: knowledgePoint
    });

  } catch (error) {
    console.error('❌ 获取知识点详情失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// --- 获取知识点的关联题目 ---
// GET /api/knowledge/point/:id/quizzes
router.get('/point/:id/quizzes', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: '无效的知识点ID格式'
      });
    }

    // 首先获取知识点信息
    const knowledgePoint = await db.collection('knowledge_points')
      .findOne({ _id: new ObjectId(id) });

    if (!knowledgePoint) {
      return res.status(404).json({
        success: false,
        error: '知识点不存在'
      });
    }

    // 查找相关题目（通过topic和main_topic匹配）
    const relatedQuizzes = await db.collection('quizzes')
      .find({
        topic: knowledgePoint.topic,
        related_main_topic: knowledgePoint.main_topic
      })
      .toArray();

    console.log(`✅ 找到 ${relatedQuizzes.length} 道相关题目`);

    res.json({
      success: true,
      data: {
        knowledge_point: knowledgePoint.sub_topic,
        quiz_count: relatedQuizzes.length,
        quizzes: relatedQuizzes
      }
    });

  } catch (error) {
    console.error('❌ 获取关联题目失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 3. 带有多个动态参数、最通用的路由 (放在最后)
// --- 获取特定章节的知识点列表 ---
// GET /api/knowledge/:topic/:main_topic
router.get('/:topic/:main_topic', async (req, res) => {
  try {
    const db = getDb();
    const { topic, main_topic } = req.params;

    console.log(`🔍 查询知识点: ${topic} - ${main_topic}`);

    // 使用已在test-queries.js中验证过的查询逻辑
    const knowledgePoints = await db.collection('knowledge_points')
      .find({
        topic: topic,
        main_topic: main_topic
      })
      .sort({ display_order: 1 })
      .toArray();

    console.log(`✅ 找到 ${knowledgePoints.length} 个知识点`);

    // 返回知识点列表
    res.json({
      success: true,
      data: {
        topic,
        main_topic,
        count: knowledgePoints.length,
        points: knowledgePoints
      }
    });

  } catch (error) {
    console.error('❌ 查询知识点失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    });
  }
});

module.exports = router;