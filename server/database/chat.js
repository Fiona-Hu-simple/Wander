import { randomUUID } from 'node:crypto';
import db from './index.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    draft TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS conversations_user ON conversations(user_id, updated_at DESC, id);
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('completed', 'generating', 'failed', 'interrupted')),
    request_id TEXT,
    reply_to INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
    error TEXT,
    created_at TEXT NOT NULL,
    legacy_time TEXT,
    UNIQUE(conversation_id, request_id, role)
  );
  CREATE INDEX IF NOT EXISTS messages_conversation ON chat_messages(conversation_id, id);
  CREATE UNIQUE INDEX IF NOT EXISTS one_generation ON chat_messages(conversation_id) WHERE status = 'generating';
  CREATE TABLE IF NOT EXISTS user_chat_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS chat_imports (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legacy_id TEXT NOT NULL,
    conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
    PRIMARY KEY(user_id, legacy_id)
  );
`);

// This project uses one API process. Any generation left by a previous process is interrupted.
db.prepare("UPDATE chat_messages SET status = 'interrupted', error = '服务重启，回复已中断' WHERE status = 'generating'").run();

export function fail(status, message) {
  return Object.assign(new Error(message), { status });
}
export const now = () => new Date().toISOString();
export function own(userId, id) {
  const row = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) throw fail(404, '会话不存在');
  return row;
}
export function conversation(row) {
  return { id: row.id, title: row.title, draft: row.draft, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
export function message(row) {
  return { id: row.id, role: row.role, content: row.content, status: row.status, requestId: row.request_id, replyTo: row.reply_to, error: row.error, createdAt: row.created_at, time: row.legacy_time || row.created_at };
}
export function setCurrent(userId, id) {
  if (id !== null) own(userId, id);
  db.prepare('INSERT INTO user_chat_state(user_id, current_conversation_id) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET current_conversation_id = excluded.current_conversation_id').run(userId, id);
}
export function createConversation(userId, title = '新对话') {
  const id = randomUUID();
  const time = now();
  db.prepare('INSERT INTO conversations(id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, userId, title, time, time);
  return own(userId, id);
}

export const beginTurn = db.transaction((userId, id, input) => {
  own(userId, id);
  const duplicate = db.prepare("SELECT * FROM chat_messages WHERE conversation_id = ? AND request_id = ? AND role = 'assistant'").get(id, input.requestId);
  if (duplicate) {
    const user = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(duplicate.reply_to);
    if ((input.retryOf && user.id !== input.retryOf) || (!input.retryOf && user.content !== input.content)) throw fail(409, '重复请求的内容不一致');
    return { duplicate: true, assistant: message(duplicate), user: message(user) };
  }
  if (db.prepare("SELECT id FROM chat_messages WHERE conversation_id = ? AND status = 'generating'").get(id)) throw fail(409, '该会话正在生成回复，请稍后重试');
  const time = now();
  let user;
  if (input.retryOf) {
    user = db.prepare("SELECT * FROM chat_messages WHERE id = ? AND conversation_id = ? AND role = 'user'").get(input.retryOf, id);
    const last = db.prepare('SELECT id FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1').get(id);
    const reply = db.prepare("SELECT * FROM chat_messages WHERE reply_to = ? ORDER BY id DESC LIMIT 1").get(input.retryOf);
    if (!user || !reply || reply.id !== last?.id || !['failed', 'interrupted'].includes(reply.status)) throw fail(409, '只能重试最后一条失败或中断的回复');
  } else {
    const result = db.prepare("INSERT INTO chat_messages(conversation_id, role, content, status, request_id, created_at) VALUES (?, 'user', ?, 'completed', ?, ?)").run(id, input.content, input.requestId, time);
    user = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
    db.prepare("UPDATE conversations SET draft = '', version = version + 1, title = CASE WHEN title = '新对话' THEN ? ELSE title END, updated_at = ? WHERE id = ?").run(input.content.slice(0, 20), time, id);
  }
  const result = db.prepare("INSERT INTO chat_messages(conversation_id, role, content, status, request_id, reply_to, created_at) VALUES (?, 'assistant', '', 'generating', ?, ?, ?)").run(id, input.requestId, user.id, time);
  setCurrent(userId, id);
  // Include only successful exchanges and the current user message; failed attempts are display-only.
  const context = db.prepare("SELECT role, content FROM chat_messages WHERE conversation_id = ? AND id <= ? AND status = 'completed' AND trim(content) != '' ORDER BY id DESC LIMIT 100").all(id, user.id).reverse();
  // Bound upstream context independently from permanent history.
  let size = 0;
  const selected = [];
  for (const item of context.reverse()) { if (size + item.content.length > 60000) break; selected.unshift(item); size += item.content.length; }
  return { duplicate: false, user: message(user), assistant: message(db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid)), context: selected };
});

export function saveReply(id, content, status, error = null) {
  const row = db.prepare('SELECT conversation_id FROM chat_messages WHERE id = ?').get(id);
  if (!row) return;
  db.transaction(() => {
    db.prepare('UPDATE chat_messages SET content = ?, status = ?, error = ? WHERE id = ?').run(content, status, error, id);
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now(), row.conversation_id);
  })();
}

export function recoverInterrupted() {
  db.prepare("UPDATE chat_messages SET status = 'interrupted', error = '服务重启，回复已中断' WHERE status = 'generating'").run();
}
