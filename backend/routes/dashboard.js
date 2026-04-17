'use strict';
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

const wrap = fn => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (e) { console.error('dashboard error:', e.message); res.status(500).json({ error: e.message }); }
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// GET /api/dashboard/kpis
router.get('/kpis', auth, wrap(async (req, res) => {
  const aid = req.agent.id;

  const [totalRow, openRow, urgentRow, unassignedRow, unreadRow, contactsRow, resolvedAllRow] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM conversations WHERE agent_id=?').get(aid),
    db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='open'").get(aid),
    db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND priority IN ('urgent','high') AND status='open'").get(aid),
    db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='open' AND (assignee_id IS NULL OR assignee_id='')").get(aid),
    db.prepare('SELECT COALESCE(SUM(unread_count),0) as c FROM conversations WHERE agent_id=?').get(aid),
    db.prepare('SELECT COUNT(*) as c FROM contacts WHERE agent_id=?').get(aid),
    db.prepare("SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved'").get(aid),
  ]);

  const totalConvs   = totalRow?.c || 0;
  const openConvs    = openRow?.c || 0;
  const urgentConvs  = urgentRow?.c || 0;
  const unassigned   = unassignedRow?.c || 0;
  const unreadTotal  = unreadRow?.c || 0;
  const totalContacts = contactsRow?.c || 0;
  const resolvedAll  = resolvedAllRow?.c || 0;

  // MySQL date functions via db.query
  const resolvedTodayRow = await db.query(
    "SELECT COUNT(*) as c FROM conversations WHERE agent_id=? AND status='resolved' AND DATE(updated_at)=CURDATE()",
    [aid], true
  );
  const todayMsgRow = await db.query(
    "SELECT COUNT(*) as c FROM messages m JOIN conversations c ON m.conversation_id=c.id WHERE c.agent_id=? AND DATE(m.created_at)=CURDATE()",
    [aid], true
  );
  const csatRow = await db.query(
    'SELECT AVG(csat_score) as avg_csat FROM conversations WHERE agent_id=? AND csat_score IS NOT NULL',
    [aid], true
  );
  const rtRow = await db.query(
    `SELECT AVG(TIMESTAMPDIFF(SECOND, c.created_at, m.created_at)) as avg_rt
     FROM conversations c
     INNER JOIN messages m ON m.conversation_id=c.id AND m.role='agent'
       AND m.id=(SELECT m2.id FROM messages m2 WHERE m2.conversation_id=c.id AND m2.role='agent' ORDER BY m2.created_at ASC LIMIT 1)
     WHERE c.agent_id=?`,
    [aid], true
  );

  const avgCsat       = csatRow?.avg_csat != null ? parseFloat(Number(csatRow.avg_csat).toFixed(1)) : 0;
  const resolutionRate = totalConvs > 0 ? Math.round((resolvedAll / totalConvs) * 100) : 0;
  let responseTime = 'N/A';
  if (rtRow?.avg_rt != null) {
    const sec = Math.round(rtRow.avg_rt);
    responseTime = `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }

  // Channel breakdown — open convs per inbox type
  const channelBreakdown = await db.prepare(
    `SELECT i.type, i.name, COUNT(c.id) as convs
     FROM inboxes i
     LEFT JOIN conversations c ON c.inbox_id=i.id AND c.agent_id=? AND c.status='open'
     WHERE i.agent_id=?
     GROUP BY i.id, i.type, i.name
     ORDER BY convs DESC LIMIT 6`
  ).all(aid, aid);

  res.json({
    kpis: {
      openConversations:   openConvs,
      urgentConversations: urgentConvs,
      resolvedToday:       resolvedTodayRow?.c || 0,
      unassigned,
      unreadTotal,
      totalContacts,
      avgCsat,
      responseTime,
      resolutionRate,
      todayMessages:       todayMsgRow?.c || 0,
      channelBreakdown:    channelBreakdown || [],
    }
  });
}));

// GET /api/dashboard/activity-feed
router.get('/activity-feed', auth, wrap(async (req, res) => {
  const aid = req.agent.id;

  const rows = await db.prepare(
    `SELECT c.id, c.status, c.priority, c.updated_at, c.subject, c.channel as ch, c.unread_count as unread,
            ct.name as contact_name, ct.color as contact_color, ct.avatar as contact_av
     FROM conversations c
     LEFT JOIN contacts ct ON c.contact_id=ct.id
     WHERE c.agent_id=?
     ORDER BY c.updated_at DESC LIMIT 12`
  ).all(aid);

  const prColor = { urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#6b7280' };

  const activity = rows.map(cv => ({
    id:     cv.id,
    convId: cv.id,
    icon:   cv.unread > 0 ? '💬'
            : cv.status === 'resolved' ? '✅'
            : cv.status === 'pending'  ? '⏳'
            : '💬',
    text:   cv.unread > 0
            ? `${cv.contact_name || 'Contact'} sent a message`
            : cv.status === 'resolved'
              ? `Resolved — ${cv.contact_name || 'Contact'}`
              : `${cv.contact_name || 'Contact'} · ${cv.subject || 'New message'}`,
    sub:    cv.subject || '',
    ch:     cv.ch,
    time:   timeAgo(cv.updated_at),
    color:  prColor[cv.priority] || '#3b82f6',
  }));

  res.json({ activity });
}));

module.exports = router;
