import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'dev-proxy-test-only-secret';
const { default: app } = await import('../server/app.js');
const { default: db } = await import('../server/database/index.js');

test('register and login work through the Vite development proxy', async t => {
  const api = app.listen(0, '127.0.0.1');
  t.after(() => { api.closeAllConnections(); api.close(); db.close(); });
  await new Promise(resolve => api.once('listening', resolve));
  const vite = await createServer({
    server: {
      host: '127.0.0.1', port: 0, open: false,
      proxy: { '/api': `http://127.0.0.1:${api.address().port}` },
    },
  });
  t.after(() => vite.close());
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  const post = path => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'proxy-user', password: 'secret123' }),
  });
  const registration = await post('/api/auth/register');
  assert.equal(registration.status, 201);
  assert.equal((await registration.json()).data.username, 'proxy-user');
  const login = await post('/api/auth/login');
  assert.equal(login.status, 200);
  const token = (await login.json()).data.token;
  const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200);
});
