# 税务学习平台 (Tax Learning Platform)

基于MongoDB的税务考试学习系统，支持间隔重复算法和智能推荐。

## 🚀 快速开始

### 环境要求
- Node.js 16+
- MongoDB 8.2+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 数据库初始化
```bash
# 重置并初始化数据库
npm run reset-db

# 或者分步执行
npm run init-db      # 初始化数据
npm run create-indexes  # 创建索引
npm run test-db      # 验证数据库
```

### 启动开发服务器
```bash
npm run dev
```

## 📁 项目结构

```
├── package.json              # 项目配置
├── scripts/                  # 数据库脚本
│   ├── init-database.js     # 数据库初始化
│   ├── create-indexes.js    # 索引创建
│   └── test-queries.js      # 功能验证
└── server/                   # 后端代码 (待开发)
    └── app.js              # Express应用
```

## 🗄️ 数据库设计

### 集合结构

#### `knowledge_points` - 知识点集合
```javascript
{
  topic: "环境保护税",           // 税种
  main_topic: "概念和征税范围",   // 主要章节
  sub_topic: "纳税人",          // 具体知识点
  content: "知识点内容...",
  key_points: ["重点1", "重点2"], // 考点重点
  tags: ["纳税人", "环保税"],    // 标签
  display_order: 1              // 显示顺序
}
```

#### `quizzes` - 题目集合
```javascript
{
  type: "multiple_choice",      // 题目类型
  question_text: "题目内容...",
  options: [{key: "A", text: "选项A"}],
  correct_answer: ["A", "C"],   // 正确答案
  explanation: "解析内容...",
  difficulty: "medium",         // 难度
  source: "2019年真题"          // 来源
}
```

#### `users` - 用户集合
```javascript
{
  user_id: "unique_id",
  nickname: "用户昵称",
  phone: "15630827927",
  learning_progress: [{         // 学习进度
    point_id: ObjectId,
    status: "learned",
    last_studied_at: Date
  }],
  quiz_history: [{             // 答题历史
    quiz_id: ObjectId,
    user_answer: ["A", "B"],
    is_correct: true
  }]
}
```

## 📊 数据验证

运行验证脚本确认数据库功能：
```bash
npm run test-db
```

验证包括：
- ✅ 基础数据查询
- ✅ 层级查询功能
- ✅ 关联查询功能
- ✅ 全文搜索功能
- ✅ 用户数据查询
- ✅ 复杂查询场景
- ✅ 索引使用情况

## 🔧 开发脚本

- `npm start` - 启动生产服务器
- `npm run dev` - 启动开发服务器 (nodemon)
- `npm run reset-db` - 重置数据库
- `npm run test-db` - 验证数据库功能

## 📈 当前状态

- ✅ MongoDB数据库设计完成
- ✅ 索引优化完成
- ✅ 数据验证脚本完成
- ⏳ Express后端API开发中
- ⏳ 前端界面开发待开始

## 🎯 下一步计划

1. 开发Express后端API
2. 实现用户认证系统
3. 开发前端学习界面
4. 实现间隔重复算法
5. 添加学习统计功能