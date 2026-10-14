import jwt from 'jsonwebtoken';
import db from '../database/index.js';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is required');

export function requireAuth(req, res, next) {
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  try {
    const payload = jwt.verify(match?.[1] || '', secret, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(payload.userId)) throw new Error('Invalid subject');
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(payload.userId);
    if (!user) throw new Error('User no longer exists');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}
