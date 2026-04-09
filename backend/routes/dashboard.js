const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/dashboard/kpis
router.get('/kpis', auth, async (req, res) => {
  const aid = req.agent.id;
  const totalConvs = (await db.prepare('SELECT COUNT(*) as c FROM conversations WHERE agent_id=?').get(aid)).c;
  const openConvs = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='open'").get(aid)).c;
  const resolvedToday = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved' AND date(updated_at)=date('now')").get(aid)).c;
  const urgentConvs = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND priority='urgent' AND status='open'").get(aid)).c;
  const totalContacts = (await db.prepare('SELECT COUNT(*) as c FROM contacts WHERE agent_id=?').get(aid)).c;
  const totalDeals = (await db.prepare('SELECT COUNT(*) as c FROM deals WHERE agent_id=?').get(aid)).c;
  const dealsValue = (await db.prepare("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE agent_id=? AND stage != 'Closed Lost'").get(aid)).v;

  // Average CSAT score from conversations that have a rating
  const csatRow = await db.query(
    'SELECT AVG(csat_score) as avg_csat FROM conversations WHERE agent_id=? AND csat_score IS NOT NULL',
    [aid], true
  );
  const avgCsat = csatRow && csatRow.avg_csat != null
    ? parseFloat(Number(csatRow.avg_csat).toFixed(1))
    : 0;

  // Average response time: average seconds between conversation created_at and first agent message created_at
  const rtRow = await db.query(
    `SELECT AVG(TIMESTAMPDIFF(SECOND, c.created_at, m.created_at)) as avg_rt
     FROM conversations c
     INNER JOIN messages m ON m.conversation_id = c.id
       AND m.role = 'agent'
       AND m.id = (
         SELECT m2.id FROM messages m2
         WHERE m2.conversation_id = c.id AND m2.role = 'agent'
         ORDER BY m2.created_at ASC LIMIT 1
       )
     WHERE c.agent_id = ?`,
    [aid], true
  );
  let responseTime = 'N/A';
  if (rtRow && rtRow.avg_rt != null) {
    const totalSec = Math.round(rtRow.avg_rt);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    responseTime = `${mins}m ${secs}s`;
  }

  // Resolution rate: resolved / total * 100
  const resolvedAll = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved'").get(aid)).c;
  const resolutionRate = totalConvs > 0 ? Math.round((resolvedAll / totalConvs) * 100) : 0;

  res.json({
    kpis: {
      totalConversations: totalConvs,
      openConversations: openConvs,
      resolvedToday,
      urgentConversations: urgentConvs,
      totalContacts,
      totalDeals,
      pipelineValue: dealsValue,
      avgCsat,
      responseTime,
      resolutionRate,
    }
  });
});

// GET /api/dashboard/activity
router.get('/activity', auth, async (req, res) => {
  const recentConvs = await db.prepare(`
    SELECT c.*, ct.name as contact_name, ct.color as contact_color
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    WHERE c.agent_id=?
    ORDER BY c.updated_at DESC LIMIT 10
  `).all(req.agent.id);
  res.json({ activity: recentConvs });
});

module.exports = router;
