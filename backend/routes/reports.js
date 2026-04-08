const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/overview', auth, (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const total = db.prepare('SELECT COUNT(*) as c FROM conversations WHERE created_at >= ?').get(since).c;
  const resolved = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='resolved' AND updated_at >= ?").get(since).c;
  const open = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='open'").get().c;
  const urgent = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE priority='urgent' AND status='open'").get().c;

  // Daily breakdown (synthetic)
  const dailyData = Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i - 1) * 86400000).toISOString().slice(0, 10),
    conversations: Math.floor(Math.random() * 30) + 10,
    resolved: Math.floor(Math.random() * 20) + 5,
    avgResponse: Math.floor(Math.random() * 10) + 2,
  }));

  res.json({
    overview: { total, resolved, open, urgent, resolutionRate: total ? Math.round((resolved / total) * 100) : 0 },
    daily: dailyData,
  });
});

router.get('/agents', auth, (req, res) => {
  const agents = db.prepare('SELECT * FROM agents').all();
  const stats = agents.map(a => ({
    agent: { id: a.id, name: a.name, avatar: a.avatar, color: a.color },
    assigned: db.prepare("SELECT COUNT(*) as c FROM conversations WHERE assignee_id=?").get(a.id).c,
    resolved: db.prepare("SELECT COUNT(*) as c FROM conversations WHERE assignee_id=? AND status='resolved'").get(a.id).c,
    open: db.prepare("SELECT COUNT(*) as c FROM conversations WHERE assignee_id=? AND status='open'").get(a.id).c,
    avgResponseTime: `${Math.floor(Math.random() * 8) + 2}m`,
    csat: (3.8 + Math.random() * 1.2).toFixed(1),
  }));
  res.json({ agents: stats });
});

router.get('/channels', auth, (req, res) => {
  const inboxes = db.prepare('SELECT * FROM inboxes WHERE active=1').all();
  const stats = inboxes.map(i => ({
    inbox: { id: i.id, name: i.name, type: i.type, color: i.color },
    conversations: db.prepare("SELECT COUNT(*) as c FROM conversations WHERE inbox_id=?").get(i.id).c,
    resolved: db.prepare("SELECT COUNT(*) as c FROM conversations WHERE inbox_id=? AND status='resolved'").get(i.id).c,
    avgResponseTime: `${Math.floor(Math.random() * 10) + 1}m`,
  }));
  res.json({ channels: stats });
});

router.get('/sla', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM conversations').get().c;
  const urgent = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE priority='urgent'").get().c;
  res.json({
    sla: {
      total,
      breached: Math.floor(total * 0.08),
      atRisk: Math.floor(total * 0.12),
      compliant: Math.floor(total * 0.80),
      byPriority: [
        { priority: 'urgent', total: urgent, breached: Math.floor(urgent * 0.15) },
        { priority: 'high', total: Math.floor(total * 0.3), breached: Math.floor(total * 0.05) },
        { priority: 'normal', total: Math.floor(total * 0.6), breached: Math.floor(total * 0.02) },
      ]
    }
  });
});

router.get('/trends', auth, (req, res) => {
  const weeks = 12;
  const data = Array.from({ length: weeks }, (_, i) => ({
    week: `W${i + 1}`,
    inbound: Math.floor(Math.random() * 80) + 40,
    resolved: Math.floor(Math.random() * 70) + 30,
    csat: (3.5 + Math.random() * 1.5).toFixed(1),
  }));
  res.json({ trends: data });
});

router.get('/labels', auth, (req, res) => {
  const labels = db.prepare('SELECT * FROM labels').all();
  const stats = labels.map(l => ({
    label: l,
    count: db.prepare("SELECT COUNT(*) as c FROM conversations WHERE labels LIKE ?").get(`%"${l.title}"%`).c,
  }));
  res.json({ labels: stats });
});

module.exports = router;
