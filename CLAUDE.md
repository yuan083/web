# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chinese tax learning H5 application that implements a spaced repetition system (SRS) using flashcards for tax professionals preparing for certification exams. The application features a MongoDB database backend, Express.js API server, and will include a mobile-responsive frontend with cloud-based progress synchronization.

## Architecture

### Backend Architecture
- **Express.js API Server** - RESTful API with MongoDB integration
- **MongoDB Database** - Optimized for hierarchical tax knowledge and quiz management
- **Authentication System** - JWT-based user authentication (future enhancement)
- **API Documentation** - Self-documenting API with health checks

### Data Flow Architecture
1. **Knowledge Content** (`knowledge_points` collection) - Hierarchical tax topics and key points
2. **Quiz Content** (`quizzes` collection) - Multiple question types with difficulty levels
3. **User Progress** - Learning progress and quiz history tracking
4. **User Identification** - User management with progress persistence

### Key Components

#### Backend API (`server/`)
- **Database Connection** (`db.js`) - MongoDB connection management with singleton pattern
- **Express Application** (`app.js`) - Main server with middleware and routing
- **Knowledge Routes** (`routes/knowledge.js`) - API endpoints for knowledge points and quizzes

#### Database Schema (MongoDB)

**knowledge_points Collection:**
```javascript
{
  topic: "环境保护税",                    // 税种分类
  main_topic: "概念和征税范围",          // 主要章节
  sub_topic: "纳税人",                   // 具体知识点
  display_order: 1,                      // 显示顺序
  content: "知识点详细内容...",
  key_points: ["重点1", "重点2"],        // 考试重点
  tags: ["纳税人", "环保税"],            // 搜索标签
  related_quizzes: [ObjectId],          // 关联题目ID
  comparison: {                          // 对比说明结构
    title: "标题",
    field1: ["内容1", "内容2"],
    field2: ["内容A", "内容B"]
  }
}
```

**quizzes Collection:**
```javascript
{
  source: "2019年真题",                  // 题目来源
  type: "multiple_choice",               // 题目类型
  question_text: "题目内容...",
  options: [{key: "A", text: "选项A"}],  // 选项数组
  correct_answer: ["A", "D", "E"],       // 正确答案
  explanation: "解析内容...",             // 答案解析
  difficulty: "medium",                  // 难度等级
  topic: "环境保护税",                   // 所属税种
  related_main_topic: "概念和征税范围"   // 关联章节
}
```

**users Collection:**
```javascript
{
  user_id: "unique_identifier",          // 用户唯一标识
  nickname: "用户昵称",                  // 显示名称
  phone: "15630827927",                  // 手机号
  learning_progress: [{                 // 学习进度记录
    point_id: ObjectId,
    status: "learned",                   // 学习状态
    last_studied_at: Date,
    study_duration_seconds: 300
  }],
  quiz_history: [{                      // 答题历史
    quiz_id: ObjectId,
    attempted_at: Date,
    user_answer: ["A", "C"],
    is_correct: false
  }],
  preferences: {                        // 用户偏好设置
    daily_goal: 10,                     // 每日目标
    notification_enabled: true,
    preferred_study_time: "evening"
  }
}
```

## Port Allocation Convention

**Project Port Range: 9365-9455**

### Current Port Assignments:
- **9365** - Main API Server (Express.js)
- **9366** - Future: Development API Server
- **9367** - Frontend Development Server (Static files)
- **9370** - Future: WebSocket Server (real-time features)
- **9380** - Future: Admin Dashboard
- **9390** - Future: Analytics Service
- **9400** - Future: File Upload Service
- **9410** - Future: Notification Service
- **9420** - Future: Authentication Service
- **9430** - Future: Payment Service
- **9440** - Future: Backup Service
- **9450** - Future: Monitoring Service

### Port Usage Guidelines:
1. **9365-9379**: Core application services
2. **9380-9399**: Supporting services and tools
3. **9400-9419**: External integrations
4. **9420-9439**: Security and authentication
5. **9440-9455**: Infrastructure and monitoring

## Development Commands

### Database Management
```bash
# Reset and initialize database
npm run reset-db

# Initialize database only
npm run init-db

# Create performance indexes
npm run create-indexes

# Test database functionality
npm run test-db
```

### Server Management
```bash
# Start development server (port 9365)
npm run dev

# Start production server
npm run start

# Start full development environment (API + Frontend)
npm run dev:full

# Start frontend only (port 9367)
npm run start-frontend
```

### API Testing
```bash
# Test server health
npm run test-api

# Test knowledge endpoint
npm run test-knowledge

# Manual API testing
curl http://localhost:9365/health
curl http://localhost:9365/api/knowledge/环境保护税/概念和征税范围
curl http://localhost:9365/api/knowledge/point/{ID}
curl http://localhost:9365/api/knowledge/point/{ID}/quizzes
curl http://localhost:9365/api/knowledge/topics
curl "http://localhost:9365/api/knowledge/search?q=纳税人"
```

## Key Technical Details

### Database Optimization
- **Compound Indexes**: Optimized for hierarchical queries (topic + main_topic + display_order)
- **Text Search**: Full-text search on content, sub_topic, and key_points fields
- **Performance**: All queries use indexes, verified through explain() analysis

### API Design Patterns
- **RESTful Routes**: Consistent URL patterns for all resources
- **Error Handling**: Global error middleware with detailed error responses
- **Data Validation**: ObjectId validation and request sanitization
- **Response Format**: Standardized JSON response structure with success/error indicators

### Security Features
- **Helmet**: Security headers for HTTP responses
- **CORS**: Cross-origin resource sharing configuration
- **Input Validation**: Parameter validation and sanitization
- **Environment Variables**: Sensitive configuration via .env files

## Browser Compatibility

- **API Server**: Requires Node.js 16+ and MongoDB 4.4+
- **Client Applications**: Modern browsers with ES6+ support
- **Mobile**: Optimized for mobile web applications
- **API**: RESTful JSON API with standard HTTP methods

## Development Guidelines

### Code Organization
- **Routes**: Modular route organization in `server/routes/` directory
- **Database**: Connection management in `server/db.js` with singleton pattern
- **Middleware**: Reusable middleware functions for common operations
- **Error Handling**: Centralized error handling with appropriate HTTP status codes

### Database Best Practices
- **Index Optimization**: Create indexes for all query patterns
- **Data Validation**: Validate all input data before database operations
- **Connection Management**: Use connection pooling and proper cleanup
- **Performance Testing**: Use explain() to verify query performance

### API Development Standards
- **Consistent Responses**: Use standardized response format
- **HTTP Status Codes**: Use appropriate status codes for different scenarios
- **Documentation**: Include inline documentation for all endpoints
- **Testing**: Test all endpoints with valid and invalid inputs

## Environment Configuration

### Required Environment Variables
```env
MONGODB_URL=mongodb://localhost:27017
PORT=9365
NODE_ENV=development
```

### Optional Environment Variables
```env
JWT_SECRET=your-jwt-secret-key
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

## Future Enhancements

### Phase 1: Core Features
- [ ] User authentication and authorization
- [ ] Learning progress tracking
- [ ] Spaced repetition algorithm implementation
- [ ] Quiz submission and scoring

### Phase 2: Advanced Features
- [ ] Real-time collaboration features
- [ ] Advanced analytics and reporting
- [ ] File upload and media management
- [ ] Push notifications

### Phase 3: Scaling Features
- [ ] Microservices architecture
- [ ] Container orchestration
- [ ] CDN integration
- [ ] Multi-region deployment