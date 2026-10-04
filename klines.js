const { proxy } = require('./_proxy');
module.exports = async (req, res) => {
  const raw = new URL(req.url, 'http://localhost');
  const symbol = (raw.searchParams.get('symbol') || '').toUpperCase();
  const interval = raw.searchParams.get('interval') || '15m';
  const limit = Math.min(Math.max(Number(raw.searchParams.get('limit') || 80), 1), 200);
  if (!/^[A-Z0-9_]+$/.test(symbol)) {
    res.statusCode = 400; return res.end(JSON.stringify({error:'invalid symbol'}));
  }
  if (!/^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d)$/.test(interval)) {
    res.statusCode = 400; return res.end(JSON.stringify({error:'invalid interval'}));
  }
  return proxy(`/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`, res);
};
