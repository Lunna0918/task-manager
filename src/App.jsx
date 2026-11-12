import { useEffect, useState } from 'react';
import './styles.css';

const PRIORITY_OPTIONS = ['高', '中', '低'];
const FILTER_OPTIONS = ['全部', '高', '中', '低'];
const PRIORITY_CLASS = { 高: 'high', 中: 'medium', 低: 'low' };

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* 忽略解析失败 */
    }
    throw new Error(message);
  }
  return res.json();
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('中');
  const [filter, setFilter] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadTasks(currentFilter = '全部', options = {}) {
    const { showLoading = true } = options;
    if (showLoading) setLoading(true);
    try {
      const query = currentFilter === '全部' ? '' : `?priority=${encodeURIComponent(currentFilter)}`;
      const data = await request(`/api/tasks${query}`);
      setTasks(Array.isArray(data) ? data : []);
      setNotice('');
    } catch (err) {
      setNotice(err.message || '数据加载失败');
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks('全部');
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setNotice('请先输入任务标题');
      return;
    }

    setSaving(true);
    try {
      await request('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, priority }),
      });
      setTitle('');
      await loadTasks(filter, { showLoading: false });
    } catch (err) {
      setNotice(err.message || '添加任务失败');
    } finally {
      setSaving(false);
    }
  }

  function changeFilter(next) {
    setFilter(next);
    loadTasks(next, { showLoading: false });
  }

  async function toggleTask(task) {
    try {
      const updated = await request(`/api/tasks?id=${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      setNotice(err.message || '更新任务失败');
    }
  }

  async function removeTask(task) {
    try {
      await request(`/api/tasks?id=${encodeURIComponent(task.id)}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
    } catch (err) {
      setNotice(err.message || '删除任务失败');
    }
  }

  const doneCount = tasks.filter((task) => task.completed).length;

  return (
    <div className="page">
      <main className="panel">
        <header className="panel__header">
          <h1>任务管理</h1>
          <p>输入任务、标记完成、按优先级筛选，数据实时保存在 Supabase。</p>
        </header>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            className="composer__input"
            type="text"
            value={title}
            maxLength={200}
            placeholder="要做点什么？输入任务后按回车添加"
            onChange={(event) => setTitle(event.target.value)}
          />
          <select
            className={`composer__select composer__select--${PRIORITY_CLASS[priority]}`}
            value={priority}
            aria-label="选择优先级"
            onChange={(event) => setPriority(event.target.value)}
          >
            {PRIORITY_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}优先级
              </option>
            ))}
          </select>
          <button className="composer__submit" type="submit" disabled={saving}>
            {saving ? '添加中…' : '添加任务'}
          </button>
        </form>

        {notice && <div className="notice">{notice}</div>}

        <div className="toolbar">
          <div className="filters" role="tablist" aria-label="按优先级筛选">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={filter === option}
                className={`filters__item ${filter === option ? 'filters__item--active' : ''}`}
                onClick={() => changeFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <span className="counter">
            共 {tasks.length} 条 · 已完成 {doneCount} 条
          </span>
        </div>

        {loading ? (
          <ul className="list" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <li className="task task--skeleton" key={key}>
                <span className="task__band" />
                <div className="task__body">
                  <span className="skeleton-line" />
                  <span className="skeleton-line skeleton-line--short" />
                </div>
              </li>
            ))}
          </ul>
        ) : tasks.length === 0 ? (
          <div className="empty">
            <p className="empty__title">
              {filter === '全部' ? '还没有任务' : `没有「${filter}」优先级的任务`}
            </p>
            <p className="empty__hint">在上方输入框写点什么，第一条任务就出现了。</p>
          </div>
        ) : (
          <ul className="list">
            {tasks.map((task) => {
              const levelClass = PRIORITY_CLASS[task.priority] || 'medium';
              return (
                <li className={`task ${task.completed ? 'task--done' : ''}`} key={task.id}>
                  <span className={`task__band task__band--${levelClass}`} />
                  <div className="task__body">
                    <span className="task__title">{task.title}</span>
                    <div className="task__meta">
                      <span className={`pill pill--${levelClass}`}>{task.priority}优先级</span>
                      <span className={`status ${task.completed ? 'status--done' : ''}`}>
                        {task.completed ? '已完成' : '进行中'}
                      </span>
                      <span className="task__time">
                        {timeFormatter.format(new Date(task.created_at))}
                      </span>
                    </div>
                  </div>
                  <div className="task__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => toggleTask(task)}
                    >
                      {task.completed ? '标记未完成' : '标记完成'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => removeTask(task)}
                    >
                      删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
