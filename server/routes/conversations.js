import { Router } from 'express';
import db from '../database/index.js';
import { requireAuth } from '../middleware/auth.js';
import { own, conversation, message, setCurrent, createConversation, now, fail } from '../database/chat.js';

const router = Router();
router.use(requireAuth);
const validTitle = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 100;
const integer = (value, fallback, max) => value === undefined ? fallback : /^\d+$/.test(String(value)) && Number(value) <= max ? Number(value) : NaN;

router.get('/state', (req, res) => {
  const state = db.prepare('SELECT current_conversation_id FROM user_chat_state WHERE user_id = ?').get(req.user.id);
  res.json({ data: { currentId: state?.current_conversation_id || null } });
});
router.patch('/state', (req, res) => {
  const id = req.body?.currentId;
  if (id !== null && typeof id !== 'string') throw fail(400, '无效的会话 ID');
  setCurrent(req.user.id, id);
  res.json({ data: { currentId: id } });
});
router.get('/conversations', (req, res) => {
  const offset = integer(req.query.offset, 0, 1000000);
  const limit = integer(req.query.limit, 30, 100);
  if (!Number.isFinite(offset) || !limit) throw fail(400, '无效的分页参数');
  let cursor;
  if (req.query.before !== undefined) {
    try { cursor = JSON.parse(Buffer.from(String(req.query.before), 'base64url').toString('utf8')); } catch { throw fail(400, '无效的分页游标'); }
    if (!Array.isArray(cursor) || cursor.length !== 2 || cursor.some(value => typeof value !== 'string')) throw fail(400, '无效的分页游标');
  }
  const rows = cursor
    ? db.prepare('SELECT * FROM conversations WHERE user_id = ? AND (updated_at, id) < (?, ?) ORDER BY updated_at DESC, id DESC LIMIT ?').all(req.user.id, cursor[0], cursor[1], limit + 1)
    : db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?').all(req.user.id, limit + 1, offset);
  const selected = rows.slice(0, limit);
  const last = selected.at(-1);
  res.json({ data: { conversations: selected.map(conversation), hasMore: rows.length > limit, nextCursor: last ? Buffer.from(JSON.stringify([last.updated_at, last.id])).toString('base64url') : null } });
});
router.post('/conversations', (req, res) => {
  const title = req.body?.title ?? '新对话';
  if (!validTitle(title)) throw fail(400, '会话名称须为 1–100 个字符');
  const row = db.transaction(() => { const created = createConversation(req.user.id, title.trim()); setCurrent(req.user.id, created.id); return created; })();
  res.status(201).json({ data: conversation(row) });
});
router.get('/conversations/:id', (req, res) => {
  const row = own(req.user.id, req.params.id);
  const before = integer(req.query.before, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  const limit = integer(req.query.limit, 50, 100);
  if (!Number.isFinite(before) || !limit) throw fail(400, '无效的分页参数');
  const rows = db.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? AND id < ? ORDER BY id DESC LIMIT ?').all(row.id, before, limit + 1);
  const selected = rows.slice(0, limit).reverse();
  res.json({ data: { ...conversation(row), messages: selected.map(message), hasMore: rows.length > limit, nextBefore: selected[0]?.id || null } });
});
router.patch('/conversations/:id', (req, res) => {
  const row = own(req.user.id, req.params.id);
  const { title, draft, version } = req.body || {};
  if (!Number.isSafeInteger(version) || (title === undefined && draft === undefined) || (title !== undefined && !validTitle(title)) || (draft !== undefined && (typeof draft !== 'string' || draft.length > 16000))) throw fail(400, '无效的会话更新');
  const result = db.prepare('UPDATE conversations SET title = ?, draft = ?, version = version + 1, updated_at = ? WHERE id = ? AND user_id = ? AND version = ?').run(title === undefined ? row.title : title.trim(), draft ?? row.draft, title === undefined ? row.updated_at : now(), row.id, req.user.id, version);
  if (!result.changes) throw fail(409, '会话已在其他页面更新，请刷新后重试');
  res.json({ data: conversation(own(req.user.id, row.id)) });
});
router.delete('/conversations/:id', (req, res) => {
  own(req.user.id, req.params.id);
  if (db.prepare("SELECT id FROM chat_messages WHERE conversation_id = ? AND status = 'generating'").get(req.params.id)) throw fail(409, '请等待回复结束后删除');
  db.transaction(() => {
    db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    const state = db.prepare('SELECT current_conversation_id FROM user_chat_state WHERE user_id = ?').get(req.user.id);
    if (!state?.current_conversation_id) setCurrent(req.user.id, db.prepare('SELECT id FROM conversations WHERE user_id = ? ORDER BY updated_at DESC, id LIMIT 1').get(req.user.id)?.id || null);
  })();
  res.json({ data: { deleted: true } });
});

// Import receipts survive conversation deletion so an old browser cannot resurrect it.
router.post('/import', (req, res) => {
  const { conversations, currentId } = req.body || {};
  if (!Array.isArray(conversations) || !conversations.length || conversations.length > 50 || (currentId !== undefined && typeof currentId !== 'string')) throw fail(400, '无效的历史记录');
  let count = 0;
  for (const c of conversations) {
    if (!c || typeof c.id !== 'string' || !c.id || c.id.length > 200 || !validTitle(c.title) || !Array.isArray(c.messages)) throw fail(400, '无效的历史会话');
    count += c.messages.length;
    for (const m of c.messages) if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 100000 || (m.time !== undefined && typeof m.time !== 'string')) throw fail(400, '无效的历史消息');
  }
  if (count > 5000) throw fail(400, '单次导入的消息过多');
  const imported = db.transaction(() => {
    const result = [];
    for (const c of conversations) {
      let receipt = db.prepare('SELECT conversation_id FROM chat_imports WHERE user_id = ? AND legacy_id = ?').get(req.user.id, c.id);
      if (!receipt) {
        const row = createConversation(req.user.id, c.title.trim());
        const insert = db.prepare("INSERT INTO chat_messages(conversation_id, role, content, status, created_at, legacy_time) VALUES (?, ?, ?, 'completed', ?, ?)");
        for (const m of c.messages) insert.run(row.id, m.role, m.content, now(), m.time?.slice(0, 100) || null);
        db.prepare('INSERT INTO chat_imports(user_id, legacy_id, conversation_id) VALUES (?, ?, ?)').run(req.user.id, c.id, row.id);
        receipt = { conversation_id: row.id };
        // Only the first migration establishes the active conversation, never later reimports.
        const state = db.prepare('SELECT current_conversation_id FROM user_chat_state WHERE user_id = ?').get(req.user.id);
        if (c.id === currentId && !state?.current_conversation_id) setCurrent(req.user.id, row.id);
      }
      result.push({ legacyId: c.id, id: receipt.conversation_id });
    }
    return result;
  })();
  res.json({ data: { imported } });
});
export default router;
