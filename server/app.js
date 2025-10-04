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

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '税务学习平台API服务正常运行',
    timestamp: new Date().toISOString()
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用税务学习平台API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      knowledge: '/api/knowledge',
      docs: 'API文档待完善'
    }
  });
});

// 404错误处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    message: `路径 ${req.originalUrl} 未找到`,
    availableEndpoints: ['/health', '/api/knowledge']
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