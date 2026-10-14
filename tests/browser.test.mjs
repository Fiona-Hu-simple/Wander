import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'ui-test-only-secret';
const { default: app } = await import('../server/app.js');
const { default: db } = await import('../server/database/index.js');
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { try { const value = await check(); if (value) return value; } catch {} await pause(100); }
  throw new Error('Timed out waiting for browser state');
}

test('Home navigation and gallery creation in a mobile browser', { skip: !chrome, timeout: 60000 }, async t => {
  const api = app.listen(0, '127.0.0.1');
  t.after(() => { api.closeAllConnections(); api.close(); db.close(); });
  await new Promise(resolve => api.once('listening', resolve));
  const vite = await createServer({ server: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api': `http://127.0.0.1:${api.address().port}` } } });
  t.after(() => vite.close());
  await vite.listen();
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'ui-user', password: 'secret123' }) });
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'wander-ui-'));
  const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  t.after(async () => {
    browser.kill();
    if (!path.resolve(profile).startsWith(path.resolve(os.tmpdir()) + path.sep + 'wander-ui-')) throw new Error('Invalid temporary profile path');
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  });
  const port = await until(async () => (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  t.after(() => socket.close());
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p?.reject(message.error); else p?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const click = async selector => {
    const point = await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); element.scrollIntoView({ block: 'center' }); const rect = element.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: base + '/login' });
  await until(() => evaluate("!!document.querySelector('input[autocomplete=username]')"));
  await evaluate("document.querySelector('input[autocomplete=username]').value='ui-user'; document.querySelector('input[autocomplete=username]').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('input[type=password]').value='secret123'; document.querySelector('input[type=password]').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('form').requestSubmit();");
  await until(() => evaluate("location.pathname === '/home' && !!document.querySelector('.chat-page')"));
  await click('.tabbar-item[href="/picture"]');
  await until(() => evaluate("location.pathname === '/picture' && !!document.querySelector('.picture-title')"));
  // 已验证用户切换页面时，短暂的认证接口故障不应阻断 Home。
  await evaluate("window.savedFetch = window.fetch; window.fetch = (...args) => String(args[0]).includes('/auth/me') ? Promise.reject(new TypeError('Simulated temporary network failure')) : window.savedFetch(...args)");
  await click('.tabbar-item[href="/home"]');
  try { await until(() => evaluate("location.pathname === '/home' && !!document.querySelector('.chat-page')")); }
  catch (error) { throw new Error(error.message + ': ' + JSON.stringify(await evaluate("({path:location.pathname,text:document.body.innerText.slice(0,500)})")) + ' browser errors: ' + errors.join('\n')); }
  await evaluate('window.fetch = window.savedFetch');
  await click('.tabbar-item[href="/picture"]');
  await until(() => evaluate("location.pathname === '/picture' && !!document.querySelector('.add-btn')"));
  assert.equal(await evaluate("document.querySelectorAll('.travel-card').length"), 5);
  await click('.add-btn');
  await until(() => evaluate("document.querySelector('.album-dialog').open"));
  await click('.album-actions button[type=button]');
  assert.equal(await evaluate("document.querySelector('.album-dialog').open"), false);
  assert.equal(await evaluate("document.querySelectorAll('.travel-card').length"), 5);
  await click('.add-btn');
  await evaluate("document.querySelector('#album-name').value='   '; document.querySelector('#album-name').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#album-description').value='   '; document.querySelector('#album-description').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.album-form').requestSubmit()");
  await until(() => evaluate("!!document.querySelector('.album-error')"));
  await evaluate("document.querySelector('#album-name').value='周末旅行'; document.querySelector('#album-name').dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#album-description').value='记录海边的美好时光'; document.querySelector('#album-description').dispatchEvent(new Event('input',{bubbles:true}))");
  await click('.create-album-btn');
  await until(() => evaluate("document.querySelectorAll('.travel-card').length === 6 && !document.querySelector('.album-dialog').open"));
  await click('.travel-card:last-child');
  await until(() => evaluate("!!document.querySelector('.sanya-title') && document.querySelector('.sanya-title').textContent === '周末旅行'"));
  assert.equal(await evaluate("document.querySelector('.sanya-subtitle').textContent"), '记录海边的美好时光');
  assert.equal(await evaluate("document.querySelectorAll('.card').length"), 20);
  // 构造本地照片选择事件，不访问真实手机文件。
  await evaluate("document.querySelector('.card').click(); const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6tAAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0)); const transfer=new DataTransfer(); transfer.items.add(new File([bytes],'photo.png',{type:'image/png'})); const input=document.querySelector('input[type=file]'); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true}));");
  await until(() => evaluate("document.querySelectorAll('.card img').length === 1"));
  await click('.back-btn');
  await until(() => evaluate("location.pathname === '/picture'"));
  await click('.travel-card:first-child');
  await until(() => evaluate("document.querySelector('.sanya-title')?.textContent === 'Sanya'"));
  assert.equal(await evaluate("document.querySelectorAll('.card img').length"), 0);
  await click('.back-btn');
  await until(() => evaluate("location.pathname === '/picture'"));
  await send('Page.reload');
  await until(() => evaluate("document.querySelectorAll('.travel-card').length === 6"));
  assert.match(await evaluate("document.querySelector('.travel-card:last-child').textContent"), /周末旅行/);
  await click('.tabbar-item[href="/home"]');
  await until(() => evaluate("location.pathname === '/home' && !!document.querySelector('.chat-page')"));
  assert.deepEqual(errors, []);
});
