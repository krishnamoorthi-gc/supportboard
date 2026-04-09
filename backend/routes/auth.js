const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

const SECRET = () => process.env.JWT_SECRET || 'supportdesk_secret';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    
    // Check if user already exists
    const existing = await db.prepare('SELECT id FROM agents WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    
    // Create new agent
    const id = uid();
    const password_hash = bcrypt.hashSync(password, 10);
    const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const av = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    
    await db.prepare('INSERT INTO agents (id,name,email,password_hash,role,color,avatar,status) VALUES (?,?,?,?,?,?,?,?)').run(
      id, name, email.toLowerCase().trim(), password_hash, 'agent', color, av, 'active'
    );
    
    // Create default inbox for this user
    await db.prepare('INSERT INTO inboxes (id,name,type,color,agent_id) VALUES (?,?,?,?,?)').run(
      uid(), 'My Inbox', 'live', '#4c82fb', id
    );
    
    const token = jwt.sign({ id, email: email.toLowerCase().trim(), role: 'agent' }, SECRET(), { expiresIn: '30d' });
    
    // Log audit
    await db.prepare('INSERT INTO audit_logs (id,agent_id,action,entity_type,details) VALUES (?,?,?,?,?)').run(
      uid(), id, 'register', 'agent', JSON.stringify({ email, name })
    );
    
    const agent = { id, name, email: email.toLowerCase().trim(), role: 'agent', color, avatar: av, status: 'active' };
    res.status(201).json({ token, agent });
  } catch (e) {
    console.error('❌ Registration error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

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
