import { Router } from 'express';
import { once } from 'node:events';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { beginTurn, saveReply, fail } from '../database/chat.js';

const router = Router();
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

router.post('/conversations/:id/messages', requireAuth, rateLimit({ limit: 20, windowMs: 60000 }), async (req, res) => {
  const { content, requestId, retryOf } = req.body || {};
  if (typeof requestId !== 'string' || !/^[\w-]{8,100}$/.test(requestId) || (retryOf !== undefined ? !Number.isSafeInteger(retryOf) || retryOf <= 0 : typeof content !== 'string' || !content.trim() || content.length > 16000)) throw fail(400, '无效的消息');
  const turn = beginTurn(req.user.id, req.params.id, { content: typeof content === 'string' ? content.trim() : undefined, requestId, retryOf });
  if (turn.duplicate) return res.json({ data: turn });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  const onClose = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', onClose);
  let reply = '';
  let completed = false;
  let reader;
  let persistedAt = 0;
  const emit = async (event, data) => {
    if (!res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) await once(res, 'drain', { signal: controller.signal });
  };
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('AI 服务未配置');
    const upstream = await fetch(DEEPSEEK_API_URL, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, Accept: 'text/event-stream' },
      body: JSON.stringify({ model: 'deepseek-chat', stream: true, messages: turn.context }),
    });
    if (!upstream.ok || !upstream.body || !upstream.headers.get('content-type')?.includes('text/event-stream')) {
      await upstream.body?.cancel();
      throw new Error('AI 服务暂时不可用，请重试');
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    await emit('meta', { user: turn.user, assistant: turn.assistant });
    reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const processEvent = async block => {
      const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n').trim();
      if (!data) return;
      if (data === '[DONE]') { completed = true; return; }
      const parsed = JSON.parse(data);
      if (parsed.error) throw new Error('AI 回复失败，请重试');
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) {
        if (reply.length + delta.length > 100000) throw new Error('回复过长，已停止生成');
        reply += delta;
        if (Date.now() - persistedAt >= 500) { saveReply(turn.assistant.id, reply, 'generating'); persistedAt = Date.now(); }
        await emit('delta', { content: delta });
      }
    };
    while (!completed) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, '\n');
      let split;
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        await processEvent(block);
        if (completed) break;
      }
      if (buffer.length > 200000) throw new Error('AI 服务返回格式异常');
      if (done) { if (!completed && buffer.trim()) await processEvent(buffer); break; }
    }
    if (!completed || !reply.trim()) { completed = false; throw new Error('回复连接中断，请重试'); }
    saveReply(turn.assistant.id, reply, 'completed');
    await emit('done', { id: turn.assistant.id, status: 'completed' });
  } catch (error) {
    const status = controller.signal.aborted || reply ? 'interrupted' : 'failed';
    const text = controller.signal.aborted ? '回复已取消或超时，可重试' : error.message === 'AI 服务未配置' ? error.message : '回复失败或连接中断，请重试';
    if (!completed) saveReply(turn.assistant.id, reply, status, text);
    if (!res.headersSent) res.status(502).json({ message: text, data: { user: turn.user, assistant: { ...turn.assistant, content: reply, status, error: text } } });
    else if (!res.destroyed && !res.writableEnded) await emit('error', { id: turn.assistant.id, status, message: text }).catch(() => {});
  } finally {
    clearTimeout(timeout);
    res.off('close', onClose);
    controller.abort();
    await reader?.cancel().catch(() => {});
    reader?.releaseLock();
    if (!res.writableEnded) res.end();
  }
});
export default router;
