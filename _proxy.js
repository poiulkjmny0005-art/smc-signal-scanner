const BASE = 'https://fapi.binance.com';

async function proxy(endpoint, res) {
  try {
    const r = await fetch(BASE + endpoint, { headers: { 'User-Agent': 'SMC-Signal-Scanner/1.1' } });
    const text = await r.text();
    res.statusCode = r.status;
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(text);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Binance API unavailable', detail: e.message }));
  }
}

module.exports = { proxy };
