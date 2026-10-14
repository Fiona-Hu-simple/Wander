import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'chat-tests-only-secret';
process.env.DEEPSEEK_API_KEY = 'mock-key';
const { default: app } = await import('../app.js');
const { default: db } = await import('../database/index.js');
const { recoverInterrupted } = await import('../database/chat.js');

test('account chat persistence acceptance', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/chat`;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let mock = () => new Response('data: {"choices":[{"delta":{"content":"你好🌏"}}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  let context;
  globalThis.fetch = (url, options) => {
    if (String(url).startsWith('https://api.deepseek.com/')) { calls++; context = JSON.parse(options.body).messages; return Promise.resolve(mock(options)); }
    return originalFetch(url, options);
  };
  t.after(() => { globalThis.fetch = originalFetch; server.closeAllConnections(); server.close(); db.close(); });
  const aliceId = Number(db.prepare("INSERT INTO users(username, password) VALUES ('alice', 'hash')").run().lastInsertRowid);
  const bobId = Number(db.prepare("INSERT INTO users(username, password) VALUES ('bob', 'hash')").run().lastInsertRowid);
  const token = id => jwt.sign({ userId: id }, process.env.JWT_SECRET);
  const alice = token(aliceId), bob = token(bobId);
  const api = (route, method = 'GET', body, auth = alice) => originalFetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = async (route, method, body, auth) => { const response = await api(route, method, body, auth); assert.ok(response.ok, await response.clone().text()); return (await response.json()).data; };
  let id;

  await t.test('new conversation, draft and selected conversation survive a fresh authenticated client', async () => {
    const created = await data('/conversations', 'POST', { title: '旅行计划', userId: bobId });
    id = created.id;
    const changed = await data(`/conversations/${id}`, 'PATCH', { draft: '未发送的北京行程', version: 0 });
    assert.equal(changed.version, 1);
    const freshToken = token(aliceId);
    assert.equal((await data('/state', 'GET', undefined, freshToken)).currentId, id);
    assert.equal((await data(`/conversations/${id}`, 'GET', undefined, freshToken)).draft, '未发送的北京行程');
    assert.equal((await data('/conversations', 'GET', undefined, bob)).conversations.length, 0);
    assert.equal((await api(`/conversations/${id}`, 'PATCH', { draft: 'stale', version: 0 })).status, 409);
  });
  await t.test('all read/write paths isolate accounts and reject unsigned access', async () => {
    assert.equal((await api('/conversations', 'GET', undefined, '')).status, 401);
    for (const [route, method, body] of [
      [`/conversations/${id}`, 'GET'], [`/conversations/${id}`, 'PATCH', { title: 'stolen', version: 1 }],
      [`/conversations/${id}`, 'DELETE'], ['/state', 'PATCH', { currentId: id }],
      [`/conversations/${id}/messages`, 'POST', { content: 'attack', requestId: 'isolation-test' }],
    ]) assert.equal((await api(route, method, body, bob)).status, 404);
    assert.equal(calls, 0);
  });
  await t.test('streaming messages persist, clear the draft, and duplicate sends do not call AI again', async () => {
    const input = { content: '去北京旅行', requestId: 'first-request' };
    const response = await api(`/conversations/${id}/messages`, 'POST', input);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /event: done/);
    const detail = await data(`/conversations/${id}`);
    assert.equal(detail.draft, '');
    assert.deepEqual(detail.messages.map(m => [m.role, m.content, m.status]), [['user', '去北京旅行', 'completed'], ['assistant', '你好🌏', 'completed']]);
    const repeated = await data(`/conversations/${id}/messages`, 'POST', input);
    assert.equal(repeated.duplicate, true);
    assert.equal(calls, 1);
    assert.equal((await api(`/conversations/${id}/messages`, 'POST', { ...input, content: 'changed' })).status, 409);
  });
  let retryUser;
  await t.test('truncated stream saves partial content, status and retry without duplicating the user message', async () => {
    mock = () => new Response('data: {"choices":[{"delta":{"content":"部分回答"}}]}\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
    const response = await api(`/conversations/${id}/messages`, 'POST', { content: '继续规划', requestId: 'partial-request' });
    assert.match(await response.text(), /event: error/);
    const detail = await data(`/conversations/${id}`);
    assert.equal(detail.messages.at(-1).status, 'interrupted');
    assert.equal(detail.messages.at(-1).content, '部分回答');
    retryUser = detail.messages.at(-1).replyTo;
    mock = () => new Response('data: {"choices":[{"delta":{"content":"完整回答"}}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
    await (await api(`/conversations/${id}/messages`, 'POST', { retryOf: retryUser, requestId: 'retry-request' })).text();
    const retried = await data(`/conversations/${id}`);
    assert.equal(retried.messages.filter(m => m.role === 'user').length, 2);
    assert.equal(retried.messages.at(-1).status, 'completed');
    assert.ok(!context.some(m => m.content === '部分回答'));
    const before = calls;
    await data(`/conversations/${id}/messages`, 'POST', { retryOf: retryUser, requestId: 'retry-request' });
    assert.equal(calls, before);
  });
  await t.test('upstream failure is saved as status, not model context', async () => {
    mock = () => new Response('private error', { status: 401 });
    const response = await api(`/conversations/${id}/messages`, 'POST', { content: '失败请求', requestId: 'failed-request' });
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('private error'));
    const detail = await data(`/conversations/${id}`);
    assert.equal(detail.messages.at(-1).status, 'failed');
    assert.equal(detail.messages.at(-1).content, '');
  });
  await t.test('disconnect saves partial reply and blocks concurrent turns and deletion during generation', async () => {
    mock = options => {
      const stream = new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"断开前内容"}}]}\n\n'));
        options.signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
      } });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
    };
    const controller = new AbortController();
    const response = await originalFetch(base + `/conversations/${id}/messages`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alice}` }, body: JSON.stringify({ content: '测试断开', requestId: 'abort-request' }) });
    const reader = response.body.getReader();
    let output = '';
    while (!output.includes('断开前内容')) { const chunk = await reader.read(); output += new TextDecoder().decode(chunk.value); }
    const before = calls;
    const repeated = await data(`/conversations/${id}/messages`, 'POST', { content: '测试断开', requestId: 'abort-request' });
    assert.equal(repeated.assistant.status, 'generating');
    assert.equal(calls, before);
    assert.equal((await api(`/conversations/${id}/messages`, 'POST', { content: '冲突', requestId: 'conflict-request' })).status, 409);
    assert.equal((await api(`/conversations/${id}`, 'DELETE')).status, 409);
    controller.abort(); await reader.cancel().catch(() => {});
    for (let i = 0; i < 50; i++) {
      if ((await data(`/conversations/${id}`)).messages.at(-1).status === 'interrupted') break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    const last = (await data(`/conversations/${id}`)).messages.at(-1);
    assert.equal(last.status, 'interrupted'); assert.equal(last.content, '断开前内容');
  });
  await t.test('rename, pagination, deletion and active-state repair persist', async () => {
    const detail = await data(`/conversations/${id}`);
    await data(`/conversations/${id}`, 'PATCH', { title: '北京计划已修改', version: detail.version });
    assert.equal((await data(`/conversations/${id}`)).title, '北京计划已修改');
    const first = await data(`/conversations/${id}?limit=2`);
    assert.equal(first.messages.length, 2); assert.equal(first.hasMore, true);
    const older = await data(`/conversations/${id}?limit=2&before=${first.nextBefore}`);
    assert.ok(older.messages.every(m => m.id < first.nextBefore));
    const another = await data('/conversations', 'POST', { title: '第二会话' });
    await data(`/conversations/${another.id}`, 'DELETE');
    assert.equal((await data('/state')).currentId, id);
    assert.equal((await api(`/conversations/${another.id}`)).status, 404);
  });
  await t.test('legacy import is atomic, isolated, idempotent and cannot resurrect deleted records', async () => {
    const legacy = { conversations: [{ id: 'legacy-1', title: '旧会话', messages: [{ role: 'user', content: '旧问题', time: '12:30' }, { role: 'assistant', content: '旧回答', time: '12:31' }] }], currentId: 'legacy-1' };
    const first = await data('/import', 'POST', legacy, bob);
    const importedId = first.imported[0].id;
    assert.equal((await data('/state', 'GET', undefined, bob)).currentId, importedId);
    const again = await data('/import', 'POST', legacy, bob);
    assert.equal(again.imported[0].id, importedId);
    assert.equal((await data(`/conversations/${importedId}`, 'GET', undefined, bob)).messages.length, 2);
    const aliceImport = await data('/import', 'POST', legacy);
    assert.notEqual(aliceImport.imported[0].id, importedId);
    assert.equal((await api(`/conversations/${importedId}`)).status, 404);
    await data(`/conversations/${importedId}`, 'DELETE', undefined, bob);
    assert.equal((await data('/import', 'POST', legacy, bob)).imported[0].id, null);
    assert.equal((await data('/conversations', 'GET', undefined, bob)).conversations.length, 0);
    const bad = { conversations: [legacy.conversations[0], { id: 'bad', title: '', messages: [] }] };
    assert.equal((await api('/import', 'POST', bad, bob)).status, 400);
    const page = await data('/conversations?limit=1');
    const next = await data('/conversations?limit=1&before=' + page.nextCursor);
    assert.equal(page.hasMore, true);
    assert.equal(next.conversations.length, 1);
    assert.notEqual(next.conversations[0].id, page.conversations[0].id);
  });
  await t.test('startup recovery changes unfinished messages to interrupted', async () => {
    db.prepare("INSERT INTO chat_messages(conversation_id, role, content, status, created_at) VALUES (?, 'assistant', '重启前内容', 'generating', ?)").run(id, new Date().toISOString());
    recoverInterrupted();
    const last = (await data(`/conversations/${id}`)).messages.at(-1);
    assert.equal(last.content, '重启前内容'); assert.equal(last.status, 'interrupted');
  });
});

test('database survives an actual process restart without touching user data', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wander-chat-test-'));
  t.after(async () => {
    if (!path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'wander-chat-test-')) throw new Error('Invalid test directory');
    await rm(directory, { recursive: true, force: true });
  });
  const env = { ...process.env, DB_PATH: path.join(directory, 'test.db') };
  const write = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import db from './server/database/index.js';
    import { createConversation, setCurrent } from './server/database/chat.js';
    const user = Number(db.prepare("INSERT INTO users(username,password) VALUES ('restart','hash')").run().lastInsertRowid);
    const c = createConversation(user, '保存后重启'); setCurrent(user, c.id);
    db.prepare("UPDATE conversations SET draft = '草稿' WHERE id = ?").run(c.id);
    db.prepare("INSERT INTO chat_messages(conversation_id,role,content,status,created_at) VALUES (?, 'assistant', '部分内容', 'generating', ?)").run(c.id, new Date().toISOString());
    db.close();
  `], { cwd: path.resolve(import.meta.dirname, '../..'), env, encoding: 'utf8' });
  assert.equal(write.status, 0, write.stderr);
  const read = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import db from './server/database/index.js';
    import './server/database/chat.js';
    const c = db.prepare('SELECT * FROM conversations').get();
    assert.equal(c.title, '保存后重启'); assert.equal(c.draft, '草稿');
    assert.equal(db.prepare('SELECT current_conversation_id FROM user_chat_state').get().current_conversation_id, c.id);
    const m = db.prepare('SELECT * FROM chat_messages').get();
    assert.equal(m.content, '部分内容'); assert.equal(m.status, 'interrupted'); db.close();
  `], { cwd: path.resolve(import.meta.dirname, '../..'), env, encoding: 'utf8' });
  assert.equal(read.status, 0, read.stderr);
});
