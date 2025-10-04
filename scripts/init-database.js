// MongoDB 数据库初始化脚本
// 数据库名称: tax_learning_platform

use tax_learning_platform;

// 1. 创建 knowledge_points 集合并插入示例数据
db.knowledge_points.insertMany([
  {
    "topic": "环境保护税",
    "main_topic": "概念和征税范围",
    "sub_topic": "纳税人",
    "display_order": 1,
    "content": "纳税人是在我国境内及管辖海域，直接向环境排放应税污染物的【企事业单位】和【其他生产经营者】。",
    "key_points": [
      "【政府机关、家庭、其他个人】不属于纳税人，即使排放也不交税。",
      "这里的'个人'不包括【个体工商户】，个体户属于'其他生产经营者'，需要交税。",
      "未形成规模化养殖的农业生产者，虽然属于纳税人，但可以享受【暂免征收】的优惠。"
    ],
    "tags": ["纳税人", "环保税", "征税范围"],
    "created_at": new Date(),
    "updated_at": new Date()
  },
  {
    "topic": "环境保护税",
    "main_topic": "概念和征税范围",
    "sub_topic": "直接排放的界定",
    "display_order": 2,
    "content": "直接向环境排放是征收环保税的必要条件。不属于直接排放的行为不征税，属于直接排放的行为需要征税。",
    "comparison": {
      "title": "直接排放 vs 非直接排放",
      "not_direct_discharge": [
        "向集中污水/垃圾处理场所排放",
        "在【符合标准】的设施内贮存、处置固体废物",
        "规模化养殖经综合利用或无害化处理后排放"
      ],
      "is_direct_discharge": [
        "集中处理场所处理后【再】向环境排放（超标征，未超标免）",
        "在【不符合标准】的设施内贮存、处置固体废物",
        "养殖场未经处理直接排放"
      ]
    },
    "tags": ["直接排放", "环保税", "必要条件"],
    "created_at": new Date(),
    "updated_at": new Date()
  },
  {
    "topic": "环境保护税",
    "main_topic": "概念和征税范围",
    "sub_topic": "应税污染物",
    "display_order": 3,
    "content": "应税污染物包括大气污染物、水污染物、固体废物、噪声等四大类。",
    "key_points": [
      "【大气污染物】包括二氧化硫、氮氧化物等44种",
      "【水污染物】包括第一类水污染物（重金属等）和其他类水污染物",
      "【固体废物】包括煤矸石、尾矿、危险废物等",
      "【噪声】仅指工业噪声，不包括交通噪声、建筑噪声等"
    ],
    "tags": ["应税污染物", "环保税", "征税对象"],
    "created_at": new Date(),
    "updated_at": new Date()
  }
]);

// 2. 创建 quizzes 集合并插入示例数据
db.quizzes.insertMany([
  {
    "source": "2019年真题",
    "type": "multiple_choice",
    "question_text": "下列直接向环境排放污染物的主体中，属于环境保护税纳税人的有？",
    "options": [
      { "key": "A", "text": "事业单位" },
      { "key": "B", "text": "个人" },
      { "key": "C", "text": "家庭" },
      { "key": "D", "text": "私营企业" },
      { "key": "E", "text": "国有企业" }
    ],
    "correct_answer": ["A", "D", "E"],
    "explanation": "环保税的纳税人是企事业单位和其他生产经营者。事业单位、私营企业、国有企业均属于此范围。家庭和不从事生产经营的个人不属于纳税人。",
    "difficulty": "medium",
    "topic": "环境保护税",
    "related_main_topic": "概念和征税范围",
    "created_at": new Date(),
    "updated_at": new Date()
  },
  {
    "source": "练习题",
    "type": "single_choice",
    "question_text": "关于环境保护税的纳税人，下列说法正确的是？",
    "options": [
      { "key": "A", "text": "所有向环境排放污染物的个人都属于纳税人" },
      { "key": "B", "text": "个体工商户不属于纳税人" },
      { "key": "C", "text": "政府机关不属于纳税人" },
      { "key": "D", "text": "家庭属于纳税人" }
    ],
    "correct_answer": ["C"],
    "explanation": "政府机关、家庭、其他个人不属于环境保护税的纳税人。个体工商户属于'其他生产经营者'，需要交税。",
    "difficulty": "easy",
    "topic": "环境保护税",
    "related_main_topic": "概念和征税范围",
    "created_at": new Date(),
    "updated_at": new Date()
  },
  {
    "source": "2020年真题",
    "type": "judgment",
    "question_text": "企业向符合标准的集中污水处理设施排放污水，属于直接排放行为，需要缴纳环境保护税。",
    "options": [
      { "key": "A", "text": "正确" },
      { "key": "B", "text": "错误" }
    ],
    "correct_answer": ["B"],
    "explanation": "向集中污水/垃圾处理场所排放不属于直接排放，不征收环境保护税。",
    "difficulty": "medium",
    "topic": "环境保护税",
    "related_main_topic": "概念和征税范围",
    "created_at": new Date(),
    "updated_at": new Date()
  }
]);

// 3. 创建 users 集合的示例数据（为测试准备）
db.users.insertOne({
  "user_id": "yuan_15630827927",
  "nickname": "袁同学",
  "phone": "15630827927",
  "last_login_at": new Date(),
  "created_at": new Date(),
  "learning_progress": [],
  "quiz_history": [],
  "preferences": {
    "daily_goal": 10, // 每日学习目标（知识点数量）
    "notification_enabled": true,
    "preferred_study_time": "evening"
  }
});

print("✅ 数据库初始化完成！");
print("📊 knowledge_points 集合: " + db.knowledge_points.countDocuments() + " 条记录");
print("📝 quizzes 集合: " + db.quizzes.countDocuments() + " 条记录");
print("👥 users 集合: " + db.users.countDocuments() + " 条记录");