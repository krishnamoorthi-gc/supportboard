const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// Categories
router.get('/categories', auth, (req, res) => {
  const cats = db.prepare('SELECT * FROM kb_categories WHERE agent_id=? ORDER BY order_idx ASC').all(req.agent.id);
  for (const c of cats) {
    c.article_count = db.prepare('SELECT COUNT(*) as n FROM kb_articles WHERE category_id=? AND author_id=?').get(c.id, req.agent.id).n;
  }
  res.json({ categories: cats });
});

router.post('/categories', auth, (req, res) => {
  const { name, description, icon, color, order_idx=0 } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO kb_categories (id,name,description,icon,color,order_idx,agent_id) VALUES (?,?,?,?,?,?,?)').run(id, name, description||null, icon||null, color||null, order_idx, req.agent.id);
  res.status(201).json({ category: db.prepare('SELECT * FROM kb_categories WHERE id=? AND agent_id=?').get(id, req.agent.id) });
});

router.patch('/categories/:id', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM kb_categories WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','description','icon','color','order_idx'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ category: c });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE kb_categories SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ category: db.prepare('SELECT * FROM kb_categories WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
});

router.delete('/categories/:id', auth, (req, res) => {
  const c = db.prepare('SELECT id FROM kb_categories WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE kb_articles SET category_id=NULL WHERE category_id=? AND author_id=?").run(req.params.id, req.agent.id);
  db.prepare('DELETE FROM kb_categories WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
});

// Articles
router.get('/articles', auth, (req, res) => {
  const { category_id, status, q } = req.query;
  let where = 'a.author_id=?'; const params = [req.agent.id];
  if (category_id) { where += ' AND a.category_id=?'; params.push(category_id); }
  if (status) { where += ' AND a.status=?'; params.push(status); }
  if (q) { where += ' AND (a.title LIKE ? OR a.body LIKE ?)'; const lq=`%${q}%`; params.push(lq,lq); }
  const articles = db.prepare(`
    SELECT a.*, ag.name as author_name, c.name as category_name
    FROM kb_articles a
    LEFT JOIN agents ag ON a.author_id = ag.id
    LEFT JOIN kb_categories c ON a.category_id = c.id
    WHERE ${where} ORDER BY a.updated_at DESC
  `).all(...params);
  for (const a of articles) { try { a.tags = JSON.parse(a.tags||'[]'); } catch { a.tags=[]; } }
  res.json({ articles });
});

router.get('/articles/:id', auth, (req, res) => {
  const a = db.prepare('SELECT * FROM kb_articles WHERE id=? AND author_id=?').get(req.params.id, req.agent.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE kb_articles SET views=views+1 WHERE id=? AND author_id=?').run(req.params.id, req.agent.id);
  try { a.tags = JSON.parse(a.tags||'[]'); } catch { a.tags=[]; }
  res.json({ article: a });
});

router.post('/articles', auth, (req, res) => {
  const { category_id, title, body, status='draft', seo_title, seo_desc, tags=[] } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uid();
  db.prepare('INSERT INTO kb_articles (id,category_id,title,body,author_id,status,seo_title,seo_desc,tags) VALUES (?,?,?,?,?,?,?,?,?)').run(
    id, category_id||null, title, body||null, req.agent.id, status, seo_title||null, seo_desc||null, JSON.stringify(tags)
  );
  res.status(201).json({ article: db.prepare('SELECT * FROM kb_articles WHERE id=? AND author_id=?').get(id, req.agent.id) });
});

router.patch('/articles/:id', auth, (req, res) => {
  const a = db.prepare('SELECT * FROM kb_articles WHERE id=? AND author_id=?').get(req.params.id, req.agent.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const fields = ['category_id','title','body','status','seo_title','seo_desc'];
  const updates = { updated_at: new Date().toISOString() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.tags !== undefined) updates.tags = JSON.stringify(req.body.tags);
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE kb_articles SET ${sets} WHERE id=? AND author_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ article: db.prepare('SELECT * FROM kb_articles WHERE id=? AND author_id=?').get(req.params.id, req.agent.id) });
});

router.delete('/articles/:id', auth, (req, res) => {
  const a = db.prepare('SELECT id FROM kb_articles WHERE id=? AND author_id=?').get(req.params.id, req.agent.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM kb_articles WHERE id=? AND author_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
});

// POST /api/kb/articles/:id/helpful
router.post('/articles/:id/helpful', auth, (req, res) => {
  const { helpful } = req.body;
  if (helpful) db.prepare('UPDATE kb_articles SET helpful_yes=helpful_yes+1 WHERE id=?').run(req.params.id);
  else db.prepare('UPDATE kb_articles SET helpful_no=helpful_no+1 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
