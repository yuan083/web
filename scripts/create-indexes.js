// MongoDB 索引创建脚本
// 用于优化查询性能

use tax_learning_platform;

// 1. knowledge_points 集合的索引
print("🔍 创建 knowledge_points 集合索引...");

// 按主题和主要话题的复合索引（用于按税种和章节查询）
db.knowledge_points.createIndex({
  "topic": 1,
  "main_topic": 1,
  "display_order": 1
}, {
  name: "idx_topic_main_order"
});

// 按标签的索引（用于搜索功能）
db.knowledge_points.createIndex({
  "tags": 1
}, {
  name: "idx_tags"
});

// 文本搜索索引（用于全文搜索）
db.knowledge_points.createIndex({
  "content": "text",
  "sub_topic": "text",
  "key_points": "text"
}, {
  name: "idx_text_search",
  weights: {
    "sub_topic": 10,
    "content": 5,
    "key_points": 8
  }
});

// 2. quizzes 集合的索引
print("🔍 创建 quizzes 集合索引...");

// 按主题和难度的索引（用于题目筛选）
db.quizzes.createIndex({
  "topic": 1,
  "difficulty": 1,
  "type": 1
}, {
  name: "idx_topic_difficulty_type"
});

// 按来源的索引（用于真题练习）
db.quizzes.createIndex({
  "source": 1
}, {
  name: "idx_source"
});

// 题目文本搜索索引
db.quizzes.createIndex({
  "question_text": "text",
  "explanation": "text"
}, {
  name: "idx_quiz_text_search"
});

// 3. users 集合的索引
print("🔍 创建 users 集合索引...");

// 用户ID唯一索引
db.users.createIndex({
  "user_id": 1
}, {
  name: "idx_user_id_unique",
  unique: true
});

// 手机号唯一索引
db.users.createIndex({
  "phone": 1
}, {
  name: "idx_phone_unique",
  unique: true,
  sparse: true // 允许为空
});

// 学习进度查询索引
db.users.createIndex({
  "user_id": 1,
  "learning_progress.point_id": 1
}, {
  name: "idx_learning_progress"
});

// 答题历史查询索引
db.users.createIndex({
  "user_id": 1,
  "quiz_history.quiz_id": 1
}, {
  name: "idx_quiz_history"
});

// 显示所有创建的索引
print("\n📋 knowledge_points 集合索引:");
db.knowledge_points.getIndexes().forEach(function(index) {
  print("  - " + index.name + ": " + JSON.stringify(index.key));
});

print("\n📋 quizzes 集合索引:");
db.quizzes.getIndexes().forEach(function(index) {
  print("  - " + index.name + ": " + JSON.stringify(index.key));
});

print("\n📋 users 集合索引:");
db.users.getIndexes().forEach(function(index) {
  print("  - " + index.name + ": " + JSON.stringify(index.key));
});

print("\n✅ 索引创建完成！");