import { createClient } from '@supabase/supabase-js';

const TASKS_TABLE = 'tasks';
const TASK_COLUMNS = 'id, title, priority, completed, created_at';
const PRIORITIES = ['高', '中', '低'];
const MAX_TITLE_LENGTH = 200;

let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  // 两个变量名都支持：SUPABASE_ANON_KEY 优先，其次 SUPABASE_KEY
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error('缺少环境变量 SUPABASE_URL 或 SUPABASE_ANON_KEY');
  }

  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

function validateTitle(title) {
  if (typeof title !== 'string') return '任务标题不能为空';
  const trimmed = title.trim();
  if (!trimmed) return '任务标题不能为空';
  if (trimmed.length > MAX_TITLE_LENGTH) return `任务标题不能超过 ${MAX_TITLE_LENGTH} 个字符`;
  return null;
}

/**
 * 任务接口，一个函数覆盖四种操作：
 *   GET    /api/tasks?priority=高      列表（按创建时间倒序，可按优先级筛选）
 *   POST   /api/tasks                  新增 { title, priority }
 *   PATCH  /api/tasks?id=xxx           更新 { completed / title / priority }
 *   DELETE /api/tasks?id=xxx           删除
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const supabase = getClient();

    if (req.method === 'GET') {
      const { priority } = req.query || {};

      let query = supabase
        .from(TASKS_TABLE)
        .select(TASK_COLUMNS)
        .order('created_at', { ascending: false });

      if (priority) {
        if (!PRIORITIES.includes(priority)) {
          return res.status(400).json({ error: '优先级只能是 高 / 中 / 低' });
        }
        query = query.eq('priority', priority);
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { title, priority = '中' } = req.body || {};

      const titleError = validateTitle(title);
      if (titleError) return res.status(400).json({ error: titleError });
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: '优先级只能是 高 / 中 / 低' });
      }

      const { data, error } = await supabase
        .from(TASKS_TABLE)
        .insert({ title: title.trim(), priority, completed: false })
        .select(TASK_COLUMNS)
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    }

    if (req.method === 'PATCH') {
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: '缺少任务 id' });

      const { title, priority, completed } = req.body || {};

      const payload = {};
      if (typeof completed === 'boolean') payload.completed = completed;

      if (title !== undefined) {
        const titleError = validateTitle(title);
        if (titleError) return res.status(400).json({ error: titleError });
        payload.title = title.trim();
      }

      if (priority !== undefined) {
        if (!PRIORITIES.includes(priority)) {
          return res.status(400).json({ error: '优先级只能是 高 / 中 / 低' });
        }
        payload.priority = priority;
      }

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: '没有需要更新的字段' });
      }

      const { data, error } = await supabase
        .from(TASKS_TABLE)
        .update(payload)
        .eq('id', id)
        .select(TASK_COLUMNS)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: '任务不存在' });

      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: '缺少任务 id' });

      const { data, error } = await supabase
        .from(TASKS_TABLE)
        .delete()
        .eq('id', id)
        .select(TASK_COLUMNS)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: '任务不存在' });

      return res.status(200).json({ success: true, removed: data });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: `不支持的请求方法：${req.method}` });
  } catch (err) {
    console.error('[API 错误]', err?.message || err);
    return res.status(500).json({ error: err?.message || '服务器内部错误' });
  }
}
