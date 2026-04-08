const jwt = require('jsonwebtoken');
const db = require('../db');

module.exports = function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supportdesk_secret');
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(payload.id);
    if (!agent) return res.status(401).json({ error: 'Agent not found' });
    req.agent = agent;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
