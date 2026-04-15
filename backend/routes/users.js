'use strict';
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { uid } = require('../utils/helpers');

const wrap = fn => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (e) { console.error('users error:', e.message); res.status(500).json({ error: e.message }); }
};

// ── DEPARTMENTS ───────────────────────────────────────────────────────────
router.get('/departments', auth, wrap(async (req, res) => {
  const departments = await db.prepare('SELECT * FROM departments WHERE agent_id=? ORDER BY name ASC').all(req.agent.id);
  // count members per department
  for (const d of departments) {
    const row = await db.prepare('SELECT COUNT(*) as c FROM agents WHERE department_id=?').get(d.id);
    d.member_count = row?.c || 0;
  }
  res.json({ departments });
}));

router.post('/departments', auth, wrap(async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  const id = uid();
  await db.prepare('INSERT INTO departments (id,name,description,agent_id) VALUES (?,?,?,?)').run(
    id, name, description || null, req.agent.id
  );
  const dept = await db.prepare('SELECT * FROM departments WHERE id=?').get(id);
  dept.member_count = 0;
  res.status(201).json({ department: dept });
}));

router.patch('/departments/:id', auth, wrap(async (req, res) => {
  const d = await db.prepare('SELECT * FROM departments WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!d) return res.status(404).json({ error: 'Department not found' });
  const { name, description } = req.body;
  if (name) await db.prepare('UPDATE departments SET name=?, updated_at=NOW() WHERE id=?').run(name, req.params.id);
  if (description !== undefined) await db.prepare('UPDATE departments SET description=?, updated_at=NOW() WHERE id=?').run(description, req.params.id);
  const updated = await db.prepare('SELECT * FROM departments WHERE id=?').get(req.params.id);
  const row = await db.prepare('SELECT COUNT(*) as c FROM agents WHERE department_id=?').get(req.params.id);
  updated.member_count = row?.c || 0;
  res.json({ department: updated });
}));

router.delete('/departments/:id', auth, wrap(async (req, res) => {
  const d = await db.prepare('SELECT * FROM departments WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!d) return res.status(404).json({ error: 'Department not found' });
  // unassign agents from this department
  await db.prepare('UPDATE agents SET department_id=NULL WHERE department_id=?').run(req.params.id);
  await db.prepare('DELETE FROM departments WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

// ── MANAGED USERS (create users with email/password, assign department & permissions) ──
router.get('/managed', auth, wrap(async (req, res) => {
  const users = await db.prepare(
    `SELECT a.id, a.name, a.email, a.role, a.avatar, a.color, a.status, a.phone, a.bio,
            a.department_id, a.permissions, a.created_at,
            d.name as department_name
     FROM agents a
     LEFT JOIN departments d ON a.department_id = d.id
     WHERE a.id != ?
     ORDER BY a.created_at DESC`
  ).all(req.agent.id);
  for (const u of users) {
    u.permissions = u.permissions ? JSON.parse(u.permissions) : null;
  }
  res.json({ users });
}));

router.post('/managed', auth, wrap(async (req, res) => {
  const { name, email, password, role = 'agent', department_id, permissions, color } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = await db.prepare('SELECT id FROM agents WHERE email=?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const id = uid();
  const av = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const userColor = color || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  const permJson = permissions ? JSON.stringify(permissions) : null;

  await db.prepare(
    'INSERT INTO agents (id,name,email,password_hash,role,avatar,color,status,department_id,permissions) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(id, name, email.toLowerCase().trim(), bcrypt.hashSync(password, 10), role, av, userColor, 'active', department_id || null, permJson);

  const user = await db.prepare(
    `SELECT a.id, a.name, a.email, a.role, a.avatar, a.color, a.status, a.phone, a.bio,
            a.department_id, a.permissions, a.created_at,
            d.name as department_name
     FROM agents a
     LEFT JOIN departments d ON a.department_id = d.id
     WHERE a.id=?`
  ).get(id);
  user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.status(201).json({ user });
}));

router.patch('/managed/:id', auth, wrap(async (req, res) => {
  const u = await db.prepare('SELECT * FROM agents WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });

  const fields = ['name', 'role', 'color', 'phone', 'bio', 'status', 'avatar', 'department_id'];
  const updates = { updated_at: new Date().toISOString() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.password) updates.password_hash = bcrypt.hashSync(req.body.password, 10);
  if (req.body.permissions !== undefined) updates.permissions = JSON.stringify(req.body.permissions);

  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE agents SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);

  const user = await db.prepare(
    `SELECT a.id, a.name, a.email, a.role, a.avatar, a.color, a.status, a.phone, a.bio,
            a.department_id, a.permissions, a.created_at,
            d.name as department_name
     FROM agents a
     LEFT JOIN departments d ON a.department_id = d.id
     WHERE a.id=?`
  ).get(req.params.id);
  user.permissions = user.permissions ? JSON.parse(user.permissions) : null;
  res.json({ user });
}));

router.delete('/managed/:id', auth, wrap(async (req, res) => {
  if (req.params.id === req.agent.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  const u = await db.prepare('SELECT id FROM agents WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
  await db.prepare('DELETE FROM agents WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

module.exports = router;
