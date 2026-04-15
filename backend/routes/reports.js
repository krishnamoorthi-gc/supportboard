const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/overview', auth, async (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '1y' ? 365 : period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const aid = req.agent.id;

  const total = (await db.prepare('SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND created_at >= ?').get(aid, since)).c;
  const resolved = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved' AND created_at >= ?").get(aid, since)).c;
  const open = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='open' AND created_at >= ?").get(aid, since)).c;
  const pending = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='pending' AND created_at >= ?").get(aid, since)).c;
  const urgent = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND priority='urgent' AND status='open' AND created_at >= ?").get(aid, since)).c;

  const rtRow = await db.query(
    `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, first_reply_at)) as avg_rt
     FROM conversations WHERE agent_id=? AND first_reply_at IS NOT NULL AND created_at >= ?`,
    [aid, since], true
  );
  const avgFirstReply = rtRow && rtRow.avg_rt != null ? Math.max(0, Math.round(Number(rtRow.avg_rt) * 10) / 10) : 0;

  const csatRow = await db.query(
    'SELECT AVG(csat_score) as avg_csat, COUNT(csat_score) as total_rated FROM conversations WHERE agent_id=? AND csat_score IS NOT NULL AND created_at >= ?',
    [aid, since], true
  );
  const avgCsat = csatRow && csatRow.avg_csat != null ? Math.round(Number(csatRow.avg_csat) * 10) / 10 : 0;
  const totalRated = csatRow ? Number(csatRow.total_rated) : 0;

  const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const prevTotal = (await db.prepare('SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND created_at >= ? AND created_at < ?').get(aid, prevSince, since)).c;
  const prevResolved = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved' AND created_at >= ? AND created_at < ?").get(aid, prevSince, since)).c;
  const prevRtRow = await db.query(
    `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, first_reply_at)) as avg_rt
     FROM conversations WHERE agent_id=? AND first_reply_at IS NOT NULL AND created_at >= ? AND created_at < ?`,
    [aid, prevSince, since], true
  );
  const prevAvgFirstReply = prevRtRow && prevRtRow.avg_rt != null ? Math.round(Number(prevRtRow.avg_rt) * 10) / 10 : 0;
  const prevCsatRow = await db.query(
    'SELECT AVG(csat_score) as avg_csat FROM conversations WHERE agent_id=? AND csat_score IS NOT NULL AND created_at >= ? AND created_at < ?',
    [aid, prevSince, since], true
  );
  const prevAvgCsat = prevCsatRow && prevCsatRow.avg_csat != null ? Math.round(Number(prevCsatRow.avg_csat) * 10) / 10 : 0;

  const dailyRows = await db.query(
    `SELECT DATE(created_at) as d, COUNT(*) as conversations,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
     FROM conversations WHERE agent_id=? AND created_at >= ?
     GROUP BY DATE(created_at) ORDER BY d ASC`, [aid, since]
  );
  const dailyMap = {};
  for (const row of dailyRows) {
    const key = typeof row.d === 'string' ? row.d : new Date(row.d).toISOString().slice(0, 10);
    dailyMap[key] = { date: key, conversations: Number(row.conversations), resolved: Number(row.resolved), pending: Number(row.pending_count || 0) };
  }
  const dailyData = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - i - 1) * 86400000).toISOString().slice(0, 10);
    dailyData.push(dailyMap[date] || { date, conversations: 0, resolved: 0, pending: 0 });
  }

  const rtDistRows = await db.query(
    `SELECT TIMESTAMPDIFF(MINUTE, created_at, first_reply_at) as rt_min
     FROM conversations WHERE agent_id=? AND first_reply_at IS NOT NULL AND created_at >= ?`, [aid, since]
  );
  const buckets = [
    { range: '< 1m', min: null, max: 1 }, { range: '1-5m', min: 1, max: 5 },
    { range: '5-15m', min: 5, max: 15 }, { range: '15-30m', min: 15, max: 30 },
    { range: '30m-1h', min: 30, max: 60 }, { range: '> 1h', min: 60, max: null },
  ];
  const rtDist = buckets.map(b => {
    const count = rtDistRows.filter(r => {
      const v = Number(r.rt_min);
      if (b.min === null) return v < b.max;
      if (b.max === null) return v >= b.min;
      return v >= b.min && v < b.max;
    }).length;
    return { range: b.range, count, pct: rtDistRows.length ? Math.round(count / rtDistRows.length * 100) : 0 };
  });

  const heatRows = await db.query(
    `SELECT DAYOFWEEK(created_at) as dow, HOUR(created_at) as h, COUNT(*) as c
     FROM conversations WHERE agent_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY DAYOFWEEK(created_at), HOUR(created_at)`, [aid]
  );
  const heatMax = Math.max(...heatRows.map(r => Number(r.c)), 1);
  const heatmap = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const row = heatRows.find(r => ((Number(r.dow) + 5) % 7) === d && Number(r.h) === h);
      return row ? Math.round(Number(row.c) / heatMax * 100) / 100 : 0;
    })
  );

  res.json({
    overview: { total, resolved, open, pending, urgent,
      resolutionRate: total ? Math.round(resolved / total * 100) : 0,
      avgFirstReply, avgCsat, totalRated },
    deltas: {
      totalDelta: prevTotal ? Math.round((total - prevTotal) / prevTotal * 100) : (total > 0 ? 100 : 0),
      resolvedDelta: prevResolved ? Math.round((resolved - prevResolved) / prevResolved * 100) : (resolved > 0 ? 100 : 0),
      replyDelta: prevAvgFirstReply ? Math.round((prevAvgFirstReply - avgFirstReply) / prevAvgFirstReply * 100) : 0,
      csatDelta: prevAvgCsat ? Math.round((avgCsat - prevAvgCsat) * 10) / 10 : 0,
    },
    daily: dailyData, rtDist, heatmap,
  });
});

router.get('/agents', auth, async (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '1y' ? 365 : period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const agents = await db.prepare('SELECT * FROM agents').all();
  const aid = req.agent.id;
  const stats = [];
  for (const a of agents) {
    const assigned = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND assignee_id=? AND created_at >= ?").get(aid, a.id, since)).c;
    const resolvedCount = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND assignee_id=? AND status='resolved' AND created_at >= ?").get(aid, a.id, since)).c;
    const rtRow = await db.query(`SELECT AVG(TIMESTAMPDIFF(MINUTE, c.created_at, c.first_reply_at)) as avg_rt FROM conversations c WHERE c.agent_id=? AND c.assignee_id=? AND c.first_reply_at IS NOT NULL AND c.created_at >= ?`, [aid, a.id, since], true);
    const avgResponseTime = rtRow && rtRow.avg_rt != null ? `${Math.round(rtRow.avg_rt)}m` : 'N/A';
    const csatRow = await db.query('SELECT AVG(csat_score) as avg_csat FROM conversations WHERE agent_id=? AND assignee_id=? AND csat_score IS NOT NULL AND created_at >= ?', [aid, a.id, since], true);
    const csat = csatRow && csatRow.avg_csat != null ? Number(csatRow.avg_csat).toFixed(1) : 'N/A';
    const loadRow = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND assignee_id=? AND status='open'").get(aid, a.id));
    stats.push({ agent: { id: a.id, name: a.name, avatar: a.avatar, color: a.color, role: a.role, status: a.status }, assigned, resolved: resolvedCount, avgResponseTime, csat, load: loadRow.c });
  }
  res.json({ agents: stats });
});

router.get('/channels', auth, async (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '1y' ? 365 : period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const aid = req.agent.id;
  const inboxes = await db.prepare('SELECT * FROM inboxes WHERE agent_id=? AND active=1').all(aid);
  const stats = [];
  for (const i of inboxes) {
    const conversations = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND inbox_id=? AND created_at >= ?").get(aid, i.id, since)).c;
    const resolvedCount = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND inbox_id=? AND status='resolved' AND created_at >= ?").get(aid, i.id, since)).c;
    const rtRow = await db.query(`SELECT AVG(TIMESTAMPDIFF(MINUTE, c.created_at, c.first_reply_at)) as avg_rt FROM conversations c WHERE c.agent_id=? AND c.inbox_id=? AND c.first_reply_at IS NOT NULL AND c.created_at >= ?`, [aid, i.id, since], true);
    const avgResponseTime = rtRow && rtRow.avg_rt != null ? `${Math.round(rtRow.avg_rt)}m` : 'N/A';
    const csatRow = await db.query('SELECT AVG(csat_score) as avg_csat FROM conversations WHERE agent_id=? AND inbox_id=? AND csat_score IS NOT NULL AND created_at >= ?', [aid, i.id, since], true);
    const csat = csatRow && csatRow.avg_csat != null ? Number(csatRow.avg_csat).toFixed(1) : 'N/A';
    stats.push({ inbox: { id: i.id, name: i.name, type: i.type, color: i.color }, conversations, resolved: resolvedCount, avgResponseTime, csat });
  }
  res.json({ channels: stats });
});

router.get('/sla', auth, async (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '1y' ? 365 : period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const aid = req.agent.id;
  const total = (await db.prepare('SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND created_at >= ?').get(aid, since)).c;
  const slaRow = await db.query('SELECT first_response_minutes, resolution_minutes FROM sla_policies ORDER BY created_at ASC LIMIT 1', [], true);
  const slaFr = (slaRow && slaRow.first_response_minutes) || 60;
  const slaRes = (slaRow && slaRow.resolution_minutes) || 480;
  const breached = (await db.query(`SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND created_at >= ? AND ((first_reply_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, first_reply_at) > ?) OR (first_reply_at IS NULL AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > ?))`, [aid, since, slaFr, slaFr], true)).c;
  const compliant = (await db.query(`SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND created_at >= ? AND first_reply_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, first_reply_at) <= ?`, [aid, since, slaFr], true)).c;
  const atRisk = Math.max(total - breached - compliant, 0);
  const resCompliant = (await db.query(`SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND created_at >= ? AND status='resolved' AND resolved_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, resolved_at) <= ?`, [aid, since, slaRes], true)).c;
  const resTotal = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved' AND created_at >= ?").get(aid, since)).c;
  const slaDaily = await db.query(`SELECT DATE(created_at) as d, COUNT(*) as total, SUM(CASE WHEN first_reply_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, first_reply_at) <= ? THEN 1 ELSE 0 END) as compliant FROM conversations WHERE agent_id=? AND created_at >= ? GROUP BY DATE(created_at) ORDER BY d ASC`, [slaFr, aid, since]);
  const slaTrend = slaDaily.map(r => ({ date: typeof r.d === 'string' ? r.d : new Date(r.d).toISOString().slice(0, 10), pct: Number(r.total) > 0 ? Math.round(Number(r.compliant) / Number(r.total) * 100) : 100 }));
  res.json({ sla: { total, breached, atRisk, compliant, resCompliant, resTotal, slaFirstResponse: slaFr, slaResolution: slaRes, slaTrend } });
});

router.get('/csat', auth, async (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '1y' ? 365 : period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const aid = req.agent.id;
  const totalResolved = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved' AND created_at >= ?").get(aid, since)).c;
  const csatRow = await db.query('SELECT AVG(csat_score) as avg_csat, COUNT(csat_score) as total_rated FROM conversations WHERE agent_id=? AND csat_score IS NOT NULL AND created_at >= ?', [aid, since], true);
  const avgCsat = csatRow && csatRow.avg_csat != null ? Math.round(Number(csatRow.avg_csat) * 10) / 10 : 0;
  const totalRated = csatRow ? Number(csatRow.total_rated) : 0;
  const responseRate = totalResolved ? Math.round(totalRated / totalResolved * 100) : 0;
  const distRows = await db.query(`SELECT csat_score as r, COUNT(*) as c FROM conversations WHERE agent_id=? AND csat_score IS NOT NULL AND created_at >= ? GROUP BY csat_score ORDER BY csat_score DESC`, [aid, since]);
  const distribution = [5, 4, 3, 2, 1].map(r => { const row = distRows.find(d => Number(d.r) === r); const count = row ? Number(row.c) : 0; return { rating: r, count, pct: totalRated ? Math.round(count / totalRated * 100) : 0 }; });
  const promoters = distribution.find(d => d.rating === 5)?.count || 0;
  const detractors = distribution.filter(d => d.rating <= 3).reduce((s, d) => s + d.count, 0);
  const nps = totalRated ? Math.round((promoters - detractors) / totalRated * 100) : 0;
  const agentCsatRows = await db.query(`SELECT c.assignee_id, a.name, a.avatar, a.color, AVG(c.csat_score) as avg_csat, COUNT(c.csat_score) as rated FROM conversations c JOIN agents a ON c.assignee_id = a.id WHERE c.agent_id=? AND c.csat_score IS NOT NULL AND c.created_at >= ? GROUP BY c.assignee_id, a.name, a.avatar, a.color ORDER BY avg_csat DESC`, [aid, since]);
  const byAgent = agentCsatRows.map(r => ({ id: r.assignee_id, name: r.name, avatar: r.avatar, color: r.color, csat: Math.round(Number(r.avg_csat) * 10) / 10, rated: Number(r.rated) }));
  res.json({ csat: { avgCsat, totalRated, totalResolved, responseRate, nps, distribution, byAgent } });
});

router.get('/trends', auth, async (req, res) => {
  const aid = req.agent.id;
  const trendRows = await db.query(`SELECT YEARWEEK(created_at, 1) as yw, COUNT(*) as inbound, SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved, AVG(CASE WHEN csat_score IS NOT NULL THEN csat_score ELSE NULL END) as csat FROM conversations WHERE agent_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK) GROUP BY YEARWEEK(created_at, 1) ORDER BY yw ASC`, [aid]);
  const trendMap = {};
  for (const row of trendRows) { trendMap[row.yw] = { week: `W${String(row.yw).slice(-2)}`, inbound: Number(row.inbound), resolved: Number(row.resolved), csat: row.csat != null ? Number(row.csat).toFixed(1) : 'N/A' }; }
  const data = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(Date.now() - i * 7 * 86400000); const jan1 = new Date(d.getFullYear(), 0, 1); const dayOfYear = Math.ceil((d - jan1) / 86400000) + 1; const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7); const yw = d.getFullYear() * 100 + weekNum; data.push(trendMap[yw] || { week: `W${String(weekNum).padStart(2, '0')}`, inbound: 0, resolved: 0, csat: 'N/A' }); }
  res.json({ trends: data });
});

router.get('/labels', auth, async (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '1y' ? 365 : period === '90d' ? 90 : period === '30d' ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  const aid = req.agent.id;
  const labels = await db.prepare('SELECT * FROM labels WHERE agent_id=?').all(aid);
  const stats = [];
  for (const l of labels) { const row = await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND labels LIKE ? AND created_at >= ?").get(aid, `%"${l.title}"%`, since); stats.push({ label: l, count: row.c }); }
  res.json({ labels: stats });
});

module.exports = router;
