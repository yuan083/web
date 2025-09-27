# 税务学习平台 - 本地数据库设计

## 数据库概述
使用IndexedDB作为本地存储解决方案，支持多用户、多科目、权限控制的完整学习平台。

## 数据表结构

### 1. users (用户表)
```javascript
{
  id: "user_1641234567890",          // 用户唯一标识
  email: "user@example.com",         // 用户邮箱
  password: "hashed_password",        // 密码哈希值
  nickname: "用户昵称",               // 用户昵称
  role: "student",                    // 用户角色: student, teacher, admin
  avatar: "base64_image_data",       // 头像图片
  created_at: "2024-01-01T00:00:00Z", // 创建时间
  last_login: "2024-01-01T00:00:00Z", // 最后登录时间
  settings: {                         // 用户设置
    theme: "light",                   // 主题: light, dark
    language: "zh-CN",                // 语言
    study_reminder: true,             // 学习提醒
    review_interval: [1, 3, 7, 14, 30] // 自定义复习间隔
  }
}
```

### 2. decks (科目表)
```javascript
{
  id: 1,                              // 科目ID (自增)
  name: "税法一",                     // 科目名称
  description: "增值税、消费税等",     // 科目描述
  user_id: "user_1641234567890",      // 创建者ID
  visibility: "private",              // 可见性: private, public
  category: "税务师考试",             // 科目分类
  difficulty: "intermediate",          // 难度等级: beginner, intermediate, advanced
  cover_image: "base64_image_data",   // 封面图片
  is_featured: false,                 // 是否推荐
  download_count: 0,                  // 下载次数
  card_count: 0,                      // 卡片数量
  created_at: "2024-01-01T00:00:00Z", // 创建时间
  updated_at: "2024-01-01T00:00:00Z", // 更新时间
  tags: ["增值税", "消费税"]          // 标签数组
}
```

### 3. cards (卡片表)
```javascript
{
  id: 1,                              // 卡片ID (自增)
  deck_id: 1,                         // 所属科目ID
  question: "增值税税率是多少？",     // 问题内容 (支持Markdown)
  answer: "基本税率13%",              // 答案内容 (支持Markdown)
  card_type: "qa",                    // 卡片类型: qa, mcq, fill_blank, type_in
  difficulty: 2,                      // 难度等级 1-5
  options: ["6%", "9%", "13%", "16%"],// 选择题选项
  correct_answer: 2,                  // 正确答案索引或内容
  explanation: "说明解释",            // 答案解释
  image: "base64_image_data",         // 卡片图片
  audio: "base64_audio_data",         // 音频数据
  video: "base64_video_data",         // 视频数据
  created_at: "2024-01-01T00:00:00Z", // 创建时间
  updated_at: "2024-01-01T00:00:00Z", // 更新时间
  tags: ["基础", "税率"]              // 标签数组
}
```

### 4. progress (学习进度表)
```javascript
{
  user_id: "user_1641234567890",      // 用户ID (复合主键)
  card_id: 1,                         // 卡片ID (复合主键)
  deck_id: 1,                         // 科目ID
  level: 3,                           // 掌握等级 0-7
  review_date: "2024-01-10",          // 下次复习日期
  last_answered: true,                // 上次是否答对
  total_attempts: 5,                   // 总尝试次数
  correct_attempts: 3,                 // 正确次数
  streak: 2,                          // 连续正确次数
  ease_factor: 2.5,                   // 难度因子 (SM-2算法)
  interval: 7,                        // 当前复习间隔(天)
  first_seen: "2024-01-01T00:00:00Z", // 首次学习时间
  last_reviewed: "2024-01-03T00:00:00Z", // 最后复习时间
  time_spent: 120,                    // 学习时间(秒)
  notes: "需要加强记忆"               // 学习笔记
}
```

### 5. study_sessions (学习会话表)
```javascript
{
  id: 1,                              // 会话ID (自增)
  user_id: "user_1641234567890",      // 用户ID
  deck_id: 1,                         // 学习科目ID
  start_time: "2024-01-01T10:00:00Z", // 开始时间
  end_time: "2024-01-01T11:00:00Z",   // 结束时间
  cards_studied: 20,                  // 学习卡片数
  cards_correct: 15,                  // 答对卡片数
  cards_new: 5,                       // 新卡片数
  cards_review: 15,                   // 复习卡片数
  total_time: 3600,                   // 总学习时间(秒)
  accuracy: 0.75,                     // 准确率
  created_at: "2024-01-01T11:00:00Z"  // 创建时间
}
```

### 6. user_stats (用户统计表)
```javascript
{
  user_id: "user_1641234567890",      // 用户ID (主键)
  total_study_time: 7200,             // 总学习时间(秒)
  total_cards_studied: 100,           // 总学习卡片数
  total_sessions: 10,                 // 总学习次数
  current_streak: 5,                  // 当前连续学习天数
  longest_streak: 10,                 // 最长连续学习天数
  total_decks: 3,                     // 创建科目数
  mastered_cards: 45,                 // 已掌握卡片数
  average_accuracy: 0.8,              // 平均准确率
  last_study_date: "2024-01-01",      // 最后学习日期
  created_at: "2024-01-01T00:00:00Z", // 创建时间
  updated_at: "2024-01-01T00:00:00Z"  // 更新时间
}
```

### 7. bookmarks (书签表)
```javascript
{
  id: 1,                              // 书签ID (自增)
  user_id: "user_1641234567890",      // 用户ID
  card_id: 1,                         // 卡片ID
  deck_id: 1,                         // 科目ID
  note: "重要知识点",                 // 书签笔记
  created_at: "2024-01-01T00:00:00Z", // 创建时间
  updated_at: "2024-01-01T00:00:00Z"  // 更新时间
}
```

### 8. media_files (媒体文件表)
```javascript
{
  id: 1,                              // 文件ID (自增)
  user_id: "user_1641234567890",      // 上传用户ID
  filename: "tax_chart.png",          // 文件名
  file_type: "image",                 // 文件类型: image, audio, video
  mime_type: "image/png",             // MIME类型
  file_size: 1024000,                 // 文件大小(字节)
  file_data: "base64_encoded_data",   // 文件数据
  uploaded_at: "2024-01-01T00:00:00Z", // 上传时间
  card_id: 1                          // 关联卡片ID
}
```

## 索引设计

### users表索引
- email: unique (唯一索引)
- role: 普通索引
- created_at: 普通索引

### decks表索引
- user_id: 普通索引
- visibility: 普通索引
- category: 普通索引
- created_at: 普通索引

### cards表索引
- deck_id: 普通索引
- card_type: 普通索引
- difficulty: 普通索引
- created_at: 普通索引

### progress表索引
- user_id: 普通索引
- card_id: 普通索引
- deck_id: 普通索引
- review_date: 普通索引
- [user_id, review_date]: 复合索引

### study_sessions表索引
- user_id: 普通索引
- deck_id: 普通索引
- start_time: 普通索引

## 数据关系

1. **用户-科目**: 一对多 (一个用户可以创建多个科目)
2. **科目-卡片**: 一对多 (一个科目包含多张卡片)
3. **用户-进度**: 一对多 (一个用户有多个学习进度记录)
4. **卡片-进度**: 一对多 (一张卡片被多个用户学习)
5. **用户-会话**: 一对多 (一个用户有多个学习会话)
6. **用户-书签**: 一对多 (一个用户可以创建多个书签)
7. **用户-媒体文件**: 一对多 (一个用户可以上传多个媒体文件)

## 权限控制

### 科目权限
- **私有科目**: 只有创建者可以查看和编辑
- **公开科目**: 所有用户可以查看，只有创建者可以编辑
- **推荐科目**: 管理员可以设置为推荐，在首页展示

### 卡片权限
- 只有科目创建者可以添加、编辑、删除卡片
- 公开科目的卡片可以被所有用户学习
- 用户只能查看和修改自己的学习进度

## 间隔重复算法

使用改进的SM-2算法：
- **初始间隔**: 1天
- **等级0-7**: [1, 3, 7, 14, 30, 60, 120, 240]天
- **难度因子**: 根据回答质量调整
- **连续正确**: 增加等级和间隔
- **回答错误**: 重置到等级0

## 数据安全

1. **密码加密**: 使用SHA-256哈希存储密码
2. **数据验证**: 所有输入数据进行验证和清理
3. **访问控制**: 基于用户角色的权限控制
4. **数据备份**: 提供数据导入导出功能
5. **本地存储**: 所有数据存储在用户本地，保护隐私