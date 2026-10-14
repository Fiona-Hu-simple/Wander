import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.DEEPSEEK_API_KEY = 'test-only-key';
const { default: app } = await import('../app.js');
const { default: db } = await import('../database/index.js');

test('authentication and API boundary regression', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(() => { server.closeAllConnections(); server.close(); db.close(); });
  const post = (path, body, token) => fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const me = token => fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  let token;
  let userId;
  let conversationId;

  await t.test('rejects missing bodies, wrong types and bcrypt truncation', async () => {
    for (const body of [undefined, { username: {}, password: '123456' }, { username: 'user', password: ['123456'] }, { username: 'user', password: '密'.repeat(25) }]) {
      assert.equal((await post('/auth/register', body)).status, 400);
    }
  });
  await t.test('normalizes username and stores a password hash', async () => {
    assert.equal((await post('/auth/register', { username: ' traveler ', password: 'secret123' })).status, 201);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('traveler');
    assert.notEqual(user.password, 'secret123');
    assert.equal(await bcrypt.compare('secret123', user.password), true);
    userId = user.id;
  });
  await t.test('concurrent registration returns 201 and 409', async () => {
    const results = await Promise.all([post('/auth/register', { username: 'parallel', password: 'secret123' }), post('/auth/register', { username: 'parallel', password: 'secret123' })]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  });
  await t.test('bad passwords and SQL-like usernames cannot authenticate', async () => {
    assert.equal((await post('/auth/login', { username: 'traveler', password: 'wrong123' })).status, 401);
    assert.equal((await post('/auth/login', { username: "' OR 1=1 --", password: 'secret123' })).status, 401);
    const response = await post('/auth/login', { username: ' traveler ', password: 'secret123' });
    assert.equal(response.status, 200);
    token = (await response.json()).data.token;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    assert.equal(payload.exp - payload.iat, 7 * 24 * 3600);
  });
  await t.test('me verifies signature, expiration, algorithm and user existence', async () => {
    const response = await me(token);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, { userId, username: 'traveler' });
    for (const invalid of ['fake', jwt.sign({ userId }, 'different-secret'), jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: -1 }), jwt.sign({ userId }, process.env.JWT_SECRET, { algorithm: 'HS384' }), jwt.sign({ userId: 99999 }, process.env.JWT_SECRET)]) {
      assert.equal((await me(invalid)).status, 401);
    }
  });
  await t.test('chat rejects unauthenticated and malformed requests before calling upstream', async () => {
    const created = await post('/chat/conversations', { title: 'Test' }, token);
    assert.equal(created.status, 201);
    conversationId = (await created.json()).data.id;
    const route = '/chat/conversations/' + conversationId + '/messages';
    assert.equal((await post(route, {})).status, 401);
    for (const body of [{}, { content: 3, requestId: 'invalid-test' }, { content: 'x'.repeat(16001), requestId: 'invalid-test' }]) {
      assert.equal((await post(route, body, token)).status, 400);
    }
  });
  await t.test('upstream auth errors return 502 without invalidating local authentication', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url, options) => String(url).startsWith('https://api.deepseek.com/')
      ? Promise.resolve(new Response('private upstream error', { status: 401 }))
      : originalFetch(url, options);
    try {
      const response = await post('/chat/conversations/' + conversationId + '/messages', { content: 'hello', requestId: 'upstream-failure' }, token);
      assert.equal(response.status, 502);
      assert.equal((await response.text()).includes('private upstream error'), false);
      assert.equal((await me(token)).status, 200);
    } finally { globalThis.fetch = originalFetch; }
  });
  await t.test('chat forwards SSE content and completion', async () => {
    const originalFetch = globalThis.fetch;
    const stream = 'data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: [DONE]\n\n';
    globalThis.fetch = (url, options) => String(url).startsWith('https://api.deepseek.com/')
      ? Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
      : originalFetch(url, options);
    try {
      const response = await post('/chat/conversations/' + conversationId + '/messages', { content: 'hello', requestId: 'stream-success' }, token);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/event-stream/);
      const body = await response.text();
      assert.match(body, /你好/);
      assert.match(body, /event: done/);
    } finally { globalThis.fetch = originalFetch; }
  });
  await t.test('oversized JSON returns 413', async () => {
    assert.equal((await post('/chat/conversations/' + conversationId + '/messages', { content: 'x'.repeat(140000), requestId: 'oversized-test' }, token)).status, 413);
  });
  await t.test('deleted users cannot reuse a signed token', async () => {
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    assert.equal((await me(token)).status, 401);
  });
  await t.test('invalid JSON returns a JSON error', async () => {
    const response = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 400);
  });
  await t.test('login attempts are rate limited', async () => {
    let response;
    for (let i = 0; i < 21; i++) response = await post('/auth/login', { username: 'nobody', password: 'secret123' });
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('retry-after')) > 0);
  });
});
