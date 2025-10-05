const jwt = require('jsonwebtoken');

// JWT认证中间件
// 验证请求头中的Authorization token，并将用户信息添加到req对象中
const authenticateToken = (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝：需要认证令牌'
      });
    }

    // 验证token - 使用与auth.js相同的默认值
    const JWT_SECRET = 'tax_learning_platform_jwt_secret_key_2024_very_long_and_secure_string_for_production_use';
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log(`❌ Token验证失败: ${err.message}`);
        return res.status(403).json({
          success: false,
          message: '令牌无效或已过期'
        });
      }

      // 将用户信息添加到请求对象
      req.user = {
        userId: decoded.userId,
        phone: decoded.phone
      };

      console.log(`✅ 用户认证成功: ${decoded.phone}`);
      next();
    });
  } catch (error) {
    console.error('❌ 认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

// 可选认证中间件
// 如果有token则验证，没有token则继续（用于可选登录的功能）
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 没有token，继续执行
      return next();
    }

    // 有token，尝试验证
    const JWT_SECRET = 'tax_learning_platform_jwt_secret_key_2024_very_long_and_secure_string_for_production_use';
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        // token无效，但不阻止请求继续
        console.log(`⚠️ 可选认证: Token无效，继续执行`);
        return next();
      }

      // token有效，添加用户信息
      req.user = {
        userId: decoded.userId,
        phone: decoded.phone
      };

      console.log(`✅ 可选认证成功: ${decoded.phone}`);
      next();
    });
  } catch (error) {
    console.error('❌ 可选认证中间件错误:', error);
    next(); // 出错也不阻止请求
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};