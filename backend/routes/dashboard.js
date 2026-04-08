const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/dashboard/kpis
router.get('/kpis', auth, async (req, res) => {
  const totalConvs = (await db.prepare('SELECT COUNT(*) as c FROM conversations').get()).c;
  const openConvs = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='open'").get()).c;
  const resolvedToday = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='resolved' AND date(updated_at)=date('now')").get()).c;
  const urgentConvs = (await db.prepare("SELECT COUNT(*) as c FROM conversations WHERE priority='urgent' AND status='open'").get()).c;
  const totalContacts = (await db.prepare('SELECT COUNT(*) as c FROM contacts').get()).c;
  const totalDeals = (await db.prepare('SELECT COUNT(*) as c FROM deals').get()).c;
  const dealsValue = (await db.prepare("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage != 'Closed Lost'").get()).v;
  const avgCsat = 4.2;
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
      responseTime: '4m 32s',
      resolutionRate: 87,
    }
  });
});

// GET /api/dashboard/activity
router.get('/activity', auth, async (req, res) => {
  const recentConvs = await db.prepare(`
    SELECT c.*, ct.name as contact_name, ct.color as contact_color
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    ORDER BY c.updated_at DESC LIMIT 10
  `).all();
  res.json({ activity: recentConvs });
});

module.exports = router;
