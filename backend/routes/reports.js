const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/overview', auth, async (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const total = (await db.prepare('SELECT COUNT(*) as c FROM conversations WHERE created_at >= ?').get(since)).c;
  const resolved = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='resolved' AND updated_at >= ?").get(since)).c;
  const open = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='open'").get()).c;
  const urgent = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE priority='urgent' AND status='open'").get()).c;

  // Real daily breakdown from the database
  const dailyRows = await db.query(
    `SELECT DATE(created_at) as d,
            COUNT(*) as conversations,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
            COALESCE(AVG(
              CASE WHEN first_reply_at IS NOT NULL
                THEN TIMESTAMPDIFF(MINUTE, created_at, first_reply_at)
                ELSE NULL
              END
            ), 0) as avgResponse
     FROM conversations
     WHERE created_at >= ?
     GROUP BY DATE(created_at)
     ORDER BY d ASC`,
    [since]
  );

  // Build a map from the query results
  const dailyMap = {};
  for (const row of dailyRows) {
    const key = typeof row.d === 'string' ? row.d : new Date(row.d).toISOString().slice(0, 10);
    dailyMap[key] = {
      date: key,
      conversations: Number(row.conversations),
      resolved: Number(row.resolved),
      avgResponse: Math.round(Number(row.avgResponse)),
    };
  }

  // Fill in all days in the range (0 for missing days)
  const dailyData = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - i - 1) * 86400000).toISOString().slice(0, 10);
    dailyData.push(dailyMap[date] || { date, conversations: 0, resolved: 0, avgResponse: 0 });
  }

  res.json({
    overview: { total, resolved, open, urgent, resolutionRate: total ? Math.round((resolved / total) * 100) : 0 },
    daily: dailyData,
  });
});

router.get('/agents', auth, async (req, res) => {
  const agents = await db.prepare('SELECT * FROM agents').all();
  const stats = [];

  for (const a of agents) {
    const assigned = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE assignee_id=?").get(a.id)).c;
    const resolvedCount = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE assignee_id=? AND status='resolved'").get(a.id)).c;
    const openCount = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE assignee_id=? AND status='open'").get(a.id)).c;

    // Average response time: average minutes between conversation created_at and first_reply_at for this agent
    const rtRow = await db.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, c.created_at, c.first_reply_at)) as avg_rt
       FROM conversations c
       WHERE c.assignee_id = ? AND c.first_reply_at IS NOT NULL`,
      [a.id], true
    );
    const avgResponseTime = rtRow && rtRow.avg_rt != null
      ? `${Math.round(rtRow.avg_rt)}m`
      : 'N/A';

    // Average CSAT for conversations assigned to this agent
    const csatRow = await db.query(
      'SELECT AVG(csat_score) as avg_csat FROM conversations WHERE assignee_id = ? AND csat_score IS NOT NULL',
      [a.id], true
    );
    const csat = csatRow && csatRow.avg_csat != null
      ? Number(csatRow.avg_csat).toFixed(1)
      : 'N/A';

    stats.push({
      agent: { id: a.id, name: a.name, avatar: a.avatar, color: a.color },
      assigned,
      resolved: resolvedCount,
      open: openCount,
      avgResponseTime,
      csat,
    });
  }

  res.json({ agents: stats });
});

router.get('/channels', auth, async (req, res) => {
  const inboxes = await db.prepare('SELECT * FROM inboxes WHERE active=1').all();
  const stats = [];

  for (const i of inboxes) {
    const conversations = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE inbox_id=?").get(i.id)).c;
    const resolvedCount = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE inbox_id=? AND status='resolved'").get(i.id)).c;

    // Average response time for conversations in this inbox
    const rtRow = await db.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, c.created_at, c.first_reply_at)) as avg_rt
       FROM conversations c
       WHERE c.inbox_id = ? AND c.first_reply_at IS NOT NULL`,
      [i.id], true
    );
    const avgResponseTime = rtRow && rtRow.avg_rt != null
      ? `${Math.round(rtRow.avg_rt)}m`
      : 'N/A';

    stats.push({
      inbox: { id: i.id, name: i.name, type: i.type, color: i.color },
      conversations,
      resolved: resolvedCount,
      avgResponseTime,
    });
  }

  res.json({ channels: stats });
});

router.get('/sla', auth, async (req, res) => {
  const total = (await db.prepare('SELECT COUNT(*) as c FROM conversations').get()).c;

  // Get the default SLA threshold (first_response_minutes) from sla_policies; fall back to 60 minutes
  const slaRow = await db.query(
    'SELECT first_response_minutes FROM sla_policies ORDER BY created_at ASC LIMIT 1',
    [], true
  );
  const slaThresholdMinutes = (slaRow && slaRow.first_response_minutes) || 60;

  // Breached: first reply took longer than SLA, OR no first reply and conversation is older than SLA threshold
  const breachedRow = await db.query(
    `SELECT COUNT(*) as c FROM conversations
     WHERE (first_reply_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, first_reply_at) > ?)
        OR (first_reply_at IS NULL AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > ?)`,
    [slaThresholdMinutes, slaThresholdMinutes], true
  );
  const breached = breachedRow ? breachedRow.c : 0;

  // Compliant: first reply within SLA threshold
  const compliantRow = await db.query(
    `SELECT COUNT(*) as c FROM conversations
     WHERE first_reply_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, first_reply_at) <= ?`,
    [slaThresholdMinutes], true
  );
  const compliant = compliantRow ? compliantRow.c : 0;

  // At risk: no first reply yet but still within threshold
  const atRisk = total - breached - compliant;

  // By priority breakdown
  const priorities = ['urgent', 'high', 'normal'];
  const byPriority = [];
  for (const p of priorities) {
    const pTotal = (await db.query(
      'SELECT COUNT(*) as c FROM conversations WHERE priority = ?',
      [p], true
    )).c;
    const pBreached = (await db.query(
      `SELECT COUNT(*) as c FROM conversations
       WHERE priority = ?
         AND ((first_reply_at IS NOT NULL AND TIMESTAMPDIFF(MINUTE, created_at, first_reply_at) > ?)
           OR (first_reply_at IS NULL AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > ?))`,
      [p, slaThresholdMinutes, slaThresholdMinutes], true
    )).c;
    byPriority.push({ priority: p, total: pTotal, breached: pBreached });
  }

  res.json({
    sla: {
      total,
      breached,
      atRisk: atRisk > 0 ? atRisk : 0,
      compliant,
      byPriority,
    }
  });
});

router.get('/trends', auth, async (req, res) => {
  // Last 12 weeks of real conversation data
  const trendRows = await db.query(
    `SELECT
       YEARWEEK(created_at, 1) as yw,
       MIN(DATE(created_at)) as week_start,
       COUNT(*) as inbound,
       SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
       AVG(CASE WHEN csat_score IS NOT NULL THEN csat_score ELSE NULL END) as csat
     FROM conversations
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
     GROUP BY YEARWEEK(created_at, 1)
     ORDER BY yw ASC`
  );

  // Build a map keyed by YEARWEEK
  const trendMap = {};
  for (const row of trendRows) {
    trendMap[row.yw] = {
      week: `W${String(row.yw).slice(-2)}`,
      inbound: Number(row.inbound),
      resolved: Number(row.resolved),
      csat: row.csat != null ? Number(row.csat).toFixed(1) : 'N/A',
    };
  }

  // Generate the 12-week range so we have entries for empty weeks too
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000);
    // Calculate YEARWEEK the same way MySQL does with mode 1 (ISO weeks)
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((d - jan1) / 86400000) + 1;
    const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
    const yw = d.getFullYear() * 100 + weekNum;

    if (trendMap[yw]) {
      data.push(trendMap[yw]);
    } else {
      data.push({
        week: `W${String(weekNum).padStart(2, '0')}`,
        inbound: 0,
        resolved: 0,
        csat: 'N/A',
      });
    }
  }

  res.json({ trends: data });
});

router.get('/labels', auth, async (req, res) => {
  const labels = await db.prepare('SELECT * FROM labels').all();
  const stats = [];
  for (const l of labels) {
    const row = await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE labels LIKE ?").get(`%"${l.title}"%`);
    stats.push({ label: l, count: row.c });
  }
  res.json({ labels: stats });
});

module.exports = router;
