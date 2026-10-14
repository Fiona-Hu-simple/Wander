// 单进程限流；多实例部署需要共享存储。
export function rateLimit({ limit, windowMs }) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [ip, entry] of clients) if (entry.expires <= now) clients.delete(ip);
    let entry = clients.get(req.ip);
    if (!entry) {
      if (clients.size >= 10000) return res.status(429).json({ code: 429, message: '请求过于频繁，请稍后重试' });
      entry = { count: 0, expires: now + windowMs };
      clients.set(req.ip, entry);
    }
    if (++entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.expires - now) / 1000));
      return res.status(429).json({ code: 429, message: '请求过于频繁，请稍后重试' });
    }
    next();
  };
}
