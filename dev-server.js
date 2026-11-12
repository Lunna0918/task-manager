import 'dotenv/config';
import express from 'express';
import handler from './api/tasks.js';

// 本地开发用的最小服务：直接把线上那个 /api/tasks 处理函数挂到 Express 上，
// 保证本地和 Vercel 跑的是同一份逻辑。
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'task-manager-api' });
});

app.all('/api/tasks', handler);

app.listen(PORT, () => {
  console.log(`本地 API 已启动：http://localhost:${PORT}`);
});
