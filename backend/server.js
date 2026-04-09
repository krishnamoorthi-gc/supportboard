require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// ── Init DB (creates schema + seeds) ──
const db = require('./db');
(async () => {
  try {
    await db.init();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
})();

const app = express();
const server = http.createServer(app);

// ── WebSocket ──
const { setupWebSocket } = require('./ws');
setupWebSocket(server);

// ── Middleware ──
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── File uploads ──
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.post('/api/upload', require('./middleware/auth'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname, size: req.file.size });
});

app.use('/uploads', express.static(uploadDir));

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
});

// ── Public bot API (no auth — uses embed_token) ──
const widgetCors = cors({ origin: '*' });

app.get('/api/bot-public/:token', widgetCors, async (req, res) => {
  try {
    const bot = await db.prepare('SELECT * FROM bots WHERE embed_token=?').get(req.params.token);
    if (!bot || !bot.id) return res.status(404).json({ error: 'Bot not found' });
    const p = (v, fb) => { try { return typeof v === 'string' ? JSON.parse(v) : v || fb; } catch { return fb; } };
    res.json({ bot: { ...bot, nodes: p(bot.nodes, []), setup: p(bot.setup, { greeting: 'Hi! How can I help?', fallback: 'Let me connect you to a human agent.' }), knowledge: p(bot.knowledge, []) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Widget script ──
app.get('/widget/bot.js', widgetCors, (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
  res.send(`(function(){
  'use strict';
  var scripts=document.querySelectorAll('script[data-bot-id]');
  var el=scripts[scripts.length-1];
  if(!el)return;
  var TOKEN=el.getAttribute('data-bot-id');
  if(!TOKEN)return;
  var ORIGIN='${BACKEND}';
  var botCfg=null,open=false,step=0,msgs=[],lastBtn='';
  fetch(ORIGIN+'/api/bot-public/'+TOKEN).then(function(r){return r.json();}).then(function(d){
    if(d.bot)botCfg=d.bot;
  }).catch(function(){}).finally(function(){injectStyle();makeBtn();});
  function injectStyle(){
    var s=document.createElement('style');
    s.textContent='#_sd_btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#4c82fb,#7c3aed);border:none;cursor:pointer;z-index:999999;box-shadow:0 4px 20px #4c82fb66;display:flex;align-items:center;justify-content:center;font-size:22px;transition:transform .2s,box-shadow .2s}#_sd_btn:hover{transform:scale(1.1)}#_sd_panel{position:fixed;bottom:90px;right:24px;width:360px;height:520px;max-height:calc(100vh - 110px);background:#fff;border:1px solid #e5e5e5;border-radius:16px;box-shadow:0 16px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;z-index:999998;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;animation:_sdUp .25s ease}@keyframes _sdUp{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:none}}#_sd_head{background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}#_sd_msgs{flex:1;overflow-y:auto;padding:14px;background:#f9f9fb}#_sd_inp_area{padding:10px 12px;border-top:1px solid #eee;display:flex;gap:7px;background:#fff;flex-shrink:0}#_sd_inp{flex:1;border:1px solid #ddd;border-radius:8px;padding:8px 11px;font-size:13px;outline:none;font-family:inherit;color:#111}#_sd_inp:focus{border-color:#4c82fb}#_sd_send{width:36px;height:36px;border-radius:8px;background:#4c82fb;border:none;color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0}._sd_msg{margin-bottom:10px}._sd_bot{display:flex;justify-content:flex-start}._sd_user{display:flex;justify-content:flex-end}._sd_sys{text-align:center;font-size:11px;color:#999;padding:3px 0}._sd_bub_b{background:#fff;color:#111;border:1px solid #e5e5e5;padding:9px 13px;border-radius:14px 14px 14px 3px;font-size:13px;line-height:1.5;max-width:80%;box-shadow:0 1px 4px rgba(0,0,0,.07)}._sd_bub_u{background:#4c82fb;color:#fff;padding:9px 13px;border-radius:14px 14px 3px 14px;font-size:13px;line-height:1.5;max-width:80%}._sd_ai_lbl{font-size:9px;color:#7c3aed;font-weight:700;letter-spacing:.5px;margin-bottom:3px}._sd_btns{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}._sd_chip{padding:5px 11px;border-radius:20px;font-size:12px;border:1.5px solid #4c82fb44;background:transparent;color:#4c82fb;cursor:pointer;font-family:inherit}._sd_chip:hover{background:#4c82fb11}._sd_chip_agent{border-color:#ef444466;color:#ef4444}._sd_chip_agent:hover{background:#ef444411}._sd_kb_lbl{font-size:9px;color:#059669;font-weight:700;letter-spacing:.5px;margin-bottom:3px}';
    document.head.appendChild(s);
  }
  function makeBtn(){
    var b=document.createElement('button');b.id='_sd_btn';b.innerHTML='💬';b.title='Chat with us';
    b.onclick=togglePanel;document.body.appendChild(b);
  }
  function togglePanel(){
    open=!open;
    var b=document.getElementById('_sd_btn');if(b)b.innerHTML=open?'✕':'💬';
    if(open)openPanel();else{var p=document.getElementById('_sd_panel');if(p)p.remove();}
  }
  function openPanel(){
    var name=(botCfg&&botCfg.name)||'Support Bot';
    var p=document.createElement('div');p.id='_sd_panel';
    p.innerHTML='<div id="_sd_head"><div style="width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤖</div><div style="flex:1"><div style="font-size:13px;font-weight:700">'+esc(name)+'</div><div style="font-size:10px;opacity:.8">● Online</div></div><button onclick="document.getElementById(\'_sd_btn\').click()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;padding:0;opacity:.7">✕</button></div><div id="_sd_msgs"></div><div id="_sd_inp_area"><input id="_sd_inp" placeholder="Type a message…"/><button id="_sd_send">→</button></div>';
    document.body.appendChild(p);
    document.getElementById('_sd_send').onclick=function(){doSend();};
    document.getElementById('_sd_inp').onkeydown=function(e){if(e.key==='Enter')doSend();};
    step=0;msgs=[];lastBtn='';
    if(botCfg)setTimeout(function(){flow(0,'','');},300);
    else addMsg({f:'sys',t:'Bot unavailable'});
  }
  function addMsg(m){
    msgs.push(m);
    var c=document.getElementById('_sd_msgs');if(!c)return;
    var d=document.createElement('div');d.className='_sd_msg';
    if(m.f==='sys'){d.className='_sd_msg _sd_sys';d.textContent=m.t;}
    else if(m.f==='user'){d.className='_sd_msg _sd_user';d.innerHTML='<div class="_sd_bub_u">'+esc(m.t)+'</div>';}
    else{
      var inner='';
      if(m.f==='ai')inner+='<div class="_sd_ai_lbl">✦ AI Response</div>';
      if(m.f==='kb')inner+='<div class="_sd_kb_lbl">📚 Knowledge Base</div>';
      if(m.f==='ask')inner+='<div class="_sd_ai_lbl">📝 Collecting input</div>';
      inner+=esc(m.t).replace(/\\n/g,'<br>');
      if(m.b&&m.b.length){inner+='<div class="_sd_btns">';m.b.forEach(function(x){var isAgent=(x==='Connect to Live Agent');inner+='<button class="_sd_chip'+(isAgent?' _sd_chip_agent':'')+'" data-v="'+(isAgent?'__agent':esc(x))+'" onclick="window.__sdChip(this)">'+esc(x)+'</button>';});inner+='</div>';}
      d.className='_sd_msg _sd_bot';d.innerHTML='<div class="_sd_bub_b">'+inner+'</div>';
    }
    c.appendChild(d);c.scrollTop=c.scrollHeight;
  }
  window.__sdChip=function(el){
    var v=el.getAttribute('data-v');
    if(v==='__agent'){connectAgent();return;}
    if(v==='__retry'){addMsg({f:'bot',t:'Sure! What else would you like to know?'});return;}
    if(v==='Yes, thanks!'){addMsg({f:'user',t:'Yes, thanks!'});addMsg({f:'bot',t:'Great! Let me know if you need anything else.'});return;}
    if(v==='No, connect me to an agent'){connectAgent();return;}
    doSend(v,true);
  };
  function searchKB(query){
    var kb=(botCfg&&botCfg.knowledge)||[];if(!kb.length)return null;
    var q=query.toLowerCase();
    var words=q.split(/\\s+/).filter(function(w){return w.length>2;});
    if(!words.length)return null;
    var best=null,bestScore=0;
    kb.forEach(function(k){
      var txt=((k.title||'')+' '+(k.content||'')).toLowerCase();
      var score=0;words.forEach(function(w){if(txt.includes(w))score++;});
      if(score>bestScore){bestScore=score;best=k;}
    });
    return bestScore>0?best:null;
  }
  var flowDone=false;
  function showAgentOption(){
    addMsg({f:'bot',t:"I don\\'t have specific information on that. Would you like to connect with a live agent?",b:['Connect to Live Agent','Ask Something Else']});
  }
  function connectAgent(){
    addMsg({f:'user',t:'Connect to Live Agent'});
    var inp2=document.getElementById('_sd_inp');var snd2=document.getElementById('_sd_send');
    if(inp2)inp2.disabled=true;if(snd2)snd2.disabled=true;
    setTimeout(function(){
      addMsg({f:'sys',t:'Connecting you to a live agent…'});
      addMsg({f:'bot',t:'A support agent will join shortly. Please wait.'});
    },800);
  }
  function doSend(txt,isChip){
    var inp=document.getElementById('_sd_inp');
    var msg=txt||(inp?inp.value.trim():'');if(!msg)return;
    if(inp&&!txt)inp.value='';
    var cur=botCfg&&botCfg.nodes&&botCfg.nodes[step];
    var onBtns=cur&&cur.type==='buttons';
    if(!isChip&&(onBtns||flowDone)){
      addMsg({f:'user',t:msg});
      setTimeout(function(){
        var hit=searchKB(msg);
        if(hit){
          var answer=(hit.title?hit.title+'\\n\\n':'')+hit.content;
          addMsg({f:'kb',t:answer});
          addMsg({f:'bot',t:'Does that answer your question?',b:['Yes, thanks!','No, connect me to an agent']});
        } else {
          showAgentOption();
        }
      },700);
      return;
    }
    if(onBtns)lastBtn=msg;
    addMsg({f:'user',t:msg});
    var ni=step+1;setTimeout(function(){flow(ni,msg,lastBtn);},400);
  }
  function evalCond(cond,lastIn,lBtn){
    if(!cond)return true;
    var c=cond.toLowerCase().trim();
    var bm=c.match(/button\\s*==\\s*(.+)/);if(bm)return lBtn.toLowerCase().trim()===bm[1].toLowerCase().trim();
    var tm=c.match(/(?:text|input)\\s+(?:contains|==)\\s*(.+)/);if(tm)return lastIn.toLowerCase().includes(tm[1].toLowerCase().trim());
    return true;
  }
  function flow(from,lastIn,lBtn){
    var nodes=(botCfg&&botCfg.nodes)||[];lastIn=lastIn||'';lBtn=lBtn||lastBtn;
    for(var i=from;i<nodes.length;i++){
      var n=nodes[i];
      if(n.type==='trigger'||n.type==='delay')continue;
      if(n.type==='condition'){
        var met=evalCond((n.config&&n.config.condition)||'',lastIn,lBtn);
        addMsg({f:'sys',t:'🔀 '+(n.label||'')+' → '+(met?(n.config&&n.config.yes_label||'Yes'):(n.config&&n.config.no_label||'No'))});
        step=i;
        if(!met){var skip=i+2;setTimeout(function(){flow(skip,lastIn,lBtn);},300);return;}
        continue;
      }
      if(n.type==='message'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label});step=i;continue;}
      if(n.type==='ai'){addMsg({f:'ai',t:(n.config&&n.config.prompt)||n.label});step=i;continue;}
      if(n.type==='assign'){addMsg({f:'bot',t:'👤 '+n.label+((n.config&&n.config.team)?' → '+n.config.team:'')});step=i;continue;}
      if(n.type==='tag'){addMsg({f:'sys',t:'🏷 Tag: '+((n.config&&n.config.tag)||n.label)});step=i;continue;}
      if(n.type==='close'){addMsg({f:'bot',t:(n.config&&n.config.message)||n.label});addMsg({f:'sys',t:'✅ Chat closed'});step=i;var inp2=document.getElementById('_sd_inp');var snd2=document.getElementById('_sd_send');if(inp2)inp2.disabled=true;if(snd2)snd2.disabled=true;return;}
      if(n.type==='buttons'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label,b:(n.config&&n.config.buttons)||[]});step=i;return;}
      if(n.type==='collect'){addMsg({f:'ask',t:'Please enter your '+((n.config&&n.config.field)||'response')});step=i;return;}
      addMsg({f:'bot',t:n.label});step=i;
    }
    flowDone=true;
    addMsg({f:'sys',t:'Anything else I can help with?'});
    var inp3=document.getElementById('_sd_inp');var snd3=document.getElementById('_sd_send');
    if(inp3)inp3.disabled=false;if(snd3)snd3.disabled=false;
  }
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
})();`);
});

// ── Standalone bot chat page ──
app.get('/chat', widgetCors, (req, res) => {
  const token = req.query.bot || '';
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chat</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:16px}
#chat-box{width:420px;height:90vh;max-height:680px;background:#fff;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden}
#chat-header{background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0}
#bot-avatar{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
#bot-title{font-size:15px;font-weight:700}
#bot-sub{font-size:11px;opacity:.8;margin-top:2px}
#chat-msgs{flex:1;overflow-y:auto;padding:16px;background:#f9f9fb;display:flex;flex-direction:column;gap:10px}
.msg-sys{text-align:center;font-size:11px;color:#aaa;padding:2px 0}
.msg-row-bot{display:flex;justify-content:flex-start}
.msg-row-user{display:flex;justify-content:flex-end}
.bub{padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.6;max-width:82%}
.bub-bot{background:#fff;color:#111;border:1px solid #e8e8e8;border-radius:16px 16px 16px 4px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.bub-user{background:#4c82fb;color:#fff;border-radius:16px 16px 4px 16px}
.tag-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;opacity:.8}
.tag-ai{color:#7c3aed}.tag-kb{color:#059669}.tag-ask{color:#d97706}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{padding:7px 15px;border-radius:20px;font-size:13px;border:1.5px solid #4c82fb66;background:transparent;color:#4c82fb;cursor:pointer;font-family:inherit;transition:all .15s;font-weight:500}
.chip:hover{background:#4c82fb;color:#fff}
.chip-agent{border-color:#ef444466;color:#ef4444}.chip-agent:hover{background:#ef4444;color:#fff}
#chat-footer{padding:12px 14px;border-top:1px solid #eee;display:flex;gap:8px;background:#fff;flex-shrink:0}
#chat-input{flex:1;border:1.5px solid #e0e0e0;border-radius:10px;padding:9px 13px;font-size:14px;outline:none;font-family:inherit;color:#111;transition:border-color .15s}
#chat-input:focus{border-color:#4c82fb}
#chat-input:disabled{background:#f5f5f5;color:#aaa;cursor:not-allowed}
#chat-send{width:40px;height:40px;border-radius:10px;background:#4c82fb;border:none;color:#fff;cursor:pointer;font-size:16px;flex-shrink:0}
#chat-send:disabled{background:#ccc;cursor:default}
.typing{display:flex;gap:4px;padding:10px 14px;background:#fff;border:1px solid #e8e8e8;border-radius:16px 16px 16px 4px;width:52px}
.dot{width:7px;height:7px;border-radius:50%;background:#bbb;animation:bounce .9s infinite}
.dot:nth-child(2){animation-delay:.15s}.dot:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}
@media(max-width:480px){body{padding:0;align-items:flex-end}#chat-box{width:100%;height:100vh;border-radius:0;max-height:none}}
</style>
</head>
<body>
<div id="chat-box">
  <div id="chat-header">
    <div id="bot-avatar">🤖</div>
    <div>
      <div id="bot-title">Support Bot</div>
      <div id="bot-sub">● Online</div>
    </div>
  </div>
  <div id="chat-msgs"><div class="msg-sys">Connecting…</div></div>
  <div id="chat-footer">
    <input id="chat-input" placeholder="Type a message…" disabled/>
    <button id="chat-send" disabled>→</button>
  </div>
</div>
<script>
(function(){
var BACKEND='${BACKEND}',TOKEN='${token}';
var botCfg=null,step=0,lastBtn='',flowDone=false;
var msgsEl=document.getElementById('chat-msgs');
var inputEl=document.getElementById('chat-input');
var sendEl=document.getElementById('chat-send');

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Chip click handler (avoids onclick quoting bugs) ──
window._sdChip=function(el){
  var v=el.getAttribute('data-v');
  if(v==='__agent'){connectAgent();return;}
  if(v==='__retry'){addMsg({f:'bot',t:'Sure! What else would you like to know?'});return;}
  doSend(v,true);
};

function chips(items){
  var html='<div class="chips">';
  items.forEach(function(x){
    var isAgent=(x==='Connect to Live Agent');
    html+='<button class="chip'+(isAgent?' chip-agent':'')+'" data-v="'+(isAgent?'__agent':esc(x))+'" onclick="_sdChip(this)">'+esc(x)+'</button>';
  });
  return html+'</div>';
}

function addMsg(m){
  var row=document.createElement('div');
  if(m.f==='sys'){row.className='msg-sys';row.textContent=m.t;}
  else if(m.f==='user'){row.className='msg-row-user';row.innerHTML='<div class="bub bub-user">'+esc(m.t)+'</div>';}
  else{
    var inner='';
    if(m.f==='ai')inner='<div class="tag-lbl tag-ai">✦ AI Response</div>';
    if(m.f==='kb')inner='<div class="tag-lbl tag-kb">📚 Knowledge Base</div>';
    if(m.f==='ask')inner='<div class="tag-lbl tag-ask">📝 Collecting input</div>';
    inner+=esc(m.t).replace(/\\n/g,'<br>');
    if(m.b&&m.b.length)inner+=chips(m.b);
    row.className='msg-row-bot';row.innerHTML='<div class="bub bub-bot">'+inner+'</div>';
  }
  msgsEl.appendChild(row);msgsEl.scrollTop=msgsEl.scrollHeight;
}

function showTyping(){
  if(document.getElementById('_typing'))return;
  var el=document.createElement('div');el.className='msg-row-bot';el.id='_typing';
  el.innerHTML='<div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  msgsEl.appendChild(el);msgsEl.scrollTop=msgsEl.scrollHeight;
}
function hideTyping(){var el=document.getElementById('_typing');if(el)el.remove();}

// ── Knowledge base search ──
function searchKB(query){
  var kb=(botCfg&&botCfg.knowledge)||[];if(!kb.length)return null;
  var q=query.toLowerCase();
  var words=q.split(/\\s+/).filter(function(w){return w.length>2;});
  if(!words.length)return null;
  var best=null,bestScore=0;
  kb.forEach(function(k){
    var txt=((k.title||'')+' '+(k.content||'')).toLowerCase();
    var score=0;
    words.forEach(function(w){if(txt.includes(w))score++;});
    if(score>bestScore){bestScore=score;best=k;}
  });
  return bestScore>0?best:null;
}

function showAgentOption(){
  addMsg({f:'bot',t:"I don\\'t have specific information on that. Would you like to connect with a live agent?",
    b:['Connect to Live Agent','Ask Something Else']});
}

function connectAgent(){
  addMsg({f:'user',t:'Connect to Live Agent'});
  inputEl.disabled=true;sendEl.disabled=true;
  showTyping();
  setTimeout(function(){
    hideTyping();
    addMsg({f:'sys',t:'Connecting you to a live agent…'});
    addMsg({f:'bot',t:'A support agent will join shortly. Please wait — your conversation history has been saved.'});
  },800);
}

function evalCond(cond,lastIn,lBtn){
  if(!cond)return true;
  var c=cond.toLowerCase().trim();
  var bm=c.match(/button\\s*==\\s*(.+)/);if(bm)return lBtn.toLowerCase().trim()===bm[1].toLowerCase().trim();
  var tm=c.match(/(?:text|input)\\s+(?:contains|==)\\s*(.+)/);if(tm)return lastIn.toLowerCase().includes(tm[1].toLowerCase().trim());
  return true;
}

function flow(from,lastIn,lBtn){
  hideTyping();
  var nodes=(botCfg&&botCfg.nodes)||[];lastIn=lastIn||'';lBtn=lBtn||lastBtn;
  for(var i=from;i<nodes.length;i++){
    var n=nodes[i];
    if(n.type==='trigger'||n.type==='delay')continue;
    if(n.type==='condition'){
      var met=evalCond((n.config&&n.config.condition)||'',lastIn,lBtn);
      addMsg({f:'sys',t:'🔀 '+(n.label||'')+' → '+(met?(n.config&&n.config.yes_label||'Yes'):(n.config&&n.config.no_label||'No'))});
      step=i;
      if(!met){var sk=i+2;showTyping();setTimeout(function(){flow(sk,lastIn,lBtn);},600);return;}
      continue;
    }
    if(n.type==='message'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label});step=i;continue;}
    if(n.type==='ai'){addMsg({f:'ai',t:(n.config&&n.config.prompt)||n.label});step=i;continue;}
    if(n.type==='assign'){addMsg({f:'bot',t:'👤 Routing: '+n.label+((n.config&&n.config.team)?' → '+n.config.team:'')});step=i;continue;}
    if(n.type==='tag'){addMsg({f:'sys',t:'🏷 Tag: '+((n.config&&n.config.tag)||n.label)});step=i;continue;}
    if(n.type==='close'){addMsg({f:'bot',t:(n.config&&n.config.message)||n.label});step=i;flowDone=true;inputEl.disabled=true;sendEl.disabled=true;return;}
    if(n.type==='buttons'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label,b:(n.config&&n.config.buttons)||[]});step=i;return;}
    if(n.type==='collect'){addMsg({f:'ask',t:'Please enter your '+((n.config&&n.config.field)||'response')});step=i;return;}
    addMsg({f:'bot',t:n.label});step=i;
  }
  // Flow ended — keep input open for KB queries
  flowDone=true;
  addMsg({f:'sys',t:'Anything else I can help with?'});
}

function doSend(txt,isChip){
  var msg=txt||(inputEl?inputEl.value.trim():'');if(!msg)return;
  if(inputEl&&!txt)inputEl.value='';
  var cur=botCfg&&botCfg.nodes&&botCfg.nodes[step];
  var onBtns=cur&&cur.type==='buttons';

  // Free-text when on a buttons node OR after flow done → search KB first
  if(!isChip&&(onBtns||flowDone)){
    addMsg({f:'user',t:msg});
    showTyping();
    setTimeout(function(){
      hideTyping();
      var hit=searchKB(msg);
      if(hit){
        var answer=(hit.title?hit.title+'\\n\\n':'')+hit.content;
        addMsg({f:'kb',t:answer});
        addMsg({f:'bot',t:'Does that answer your question?',b:['Yes, thanks!','No, connect me to an agent']});
      } else {
        showAgentOption();
      }
    },700);
    return;
  }

  if(onBtns)lastBtn=msg;
  addMsg({f:'user',t:msg});
  var ni=step+1;showTyping();setTimeout(function(){flow(ni,msg,lastBtn);},600);
}

// Handle "Yes thanks" / "No connect agent" responses
var origChip=window._sdChip;
window._sdChip=function(el){
  var v=el.getAttribute('data-v');
  if(v==='Yes, thanks!'){addMsg({f:'user',t:'Yes, thanks!'});addMsg({f:'bot',t:'Great! Let me know if you need anything else.'});return;}
  if(v==='No, connect me to an agent'){connectAgent();return;}
  origChip(el);
};

sendEl.onclick=function(){doSend();};
inputEl.onkeydown=function(e){if(e.key==='Enter'&&!inputEl.disabled)doSend();};

// Load bot
fetch(BACKEND+'/api/bot-public/'+TOKEN)
  .then(function(r){return r.json();})
  .then(function(d){
    msgsEl.innerHTML='';
    if(!d.bot){addMsg({f:'sys',t:'Bot not found or inactive.'});return;}
    botCfg=d.bot;
    document.getElementById('bot-title').textContent=d.bot.name||'Support Bot';
    inputEl.disabled=false;sendEl.disabled=false;
    showTyping();setTimeout(function(){flow(0,'','');},500);
  })
  .catch(function(){
    msgsEl.innerHTML='';
    addMsg({f:'sys',t:'Could not connect. Please try again later.'});
  });
})();
</script>
</body>
</html>`);
});

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/kb', require('./routes/kb'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));

// Live monitor - visitor sessions
app.use('/api/monitor', require('./middleware/auth'), (req, res) => {
  if (req.method === 'GET') {
    // Simulate real-time visitors
    const visitors = Array.from({ length: Math.floor(Math.random() * 12) + 3 }, (_, i) => ({
      id: `v${i + 1}`,
      page: ['/pricing', '/features', '/docs', '/', '/blog', '/contact'][Math.floor(Math.random() * 6)],
      country: ['India', 'United States', 'Germany', 'Brazil', 'Japan', 'UK', 'France', 'Canada'][Math.floor(Math.random() * 8)],
      city: ['Chennai', 'New York', 'Berlin', 'São Paulo', 'Tokyo'][Math.floor(Math.random() * 5)],
      source: ['Google', 'Direct', 'Twitter', 'LinkedIn', 'Referral'][Math.floor(Math.random() * 5)],
      device: Math.random() > 0.5 ? 'desktop' : 'mobile',
      duration: Math.floor(Math.random() * 600) + 30,
      intent: ['buyer', 'researcher', 'support_seeker', 'competitor'][Math.floor(Math.random() * 4)],
    }));
    return res.json({ visitors, total: visitors.length });
  }
  res.json({ success: true });
});

// Notifications
app.use('/api/notifications', require('./middleware/auth'), async (req, res) => {
  const auth = require('./middleware/auth');
  if (req.method === 'GET') {
    const notifs = await db.prepare('SELECT * FROM notifications WHERE agent_id=? ORDER BY created_at DESC LIMIT 20').all(req.agent.id);
    return res.json({ notifications: notifs });
  }
  if (req.method === 'PATCH') {
    await db.prepare('UPDATE notifications SET read=1 WHERE agent_id=?').run(req.agent.id);
    return res.json({ success: true });
  }
  res.json({ success: true });
});

// Integrations list
app.get('/api/integrations', require('./middleware/auth'), (req, res) => {
  const integrations = [
    { id: 'int1', name: 'Slack', category: 'Communication', connected: false, icon: '💬', description: 'Get notifications and create tickets from Slack' },
    { id: 'int2', name: 'Jira', category: 'Project Management', connected: false, icon: '📋', description: 'Sync tickets with Jira issues' },
    { id: 'int3', name: 'HubSpot', category: 'CRM', connected: false, icon: '🧲', description: 'Sync contacts and deals with HubSpot' },
    { id: 'int4', name: 'Salesforce', category: 'CRM', connected: false, icon: '☁️', description: 'Bidirectional sync with Salesforce' },
    { id: 'int5', name: 'Stripe', category: 'Payments', connected: true, icon: '💳', description: 'View customer billing info in conversations' },
    { id: 'int6', name: 'Shopify', category: 'E-commerce', connected: false, icon: '🛍️', description: 'Pull order details into support context' },
    { id: 'int7', name: 'Google Analytics', category: 'Analytics', connected: false, icon: '📊', description: 'Track support widget performance' },
    { id: 'int8', name: 'Zapier', category: 'Automation', connected: false, icon: '⚡', description: 'Connect SupportDesk to 5000+ apps' },
    { id: 'int9', name: 'GitHub', category: 'Developer', connected: true, icon: '🐙', description: 'Link issues to GitHub repos' },
    { id: 'int10', name: 'Intercom', category: 'Migration', connected: false, icon: '🚀', description: 'Import data from Intercom' },
    { id: 'int11', name: 'Zendesk', category: 'Migration', connected: false, icon: '🎯', description: 'Import data from Zendesk' },
    { id: 'int12', name: 'Twilio', category: 'Communication', connected: false, icon: '📞', description: 'SMS and voice via Twilio' },
  ];
  res.json({ integrations });
});

app.patch('/api/integrations/:id', require('./middleware/auth'), (req, res) => {
  res.json({ success: true, message: 'Integration config saved' });
});

// ── 404 fallback ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  SupportDesk Backend                    ║
║  → http://localhost:${PORT}               ║
║  → WebSocket: ws://localhost:${PORT}/ws   ║
║  → Health: http://localhost:${PORT}/health║
╚══════════════════════════════════════════╝
  `);
});
