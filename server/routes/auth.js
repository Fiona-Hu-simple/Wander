import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/index.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

const router = Router();

// JWT 密钥（生产环境应放在环境变量中）
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
const TOKEN_EXPIRES_IN = '7d';
router.get('/me', requireAuth, (req, res) => res.json({ code: 200, data: { userId: req.user.id, username: req.user.username } }));

function credentials(body) {
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') return null;
  const username = body.username.trim();
  const password = body.password;
  if (username.length < 2 || username.length > 20 || password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) return null;
  return { username, password };
}


/**
 * POST /api/auth/register
 * 注册新用户
 * Body: { username, password }
 */
router.post('/register', rateLimit({ limit: 10, windowMs: 60000 }), async (req, res) => {
  try {
    const input = credentials(req.body);
    if (!input) return res.status(400).json({ code: 400, message: '用户名须为 2-20 个字符，密码至少 6 位且不超过 72 字节' });
    const { username, password } = input;

    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({
        code: 409,
        message: '用户名已被注册',
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入用户
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const result = stmt.run(username, hashedPassword);

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        userId: result.lastInsertRowid,
        username,
      },
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ code: 409, message: '用户名已被注册' });
    console.error('注册失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
    });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 * Body: { username, password }
 */
router.post('/login', rateLimit({ limit: 20, windowMs: 60000 }), async (req, res) => {
  try {
    const input = credentials(req.body);
    if (!input) return res.status(400).json({ code: 400, message: '用户名须为 2-20 个字符，密码至少 6 位且不超过 72 字节' });
    const { username, password } = input;

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误',
      });
    }

    // 生成 JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN, algorithm: 'HS256' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        userId: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
    });
  }
});

export default router;
