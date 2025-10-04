// Express应用主文件
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// 导入数据库连接
const { connectDb, closeDb } = require('./db');

// 导入路由
const knowledgeRoutes = require('./routes/knowledge');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 9365;

// 中间件配置
app.use(helmet()); // 安全头部
app.use(cors()); // 跨域支持
app.use(morgan('combined')); // 日志记录
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码解析

// API路由
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '税务学习平台API服务正常运行',
    timestamp: new Date().toISOString()
  });
});

// 根路径 - API文档
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用税务学习平台API',
    version: '1.0.0',
    description: '中国税务学习H5应用后端API服务',
    base_url: `http://localhost:${PORT}`,
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      // 系统相关
      health: {
        path: '/health',
        method: 'GET',
        description: '健康检查 - 验证API服务状态'
      },

      // 认证相关
      auth: {
        register: {
          path: '/api/auth/register',
          method: 'POST',
          description: '用户注册 - 创建新用户账号',
          body: {
            phone: 'string (手机号)',
            nickname: 'string (昵称)',
            password: 'string (密码)'
          }
        },
        login: {
          path: '/api/auth/login',
          method: 'POST',
          description: '用户登录 - 获取访问令牌',
          body: {
            phone: 'string (手机号)',
            password: 'string (密码)'
          }
        }
      },

      // 知识点相关
      knowledge: {
        topics: {
          path: '/api/knowledge/topics',
          method: 'GET',
          description: '获取所有税种主题 - 包含章节数量统计'
        },
        search: {
          path: '/api/knowledge/search',
          method: 'GET',
          description: '搜索知识点 - 全文搜索知识点内容',
          params: {
            q: 'string (搜索关键词)'
          }
        },
        chapter: {
          path: '/api/knowledge/:topic/:main_topic',
          method: 'GET',
          description: '获取章节知识点列表 - 按主题和章节查询',
          params: {
            topic: 'string (税种主题)',
            main_topic: 'string (主要章节)'
          }
        },
        detail: {
          path: '/api/knowledge/point/:id',
          method: 'GET',
          description: '获取知识点详情 - 单个知识点的完整信息',
          params: {
            id: 'string (知识点ID)'
          }
        },
        quizzes: {
          path: '/api/knowledge/point/:id/quizzes',
          method: 'GET',
          description: '获取知识点关联题目 - 用于练习模式',
          params: {
            id: 'string (知识点ID)'
          }
        }
      },

      // 用户进度相关 (需要认证)
      user_progress: {
        get: {
          path: '/api/user/progress',
          method: 'GET',
          description: '获取用户学习进度 - 包含统计数据和答题历史',
          headers: {
            Authorization: 'Bearer <token>'
          }
        },
        mark_learned: {
          path: '/api/user/progress/mark-learned',
          method: 'POST',
          description: '标记知识点为已学习 - 更新学习进度',
          headers: {
            Authorization: 'Bearer <token>'
          },
          body: {
            pointId: 'string (知识点ID)'
          }
        }
      },

      // 答题相关 (需要认证)
      quiz: {
        submit_single: {
          path: '/api/user/quiz-history',
          method: 'POST',
          description: '提交单个答题记录 - 保存单题答案和结果',
          headers: {
            Authorization: 'Bearer <token>'
          },
          body: {
            quizId: 'string (题目ID)',
            userAnswer: 'array (用户答案)'
          }
        },
        submit_batch: {
          path: '/api/user/quiz-history/batch',
          method: 'POST',
          description: '批量提交答题记录 - 保存练习模式的所有答案',
          headers: {
            Authorization: 'Bearer <token>'
          },
          body: {
            quizResults: 'array (答题结果数组)'
          }
        }
      }
    },

    // 认证说明
    authentication: {
      type: 'JWT Bearer Token',
      description: '除了公开接口外，所有用户相关接口需要在请求头中包含有效的JWT令牌',
      header_example: 'Authorization: Bearer <your-jwt-token>',
      login_required: '以下接口需要认证: /api/user/*'
    },

    // 响应格式
    response_format: {
      success: {
        status: 'boolean',
        message: 'string',
        data: 'object/array (响应数据)'
      },
      error: {
        status: 'boolean',
        error: 'string',
        message: 'string',
        details: 'object (仅在开发环境)'
      }
    },

    // 错误代码
    status_codes: {
      200: '成功',
      201: '创建成功',
      400: '请求参数错误',
      401: '未授权 - 需要登录或令牌无效',
      404: '资源不存在',
      409: '资源冲突 - 如用户已存在',
      500: '服务器内部错误'
    }
  });
});

// 404错误处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API接口不存在',
    message: `路径 ${req.originalUrl} 未找到`,
    method: req.method,
    suggestion: '请检查API路径是否正确，或者访问根路径 / 查看完整的API文档',
    available_endpoints: {
      system: ['/health', '/'],
      auth: ['/api/auth/register', '/api/auth/login'],
      knowledge: [
        '/api/knowledge/topics',
        '/api/knowledge/search',
        '/api/knowledge/:topic/:main_topic',
        '/api/knowledge/point/:id',
        '/api/knowledge/point/:id/quizzes'
      ],
      user: [
        '/api/user/progress (需要认证)',
        '/api/user/progress/mark-learned (需要认证)',
        '/api/user/quiz-history (需要认证)',
        '/api/user/quiz-history/batch (需要认证)'
      ]
    },
    examples: {
      health_check: 'GET /health',
      get_topics: 'GET /api/knowledge/topics',
      search: 'GET /api/knowledge/search?q=纳税人',
      user_login: 'POST /api/auth/login',
      get_progress: 'GET /api/user/progress (需Authorization头)'
    }
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(err.status || 500).json({
    error: '服务器内部错误',
    message: err.message || '未知错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDb();

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器启动成功！`);
      console.log(`📍 地址: http://localhost:${PORT}`);
      console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
      console.log(`📚 知识点API: http://localhost:${PORT}/api/knowledge`);
      console.log(`📖 API文档: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('📴 收到SIGTERM信号，正在关闭服务器...');
  await closeDb();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 收到SIGINT信号，正在关闭服务器...');
  await closeDb();
  process.exit(0);
});

// 启动应用
if (require.main === module) {
  startServer();
}

module.exports = app;