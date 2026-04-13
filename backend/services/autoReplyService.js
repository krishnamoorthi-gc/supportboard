'use strict';

const db = require('../db');
const { uid } = require('../utils/helpers');

const ANTHROPIC_KEY = () => process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(systemPrompt, messages, maxTokens = 600) {
  const apiKey = ANTHROPIC_KEY();
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    console.warn('[autoReply] ANTHROPIC_API_KEY not configured — skipping AI reply');
    return null;
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.warn('[autoReply] Claude API error:', res.status, errBody?.error?.message || '');
    return null;
  }
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || null;
}

/**
 * Check if AI auto-reply is enabled for the inbox owner and, if so,
 * generate + save + send an AI reply to the latest customer message.
 *
 * Runs fully async — never throws to the caller.
 */
async function triggerAutoReply(opts) {
  const { conversationId, inboxId, agentId, channel, customerMessage, contactEmail, inReplyToMsgId, subject } = opts;
  try {
    if (!agentId) {
      console.warn('[autoReply] No agentId for inbox', inboxId, '— skipping');
      return;
    }

    // 1. Load aibot_config — auto-reply must be enabled
    const cfg = await db.prepare('SELECT * FROM aibot_config WHERE agent_id=?').get(agentId);
    if (!cfg) {
      console.log('[autoReply] No aibot_config for agent', agentId, '— skipping');
      return;
    }
    if (!cfg.ai_auto_reply) {
      console.log('[autoReply] ai_auto_reply disabled for agent', agentId, '— skipping');
      return;
    }

    // Per-channel check: only block if channel is explicitly set to false
    // If the main toggle is on and no per-channel setting exists, we reply
    let channels = {};
    try { channels = JSON.parse(cfg.channels || '{}'); } catch {}
    if (Object.keys(channels).length > 0 && channels[channel] === false) {
      console.log(`[autoReply] Channel "${channel}" disabled for agent ${agentId} — skipping`);
      return;
    }

    console.log(`[autoReply] Generating AI reply for conv ${conversationId} (${channel})...`);

    // 2. Build FAQ context
    const faqs = await db.prepare('SELECT question, answer FROM aibot_faqs WHERE agent_id=? LIMIT 30').all(agentId);
    const faqText = faqs.length
      ? '\n\nKnowledge base:\n' + faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
      : '';

    // 3. Recent conversation history for multi-turn context
    const recentMsgs = await db.prepare(
      'SELECT role, text FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 8'
    ).all(conversationId);
    const history = recentMsgs.reverse()
      .filter(m => m.text)
      .map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text }));

    // Claude requires messages to alternate roles and start with 'user'
    // Deduplicate consecutive same-role messages
    const deduped = [];
    for (const m of history) {
      if (deduped.length && deduped[deduped.length - 1].role === m.role) {
        deduped[deduped.length - 1].content += '\n' + m.content;
      } else {
        deduped.push({ ...m });
      }
    }
    // Ensure starts with user
    if (deduped.length && deduped[0].role !== 'user') deduped.shift();

    const messagesForClaude = deduped.length
      ? deduped
      : [{ role: 'user', content: customerMessage || 'Hello' }];

    const sysPrompt = (cfg.sys_prompt || 'You are a helpful customer support assistant.').trim()
      + faqText
      + `\n\nReply via ${channel}. Be concise and professional. Do not use placeholder text.`;

    // 4. Small delay so the reply doesn't appear instant
    await new Promise(r => setTimeout(r, 1500));

    const replyText = await callClaude(sysPrompt, messagesForClaude);
    if (!replyText) {
      console.warn('[autoReply] No reply generated — Claude returned empty');
      return;
    }

    // 5. Persist agent message
    const msgId = uid();
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.prepare(
      'INSERT INTO messages (id,conversation_id,role,text,agent_id,is_read,created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(msgId, conversationId, 'agent', replyText, agentId, 1, nowStr);
    await db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(nowStr, conversationId);

    // 6. Send outbound email if email channel
    if (channel === 'email' && contactEmail) {
      try {
        const { sendEmail } = require('./emailService');
        await sendEmail({
          inboxId,
          to: contactEmail,
          subject: subject
            ? (subject.startsWith('Re:') ? subject : 'Re: ' + subject)
            : 'Re: Your support request',
          text: replyText,
          inReplyTo: inReplyToMsgId || undefined,
        });
        console.log('[autoReply] Email sent to', contactEmail);
      } catch (emailErr) {
        console.warn('[autoReply] Email send failed (non-fatal):', emailErr.message);
      }
    }

    // 7. Broadcast so the inbox UI shows the reply immediately
    try {
      const { broadcastToAll } = require('../ws');
      broadcastToAll({
        type: 'new_message',
        conversationId,
        message: {
          id: msgId,
          conversation_id: conversationId,
          role: 'agent',
          text: replyText,
          agent_id: agentId,
          is_read: 1,
          created_at: nowStr,
        },
      });
    } catch {}

    console.log(`[autoReply] AI reply sent → conversation ${conversationId} (${channel})`);
  } catch (err) {
    console.warn('[autoReply] Failed (non-fatal):', err.message, err.stack);
  }
}

module.exports = { triggerAutoReply };
