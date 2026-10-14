import './config/env.js';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import conversationsRouter from './routes/conversations.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

// 中间件
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',').map(origin => origin.trim()).filter(Boolean),
}));
app.use('/api/chat/import', requireAuth, express.json({ limit: '2mb' }));
app.use(express.json({ limit: '128kb' }));

// 路由
app.use('/api/auth', authRouter);
app.use('/api/chat', conversationsRouter, chatRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = [400, 404, 409, 413].includes(error.status) ? error.status : 500;
  res.status(status).json({ code: status, message: status === 500 ? '服务器内部错误' : status === 413 ? '请求内容过大' : error.type === 'entity.parse.failed' ? '请求 JSON 格式错误' : error.message });
});


export default app;
