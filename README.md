# 任务管理系统

一个可以直接部署到 **Vercel** 的任务管理系统：React（Vite）前端 + Vercel Serverless API + Supabase 数据库。

## 功能

- 输入任务标题 + 选择优先级（高 / 中 / 低）添加任务，支持回车快捷提交
- 任务列表显示标题、优先级、完成状态和创建时间
- 每条任务支持「完成 / 未完成」切换和删除
- 按优先级筛选（全部 / 高 / 中 / 低）
- 任务按创建时间倒序排列，已完成任务标题加删除线并置灰
- 中文界面，数据持久化在 Supabase

## 目录结构

```
task-manager/
├── api/tasks.js        # Vercel 无服务器函数，任务的增删改查
├── src/                # React 前端
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── dev-server.js       # 本地开发用的 Express 外壳，复用 api/tasks.js
├── supabase/schema.sql # 建表 + RLS 策略
├── index.html
├── vite.config.js
└── package.json
```

只有一个 API 处理函数，本地和线上跑的是同一份逻辑：本地由 `dev-server.js` 用 Express 挂载，线上由 Vercel 作为 Serverless Function 运行。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/tasks?priority=高` | 任务列表，`priority` 可选，按 `created_at` 倒序 |
| POST | `/api/tasks` | 新增任务，body：`{ "title": "写周报", "priority": "高" }` |
| PATCH | `/api/tasks?id=<uuid>` | 更新任务，body 可含 `completed` / `title` / `priority` |
| DELETE | `/api/tasks?id=<uuid>` | 删除任务 |

`priority` 只接受 `高`、`中`、`低`。

## 本地开发

需要 Node.js 18+。

```bash
npm install

# 1. 配环境变量
cp .env.example .env      # 填入 SUPABASE_URL / SUPABASE_ANON_KEY

# 2. 起 API（新终端）
npm run dev:api           # http://localhost:3000

# 3. 起前端（新终端）
npm run dev               # http://localhost:5173
```

前端通过 Vite 代理把 `/api` 转发到 `localhost:3000`。

## 部署到 Vercel

1. 打开 https://vercel.com/new ，选择 **Import Git Repository** → 找到本仓库 → `Import`
2. 按下表填写：

| 字段 | 填什么 |
| --- | --- |
| Project Name | `task-manager` |
| Root Directory | `./`（保持默认，不要填子目录） |
| Application Preset | **Vite** |
| Build Command | 留空（Vite 预设自动用 `npm run build`） |
| Output Directory | 留空（Vite 预设自动用 `dist`） |

3. 展开 **Environment Variables**，加两条（Production / Preview / Development 都勾上）：

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<你的项目 ID>.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_...`（Supabase 的 publishable key / anon key） |

4. 点 **Deploy**，1～3 分钟后拿到 `https://task-manager-xxx.vercel.app` 的地址

## 数据库准备

在 Supabase 控制台 **SQL Editor** 里执行 `supabase/schema.sql`，会创建 `public.tasks` 表、创建时间索引，以及放行匿名读写的 RLS 策略。

## 安全说明

- 仓库内不含任何真实密钥，`.env` 已被 `.gitignore` 忽略
- RLS 策略放行匿名读写，适合个人项目；要给多人正式使用，建议接入 Supabase Auth，按 `user_id` 限定行级权限
