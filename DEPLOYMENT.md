# 税务师学习平台 - 快速部署指南

## 🚀 Vercel 部署步骤

### 1. 推送到GitHub
使用新账户创建仓库并推送代码：

```bash
# 在GitHub上创建新仓库（名称：shuiwushi）
# 然后执行以下命令：

git remote add origin git@github-163.com:yuan083/shuiwushi.git
git push -u origin main
```

### 2. 部署到Vercel

#### 方法一：通过Vercel网站（推荐）
1. 访问 [vercel.com](https://vercel.com)
2. 使用GitHub账号登录
3. 点击 "Add New..." → "Project"
4. 选择 `yuan083/shuiwushi` 仓库
5. **关键：配置环境变量**
   ```
   SUPABASE_URL = https://mrpomuidxsocqifpkvbc.supabase.co
   SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycG9tdWlkeHNvY3FpZnBrdmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNjc0MjQsImV4cCI6MjA3NDY0MzQyNH0.2HD9XQvXNaGgTnwtumcY1pejwN77BNJtUQ-TFDm40YQ
   ```
6. 点击 "Deploy"

#### 方法二：使用Vercel CLI
```bash
# 安装Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（会提示配置环境变量）
vercel

# 生产部署
vercel --prod
```

### 3. 验证部署成功
- 访问部署后的URL
- 测试注册/登录功能
- 尝试学习几张卡片
- 确认进度能正常保存

## 📱 功能特性

### ✅ 已完成功能
- **用户认证系统** - 注册/登录/退出
- **核心学习循环** - 卡片学习、进度保存
- **间隔重复算法** - 智能复习安排
- **响应式设计** - 支持手机和桌面端
- **云端同步** - Supabase数据存储
- **20张税务卡片** - 涵盖增值税、消费税等基础内容

### 🔄 下一阶段计划
1. **用户测试反馈** - 邀请真实用户使用
2. **内容扩充** - 增加到50+张学习卡片
3. **易错题本** - 智能筛选薄弱知识点
4. **体验优化** - 根据反馈改进UI/UX

## 🔧 技术栈

- **前端**: HTML5 + CSS3 + JavaScript ES6+
- **后端**: Supabase (PostgreSQL + Auth)
- **样式**: 女生友好的马卡龙色系
- **字体**: Google Fonts 中文字体支持
- **图标**: Font Awesome

## 📝 本地开发

```bash
# 启动本地服务器
python3 -m http.server 8000
# 或
npx http-server

# 访问 http://localhost:8000
```

## 🎯 项目目标

为税务师考生提供高效的学习工具，通过间隔重复算法帮助用户：
- 系统化学习税务知识点
- 智能安排复习时间
- 追踪学习进度
- 提高记忆效率

---

**部署完成后，你就可以分享给朋友开始使用了！** 🎉