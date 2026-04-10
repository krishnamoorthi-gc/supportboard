const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
function safeJson(val) {
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}
function parseJson(val, fb) {
  try { return typeof val === 'string' ? JSON.parse(val) : val || fb; }
  catch { return fb; }
}

// ═══════════════════════════════════════════════════════════════
// FORMS CRUD (authenticated)
// ═══════════════════════════════════════════════════════════════

router.get('/', auth, async (req, res) => {
  try {
    const forms = await db.prepare(
      'SELECT * FROM forms WHERE agent_id = ? ORDER BY updated_at DESC'
    ).all(req.agent.id);
    // Attach submission counts
    for (const f of forms) {
      const row = await db.prepare('SELECT COUNT(*) as c FROM form_submissions WHERE form_id = ?').get(f.id);
      f.submissions = row?.c || 0;
      f.fields = parseJson(f.fields, []);
      f.settings = parseJson(f.settings, {});
    }
    res.json({ forms });
  } catch (err) {
    console.error('GET /forms error:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const form = await db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    form.fields = parseJson(form.fields, []);
    form.settings = parseJson(form.settings, {});
    const row = await db.prepare('SELECT COUNT(*) as c FROM form_submissions WHERE form_id = ?').get(form.id);
    form.submissions = row?.c || 0;
    res.json({ form });
  } catch (err) {
    console.error('GET /forms/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, fields = [], settings = {}, status = 'draft' } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const ts = now();
    await db.prepare(
      'INSERT INTO forms (id, name, status, fields, settings, agent_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)'
    ).run(id, name, status, safeJson(fields), safeJson(settings), req.agent.id, ts, ts);
    const form = await db.prepare('SELECT * FROM forms WHERE id = ?').get(id);
    form.fields = parseJson(form.fields, []);
    form.settings = parseJson(form.settings, {});
    form.submissions = 0;
    res.status(201).json({ form });
  } catch (err) {
    console.error('POST /forms error:', err);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Form not found' });
    const updates = { updated_at: now() };
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.fields !== undefined) updates.fields = safeJson(req.body.fields);
    if (req.body.settings !== undefined) updates.settings = safeJson(req.body.settings);
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE forms SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const form = await db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
    form.fields = parseJson(form.fields, []);
    form.settings = parseJson(form.settings, {});
    const row = await db.prepare('SELECT COUNT(*) as c FROM form_submissions WHERE form_id = ?').get(form.id);
    form.submissions = row?.c || 0;
    res.json({ form });
  } catch (err) {
    console.error('PATCH /forms/:id error:', err);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM form_submissions WHERE form_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM forms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /forms/:id error:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SUBMISSIONS (authenticated — view/export)
// ═══════════════════════════════════════════════════════════════

router.get('/:id/submissions', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const submissions = await db.prepare(
      'SELECT * FROM form_submissions WHERE form_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(req.params.id, parseInt(limit), parseInt(offset));
    for (const s of submissions) s.data = parseJson(s.data, {});
    const countRow = await db.prepare('SELECT COUNT(*) as c FROM form_submissions WHERE form_id = ?').get(req.params.id);
    res.json({ submissions, total: countRow?.c || 0 });
  } catch (err) {
    console.error('GET /forms/:id/submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.delete('/:id/submissions/:subId', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM form_submissions WHERE id = ? AND form_id = ?').run(req.params.subId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth — for embedded forms)
// ═══════════════════════════════════════════════════════════════

// GET public form data (for rendering)
router.get('/public/:id', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const form = await db.prepare("SELECT * FROM forms WHERE id = ? AND status = 'active'").get(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found or inactive' });
    form.fields = parseJson(form.fields, []);
    form.settings = parseJson(form.settings, {});
    res.json({ name: form.name, fields: form.fields, settings: form.settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load form' });
  }
});

// POST public submission (no auth, CORS-open)
router.post('/public/:id/submit', async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const form = await db.prepare("SELECT * FROM forms WHERE id = ? AND status = 'active'").get(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found or inactive' });
    const { data = {} } = req.body;
    // Validate required fields
    const fields = parseJson(form.fields, []);
    for (const f of fields) {
      if (f.required && !['heading', 'paragraph'].includes(f.type)) {
        const val = data[f.id] || data[f.label];
        if (!val || (typeof val === 'string' && !val.trim())) {
          return res.status(400).json({ error: `${f.label} is required` });
        }
      }
    }
    const id = uid();
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    await db.prepare(
      'INSERT INTO form_submissions (id, form_id, data, ip, user_agent, agent_id, created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(id, req.params.id, safeJson(data), ip, ua, form.agent_id, now());
    const settings = parseJson(form.settings, {});
    res.json({ success: true, message: settings.successMsg || 'Thank you!' });
  } catch (err) {
    console.error('POST /forms/public/:id/submit error:', err);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// CORS preflight for public endpoints
router.options('/public/:id', (req, res) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.sendStatus(204); });
router.options('/public/:id/submit', (req, res) => { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.sendStatus(204); });

module.exports = router;
