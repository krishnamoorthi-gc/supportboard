const { v4: uuidv4 } = require('uuid');

function uid() { return uuidv4(); }

function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function search(q, fields, row) {
  if (!q) return true;
  const lq = q.toLowerCase();
  return fields.some(f => (row[f] || '').toLowerCase().includes(lq));
}

function parseJson(val, fallback = null) {
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return fallback; }
}

function ok(res, data) {
  return res.json({ success: true, ...data });
}

module.exports = { uid, paginate, search, parseJson, ok };
