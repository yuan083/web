// 数据库连接模块
const { MongoClient } = require('mongodb');

// MongoDB连接配置
const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const dbName = 'tax_learning_platform';

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  // 连接到MongoDB
  async connect() {
    try {
      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      this.db = this.client.db(dbName);
      console.log('✅ 成功连接到MongoDB数据库:', dbName);
      return this.db;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  // 获取数据库实例
  getDb() {
    if (!this.db) {
      throw new Error('数据库未连接，请先调用 connect() 方法');
    }
    return this.db;
  }

  // 关闭数据库连接
  async close() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 创建单例实例
const database = new Database();

// 导出数据库实例和连接函数
module.exports = {
  getDb: () => database.getDb(),
  connectDb: () => database.connect(),
  closeDb: () => database.close()
};