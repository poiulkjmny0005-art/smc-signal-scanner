const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC = __dirname;
const BINANCE = 'https://fapi.binance.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const cache = new Map();
let queueTail = Promise.resolve();
let lastRequestAt = 0;
const MIN_GAP_MS = 180;

function send(res, status, body, type='application/json; charset=utf-8', extraHeaders={}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders
  });
  res.end(body);
}

function cacheGet(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) { cache.delete(key); return null; }
  return item.value;
}
function cacheSet(key, value, ttlMs) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

function enqueue(task) {
  const run = queueTail.then(task, task);
  queueTail = run.catch(() => {});
  return run;
}

async function binanceFetch(endpoint, retries=5) {
  return enqueue(async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastRequestAt));
    if (wait) await sleep(wait);

    let lastStatus = 0;
    let lastText = '';
    for (let i = 0; i < retries; i++) {
      lastRequestAt = Date.now();
      const r = await fetch(BINANCE + endpoint, {
        headers: { 'User-Agent': 'SMC-Signal-Scanner/3.0' }
      });
      const text = await r.text();
      lastStatus = r.status;
      lastText = text;
      if (r.ok) return { status: 200, text };

      if (r.status === 429 || r.status === 418) {
        const retryAfter = Number(r.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 30000)
          : Math.min(1200 * Math.pow(1.8, i), 12000);
        await sleep(backoff);
        continue;
      }
      return { status: r.status, text };
    }
    return { status: lastStatus || 429, text: lastText || JSON.stringify({ error: 'API rate limit' }) };
  });
}

async function proxyCached(res, endpoint, ttlMs) {
  const cached = cacheGet(endpoint);
  if (cached) return send(res, 200, cached, 'application/json; charset=utf-8', { 'X-Cache': 'HIT' });
  try {
    const result = await binanceFetch(endpoint);
    if (result.status !== 200) return send(res, result.status, result.text);
    cacheSet(endpoint, result.text, ttlMs);
    return send(res, 200, result.text, 'application/json; charset=utf-8', { 'X-Cache': 'MISS' });
  } catch (e) {
    return send(res, 502, JSON.stringify({ error: 'Binance API unavailable', detail: e.message }));
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname === '/api/status') {
    return send(res, 200, JSON.stringify({ ok: true, mode: 'fast-prescreen-v3', minGapMs: MIN_GAP_MS }));
  }
  if (u.pathname === '/api/exchangeInfo') {
    return proxyCached(res, '/fapi/v1/exchangeInfo', 15 * 60 * 1000);
  }
  // v3 預篩：只呼叫一次全市場 24h ticker，快取 60 秒。
  if (u.pathname === '/api/ticker24hr') {
    return proxyCached(res, '/fapi/v1/ticker/24hr', 60 * 1000);
  }
  if (u.pathname === '/api/klines') {
    const symbol = (u.searchParams.get('symbol') || '').toUpperCase();
    const interval = u.searchParams.get('interval') || '15m';
    const limit = Math.min(Math.max(Number(u.searchParams.get('limit') || 80), 20), 100);
    if (!/^[A-Z0-9_]+$/.test(symbol)) return send(res, 400, JSON.stringify({error:'invalid symbol'}));
    if (!/^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d)$/.test(interval)) return send(res, 400, JSON.stringify({error:'invalid interval'}));
    const endpoint = `/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
    return proxyCached(res, endpoint, 35 * 1000);
  }

  let filePath = u.pathname === '/' ? path.join(PUBLIC, 'index.html') : path.join(PUBLIC, u.pathname);
  if (!filePath.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
    res.writeHead(200, {'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control':'no-store'});
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SMC scanner fast prescreen v3 running on port ${PORT}`);
});
