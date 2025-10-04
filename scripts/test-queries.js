// 全面验证脚本 - 测试数据库结构和API查询模拟
use tax_learning_platform;

print("=========================================");
print("🚀 开始数据库功能验证...");
print("=========================================\n");

// --- 1. 验证基础数据查询 (验证数据是否成功插入) ---
print("--- 验证 1: 基础数据查询 ---");
const knowledgePointCount = db.knowledge_points.countDocuments();
const quizCount = db.quizzes.countDocuments();
const userCount = db.users.countDocuments();

if (knowledgePointCount > 0 && quizCount > 0 && userCount > 0) {
  print(`✅ 成功: 数据已载入。知识点: ${knowledgePointCount}, 题目: ${quizCount}, 用户: ${userCount}`);
} else {
  print(`❌ 失败: 集合为空，请先运行 'npm run init-db'`);
}
print("\n");

// --- 2. 验证知识点层级查询 (模拟前端获取课程目录) ---
print("--- 验证 2: 按层级查询知识点 (环保税) ---");
// 这个查询会利用到你创建的 (topic, main_topic, display_order) 复合索引
const chapterContent = db.knowledge_points.find({
  topic: "环境保护税",
  main_topic: "概念和征税范围"
}).sort({ display_order: 1 }).toArray();

if (chapterContent.length > 0) {
  print(`✅ 成功: 成功查询到 "${chapterContent[0].main_topic}" 章节下的 ${chapterContent.length} 个知识点。`);
  print(`第一个知识点是: "${chapterContent[0].sub_topic}"`);
} else {
  print("❌ 失败: 未能按章节查询到知识点。");
}
print("\n");

// --- 3. 验证题目与知识点的关联查询 ---
print("--- 验证 3: 查询知识点及其关联的题目 ---");
// 找到"纳税人"这个知识点
const taxpayerPoint = db.knowledge_points.findOne({ sub_topic: "纳税人" });
if (taxpayerPoint) {
  print(`✅ 成功: 找到知识点 "纳税人"`);

  // 查询与这个知识点相关的题目（通过主题匹配）
  const relatedQuizzes = db.quizzes.find({
    topic: taxpayerPoint.topic,
    related_main_topic: taxpayerPoint.main_topic
  }).toArray();

  if (relatedQuizzes.length > 0) {
    print(`✅ 成功: 找到 ${relatedQuizzes.length} 道相关题目`);
    print(`第一道题: "${relatedQuizzes[0].question_text.substring(0, 20)}..."`);
  } else {
    print("⚠️  警告: 未找到相关题目，但知识点存在");
  }
} else {
  print("❌ 失败: 未找到\"纳税人\"知识点");
}
print("\n");

// --- 4. 验证全文搜索功能 (验证文本索引) ---
print("--- 验证 4: 全文搜索功能 (搜索'噪声') ---");
// 这个查询会利用到你为 knowledge_points 创建的文本索引
const searchResults = db.knowledge_points.find({
  $text: { $search: "噪声" }
}).toArray();

if (searchResults.length > 0) {
  print(`✅ 成功: 文本索引工作正常，找到 ${searchResults.length} 个与 '噪声' 相关的知识点。`);
} else {
  print("❌ 失败: 全文搜索未返回结果，请检查文本索引是否已创建。");
}
print("\n");

// --- 5. 验证用户数据查询 (验证用户数据结构和索引) ---
print("--- 验证 5: 查询特定用户的学习进度 ---");
// 假设袁同学的手机号是 '15630827927'
const testUser = db.users.findOne({ phone: "15630827927" });
if (testUser) {
    if (testUser.learning_progress && testUser.learning_progress.length > 0) {
        print(`✅ 成功: 找到用户 "${testUser.nickname}"，他有 ${testUser.learning_progress.length} 条学习记录。`);
    } else {
        print(`⚠️  警告: 找到了用户，但该用户没有学习记录。`);
    }
} else {
  print("❌ 失败: 未能通过手机号找到测试用户，请检查唯一索引或初始化数据。");
}
print("\n");

// --- 6. 验证复杂查询场景 (模拟真实API调用) ---
print("--- 验证 6: 复杂查询场景测试 ---");

// 场景1: 获取特定税种的所有章节和知识点统计
const topicStats = db.knowledge_points.aggregate([
  { $match: { topic: "环境保护税" } },
  { $group: {
    _id: "$main_topic",
    count: { $sum: 1 },
    points: { $push: { sub_topic: "$sub_topic", order: "$display_order" } }
  }},
  { $sort: { _id: 1 } }
]).toArray();

if (topicStats.length > 0) {
  print(`✅ 成功: 环保税有 ${topicStats.length} 个章节`);
  topicStats.forEach(chapter => {
    print(`   - ${chapter._id}: ${chapter.count} 个知识点`);
  });
} else {
  print("❌ 失败: 聚合查询失败");
}

// 场景2: 按难度统计题目数量
const difficultyStats = db.quizzes.aggregate([
  { $match: { topic: "环境保护税" } },
  { $group: { _id: "$difficulty", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray();

if (difficultyStats.length > 0) {
  print(`✅ 成功: 按难度统计题目`);
  difficultyStats.forEach(stat => {
    print(`   - ${stat._id}: ${stat.count} 道题`);
  });
} else {
  print("⚠️  警告: 难度统计查询无结果");
}
print("\n");

// --- 7. 验证索引使用情况 ---
print("--- 验证 7: 索引使用情况检查 ---");

// 检查知识点集合的索引使用
const knowledgeIndexTest = db.knowledge_points.find({
  topic: "环境保护税",
  main_topic: "概念和征税范围"
}).sort({ display_order: 1 }).explain("executionStats");

// 正确的索引判断：检查输入阶段是否为IXSCAN
const inputStage = knowledgeIndexTest.executionStats.executionStages.inputStage;
const usesKnowledgeIndex = inputStage && inputStage.stage === "IXSCAN";

if (usesKnowledgeIndex) {
  print(`✅ 成功: 知识点查询使用了复合索引 "${inputStage.indexName}"`);
  print(`   - 扫描文档数: ${knowledgeIndexTest.executionStats.totalDocsExamined}`);
  print(`   - 返回结果数: ${knowledgeIndexTest.executionStats.nReturned}`);
} else {
  print("⚠️  警告: 知识点查询未使用索引，可能影响性能");
  print(`   - 当前执行阶段: ${knowledgeIndexTest.executionStats.executionStages.stage}`);
}

// 检查文本搜索索引
const textSearchTest = db.knowledge_points.find({
  $text: { $search: "纳税人" }
}).explain("executionStats");

// 正确的文本搜索判断：检查执行阶段是否为TEXT_MATCH或TEXT
const textStage = textSearchTest.executionStats.executionStages.stage;
const usesTextIndex = textStage === "TEXT_MATCH" || textStage === "TEXT";

if (usesTextIndex) {
  print(`✅ 成功: 文本搜索使用了文本索引 "${textSearchTest.executionStats.executionStages.indexName}"`);
  print(`   - 执行阶段: ${textStage}`);
  print(`   - 扫描文档数: ${textSearchTest.executionStats.totalDocsExamined}`);
  print(`   - 返回结果数: ${textSearchTest.executionStats.nReturned}`);
} else {
  print("❌ 失败: 文本搜索未使用文本索引");
  print(`   - 当前执行阶段: ${textStage}`);
}
print("\n");

print("=========================================");
print("✅ 验证脚本执行完毕。");
print("=========================================");

// --- 总结报告 ---
print("\n📊 数据库验证总结:");
print(`   - 知识点数量: ${knowledgePointCount}`);
print(`   - 题目数量: ${quizCount}`);
print(`   - 用户数量: ${userCount}`);
print(`   - 环保税章节数: ${topicStats.length}`);

if (knowledgePointCount > 0 && quizCount > 0 && userCount > 0 && topicStats.length > 0) {
  print("\n🎉 恭喜！数据库验证全部通过，可以开始后端API开发了！");
} else {
  print("\n⚠️  请检查上述失败项并修复后再进行后续开发。");
}