const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC = __dirname;
const BINANCE = 'https://fapi.binance.com';

function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

async function proxyJson(res, endpoint) {
  try {
    const r = await fetch(BINANCE + endpoint, {
      headers: { 'User-Agent': 'SMC-Signal-Scanner/1.0' }
    });
    const text = await r.text();
    if (!r.ok) return send(res, r.status, text);
    send(res, 200, text);
  } catch (e) {
    send(res, 502, JSON.stringify({ error: 'Binance API unavailable', detail: e.message }));
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);

  if (u.pathname === '/api/exchangeInfo') {
    return proxyJson(res, '/fapi/v1/exchangeInfo');
  }
  if (u.pathname === '/api/ticker24hr') {
    return proxyJson(res, '/fapi/v1/ticker/24hr');
  }
  if (u.pathname === '/api/klines') {
    const symbol = (u.searchParams.get('symbol') || '').toUpperCase();
    const interval = u.searchParams.get('interval') || '15m';
    const limit = Math.min(Number(u.searchParams.get('limit') || 80), 200);
    if (!/^[A-Z0-9_]+$/.test(symbol)) return send(res, 400, JSON.stringify({error:'invalid symbol'}));
    if (!/^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d)$/.test(interval)) return send(res, 400, JSON.stringify({error:'invalid interval'}));
    return proxyJson(res, `/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`);
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
  console.log(`SMC scanner running at http://localhost:${PORT}`);
});
