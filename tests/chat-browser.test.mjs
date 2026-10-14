import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'chat-browser-test-only';
process.env.DEEPSEEK_API_KEY = 'mock-only';
const { default: app } = await import('../server/app.js');
const { default: db } = await import('../server/database/index.js');
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { const result = await check(); if (result) return result; await pause(50); }
  throw new Error('Timed out waiting for chat state');
}
async function browser(t, base) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'wander-chat-browser-'));
  const process = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  t.after(async () => {
    process.kill();
    if (!path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'wander-chat-browser-')) throw new Error('Invalid temporary browser directory');
    await fs.rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  });
  const port = await until(async () => {
    try { return (await fs.readFile(path.join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { return false; }
  });
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  t.after(() => socket.close());
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p?.reject(message.error); else p?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const click = async selector => {
    await until(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`));
    return evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const fill = (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  const navigate = async route => { await send('Page.navigate', { url: base + route }); };
  const ready = () => until(() => evaluate("location.pathname === '/home' && !!document.querySelector('.chat-input') && !document.querySelector('.chat-input').disabled"));
  const signIn = async username => {
    await navigate('/login');
    await until(() => evaluate("!!document.querySelector('input[autocomplete=username]')"));
    await fill('input[autocomplete=username]', username);
    await fill('input[type=password]', 'secret123');
    await evaluate('document.querySelector("form").requestSubmit()');
    await ready();
  };
  const reload = async () => {
    await evaluate('window.chatTestOldDocument = true');
    await send('Page.reload');
    await until(() => evaluate('window.chatTestOldDocument !== true'));
    await ready();
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  return { evaluate, click, fill, navigate, signIn, ready, reload, errors };
}

test('chat restoration across separate browsers and account switching', { skip: !chrome, timeout: 90000 }, async t => {
  const api = app.listen(0, '127.0.0.1');
  await new Promise(resolve => api.once('listening', resolve));
  t.after(() => { api.closeAllConnections(); api.close(); db.close(); });
  const vite = await createServer({ server: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api': `http://127.0.0.1:${api.address().port}` } } });
  await vite.listen(); t.after(() => vite.close());
  const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let truncated = false;
  globalThis.fetch = (url, options) => {
    if (!String(url).startsWith('https://api.deepseek.com/')) return originalFetch(url, options);
    calls++;
    // Split every UTF-8 byte to exercise both the server and browser decoders.
    const source = 'data: {"choices":[{"delta":{"content":"中文流式回答🌏"}}]}\n\n' + (truncated ? '' : 'data: [DONE]\n\n');
    const bytes = new TextEncoder().encode(source);
    return Promise.resolve(new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } }));
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  for (const username of ['chat-alice', 'chat-bob']) {
    const response = await originalFetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: 'secret123' }) });
    assert.equal(response.status, 201);
  }
  const aliceId = db.prepare("SELECT id FROM users WHERE username = 'chat-alice'").get().id;
  const a = await browser(t, base);
  await a.navigate('/login'); await until(() => a.evaluate("!!document.querySelector('form')"));
  const legacy = { currentId: 'old-current', conversations: [
    { id: 'old-first', title: '旧第一会话', messages: [{ role: 'user', content: '旧第一问题', time: '10:00' }] },
    { id: 'old-current', title: '旧当前会话', messages: [{ role: 'user', content: '旧当前问题', time: '10:01' }, { role: 'assistant', content: '旧当前回答', time: '10:02' }] },
  ] };
  await a.evaluate(`localStorage.setItem('wander_conversations:${aliceId}', ${JSON.stringify(JSON.stringify(legacy))})`);
  await a.signIn('chat-alice');
  assert.ok(await a.evaluate("document.querySelector('.chat-messages').innerText.includes('旧当前回答')"));
  assert.equal(db.prepare('SELECT count(*) AS n FROM conversations WHERE user_id = ?').get(aliceId).n, 2);
  await a.reload();
  assert.equal(db.prepare('SELECT count(*) AS n FROM conversations WHERE user_id = ?').get(aliceId).n, 2);

  await a.click('button[title="新建对话"]');
  await a.fill('.modal-input', '服务器旅行计划');
  await a.click('.modal-btn-confirm');
  await until(() => a.evaluate("!document.querySelector('.modal-input') && !document.querySelector('.chat-input').disabled"));
  const activeId = await until(() => db.prepare("SELECT id FROM conversations WHERE user_id = ? AND title = '服务器旅行计划'").get(aliceId)?.id);
  await a.fill('.chat-input', '测试保存对话'); await a.click('.chat-send-btn');
  try { await until(() => a.evaluate("document.querySelector('.chat-messages').innerText.includes('中文流式回答🌏') && !document.querySelector('.chat-input').disabled")); }
  catch (e) { throw new Error(e.message + ': ' + await a.evaluate('document.body.innerText') + ' browser errors: ' + a.errors.join('\n')); }
  assert.equal(calls, 1);
  await a.fill('.chat-input', '下次继续的草稿');
  await until(() => db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft === '下次继续的草稿');

  // Separate profile: no shared localStorage or cookies.
  const b = await browser(t, base);
  await b.signIn('chat-alice');
  assert.equal(await b.evaluate("document.querySelector('.chat-input').value"), '下次继续的草稿');
  assert.ok(await b.evaluate("document.querySelector('.chat-messages').innerText.includes('中文流式回答🌏')"));
  await b.click('button[title="历史对话"]');
  await until(() => b.evaluate("document.querySelectorAll('.history-item').length === 3"));
  assert.equal(await b.evaluate("document.querySelector('.history-item.active .history-item-title').textContent"), '服务器旅行计划');
  await b.click('.history-item.active button[title="重命名"]');
  await b.fill('.history-rename-input', '旅行计划已改名');
  await b.evaluate("document.querySelector('.history-rename-input').dispatchEvent(new KeyboardEvent('keyup', {key:'Enter',bubbles:true}))");
  await until(() => db.prepare('SELECT title FROM conversations WHERE id = ?').get(activeId).title === '旅行计划已改名');
  await a.reload();
  await a.click('button[title="历史对话"]');
  assert.equal(await a.evaluate("document.querySelector('.history-item.active .history-item-title').textContent"), '旅行计划已改名');
  await a.click('button[title="历史对话"]');

  // Another device changes the draft: a stale version must not silently overwrite it.
  await b.fill('.chat-input', '另一个浏览器的草稿');
  await until(() => db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft === '另一个浏览器的草稿');
  await a.fill('.chat-input', '当前浏览器保留的草稿');
  await until(() => a.evaluate("document.querySelector('.chat-sync-error')?.innerText.includes('其他页面更新')"));
  assert.equal(db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft, '另一个浏览器的草稿');
  assert.equal(await a.evaluate("document.querySelector('.chat-input').value"), '当前浏览器保留的草稿');
  await a.click('.chat-sync-error button');
  await until(() => db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft === '当前浏览器保留的草稿');
  await until(() => a.evaluate("!document.querySelector('.chat-sync-error') && !document.querySelector('.chat-input').disabled"));
  const savedVersion = db.prepare('SELECT version FROM conversations WHERE id = ?').get(activeId).version;
  await a.evaluate(`localStorage.setItem('wander_draft:${aliceId}:${activeId}', ${JSON.stringify(JSON.stringify({ draft: '旧版本本地草稿', version: savedVersion - 1 }))})`);
  await a.reload();
  assert.equal(await a.evaluate("document.querySelector('.chat-input').value"), '旧版本本地草稿');
  assert.ok(await a.evaluate("document.querySelector('.chat-sync-error').innerText.includes('服务器草稿已更新')"));
  assert.equal(db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft, '当前浏览器保留的草稿');
  await a.reload();
  assert.equal(db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft, '当前浏览器保留的草稿');
  await a.click('.chat-sync-error button');
  await until(() => db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft === '旧版本本地草稿');
  await until(() => a.evaluate("!document.querySelector('.chat-sync-error') && !document.querySelector('.chat-input').disabled"));

  // The POST succeeds server-side but its HTTP response is lost: no second send is created.
  await a.fill('.chat-input', '响应丢失也不重复');
  await a.evaluate("window.originalChatFetch = window.fetch; window.fetch = async (...args) => { const response = await window.originalChatFetch(...args); if (String(args[0]).endsWith('/messages') && args[1]?.method === 'POST') { await response.text(); throw new TypeError('Simulated lost response'); } return response; }");
  await a.click('.chat-send-btn');
  await until(() => a.evaluate("!!document.querySelector('.chat-sync-error') && !document.querySelector('.chat-input').disabled"));
  assert.equal(await a.evaluate("document.querySelector('.chat-input').value"), '');
  assert.equal(db.prepare("SELECT count(*) AS n FROM chat_messages WHERE conversation_id = ? AND content = '响应丢失也不重复'").get(activeId).n, 1);
  assert.equal(calls, 2);
  await a.evaluate('window.fetch = window.originalChatFetch');

  truncated = true;
  await a.fill('.chat-input', '中断测试'); await a.click('.chat-send-btn');
  await until(() => a.evaluate("!!document.querySelector('.message-status') && document.body.innerText.includes('重试回复') && !document.querySelector('.chat-input').disabled"));
  await a.reload();
  assert.ok(await a.evaluate("document.querySelector('.chat-messages').innerText.includes('中文流式回答🌏') && !!document.querySelector('.message-status')"));
  truncated = false;
  await a.click('.chat-state-button');
  await until(() => a.evaluate("!document.querySelector('.chat-input').disabled && !document.body.innerText.includes('重试回复')"));
  assert.equal(db.prepare("SELECT count(*) AS n FROM chat_messages WHERE conversation_id = ? AND role = 'user' AND content = '中断测试'").get(activeId).n, 1);

  await a.fill('.chat-input', '重新登录可见草稿');
  await until(() => db.prepare('SELECT draft FROM conversations WHERE id = ?').get(activeId).draft === '重新登录可见草稿');
  await a.click('.tabbar-item[href="/my"]');
  await until(() => a.evaluate("location.pathname === '/my'"));
  await a.evaluate("[...document.querySelectorAll('button')].find(el => el.textContent.includes('退出登录')).click()");
  await a.signIn('chat-bob');
  assert.ok(await a.evaluate("!document.querySelector('.chat-messages').innerText.includes('旧当前回答') && !document.querySelector('.chat-messages').innerText.includes('中文流式回答🌏')"));
  assert.equal(await a.evaluate("document.querySelector('.chat-input').value"), '');
  await a.click('.tabbar-item[href="/my"]');
  await until(() => a.evaluate("location.pathname === '/my'"));
  await a.evaluate("[...document.querySelectorAll('button')].find(el => el.textContent.includes('退出登录')).click()");
  await a.signIn('chat-alice');
  assert.equal(await a.evaluate("document.querySelector('.chat-input').value"), '重新登录可见草稿');

  // Restoring a different historical selection must work independently of list order.
  await a.click('button[title="历史对话"]');
  await a.evaluate("[...document.querySelectorAll('.history-item')].find(el => el.textContent.includes('旧第一会话')).click()");
  await until(() => a.evaluate("document.querySelector('.chat-messages').innerText.includes('旧第一问题') && !document.querySelector('.chat-input').disabled"));
  await a.reload();
  assert.ok(await a.evaluate("document.querySelector('.chat-messages').innerText.includes('旧第一问题')"));
  await a.click('button[title="历史对话"]');
  await a.evaluate("[...document.querySelectorAll('.history-item')].find(el => el.textContent.includes('旅行计划已改名')).click()");
  await until(() => a.evaluate("document.querySelector('.chat-input').value === '重新登录可见草稿' && !document.querySelector('.chat-input').disabled"));

  await a.click('button[title="历史对话"]');
  await a.click('.history-item.active button[title="删除"]');
  await until(() => !db.prepare('SELECT id FROM conversations WHERE id = ?').get(activeId));
  assert.equal(db.prepare('SELECT count(*) AS n FROM chat_messages WHERE conversation_id = ?').get(activeId).n, 0);
  await a.reload();
  assert.equal(db.prepare('SELECT count(*) AS n FROM conversations WHERE user_id = ?').get(aliceId).n, 2);
  assert.deepEqual(a.errors, []); assert.deepEqual(b.errors, []);
});
