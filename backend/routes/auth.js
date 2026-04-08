const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

const SECRET = () => process.env.JWT_SECRET || 'supportdesk_secret';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const agent = await db.prepare('SELECT * FROM agents WHERE email = ?').get(email.toLowerCase().trim());
  if (!agent) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, agent.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  if (agent.two_fa_enabled) {
    return res.json({ twoFaRequired: true, agent_id: agent.id });
  }

  const token = jwt.sign({ id: agent.id, email: agent.email, role: agent.role }, SECRET(), { expiresIn: '30d' });

  // Log audit
  await db.prepare('INSERT INTO audit_logs (id,agent_id,action,entity_type,details) VALUES (?,?,?,?,?)').run(
    uid(), agent.id, 'login', 'agent', JSON.stringify({ email })
  );

  const { password_hash, two_fa_secret, ...safe } = agent;
  res.json({ token, agent: safe });
});

// POST /api/auth/2fa (Verify 2FA)
router.post('/2fa', async (req, res) => {
  const { agent_id, agentId, code } = req.body;
  const id = agent_id || agentId;
  if (!id || !code) return res.status(400).json({ error: 'agent_id and code required' });
  if (code.length < 6) return res.status(401).json({ error: 'Invalid 2FA code' });

  const agent = await db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const token = jwt.sign({ id: agent.id, email: agent.email, role: agent.role }, SECRET(), { expiresIn: '30d' });
  const { password_hash, two_fa_secret, ...safe } = agent;
  res.json({ token, agent: safe });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const { password_hash, two_fa_secret, ...safe } = req.agent;
  res.json({ agent: safe });
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  await db.prepare('INSERT INTO audit_logs (id,agent_id,action,entity_type,details) VALUES (?,?,?,?,?)').run(
    uid(), req.agent.id, 'logout', 'agent', '{}'
  );
  res.json({ success: true });
});

module.exports = router;
