const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { ObjectId } = require('mongodb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10; // 密码加密强度
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key'; // JWT密钥

// --- API: 用户注册 ---
// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { nickname, phone, password } = req.body;
    const db = getDb();

    // 1. 简单验证
    if (!nickname || !phone || !password) {
      return res.status(400).json({ success: false, message: "昵称、手机号和密码不能为空" });
    }

    // 2. 检查手机号是否已被注册
    const existingUser = await db.collection('users').findOne({ phone: phone });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "该手机号已被注册" });
    }

    // 3. 密码加密
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. 创建新用户
    const newUser = {
      nickname: nickname,
      phone: phone,
      password: hashedPassword, // 存储加密后的密码
      created_at: new Date(),
      learning_progress: [],
      quiz_history: []
    };
    const result = await db.collection('users').insertOne(newUser);

    console.log(`✅ 新用户注册成功: ${nickname} (${phone})`);

    res.status(201).json({
      success: true,
      message: "注册成功",
      userId: result.insertedId
    });

  } catch (error) {
    console.error('❌ 用户注册失败:', error);
    next(error); // 将错误传递给全局错误处理器
  }
});

// --- API: 用户登录 ---
// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
     const { phone, password } = req.body;
     const db = getDb();

     // 1. 查找用户
     const user = await db.collection('users').findOne({ phone: phone });
     if (!user) {
       return res.status(401).json({ success: false, message: "手机号或密码错误" });
     }

     // 2. 验证密码
     const isMatch = await bcrypt.compare(password, user.password);
     if (!isMatch) {
       return res.status(401).json({ success: false, message: "手机号或密码错误" });
     }

     // 3. 生成 JWT Token
     const payload = { userId: user._id, phone: user.phone };
     const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); // Token有效期7天

     console.log(`✅ 用户登录成功: ${user.nickname} (${phone})`);

     res.json({
         success: true,
         message: "登录成功",
         token: token,
         user: {
             id: user._id,
             nickname: user.nickname,
             phone: user.phone
         }
     });

  } catch (error) {
     console.error('❌ 用户登录失败:', error);
     next(error);
  }
});

// --- API: 获取用户信息（需要认证）---
// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.userId;

    // 查找用户信息（不包含密码）
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          password: 0 // 只排除密码字段，包含其他所有字段
        }
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    console.log(`✅ 获取用户信息: ${user.nickname} (${user.phone})`);

    res.json({
      success: true,
      data: {
        id: user._id,
        nickname: user.nickname,
        phone: user.phone,
        created_at: user.created_at,
        learning_progress: user.learning_progress || [],
        quiz_history: user.quiz_history || []
      }
    });

  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);
    next(error);
  }
});

module.exports = router;