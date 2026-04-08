import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── TEAM CHAT ────────────────────────────────────────────────────────────
// ─── TEAM CHAT (Slack/Cliq-class) ─────────────────────────────────────────
const TC_SECTIONS=[{id:"starred",name:"Starred"},{id:"channels",name:"Channels"},{id:"dms",name:"Direct Messages"}];
export const TC_CHANNELS=[
  {id:"ch1",name:"general",desc:"Company-wide announcements",icon:"#",private:false,members:["a1","a2","a3","a4"],unread:2,starred:true,muted:false,topic:"Standup at 10:30 AM",bookmarks:[{id:"bm1",label:"SLA Dashboard",url:"#"},{id:"bm2",label:"Sprint Board",url:"#"},{id:"bm3",label:"On-Call",url:"#"}]},
  {id:"ch2",name:"support-escalations",desc:"Escalate tricky tickets",icon:"#",private:false,members:["a1","a2","a3","a4"],unread:1,starred:true,muted:false,topic:"Include customer name + priority",bookmarks:[{id:"bm4",label:"Playbook",url:"#"}]},
  {id:"ch3",name:"engineering-help",desc:"Ask devs for help",icon:"#",private:false,members:["a1","a2","a4"],unread:0,starred:false,muted:false,topic:"",bookmarks:[]},
  {id:"ch4",name:"sales-handoffs",desc:"Pass leads to sales",icon:"#",private:false,members:["a1","a3"],unread:0,starred:false,muted:false,topic:"",bookmarks:[]},
  {id:"ch5",name:"random",desc:"Non-work banter",icon:"#",private:false,members:["a1","a2","a3","a4"],unread:0,starred:false,muted:true,topic:"🎉 Friday vibes",bookmarks:[]},
  {id:"ch6",name:"product-feedback",desc:"Customer feedback & requests",icon:"#",private:false,members:["a1","a2","a3"],unread:0,starred:false,muted:false,topic:"",bookmarks:[]},
  {id:"ch7",name:"leadership",desc:"Manager discussions",icon:"🔒",private:true,members:["a1","a4"],unread:0,starred:false,muted:false,topic:"",bookmarks:[]},
  {id:"ch8",name:"ai-experiments",desc:"Testing AI features",icon:"#",private:false,members:["a1","a2","a3"],unread:0,starred:false,muted:false,topic:"",bookmarks:[]}
];
export const TC_DMS=[{id:"dm1",agentId:"a2",unread:1,starred:true},{id:"dm2",agentId:"a3",unread:0,starred:false},{id:"dm3",agentId:"a4",unread:0,starred:false}];
const TC_MSGS_INIT={
  ch1:[
    {id:"tm1",uid:"a1",text:"Good morning team! 🌞 Let's crush it today.",t:"09:02",date:"Today",reactions:[{emoji:"🔥",users:["a2","a3"]},{emoji:"👍",users:["a4"]}],thread:[],pinned:true,file:null},
    {id:"tm2",uid:"a2",text:"Taking the **Arjun Mehta** ticket — payment stuck 3 days. Checking Stripe.",t:"09:05",date:"Today",reactions:[{emoji:"✅",users:["a1"]}],thread:[{id:"tr1",uid:"a1",text:"Thanks Dev! Need Stripe admin creds?",t:"09:06"},{id:"tr2",uid:"a2",text:"Got access 👍 Found it — `PAY-2026-4821` held by fraud filter. Releasing.",t:"09:12"}],pinned:false,file:null},
    {id:"tm3",uid:"a3",text:"WhatsApp volume spiking — **56 conversations** already. @Priya can we enable AI auto-reply for WA?",t:"09:15",date:"Today",reactions:[],thread:[{id:"tr3",uid:"a1",text:"Done! AI Auto-Reply ON for WhatsApp. Handles greetings + FAQs, escalates complex ones.",t:"09:22"},{id:"tr4",uid:"a3",text:"Amazing — response time dropped from 4min to 12s! 🏎️",t:"09:25"}],pinned:false,file:null},
    {id:"tm4",uid:"a4",text:"Deployed **CSV Export v2.4** to production.\n\n→ Customers can download: conversation reports, contact lists, invoices",t:"09:45",date:"Today",reactions:[{emoji:"🎉",users:["a1","a2","a3"]},{emoji:"🚀",users:["a1"]}],thread:[],pinned:false,file:null},
    {id:"tm5",uid:"a2",text:"📋 **Ticket Escalation:**\n> Customer: Arjun Mehta\n> Issue: Payment stuck 3 days · Priority: 🔴 Urgent\n> Channel: Live Chat\n\nStripe confirmed fraud filter hold. Released + refund initiated.",t:"10:01",date:"Today",reactions:[{emoji:"👀",users:["a1","a4"]},{emoji:"✅",users:["a3"]}],thread:[{id:"tr5",uid:"a4",text:"Great work Dev! Updated runbook to include fraud filter as step 2.",t:"10:03"},{id:"tr6",uid:"a2",text:"Customer confirmed receipt. Resolved. ✅",t:"10:15"}],pinned:true,file:null},
    {id:"tm6",uid:"a3",text:"Sharing the metrics file:",t:"10:30",date:"Today",reactions:[],thread:[],pinned:false,file:{name:"march_support_metrics.pdf",size:"2.4 MB",type:"pdf"}},
  ],
  ch2:[
    {id:"tm7",uid:"a2",text:"🚨 **Escalation:** Sarah Chen API auth issue\n> 401 on valid tokens since 2 AM\n> Affects 3 enterprise customers\n\nLogs show token rotation at 02:00 invalidated sessions.",t:"08:30",date:"Today",reactions:[],thread:[{id:"tr7",uid:"a4",text:"Found it in deployment logs. Rolling back. ETA 15 min.",t:"08:45"},{id:"tr8",uid:"a4",text:"Rolled back. Tokens should work now.",t:"09:01"},{id:"tr9",uid:"a2",text:"Confirmed with Sarah — API working. Adding post-mortem ticket.",t:"09:10"}],pinned:true,file:null},
  ],
  dm1:[
    {id:"dm1m1",uid:"a2",text:"Hey Priya, can you review the SLA report before standup?",t:"08:50",date:"Today",reactions:[],thread:[],pinned:false,file:null},
    {id:"dm1m2",uid:"a1",text:"Sure! Ready by 10:30. Want the WA channel breakdown too?",t:"08:52",date:"Today",reactions:[{emoji:"👍",users:["a2"]}],thread:[],pinned:false,file:null},
    {id:"dm1m3",uid:"a2",text:"Yes please. Also — do we have budget for the **Slack integration** upgrade? Free tier limits us to 100 msg/day.",t:"09:10",date:"Today",reactions:[],thread:[],pinned:false,file:null},
    {id:"dm1m4",uid:"a1",text:"Let me check with finance. We should be able to swing ₹5K/mo for the Pro tier. I'll confirm today.",t:"09:15",date:"Today",reactions:[{emoji:"🙏",users:["a2"]}],thread:[],pinned:false,file:null},
  ],
  dm2:[
    {id:"dm2m1",uid:"a3",text:"Priya — the WhatsApp volume is insane today. 56 conversations before 10 AM 😅",t:"09:20",date:"Today",reactions:[],thread:[],pinned:false,file:null},
    {id:"dm2m2",uid:"a1",text:"I saw! Just enabled AI auto-reply for WA. Should help a lot. Let me know if quality dips.",t:"09:25",date:"Today",reactions:[],thread:[],pinned:false,file:null},
    {id:"dm2m3",uid:"a3",text:"Already seeing improvement — response time dropped from 4min to under 30s. AI is handling greetings perfectly.",t:"09:40",date:"Today",reactions:[{emoji:"🔥",users:["a1"]}],thread:[],pinned:false,file:null},
  ],
  dm3:[
    {id:"dm3m1",uid:"a4",text:"FYI — CSV export v2.4 deployment went smooth. No rollback needed 🚀",t:"09:50",date:"Today",reactions:[],thread:[],pinned:false,file:null},
    {id:"dm3m2",uid:"a1",text:"Great work Aryan! Can you draft a changelog for the blog post?",t:"09:55",date:"Today",reactions:[{emoji:"✅",users:["a4"]}],thread:[],pinned:false,file:null},
  ],
  ch3:[
    {id:"ch3m1",uid:"a2",text:"Anyone know why the webhook retry queue is backed up? Seeing 2K+ pending events.",t:"08:00",date:"Today",reactions:[],thread:[{id:"ch3t1",uid:"a4",text:"Redis queue hit memory limit. Bumped to 8GB. Should clear in ~10 min.",t:"08:12"},{id:"ch3t2",uid:"a2",text:"Clearing now — down to 400. Thanks Aryan!",t:"08:25"}],pinned:false,file:null},
    {id:"ch3m2",uid:"a4",text:"🔧 **Post-mortem:** Token rotation deployment at 02:00 didn't invalidate cache properly. Fix: added cache-busting header. PR #2847 merged.",t:"09:30",date:"Today",reactions:[{emoji:"✅",users:["a1","a2"]}],thread:[],pinned:false,file:null},
  ],
  ch4:[
    {id:"ch4m1",uid:"a1",text:"📥 **New Lead Handoff:**\n> Company: GlobalRetail (500+ stores)\n> Contact: David Chen, CTO\n> Interest: Multi-brand + multi-language\n> Estimated deal: ₹96K\n\nScheduled discovery call for March 29.",t:"09:30",date:"Today",reactions:[{emoji:"💰",users:["a3"]}],thread:[{id:"ch4t1",uid:"a3",text:"I'll prepare the multi-brand demo. Any specific languages they need?",t:"09:35"},{id:"ch4t2",uid:"a1",text:"English, Hindi, Mandarin, Spanish. 12 countries. Big one!",t:"09:38"}],pinned:false,file:null},
  ],
  ch5:[
    {id:"ch5m1",uid:"a3",text:"Discovered a café near the office that has the BEST filter coffee. Anyone want to try at lunch? ☕",t:"09:00",date:"Today",reactions:[{emoji:"☕",users:["a1","a2"]},{emoji:"🎉",users:["a4"]}],thread:[{id:"ch5t1",uid:"a2",text:"Count me in!",t:"09:05"},{id:"ch5t2",uid:"a4",text:"Where is it?",t:"09:06"},{id:"ch5t3",uid:"a3",text:"Koramangala 4th Block, next to the bookshop. 12:30?",t:"09:08"}],pinned:false,file:null},
    {id:"ch5m2",uid:"a2",text:"TIL: Ctrl+Shift+M toggles mute on current channel. How did I not know this? 🤦",t:"10:15",date:"Today",reactions:[{emoji:"🤔",users:["a1"]},{emoji:"💡",users:["a3"]}],thread:[],pinned:false,file:null},
  ],
  ch6:[
    {id:"ch6m1",uid:"a3",text:"📊 **Weekly Feedback Summary:**\n\n• CSV export most-requested (shipped! 🎉)\n• Mobile app push notifications — 8 requests\n• Dark mode in widget — 5 requests\n• WhatsApp template messages — 4 requests",t:"08:00",date:"Today",reactions:[{emoji:"📊",users:["a1"]}],thread:[{id:"ch6t1",uid:"a1",text:"Mobile push is on the Q2 roadmap. Dark mode in widget is already in dev!",t:"08:15"}],pinned:false,file:null},
  ],
  ch7:[
    {id:"ch7m1",uid:"a1",text:"Q1 numbers look strong: ₹18.4L revenue (+23%), 142 paying customers (+31%). Churn at 2.8% (down from 3.5%). Full deck ready for board review Friday.",t:"Yesterday",date:"Yesterday",reactions:[{emoji:"🚀",users:["a4"]}],thread:[{id:"ch7t1",uid:"a4",text:"Should we include the AI bot ROI metrics? Auto-resolve rate hit 38% this month.",t:"Yesterday"}],pinned:false,file:null},
  ],
  ch8:[
    {id:"ch8m1",uid:"a2",text:"Testing the new AI Copilot with live tickets. Early results:\n• Response quality: 4.5/5 avg\n• Auto-resolve rate: 38%\n• False positives: ~3%\n• Avg latency: 1.2s",t:"Yesterday",date:"Yesterday",reactions:[{emoji:"🤖",users:["a1","a3"]},{emoji:"🔥",users:["a4"]}],thread:[{id:"ch8t1",uid:"a1",text:"38% auto-resolve is incredible! What's the false positive breakdown?",t:"Yesterday"},{id:"ch8t2",uid:"a2",text:"Mostly edge cases: multi-turn billing disputes and regulatory questions. Adding those to training set.",t:"Yesterday"}],pinned:false,file:null},
    {id:"ch8m2",uid:"a4",text:"Shipped sentiment analysis v2. Now detects frustration, urgency, and satisfaction in real-time. Try it on #support-escalations.",t:"Today",date:"Today",reactions:[{emoji:"⚡",users:["a1","a2","a3"]}],thread:[],pinned:false,file:null},
  ]
};
const REACTIONS_SET=["👍","❤️","🔥","🎉","👀","🚀","✅","💯","🙏","😂","😢","🤔","💪","🤝","❓","⚡"];
const SLASH_CMDS=[{cmd:"/remind",desc:"Set a reminder"},{cmd:"/poll",desc:"Create a poll"},{cmd:"/status",desc:"Update status"},{cmd:"/mute",desc:"Mute channel"},{cmd:"/topic",desc:"Set channel topic"},{cmd:"/invite",desc:"Invite to channel"},{cmd:"/shrug",desc:"¯\\_(ツ)_/¯"},{cmd:"/ai",desc:"Ask AI"},{cmd:"/ticket",desc:"Create ticket from chat"},{cmd:"/call",desc:"Start huddle"},{cmd:"/giphy",desc:"Send a GIF"},{cmd:"/leave",desc:"Leave channel"}];

export default function TeamChatScr({agents,setAgents,fontKey,themeKey}){
  const [channels,setChannels]=useState(TC_CHANNELS);
  // ═══ MULTI-PANE ═══
  const [panes,setPanes]=useState([]); // secondary pane channel/dm IDs (max 2)
  const [paneInputs,setPaneInputs]=useState({});
  const openPane=(chId)=>{if(chId===activeCh||panes.includes(chId))return;setPanes(p=>p.length>=2?[p[1],chId]:[...p,chId]);
    if(api.isConnected()&&!tcMsgs[chId]?.length)api.get(`/chat/messages/${chId}`).then(r=>{if(r?.data?.length)setTcMsgs(p=>({...p,[chId]:r.data.map(m=>({id:m.id,uid:m.author_id,text:m.text,t:m.timestamp||"",date:m.date_label||"Today",reactions:(m.reactions||[]).map(rx=>({emoji:rx.emoji,users:rx.user_ids||[]})),thread:m.thread||[],pinned:!!m.pinned,file:m.file_name?{name:m.file_name,size:m.file_size}:null}))}));}).catch(()=>{});};
  const closePane=(chId)=>setPanes(p=>p.filter(x=>x!==chId));
  const paneSend=(chId)=>{const txt=(paneInputs[chId]||"").trim();if(!txt)return;setTcMsgs(p=>({...p,[chId]:[...(p[chId]||[]),{id:"tm"+uid(),uid:"a1",text:txt,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:null}]}));setPaneInputs(p=>({...p,[chId]:""}));if(api.isConnected()){const isDm=chId.startsWith("dm");api.post("/chat/messages",{[isDm?"dm_id":"channel_id"]:chId,text:txt}).catch(()=>{});}};
  // Public channels auto-include all agents/members
  const getChMembers=ch=>{if(!ch)return[];if(!ch.private)return agents.map(a=>a.id);return ch.members||[];};
  const [tcMsgs,setTcMsgs]=useState(TC_MSGS_INIT);
  const [activeCh,setActiveCh]=useState("ch1");
  const [tcInp,setTcInp]=useState("");
  const [showThread,setShowThread]=useState(null);const [threadInp,setThreadInp]=useState("");
  const [showReactions,setShowReactions]=useState(null);
  const [showNewCh,setShowNewCh]=useState(false);const [newChName,setNewChName]=useState("");const [newChDesc,setNewChDesc]=useState("");const [newChPrivate,setNewChPrivate]=useState(false);
  const [showHuddle,setShowHuddle]=useState(false);
  const [tcSearch,setTcSearch]=useState("");
  const [collapsed,setCollapsed]=useState({});
  const [pinnedMsgs,setPinnedMsgs]=useState({"ch1":["tm1","tm5"],"ch2":["tm7"]});
  const [bookmarks,setBookmarks]=useState([]);
  const [editingMsg,setEditingMsg]=useState(null);const [editText,setEditText]=useState("");
  const [showPinned,setShowPinned]=useState(false);
  const [showPoll,setShowPoll]=useState(false);const [pollQ,setPollQ]=useState("");const [pollOpts,setPollOpts]=useState(["","",""]);
  const [polls,setPolls]=useState({"ch1":[{id:"poll1",q:"Weekly retro time?",opts:[{text:"2 PM Fri",votes:["a1","a2"]},{text:"4 PM Fri",votes:["a3"]},{text:"10 AM Mon",votes:["a4"]}],closed:false}]});
  const [userStatus,setUserStatus]=useState({emoji:"🟢",text:"Available"});const [showStatusPicker,setShowStatusPicker]=useState(false);
  const [showMembers,setShowMembers]=useState(false);const [showChInfo,setShowChInfo]=useState(false);
  // ── Channel & Member management ──
  const [tcDms,setTcDms]=useState(TC_DMS);
  const [showInvite,setShowInvite]=useState(false);
  const [showEditCh,setShowEditCh]=useState(false);
  const [editChName,setEditChName]=useState("");const [editChDesc,setEditChDesc]=useState("");const [editChTopic,setEditChTopic]=useState("");const [editChPrivate,setEditChPrivate]=useState(false);
  const [showNewDm,setShowNewDm]=useState(false);
  const [showDeleteCh,setShowDeleteCh]=useState(false);
  const [typingUsers,setTypingUsers]=useState({});
  // Typing simulation — show other agents typing periodically for realism
  useEffect(()=>{
    const iv=setInterval(()=>{
      const others=["a2","a3","a4"];const ch=["ch1","ch2","ch3"];
      const randomCh=ch[Math.floor(Math.random()*ch.length)];
      const randomAgent=others[Math.floor(Math.random()*others.length)];
      if(Math.random()>0.7){setTypingUsers(p=>({...p,[randomCh]:[randomAgent]}));setTimeout(()=>setTypingUsers(p=>({...p,[randomCh]:[]})),2500);}
    },8000);
    return()=>clearInterval(iv);
  },[]);
  // Send typing event (no-op until WebSocket is passed as prop)
  const sendTypingEvent=()=>{};
  const [showSchedule,setShowSchedule]=useState(false);const [scheduleTime,setScheduleTime]=useState("");
  const [msgSearch,setMsgSearch]=useState("");const [showMsgSearch,setShowMsgSearch]=useState(false);
  const [showSlash,setShowSlash]=useState(false);
  const [showFwd,setShowFwd]=useState(null);const [reminderMsg,setReminderMsg]=useState(null);const [reminderTime,setReminderTime]=useState("30");
  const [profilePop,setProfilePop]=useState(null);
  const [showAiPanel,setShowAiPanel]=useState(false);
  const [aiSummary,setAiSummary]=useState(null);const [aiSumLoad,setAiSumLoad]=useState(false);
  const [aiSugs,setAiSugs]=useState([]);const [aiSugLoad,setAiSugLoad]=useState(false);
  const [aiStandup,setAiStandup]=useState(null);const [aiStdLoad,setAiStdLoad]=useState(false);
  // ── Invite to workspace (shared with Settings) ──
  const [showWsInvite,setShowWsInvite]=useState(false);const [wsInvName,setWsInvName]=useState("");const [wsInvEmail,setWsInvEmail]=useState("");
  const inviteToWorkspace=()=>{if(!wsInvEmail.includes("@"))return showT("Valid email required","error");const nm=wsInvName.trim()||wsInvEmail.split("@")[0];setAgents(p=>[...p,{id:"a"+uid(),name:nm,email:wsInvEmail,role:"Member",av:nm.slice(0,2).toUpperCase(),color:[C.a,C.g,C.p,C.cy,C.y,"#ff6b35"][Math.floor(Math.random()*6)],status:"offline",maxConvs:8}]);showT(nm+" added to workspace as Member","success");setShowWsInvite(false);setWsInvName("");setWsInvEmail("");};
  const ref=useRef(null);
  const fileRef=useRef(null);
  const handleFileUpload=e=>{const f=e.target.files?.[0];if(!f)return;const sizeMB=(f.size/1024/1024).toFixed(1);const ext=f.name.split('.').pop()?.toLowerCase()||'file';const msg=`📎 ${f.name}`;setTcMsgs(p=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:"tm"+uid(),uid:"a1",text:msg,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:{name:f.name,size:sizeMB+" MB",type:ext}}]}));if(api.isConnected()){const isDm=activeCh.startsWith("dm");api.post("/chat/messages",{[isDm?"dm_id":"channel_id"]:activeCh,text:msg,file_name:f.name,file_size:sizeMB+" MB",file_type:ext}).catch(()=>{});}showT("File shared: "+f.name,"success");e.target.value="";};
  // ── New features state ──
  const [drafts,setDrafts]=useState({});
  const [scheduledMsgs,setScheduledMsgs]=useState([]);
  const [showScheduledList,setShowScheduledList]=useState(false);
  const [showFilesPanel,setShowFilesPanel]=useState(false);
  const [showEmojiPicker,setShowEmojiPicker]=useState(false);
  const [mentionSearch,setMentionSearch]=useState(null);
  const [chNotifPrefs,setChNotifPrefs]=useState({});
  const [showChNotif,setShowChNotif]=useState(false);
  const [lastRead]=useState({"ch1":"tm4","ch2":"tm7"});
  const [showFmtBar]=useState(true);
  const EMOJI_GRID=["😀","😂","🤣","😊","😍","🥰","😎","🤔","😢","😡","🥳","🤯","😴","🤮","🥺","😈","👍","👎","👏","🙌","🤝","💪","🔥","❤️","💯","✅","❌","⭐","🚀","🎉","🎯","💡","📌","📎","🔗","⚡","🏆","💎","🌟","⏰","📊","💬","🤖","🔔","🔕","📱","💻","🎧","☕"];
  const tcUnreadTotal=channels.reduce((s,c)=>s+c.unread,0)+tcDms.reduce((s,d)=>s+d.unread,0);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[tcMsgs,activeCh]);
  // ═══ TEAM CHAT API LOADING ═══
  useEffect(()=>{
    if(!api.isConnected())return;
    api.get("/chat/channels").then(r=>{if(r?.data?.length)setChannels(r.data.map(c=>({...c,unread:c.message_count||0,starred:c.members?.some(m=>m.agent_id==="a1"&&m.starred)||false,muted:c.members?.some(m=>m.agent_id==="a1"&&m.muted)||false})));}).catch(()=>{});
    api.get("/chat/dms").then(r=>{if(r?.data?.length)setTcDms(r.data.map(d=>({id:d.id,agentId:d.agent1_id==="a1"?d.agent2_id:d.agent1_id,unread:0,starred:false})));}).catch(()=>{});
  },[]);
  // Load messages when switching channel
  const [tcMsgsLoading,setTcMsgsLoading]=useState(false);
  useEffect(()=>{
    if(!api.isConnected()||!activeCh)return;
    if(tcMsgs[activeCh]?.length>0)return; // Already loaded
    setTcMsgsLoading(true);
    api.get(`/chat/messages/${activeCh}`).then(r=>{
      if(r?.data?.length)setTcMsgs(p=>({...p,[activeCh]:r.data.map(m=>({id:m.id,uid:m.author_id,text:m.text,t:m.timestamp||"",date:m.date_label||"Today",reactions:(m.reactions||[]).map(rx=>({emoji:rx.emoji,users:rx.user_ids||[]})),thread:m.thread||[],pinned:!!m.pinned,file:m.file_name?{name:m.file_name,size:m.file_size}:null}))}));
    }).catch(()=>{}).finally(()=>setTcMsgsLoading(false));
  },[activeCh]);
  // Keyboard shortcuts
  useEffect(()=>{const h=e=>{if(e.ctrlKey&&e.key==="/"){e.preventDefault();setTcInp("/");setShowSlash(true);}if(e.ctrlKey&&e.shiftKey&&e.key==="M"){e.preventDefault();setChannels(p=>p.map(c=>c.id===activeCh?{...c,muted:!c.muted}:c));showT(aCh?.muted?"Unmuted":"Muted","info");}if(e.key==="Escape"){setShowThread(null);setShowMembers(false);setShowChInfo(false);setShowAiPanel(false);setShowFilesPanel(false);setShowEmojiPicker(false);setMentionSearch(null);setProfilePop(null);}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[activeCh]);

  const aCh=channels.find(c=>c.id===activeCh);const aDm=tcDms.find(d=>d.id===activeCh);
  const dmAg=aDm?agents.find(a=>a.id===aDm.agentId):null;
  const curMsgs=tcMsgs[activeCh]||[];const fMsgs=msgSearch?curMsgs.filter(m=>m.text.toLowerCase().includes(msgSearch.toLowerCase())):curMsgs;
  const ag=agents.reduce((m,a)=>{m[a.id]=a;return m;},{});
  const chPins=pinnedMsgs[activeCh]||[];const chLabel=aCh?"#"+aCh.name:dmAg?.name||"";
  const switchCh=id=>{if(tcInp.trim())setDrafts(p=>({...p,[activeCh]:tcInp}));setActiveCh(id);setTcInp(drafts[id]||"");setShowThread(null);setAiSummary(null);setMsgSearch("");setShowEmojiPicker(false);setMentionSearch(null);};

  const handleInp=e=>{const v=e.target.value;setTcInp(v);setShowSlash(v.startsWith("/")&&v.length<20);setAiSugs([]);sendTypingEvent();
    const atMatch=v.match(/@(\w*)$/);if(atMatch){setMentionSearch(atMatch[1].toLowerCase());setShowEmojiPicker(false);}else setMentionSearch(null);
  };
  const insertMention=name=>{setTcInp(p=>p.replace(/@\w*$/,"@"+name.split(" ")[0]+" "));setMentionSearch(null);};
  const insertFmt=(pre,suf)=>{setTcInp(p=>p+pre+(suf||""));};
  const insertEmoji=e=>{setTcInp(p=>p+e);setShowEmojiPicker(false);};
  const scheduleMsg=()=>{if(!tcInp.trim()||!scheduleTime)return;setScheduledMsgs(p=>[...p,{id:"sch"+uid(),ch:activeCh,text:tcInp,time:scheduleTime}]);setTcInp("");setShowSchedule(false);setScheduleTime("");showT("Scheduled!","success");};
  const cancelScheduled=id=>{setScheduledMsgs(p=>p.filter(s=>s.id!==id));showT("Cancelled","info");};
  const copyPermalink=mid=>{navigator.clipboard?.writeText(`#/teamchat?ch=${activeCh}&msg=${mid}`);showT("Link copied!","success");};
  const [huddleMic,setHuddleMic]=useState(true);const [huddleCam,setHuddleCam]=useState(false);const [huddleScreen,setHuddleScreen]=useState(false);
  const send=()=>{
    if(!tcInp.trim())return;const t=tcInp.trim();setTcInp("");setShowSlash(false);
    if(t==="/shrug"){addMsg("¯\\_(ツ)_/¯");return;}
    if(t.startsWith("/mute")){setChannels(p=>p.map(c=>c.id===activeCh?{...c,muted:!c.muted}:c));showT(aCh?.muted?"Unmuted":"Muted","info");return;}
    if(t.startsWith("/topic ")){setChannels(p=>p.map(c=>c.id===activeCh?{...c,topic:t.slice(7)}:c));showT("Topic updated","success");return;}
    if(t.startsWith("/status ")){setUserStatus({emoji:t.slice(8,10),text:t.slice(10).trim()||"Custom"});showT("Status set","success");return;}
    if(t.startsWith("/call")){setShowHuddle(true);return;}
    if(t.startsWith("/ai ")){addMsg(t.slice(4));addMsg("🤖 *Processing your question…* (Claude API response would appear here)",true);return;}
    if(t.startsWith("/remind ")){const parts=t.slice(8);setReminderMsg({id:"r"+uid(),text:parts});showT("Reminder set: "+parts,"success");return;}
    if(t.startsWith("/poll ")){setPollQ(t.slice(6));setShowPoll(true);return;}
    if(t.startsWith("/invite")){setShowInvite(true);return;}
    if(t.startsWith("/ticket")){addMsg("📋 Created support ticket from this conversation",true);showT("Ticket created from chat","success");return;}
    if(t.startsWith("/giphy ")){addMsg("🖼️ [GIF: "+t.slice(7)+"]");return;}
    if(t.startsWith("/leave")){leaveCh(activeCh);return;}
    addMsg(t);
  };
  const addMsg=(text,isBot)=>{setTcMsgs(p=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:"tm"+uid(),uid:isBot?"bot":"a1",text,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:null,isBot}]}));if(!isBot&&api.isConnected()){const isDm=activeCh.startsWith("dm");api.post("/chat/messages",{[isDm?"dm_id":"channel_id"]:activeCh,text}).catch(()=>{});}};
  const sendTh=()=>{if(!threadInp.trim()||!showThread)return;const text=threadInp.trim();setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map(m=>m.id===showThread.id?{...m,thread:[...m.thread,{id:"tr"+uid(),uid:"a1",text,t:now()}]}:m)}));setThreadInp("");if(api.isConnected())api.post(`/chat/messages/${showThread.id}/thread`,{text}).catch(()=>{});};
  const react=(mid,em)=>{setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map(m=>{if(m.id!==mid)return m;const ex=m.reactions.find(r=>r.emoji===em);if(ex){if(ex.users.includes("a1"))return{...m,reactions:m.reactions.map(r=>r.emoji===em?{...r,users:r.users.filter(u=>u!=="a1")}:r).filter(r=>r.users.length>0)};return{...m,reactions:m.reactions.map(r=>r.emoji===em?{...r,users:[...r.users,"a1"]}:r)};}return{...m,reactions:[...m.reactions,{emoji:em,users:["a1"]}]};})}));setShowReactions(null);if(api.isConnected())api.post(`/chat/messages/${mid}/reactions`,{emoji:em}).catch(()=>{});};
  const del=mid=>{setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).filter(m=>m.id!==mid)}));showT("Deleted","success");};
  const saveEd=()=>{setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map(m=>m.id===editingMsg?{...m,text:editText,edited:true}:m)}));if(api.isConnected())api.patch(`/chat/messages/${editingMsg}`,{text:editText}).catch(()=>{});setEditingMsg(null);showT("Edited","success");};
  const pin=mid=>{setPinnedMsgs(p=>{const c=p[activeCh]||[];const isPinned=c.includes(mid);const next=isPinned?c.filter(x=>x!==mid):[...c,mid];if(api.isConnected())api.patch(`/chat/messages/${mid}`,{pinned:!isPinned}).catch(()=>{});return{...p,[activeCh]:next};});showT("Pin toggled","success");};
  const star=cid=>{setChannels(p=>p.map(c=>c.id===cid?{...c,starred:!c.starred}:c));};
  const fwd=(msg,to)=>{setTcMsgs(p=>({...p,[to]:[...(p[to]||[]),{id:"tm"+uid(),uid:"a1",text:`↪️ Fwd from ${chLabel}:\n> ${msg.text.slice(0,200)}`,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:null}]}));showT("Forwarded","success");setShowFwd(null);};
  const createCh=()=>{if(!newChName.trim())return showT("Name required","error");const id="ch"+uid();setChannels(p=>[...p,{id,name:newChName.trim().toLowerCase().replace(/\s+/g,"-"),desc:newChDesc,icon:newChPrivate?"🔒":"#",private:newChPrivate,members:["a1"],unread:0,starred:false,muted:false,topic:"",bookmarks:[]}]);setActiveCh(id);setShowNewCh(false);setNewChName("");setNewChDesc("");showT("Created!","success");
    addMsg("📢 Channel created by Priya Sharma",true);
  };
  // ── Channel management ──
  const addMember=(chId,agId)=>{setChannels(p=>p.map(c=>c.id===chId?{...c,members:[...new Set([...c.members,agId])]}:c));showT(agents.find(a=>a.id===agId)?.name+" added","success");
    addMsg("👤 "+agents.find(a=>a.id===agId)?.name+" was added to the channel",true);
  };
  const removeMember=(chId,agId)=>{if(agId==="a1")return showT("Can't remove yourself — use Leave","error");setChannels(p=>p.map(c=>c.id===chId?{...c,members:c.members.filter(m=>m!==agId)}:c));showT("Member removed","success");
    addMsg("👤 "+agents.find(a=>a.id===agId)?.name+" was removed from the channel",true);
  };
  const leaveCh=(chId)=>{setChannels(p=>p.map(c=>c.id===chId?{...c,members:c.members.filter(m=>m!=="a1")}:c));showT("Left channel","info");switchCh("ch1");};
  const editChSave=()=>{setChannels(p=>p.map(c=>c.id===activeCh?{...c,name:editChName||c.name,desc:editChDesc||c.desc,topic:editChTopic!==undefined?editChTopic:c.topic,private:editChPrivate,icon:editChPrivate?"🔒":"#"}:c));setShowEditCh(false);showT("Channel updated","success");};
  const deleteCh=(chId)=>{const ch=channels.find(c=>c.id===chId);setChannels(p=>p.filter(c=>c.id!==chId));setTcMsgs(p=>{const n={...p};delete n[chId];return n;});switchCh("ch1");setShowDeleteCh(false);setShowChInfo(false);showT("#"+(ch?.name||"channel")+" deleted","success");if(api.isConnected())api.del(`/chat/channels/${chId}`).catch(()=>{});};
  const openEditCh=()=>{if(!aCh)return;setEditChName(aCh.name);setEditChDesc(aCh.desc);setEditChTopic(aCh.topic);setEditChPrivate(aCh.private);setShowEditCh(true);};
  const startDm=(agId)=>{const existing=tcDms.find(d=>d.agentId===agId);if(existing){switchCh(existing.id);setProfilePop(null);return;}const id="dm"+uid();setTcDms(p=>[...p,{id,agentId:agId,unread:0,starred:false}]);switchCh(id);setProfilePop(null);setShowNewDm(false);showT("DM opened with "+agents.find(a=>a.id===agId)?.name,"success");};
  const votePoll=(pid,oi)=>{setPolls(p=>({...p,[activeCh]:(p[activeCh]||[]).map(pl=>pl.id===pid?{...pl,opts:pl.opts.map((o,i)=>i===oi?{...o,votes:o.votes.includes("a1")?o.votes.filter(v=>v!=="a1"):[...o.votes,"a1"]}:o)}:pl)}));};
  const createPoll=()=>{const opts=pollOpts.filter(o=>o.trim());if(!pollQ.trim()||opts.length<2)return showT("Need question + 2 options","error");setPolls(p=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:"poll"+uid(),q:pollQ,opts:opts.map(o=>({text:o,votes:[]})),closed:false}]}));setShowPoll(false);setPollQ("");setPollOpts(["","",""]);showT("Poll created!","success");};
  // AI
  const aiSum=async()=>{setAiSumLoad(true);setAiSummary(null);try{const ctx=curMsgs.slice(-15).map(m=>`[${ag[m.uid]?.name||"Bot"}] ${m.text}`).join("\n");const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,system:"Summarize team chat in 3-4 bullet points. Decisions, actions, updates. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setAiSummary(d.content?.[0]?.text||"");}catch(e){setAiSummary("• Resolved Arjun Mehta payment (Stripe fraud filter)\n• AI Auto-Reply enabled for WhatsApp — 12s response time\n• CSV Export v2.4 deployed\n• API auth 401 — token rotation rolled back");}setAiSumLoad(false);};
  const aiReply=async()=>{setAiSugLoad(true);setAiSugs([]);try{const ctx=curMsgs.slice(-3).map(m=>`[${ag[m.uid]?.name}] ${m.text}`).join("\n");const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,system:"Suggest 3 short team chat replies. Return JSON array of 3 strings only.",messages:[{role:"user",content:ctx}]})});const d=await r.json();const p=JSON.parse((d.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim());setAiSugs(Array.isArray(p)?p:["Got it, on it.","Thanks!","Good call."]);}catch(e){setAiSugs(["Got it, I'll handle this.","Thanks for the update!","Makes sense — let's do it."]);}setAiSugLoad(false);};
  const aiStd=async()=>{setAiStdLoad(true);setAiStandup(null);try{const ctx=curMsgs.slice(-20).map(m=>`[${ag[m.uid]?.name}] ${m.text}`).join("\n");const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:350,system:"Generate standup: DONE, DOING, BLOCKED. 2-3 bullets each. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setAiStandup(d.content?.[0]?.text||"");}catch(e){setAiStandup("DONE\n• Resolved Arjun Mehta payment\n• Deployed CSV Export v2.4\n• Enabled AI Auto-Reply for WA\n\nDOING\n• Monitoring WA CSAT\n• API auth post-mortem\n\nBLOCKED\n• Slack integration budget needed");}setAiStdLoad(false);};

  const togSec=id=>setCollapsed(p=>({...p,[id]:!p[id]}));
  const starredChs=channels.filter(c=>c.starred);const starredDms=tcDms.filter(d=>d.starred);

  const renderMsg=(m,isThread)=>{
    const a2=m.isBot?{name:"SupportDesk AI",av:"✦",color:C.p,status:"online",role:"Bot"}:ag[m.uid]||{name:"?",av:"??",color:C.t3};
    const isPinned=chPins.includes(m.id);const isBm=bookmarks.includes(m.id);const isEd=editingMsg===m.id;
    const hl=msgSearch&&m.text.toLowerCase().includes(msgSearch.toLowerCase());
    return <div key={m.id} className="msg-row" style={{display:"flex",gap:9,padding:isThread?"6px 0":"10px 22px",position:"relative",background:hl?C.yd+"55":"transparent",borderLeft:isPinned&&!isThread?`3px solid ${C.y}`:"3px solid transparent"}}>
      <div style={{cursor:"pointer",flexShrink:0}} onClick={()=>!isThread&&!m.isBot&&setProfilePop(m.uid)}><Av i={a2.av} c={a2.color} s={isThread?24:36} dot={a2.status==="online"}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:1}}>
          <span style={{fontSize:isThread?12:14,fontWeight:700,color:m.isBot?C.p:C.t1,cursor:"pointer"}} onClick={()=>!isThread&&!m.isBot&&setProfilePop(m.uid)}>{a2.name}</span>
          {a2.role&&!isThread&&<span style={{fontSize:9,fontFamily:FM,color:a2.role==="Bot"?C.p:a2.role==="Owner"?C.p:C.t3,background:a2.role==="Bot"?C.pd:C.s3,padding:"1px 4px",borderRadius:3}}>{a2.role}</span>}
          <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{m.t}</span>
          {m.edited&&<span style={{fontSize:9,color:C.t3,fontStyle:"italic"}}>(edited)</span>}
          {isPinned&&<span style={{fontSize:9,color:C.y}}>📌</span>}
        </div>
        {isEd?<div style={{display:"flex",gap:4}}><input value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEd();if(e.key==="Escape")setEditingMsg(null);}} autoFocus style={{flex:1,background:C.bg,border:`1px solid ${C.a}`,borderRadius:5,padding:"4px 7px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/><button onClick={saveEd} style={{padding:"3px 7px",borderRadius:4,fontSize:9,background:C.a,color:"#fff",border:"none",cursor:"pointer"}}>Save</button><button onClick={()=>setEditingMsg(null)} style={{padding:"3px 5px",borderRadius:4,fontSize:9,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Esc</button></div>:
        <div style={{fontSize:14,color:m.isBot?C.p:C.t1,lineHeight:1.65,wordBreak:"break-word"}}>
          {m.text.split("\n").map((line,i)=>{
            const hlText=(txt)=>{if(!msgSearch||!hl)return txt;const re=new RegExp(`(${msgSearch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');const parts=txt.split(re);return parts.map((p,k)=>re.test(p)?<mark key={k} style={{background:C.y+"66",color:C.t1,borderRadius:2,padding:"0 1px"}}>{p}</mark>:p);};
            if(line.startsWith("**")&&line.endsWith("**"))return <strong key={i} style={{color:C.t1,display:"block"}}>{hlText(line.slice(2,-2))}</strong>;
            if(line.startsWith("> "))return <div key={i} style={{borderLeft:`3px solid ${C.b2}`,paddingLeft:8,color:C.t3,fontStyle:"italic",margin:"2px 0"}}>{hlText(line.slice(2))}</div>;
            if(line.startsWith("→ "))return <div key={i} style={{background:C.ad,border:`1px solid ${C.a}33`,borderRadius:7,padding:"4px 9px",margin:"2px 0",fontSize:11}}>{hlText(line.slice(2))}</div>;
            if(line.startsWith("↪️"))return <div key={i} style={{background:C.s3,border:`1px solid ${C.b1}`,borderRadius:7,padding:"5px 9px",margin:"2px 0",fontSize:11}}>{hlText(line)}</div>;
            return <span key={i}>{line.replace(/\*\*(.*?)\*\*/g,"$1").split(/(\*\*.*?\*\*|`.*?`|@\w+)/g).map((p,j)=>{
              if(p.startsWith("`")&&p.endsWith("`"))return <code key={j} style={{background:C.s3,padding:"1px 4px",borderRadius:3,fontSize:12,fontFamily:FM,color:C.cy}}>{p.slice(1,-1)}</code>;
              if(p.startsWith("@"))return <span key={j} style={{color:C.a,fontWeight:700,background:C.ad,padding:"0 2px",borderRadius:3,cursor:"pointer"}}>{p}</span>;
              return <span key={j}>{hlText(p)}</span>;
            })}{i<m.text.split("\n").length-1&&<br/>}</span>;
          })}
        </div>}
        {m.file&&<div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.s3,border:`1px solid ${C.b1}`,borderRadius:10,marginTop:5,cursor:"pointer"}} onClick={()=>showT("Opening "+m.file.name,"info")}>
          <span style={{fontSize:22}}>{m.file.type==="pdf"?"📄":m.file.type==="img"?"🖼":"📁"}</span>
          <div><div style={{fontSize:14,fontWeight:600,color:C.t1}}>{m.file.name}</div><div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>{m.file.size}</div></div>
          <span style={{color:C.a,fontSize:13}}>↓</span>
        </div>}
        {m.reactions?.length>0&&<div style={{display:"flex",gap:2,marginTop:3,flexWrap:"wrap"}}>
          {m.reactions.map(r=><button key={r.emoji} onClick={()=>react(m.id,r.emoji)} title={r.users.map(u=>ag[u]?.name||u).join(", ")} style={{display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:10,fontSize:12,background:r.users.includes("a1")?C.ad:C.s3,border:`1px solid ${r.users.includes("a1")?C.a+"55":C.b1}`,cursor:"pointer"}}>{r.emoji}<span style={{fontSize:9.5,fontFamily:FM,color:r.users.includes("a1")?C.a:C.t3}}>{r.users.length}</span></button>)}
          <button onClick={()=>setShowReactions(showReactions===m.id?null:m.id)} style={{width:18,height:18,borderRadius:9,fontSize:9,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        </div>}
        {showReactions===m.id&&<div style={{display:"flex",gap:1,flexWrap:"wrap",padding:3,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,marginTop:2}}>
          {REACTIONS_SET.map(e=><button key={e} onClick={()=>react(m.id,e)} style={{width:22,height:22,borderRadius:3,fontSize:12,background:"transparent",border:"none",cursor:"pointer"}} className="hov">{e}</button>)}
        </div>}
        {!isThread&&m.thread?.length>0&&<button onClick={()=>setShowThread(m)} style={{display:"flex",alignItems:"center",gap:4,marginTop:3,padding:"3px 8px",borderRadius:6,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:12,color:C.a,fontWeight:600}}>
          <span style={{display:"flex"}}>{m.thread.slice(-3).map((t2,i)=><span key={i} style={{marginLeft:i>0?-3:0}}><Av i={ag[t2.uid]?.av||"?"} c={ag[t2.uid]?.color||C.t3} s={13}/></span>)}</span>
          {m.thread.length} {m.thread.length===1?"reply":"replies"}
        </button>}
        {!isThread&&<div className="msg-actions" style={{position:"absolute",top:-4,right:22,display:"none",gap:1,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:2,boxShadow:"0 4px 16px rgba(0,0,0,.25)"}}>
          {[{i:"😊",fn:()=>setShowReactions(m.id),t:"React"},{i:"💬",fn:()=>setShowThread(m),t:"Thread"},{i:"📌",fn:()=>pin(m.id),t:"Pin"},{i:"🔖",fn:()=>{setBookmarks(p=>p.includes(m.id)?p.filter(x=>x!==m.id):[...p,m.id]);showT("Saved","success");},t:"Save"},{i:"↪️",fn:()=>setShowFwd(m),t:"Forward"},{i:"⏰",fn:()=>setReminderMsg(m),t:"Remind"},{i:"🔗",fn:()=>copyPermalink(m.id),t:"Link"},...(m.uid==="a1"?[{i:"✎",fn:()=>{setEditingMsg(m.id);setEditText(m.text);},t:"Edit"},{i:"✕",fn:()=>del(m.id),t:"Del",c:C.r}]:[]),{i:"⎘",fn:()=>{navigator.clipboard?.writeText(m.text);showT("Copied","success");},t:"Copy"}].map(b=>
            <button key={b.t} onClick={b.fn} title={b.t} style={{width:26,height:26,borderRadius:5,fontSize:12,background:"transparent",border:"none",cursor:"pointer",color:b.c||C.t3,display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">{b.i}</button>
          )}
        </div>}
      </div>
    </div>;
  };

  const SideSection=({id,name,children,action})=>(
    <div style={{marginBottom:2}}>
      <div style={{display:"flex",alignItems:"center"}}>
        <button onClick={()=>togSec(id)} style={{flex:1,display:"flex",alignItems:"center",gap:3,padding:"3px 8px",background:"transparent",border:"none",cursor:"pointer",color:C.t3,fontSize:10,fontWeight:700,fontFamily:FM,letterSpacing:"0.5px"}}>
          <span style={{fontSize:8,transition:"transform .15s",transform:collapsed[id]?"rotate(-90deg)":"rotate(0)"}}>{"\u25BC"}</span>{name}
        </button>
        {action&&<button onClick={action.fn} title={action.tip||""} style={{width:20,height:20,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:"transparent",border:"none",cursor:"pointer",color:C.t3,marginRight:6}} className="hov">{action.icon||"+"}</button>}
      </div>
      {!collapsed[id]&&children}
    </div>
  );

  const ChBtn=({ch})=><div style={{display:"flex",alignItems:"center"}} onContextMenu={e=>{e.preventDefault();star(ch.id);}}>
    <button onClick={()=>{switchCh(ch.id);}} onAuxClick={e=>{if(e.button===1){e.preventDefault();openPane(ch.id);}}} className="hov" style={{flex:1,padding:"5px 10px 5px 16px",display:"flex",alignItems:"center",gap:4,background:activeCh===ch.id?C.ad:panes.includes(ch.id)?C.pd+"44":"transparent",border:"none",cursor:"pointer",borderRadius:4,marginBottom:1}}>
      <span style={{fontSize:11,color:ch.private?C.y:C.t3,fontWeight:700,width:14}}>{ch.icon}</span>
      <span style={{fontSize:13,color:activeCh===ch.id?C.t1:C.t2,fontWeight:ch.unread?700:500,flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</span>
      {ch.muted&&<span style={{fontSize:7}}>🔕</span>}
      {ch.unread>0&&<span style={{background:ch.muted?C.t3:C.r,color:"#fff",borderRadius:6,padding:"0 4px",fontSize:9,fontWeight:700}}>{ch.unread}</span>}
      {drafts[ch.id]&&<span style={{fontSize:9,color:C.y,fontFamily:FM,fontWeight:700}}>Draft</span>}
      {panes.includes(ch.id)&&<span style={{width:6,height:6,borderRadius:"50%",background:C.p,flexShrink:0}}/>}
    </button>
    <button onClick={e=>{e.stopPropagation();openPane(ch.id);}} title="Open in new pane (or middle-click)" style={{width:18,height:18,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,background:"transparent",color:C.t3,border:"none",cursor:"pointer",flexShrink:0,opacity:.4,transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".4"}>⧉</button>
  </div>;

  return <div style={{flex:1,display:"flex",minWidth:0}}>
    {/* ═══ SIDEBAR ═══ */}
    <div style={{width:250,background:C.s1,borderRight:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 14px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:16,fontWeight:700,fontFamily:FD}}>Team Chat</span>
          <div style={{display:"flex",gap:3}}>
            {panes.length>0&&<button onClick={()=>setPanes([])} title="Close all panes" style={{padding:"2px 7px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,background:C.pd,color:C.p,border:`1px solid ${C.p}44`,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>⧉ {panes.length+1}<span style={{fontSize:8}}>×</span></button>}
            <button onClick={()=>setShowAiPanel(p=>!p)} title="AI" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:showAiPanel?C.pd:C.s3,color:showAiPanel?C.p:C.t3,border:`1px solid ${showAiPanel?C.p+"44":C.b1}`,cursor:"pointer"}} className="hov">✦</button>
            <button onClick={()=>setShowNewCh(true)} title="New" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">+</button>
          </div>
        </div>
        <button onClick={()=>setShowStatusPicker(p=>!p)} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",marginBottom:6}}>
          <span style={{fontSize:12}}>{userStatus.emoji}</span><span style={{fontSize:12,color:C.t2,flex:1,textAlign:"left"}}>{userStatus.text}</span><span style={{fontSize:7,color:C.t3}}>{"\u25BC"}</span>
        </button>
        {showStatusPicker&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:4,marginBottom:6,animation:"fadeUp .1s ease"}}>
          {[{e:"🟢",t:"Available"},{e:"🔴",t:"Busy"},{e:"🌙",t:"Away"},{e:"🔕",t:"Do Not Disturb"},{e:"🍕",t:"Lunch"},{e:"🏠",t:"Remote"},{e:"🎧",t:"In Huddle"},{e:"🎯",t:"Focusing"},{e:"✈️",t:"Vacation"}].map(s=>(
            <button key={s.t} onClick={()=>{setUserStatus(s);setShowStatusPicker(false);}} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:4,background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.t2,textAlign:"left"}}>{s.e} {s.t}</button>
          ))}
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:4,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px"}}>
          <NavIcon id="search" s={12} col={C.t3}/><input value={tcSearch} onChange={e=>setTcSearch(e.target.value)} placeholder="Find…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 5px"}}>
        {(starredChs.length>0||starredDms.length>0)&&<SideSection id="starred" name="STARRED">
          {starredChs.map(ch=><ChBtn key={ch.id} ch={ch}/>)}
          {starredDms.map(dm=>{const a2=agents.find(x=>x.id===dm.agentId);return a2?<button key={dm.id} onClick={()=>{switchCh(dm.id);}} className="hov" style={{width:"100%",padding:"5px 10px 5px 16px",display:"flex",alignItems:"center",gap:4,background:activeCh===dm.id?C.ad:"transparent",border:"none",cursor:"pointer",borderRadius:4,marginBottom:1}}>
            <Av i={a2.av} c={a2.color} s={15} dot={a2.status==="online"}/><span style={{fontSize:11,color:C.t2,flex:1,textAlign:"left"}}>{a2.name}</span>
          </button>:null;})}
        </SideSection>}
        <SideSection id="channels" name="CHANNELS" action={{fn:()=>setShowNewCh(true),tip:"New Channel",icon:"+"}}>
          {channels.filter(c=>!tcSearch||c.name.includes(tcSearch)).map(ch=><ChBtn key={ch.id} ch={ch}/>)}
        </SideSection>
        <SideSection id="dms" name={"MEMBERS ("+agents.filter(a=>a.id!=="a1").length+")"} action={{fn:()=>setShowNewDm(true),tip:"New DM",icon:"+"}}>
          {agents.filter(a=>a.id!=="a1").filter(a=>!tcSearch||a.name.toLowerCase().includes(tcSearch.toLowerCase())).map(a=>{const dm=tcDms.find(d=>d.agentId===a.id);return(
            <button key={a.id} onClick={()=>{if(dm)switchCh(dm.id);else startDm(a.id);}} onAuxClick={e=>{if(e.button===1&&dm){e.preventDefault();openPane(dm.id);}}} className="hov" style={{width:"100%",padding:"5px 10px 5px 16px",display:"flex",alignItems:"center",gap:4,background:dm&&activeCh===dm.id?C.ad:dm&&panes.includes(dm.id)?C.pd+"44":"transparent",border:"none",cursor:"pointer",borderRadius:4,marginBottom:1}}>
              <Av i={a.av} c={a.color} s={20} dot={a.status==="online"}/><span style={{fontSize:13,color:dm&&activeCh===dm.id?C.t1:C.t2,fontWeight:dm?.unread?700:500,flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
              <span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:a.role==="Owner"?C.pd:a.role==="Admin"?C.ad:a.role==="Agent"?C.gd:a.role==="Member"?C.yd:C.s3,color:a.role==="Owner"?C.p:a.role==="Admin"?C.a:a.role==="Agent"?C.g:a.role==="Member"?C.y:C.t3,fontFamily:FM,fontWeight:700}}>{a.role}</span>
              {dm&&dm.unread>0&&<span style={{background:C.r,color:"#fff",borderRadius:6,padding:"0 4px",fontSize:7.5,fontWeight:700}}>{dm.unread}</span>}
            </button>
          );})}
        </SideSection>
      </div>
      <div style={{padding:"7px 12px",borderTop:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:-2}}>
        {agents.filter(a=>a.status==="online").map(a=><div key={a.id} style={{marginLeft:-2}} title={a.name}><Av i={a.av} c={a.color} s={22} dot/></div>)}
        <span style={{fontSize:10,color:C.g,fontFamily:FM,marginLeft:6}}>{agents.filter(a=>a.status==="online").length} online</span>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM,marginLeft:5}}>· {agents.length} total</span>
      </div>
    </div>

    {/* ═══ MAIN ═══ */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
      <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:10}}>
        {aCh?<><span style={{fontSize:16,fontWeight:700}}>{aCh.icon}</span><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16,fontWeight:700,fontFamily:FD}}>{aCh.name}</span>{aCh.muted&&<span style={{fontSize:10,color:C.t3}}>🔕</span>}<span style={{fontSize:11,color:C.t3,fontFamily:FM}}>· {getChMembers(aCh).length}</span></div>{aCh.topic&&<div style={{fontSize:12,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{aCh.topic}</div>}</div></>:
        dmAg?<><Av i={dmAg.av} c={dmAg.color} s={32} dot={dmAg.status==="online"}/><div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,fontFamily:FD}}>{dmAg.name}</div><div style={{fontSize:12,color:C.t3,fontFamily:FM}}>{dmAg.role} · {dmAg.status}</div></div></>:null}
        <div style={{display:"flex",gap:3}}>
          {[{i:"search",fn:()=>setShowMsgSearch(p=>!p),a:showMsgSearch},{e:"📌",fn:()=>setShowPinned(p=>!p),a:showPinned,cnt:chPins.length},{e:"📊",fn:()=>setShowPoll(true)},{e:"🎧",fn:()=>setShowHuddle(true)},{e:"📎",fn:()=>{addMsg("Shared a file:");setTcMsgs(p=>{const m=p[activeCh];if(!m)return p;const last=m[m.length-1];return{...p,[activeCh]:m.map(x=>x.id===last.id?{...x,file:{name:"upload_"+uid()+".pdf",size:"1.8 MB",type:"pdf"}}:x)};});showT("Shared","success");}},{e:"📂",fn:()=>setShowFilesPanel(p=>!p),a:showFilesPanel},{e:"🔔",fn:()=>setShowChNotif(true)},{e:"ℹ",fn:()=>setShowChInfo(p=>!p),a:showChInfo},{i:"contacts",fn:()=>setShowMembers(p=>!p),a:showMembers}].map((b,idx)=>
            <button key={idx} onClick={b.fn} style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:b.a?C.ad:C.s3,border:`1px solid ${b.a?C.a+"44":C.b1}`,cursor:"pointer",position:"relative"}} className="hov">
              {b.i?<NavIcon id={b.i} s={13} col={b.a?C.a:C.t3}/>:<span style={{fontSize:12,color:b.a?C.a:C.t3}}>{b.e}</span>}
              {b.cnt>0&&<span style={{position:"absolute",top:-3,right:-3,width:13,height:13,borderRadius:"50%",background:C.y,color:"#000",fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{b.cnt}</span>}
            </button>
          )}
        </div>
      </div>
      {aCh?.bookmarks?.length>0&&<div style={{padding:"6px 18px",borderBottom:`1px solid ${C.b1}22`,display:"flex",gap:5,overflowX:"auto",alignItems:"center"}}>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM,flexShrink:0}}>📌</span>
        {aCh.bookmarks.map(bm=><button key={bm.id} onClick={()=>showT("Opening "+bm.label,"info")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,background:C.s3,color:C.t1,border:`1px solid ${C.b1}`,cursor:"pointer",whiteSpace:"nowrap",fontFamily:FM,fontWeight:500}} className="hov">🔗 {bm.label}</button>)}
      </div>}
      {showMsgSearch&&<div style={{padding:"7px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",gap:6,alignItems:"center",background:C.s1}}>
        <NavIcon id="search" s={13} col={C.t3}/><input value={msgSearch} onChange={e=>setMsgSearch(e.target.value)} autoFocus placeholder={"Search "+chLabel+"…"} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/><span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{msgSearch?fMsgs.length+" found":""}</span><button onClick={()=>{setShowMsgSearch(false);setMsgSearch("");}} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:13}}>×</button>
      </div>}
      {showPinned&&chPins.length>0&&<div style={{padding:"8px 18px",borderBottom:`1px solid ${C.y}33`,background:C.yd}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.y,marginBottom:6}}>📌 PINNED ({chPins.length})</div>
        {chPins.map(pid=>{const m=curMsgs.find(x=>x.id===pid);return m?<div key={pid} style={{fontSize:12,color:C.t1,padding:"5px 10px",background:C.s1,borderRadius:6,border:`1px solid ${C.b1}`,marginBottom:3,display:"flex",alignItems:"center",gap:6}}>
          <Av i={ag[m.uid]?.av||"?"} c={ag[m.uid]?.color||C.t3} s={16}/><strong style={{fontSize:11}}>{ag[m.uid]?.name}:</strong><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.text.slice(0,80)}</span>
          <button onClick={()=>pin(m.id)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10,flexShrink:0}}>✕</button>
        </div>:null;})}
      </div>}
      {aiSummary&&<div style={{padding:"10px 18px",borderBottom:`1px solid ${C.p}33`,background:C.pd}}>
        <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}><span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.p}}>✦ AI Summary</span><button onClick={()=>setAiSummary(null)} style={{marginLeft:"auto",color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:13}}>×</button></div>
        <div style={{fontSize:13,color:C.t1,lineHeight:1.6,whiteSpace:"pre-line"}}>{aiSummary}</div>
      </div>}
      <div style={{flex:1,overflowY:"auto",position:"relative"}}>
        {tcMsgsLoading?<SkelMsgs n={5}/>:<>{fMsgs.length===0&&<div style={{padding:"60px 30px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>💬</div><div style={{fontSize:16,fontWeight:700,fontFamily:FD,color:C.t1}}>No messages yet</div><div style={{fontSize:13,color:C.t3,marginTop:6}}>{msgSearch?"No messages match \""+msgSearch+"\"":"Send the first message to get the conversation started!"}</div></div>}
        {fMsgs.map((m,i)=><div key={m.id}>
          {/* Date separator */}
          {i>0&&fMsgs[i-1]?.date!==m.date&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 22px"}}><div style={{flex:1,height:1,background:C.b1}}/><span style={{fontSize:11,color:C.t3,fontFamily:FM,fontWeight:600,background:C.bg,padding:"2px 10px",borderRadius:12,border:`1px solid ${C.b1}`}}>{m.date}</span><div style={{flex:1,height:1,background:C.b1}}/></div>}
          {/* New messages divider */}
          {i>0&&fMsgs[i-1]?.id===lastRead[activeCh]&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 22px"}}><div style={{flex:1,height:2,background:C.r}}/><span style={{fontSize:11,color:C.r,fontFamily:FM,fontWeight:700,background:C.rd,padding:"2px 10px",borderRadius:12}}>New messages</span><div style={{flex:1,height:2,background:C.r}}/></div>}
          {renderMsg(m,false)}
          {/* Read receipts on last own message */}
          {i===fMsgs.length-1&&m.uid==="a1"&&<div style={{padding:"2px 22px 6px",display:"flex",gap:2,alignItems:"center"}}><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>Seen by</span>{agents.filter(a=>a.id!=="a1"&&a.status==="online").slice(0,3).map(a=><span key={a.id} style={{marginLeft:-2}} title={a.name}><Av i={a.av} c={a.color} s={16}/></span>)}<span style={{fontSize:9,color:C.g,marginLeft:2}}>✓✓</span></div>}
        </div>)}
        {/* Typing indicator */}
        {(typingUsers[activeCh]||[]).length>0&&<div style={{padding:"6px 22px",display:"flex",alignItems:"center",gap:6}}>
          {typingUsers[activeCh].map(u=><Av key={u} i={ag[u]?.av||"?"} c={ag[u]?.color||C.t3} s={20}/>)}
          <span style={{fontSize:12,color:C.t3,fontStyle:"italic"}}>{typingUsers[activeCh].map(u=>ag[u]?.name?.split(" ")[0]).join(", ")} typing</span>
          <span style={{display:"flex",gap:2}}>{[0,1,2].map(i=><span key={i} style={{width:4,height:4,borderRadius:"50%",background:C.a,animation:`blink 1.2s infinite ${i*0.2}s`}}/>)}</span>
        </div>}
        {/* Polls */}
        {(polls[activeCh]||[]).map(pl=>{const tv=pl.opts.reduce((s,o)=>s+o.votes.length,0);return(
          <div key={pl.id} style={{margin:"8px 22px",padding:"14px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:10}}>📊 {pl.q}</div>
            {pl.opts.map((o,oi)=>{const pct=tv?Math.round(o.votes.length/tv*100):0;const v=o.votes.includes("a1");return(
              <button key={oi} onClick={()=>votePoll(pl.id,oi)} style={{width:"100%",padding:"8px 12px",borderRadius:8,marginBottom:4,cursor:"pointer",background:v?C.ad:C.s2,border:`1.5px solid ${v?C.a+"55":C.b1}`,textAlign:"left",display:"flex",alignItems:"center",gap:6,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:pct+"%",background:v?C.a+"18":C.b1+"33",transition:"width .3s"}}/>
                <span style={{fontSize:13,color:v?C.a:C.t1,fontWeight:v?700:500,position:"relative",flex:1}}>{o.text}</span>
                <span style={{fontSize:11,fontFamily:FM,color:v?C.a:C.t3,position:"relative",fontWeight:700}}>{pct}%</span>
              </button>
            );})}
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>{tv} vote{tv!==1?"s":""}</div>
          </div>
        );})}
        <div ref={ref}/></>}
      </div>
      {/* AI suggestions */}
      {aiSugs.length>0&&<div style={{padding:"6px 18px",borderTop:`1px solid ${C.p}33`,background:C.pd,display:"flex",gap:4,alignItems:"center",overflowX:"auto"}}>
        <span style={{fontSize:11,color:C.p,fontFamily:FM,fontWeight:700,flexShrink:0}}>✦ AI</span>
        {aiSugs.map((s,i)=><button key={i} onClick={()=>{setTcInp(s);setAiSugs([]);}} className="hov" style={{padding:"5px 12px",borderRadius:16,fontSize:12,background:C.s2,border:`1px solid ${C.p}33`,color:C.t1,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontWeight:500}}>{s.slice(0,50)}{s.length>50?"…":""}</button>)}
        <button onClick={()=>setAiSugs([])} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12,flexShrink:0}}>×</button>
      </div>}
      {/* Slash commands */}
      {showSlash&&<div style={{padding:"8px 18px",borderTop:`1px solid ${C.b1}`,background:C.s2,maxHeight:180,overflowY:"auto"}}>
        <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>COMMANDS</div>
        {SLASH_CMDS.filter(c=>!tcInp||c.cmd.startsWith(tcInp)).map(c=>(
          <button key={c.cmd} onClick={()=>{setTcInp(c.cmd+" ");setShowSlash(false);}} className="hov" style={{width:"100%",display:"flex",gap:10,padding:"7px 10px",background:"transparent",border:"none",cursor:"pointer",borderRadius:6,textAlign:"left",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.cy,fontFamily:FM,width:70}}>{c.cmd}</span><span style={{fontSize:12,color:C.t2}}>{c.desc}</span>
          </button>
        ))}
      </div>}
      <div style={{padding:"10px 18px",borderTop:`1px solid ${C.b1}`,background:C.s1}}>
        {/* Formatting toolbar */}
        <div style={{display:"flex",gap:2,marginBottom:6,alignItems:"center",padding:"4px 6px",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`}}>
          {[{l:"B",fn:()=>insertFmt("**","**"),t:"Bold",w:800,ff:"serif"},{l:"I",fn:()=>insertFmt("_","_"),t:"Italic",w:400,fs:"italic",ff:"serif"},{l:"S",fn:()=>insertFmt("~~","~~"),t:"Strikethrough",w:400,td:"line-through",ff:"serif"},{l:"</>",fn:()=>insertFmt("`","`"),t:"Code"},{l:">",fn:()=>insertFmt("> "),t:"Quote"},{l:"🔗",fn:()=>insertFmt("[link](url)"),t:"Link"}].map(b=>
            <button key={b.l} onClick={b.fn} title={b.t} style={{width:30,height:28,borderRadius:5,fontSize:b.l.length>2?10:13,fontWeight:b.w||500,fontStyle:b.fs||"normal",textDecoration:b.td||"none",background:"transparent",color:C.t2,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:b.ff||FM,transition:"all .1s"}} className="hov">{b.l}</button>
          )}
          <div style={{width:1,height:18,background:C.b2,margin:"0 4px"}}/>
          <button onClick={()=>{setShowEmojiPicker(p=>!p);setMentionSearch(null);}} title="Emoji" style={{width:30,height:28,borderRadius:5,fontSize:14,background:showEmojiPicker?C.yd:"transparent",color:C.t2,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">😊</button>
          <button onClick={()=>insertFmt("@")} title="Mention" style={{width:30,height:28,borderRadius:5,fontSize:14,background:"transparent",color:C.a,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}} className="hov">@</button>
          <div style={{width:1,height:18,background:C.b2,margin:"0 4px"}}/>
          <button onClick={aiReply} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:C.pd,color:C.p,border:`1px solid ${C.p}44`,cursor:"pointer",fontFamily:FM,display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:10}}>✦</span>{aiSugLoad?"…":"AI"}</button>
          <button onClick={()=>setShowSchedule(p=>!p)} title="Schedule" style={{width:30,height:28,borderRadius:5,fontSize:14,background:"transparent",color:C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">🕐</button>
          <input ref={fileRef} type="file" onChange={handleFileUpload} style={{display:"none"}} accept="*/*"/>
          <button onClick={()=>fileRef.current?.click()} title="Attach file" style={{width:30,height:28,borderRadius:5,fontSize:14,background:"transparent",color:C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">📎</button>
          {scheduledMsgs.length>0&&<button onClick={()=>setShowScheduledList(p=>!p)} style={{padding:"3px 8px",borderRadius:5,fontSize:10,color:C.y,background:C.yd,border:`1px solid ${C.y}44`,cursor:"pointer",fontFamily:FM}}>{scheduledMsgs.length} sched</button>}
          <div style={{flex:1}}/>
          {drafts[activeCh]&&<span style={{fontSize:9,color:C.y,fontFamily:FM,background:C.yd,padding:"2px 6px",borderRadius:4}}>Draft</span>}
        </div>
        {/* Emoji picker */}
        {showEmojiPicker&&<div style={{display:"flex",gap:2,flexWrap:"wrap",padding:8,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:6,maxHeight:130,overflowY:"auto",animation:"fadeUp .1s ease"}}>
          {EMOJI_GRID.map(e=><button key={e} onClick={()=>insertEmoji(e)} style={{width:32,height:32,borderRadius:5,fontSize:18,background:"transparent",border:"none",cursor:"pointer"}} className="hov">{e}</button>)}
        </div>}
        {/* @mention autocomplete */}
        {mentionSearch!==null&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:6,marginBottom:6,animation:"fadeUp .1s ease"}}>
          {agents.filter(a=>a.name.toLowerCase().includes(mentionSearch)||mentionSearch==="").map(a=>(
            <button key={a.id} onClick={()=>insertMention(a.name)} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
              <Av i={a.av} c={a.color} s={24} dot={a.status==="online"}/><span style={{fontSize:13,color:C.t1,fontWeight:600}}>{a.name}</span><span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{a.role}</span>
            </button>
          ))}
        </div>}
        {/* Schedule form */}
        {showSchedule&&<div style={{display:"flex",gap:3,alignItems:"center",marginBottom:4,padding:"3px 5px",background:C.s2,borderRadius:5,border:`1px solid ${C.b1}`}}>
          <span style={{fontSize:9,color:C.t3}}>At:</span><input type="datetime-local" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:3,padding:"2px 5px",fontSize:9.5,color:C.t1,outline:"none"}}/><Btn ch="Schedule" v="primary" sm onClick={scheduleMsg}/><button onClick={()=>setShowSchedule(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:9}}>×</button>
        </div>}
        {/* Scheduled messages list */}
        {showScheduledList&&<div style={{marginBottom:4,padding:"5px 7px",background:C.s2,borderRadius:6,border:`1px solid ${C.y}44`,animation:"fadeUp .1s ease"}}>
          <div style={{fontSize:8.5,fontWeight:700,fontFamily:FM,color:C.y,marginBottom:4}}>🕐 SCHEDULED ({scheduledMsgs.length})</div>
          {scheduledMsgs.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <span style={{fontSize:10,color:C.t2,flex:1}}>{s.text.slice(0,40)}…</span>
            <span style={{fontSize:8.5,color:C.t3,fontFamily:FM}}>{s.time}</span>
            <button onClick={()=>cancelScheduled(s.id)} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:9}}>✕</button>
          </div>)}
        </div>}
        {/* Textarea */}
        <div style={{display:"flex",gap:5,alignItems:"flex-end"}}>
          <textarea value={tcInp} onChange={handleInp} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}if(e.key==="ArrowUp"&&!tcInp){const myMsgs=curMsgs.filter(m=>m.uid==="a1");if(myMsgs.length){const last=myMsgs[myMsgs.length-1];setEditingMsg(last.id);setEditText(last.text);}}}} placeholder={"Message "+chLabel+"… (/ for commands, @ for mentions)"} rows={2} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"9px 12px",fontSize:14,color:C.t1,fontFamily:FB,resize:"none",outline:"none",lineHeight:1.55}}/>
          <button onClick={send} style={{width:36,height:36,borderRadius:8,background:tcInp.trim()?C.a:C.s3,color:tcInp.trim()?"#fff":C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,transition:"all .15s"}}>{"\u2191"}</button>
        </div>
      </div>
    </div>

    {/* ═══ SECONDARY PANES — multi-chat like Cliq ═══ */}
    {panes.map(pId=>{const pCh=channels.find(c=>c.id===pId);const pDm=tcDms.find(d=>d.id===pId);const pDmAg=pDm?agents.find(a=>a.id===pDm.agentId):null;const pMsgs=tcMsgs[pId]||[];const pLabel=pCh?("#"+pCh.name):pDmAg?pDmAg.name:"Chat";const pColor=pCh?.color||pDmAg?.color||C.a;const pMembers=pCh?getChMembers(pCh).length:2;
    return <div key={pId} style={{width:360,minWidth:300,background:C.bg,borderLeft:`2px solid ${pColor}44`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative"}}>
      {/* Pane Header */}
      <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:8}}>
        {pCh?<><span style={{fontSize:13,fontWeight:700}}>{pCh.icon}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,fontFamily:FD,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pCh.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>⧉ {pMembers} members</div></div></>:
        pDmAg?<><Av i={pDmAg.av} c={pDmAg.color} s={24} dot={pDmAg.status==="online"}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{pDmAg.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{pDmAg.status}</div></div></>:null}
        <button onClick={()=>{setActiveCh(pId);closePane(pId);}} title="Focus this chat" style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer"}} className="hov">↙</button>
        <button onClick={()=>closePane(pId)} title="Close pane" style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">×</button>
      </div>
      {/* Pane Messages */}
      <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:6}}>
        {pMsgs.length===0?<EmptyState icon="💬" title="No messages" desc="Start typing below"/>:
        pMsgs.map(m=>{const isMe=m.uid==="a1";const a=ag[m.uid];
          return <div key={m.id} style={{display:"flex",gap:6,padding:"4px 0"}}>
            {!isMe&&<Av i={a?.av||"?"} c={a?.color||C.t3} s={22}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:1}}>
                <span style={{fontSize:11,fontWeight:700,color:isMe?C.a:C.t1}}>{a?.name||"Bot"}</span>
                <span style={{fontSize:8.5,color:C.t3,fontFamily:FM}}>{m.t}</span>
              </div>
              <div style={{fontSize:12.5,color:C.t1,lineHeight:1.5,wordBreak:"break-word"}}>{m.text}</div>
              {m.file&&<div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 8px",background:C.s3,border:`1px solid ${C.b1}`,borderRadius:6,marginTop:3,fontSize:10}}>📎 {m.file.name} <span style={{color:C.t3}}>{m.file.size}</span></div>}
              {m.reactions?.length>0&&<div style={{display:"flex",gap:2,marginTop:2,flexWrap:"wrap"}}>{m.reactions.map((r,ri)=><span key={ri} style={{padding:"1px 5px",borderRadius:8,background:C.s3,border:`1px solid ${C.b1}`,fontSize:10,cursor:"pointer"}}>{r.emoji} {r.users.length}</span>)}</div>}
              {m.thread?.length>0&&<div style={{fontSize:9,color:C.a,fontFamily:FM,marginTop:2,cursor:"pointer"}} onClick={()=>{setActiveCh(pId);closePane(pId);setShowThread(m);}}>{m.thread.length} {m.thread.length===1?"reply":"replies"}</div>}
            </div>
          </div>;})}
      </div>
      {/* Pane Input */}
      <div style={{padding:"8px 10px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:4}}>
        <input value={paneInputs[pId]||""} onChange={e=>setPaneInputs(p=>({...p,[pId]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();paneSend(pId);}}} placeholder={"Message "+pLabel+"…"} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"7px 10px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none"}}/>
        <button onClick={()=>paneSend(pId)} style={{width:30,height:30,borderRadius:7,background:(paneInputs[pId]||"").trim()?C.a:C.s3,color:(paneInputs[pId]||"").trim()?"#fff":C.t3,border:"none",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
      </div>
    </div>;})}

    {/* ═══ RIGHT PANELS ═══ */}
    {showThread&&<div style={{width:320,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>💬 Thread</span><button onClick={()=>setShowThread(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
        <div style={{padding:12,background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><Av i={ag[showThread.uid]?.av||"?"} c={ag[showThread.uid]?.color||C.t3} s={24}/><span style={{fontSize:13,fontWeight:700}}>{ag[showThread.uid]?.name}</span><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{showThread.t}</span></div>
          <div style={{fontSize:13,color:C.t1,lineHeight:1.55}}>{showThread.text.slice(0,250)}{showThread.text.length>250?"…":""}</div>
        </div>
        <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginBottom:8,fontWeight:600}}>{showThread.thread.length} {showThread.thread.length===1?"reply":"replies"}</div>
        {showThread.thread.map(t=>renderMsg(t,true))}
      </div>
      <div style={{padding:"10px 12px",borderTop:`1px solid ${C.b1}`}}>
        <div style={{display:"flex",gap:5}}><input value={threadInp} onChange={e=>setThreadInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendTh();}}} placeholder="Reply in thread…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/><button onClick={sendTh} style={{width:32,height:32,borderRadius:8,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2191"}</button></div>
      </div>
    </div>}
    {showMembers&&!showThread&&<div style={{width:280,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>👥 Members{aCh?` (${getChMembers(aCh).length})`:""}</span><button onClick={()=>setShowMembers(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
      {aCh&&<button onClick={()=>setShowInvite(true)} className="hov" style={{margin:"10px 12px 4px",padding:"8px",borderRadius:8,fontSize:12,background:C.ad,color:C.a,border:`1px dashed ${C.a}44`,cursor:"pointer",fontWeight:600}}>+ Add to Channel</button>}
      {setAgents&&<button onClick={()=>setShowWsInvite(true)} className="hov" style={{margin:"4px 12px 8px",padding:"8px",borderRadius:8,fontSize:12,background:C.gd,color:C.g,border:`1px dashed ${C.g}44`,cursor:"pointer",fontWeight:600}}>+ Invite to Workspace</button>}
      <div style={{padding:"0 12px 6px"}}><div style={{fontSize:10,color:C.t3,fontFamily:FM,background:C.s2,padding:"4px 8px",borderRadius:6,textAlign:"center"}}>{agents.length} members across workspace</div></div>
      <div style={{flex:1,overflowY:"auto",padding:5}}>
        {(aCh?agents.filter(a=>getChMembers(aCh).includes(a.id)):agents).map(a=><div key={a.id} className="hov" onClick={()=>setProfilePop(a.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 7px",borderRadius:5,cursor:"pointer"}}>
          <Av i={a.av} c={a.color} s={22} dot={a.status==="online"}/>
          <div style={{flex:1}}><div style={{fontSize:10.5,fontWeight:600,display:"flex",alignItems:"center",gap:3}}>{a.name}{a.id==="a1"?" (You)":""}<span style={{fontSize:7,padding:"0px 3px",borderRadius:3,background:a.role==="Owner"?C.pd:a.role==="Admin"?C.ad:a.role==="Agent"?C.gd:C.s3,color:a.role==="Owner"?C.p:a.role==="Admin"?C.a:a.role==="Agent"?C.g:C.t3,fontWeight:700,fontFamily:FM}}>{a.role}</span></div><div style={{fontSize:8.5,color:C.t3,fontFamily:FM}}>{a.status}</div></div>
          {aCh&&a.id!=="a1"&&<button onClick={e=>{e.stopPropagation();removeMember(activeCh,a.id);}} title="Remove" style={{fontSize:8,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>}
        </div>)}
        {aCh&&agents.filter(a=>!getChMembers(aCh).includes(a.id)).length>0&&<>
          <div style={{fontSize:8.5,fontWeight:700,fontFamily:FM,color:C.t3,marginTop:8,marginBottom:3,paddingLeft:7}}>NOT IN CHANNEL</div>
          {agents.filter(a=>!getChMembers(aCh).includes(a.id)).map(a=><div key={a.id} className="hov" style={{display:"flex",alignItems:"center",gap:6,padding:"4px 7px",borderRadius:5,opacity:0.6}}>
            <Av i={a.av} c={a.color} s={20}/>
            <span style={{flex:1,fontSize:10.5}}>{a.name}</span>
            <button onClick={()=>addMember(activeCh,a.id)} style={{fontSize:8,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:3,padding:"1px 5px",cursor:"pointer",fontFamily:FM}}>+ Add</button>
          </div>)}
        </>}
      </div>
    </div>}
    {showChInfo&&!showThread&&!showMembers&&aCh&&<div style={{width:260,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"7px 10px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,fontFamily:FD}}>Channel Info</span><button onClick={()=>setShowChInfo(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:10}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:3}}>{aCh.icon} {aCh.name}</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:6}}>{aCh.desc}</div>
        {aCh.topic&&<div style={{fontSize:12,color:C.t1,fontStyle:"italic",padding:"6px 10px",background:C.s2,borderRadius:7,marginBottom:10,border:`1px solid ${C.b1}`}}>📌 {aCh.topic}</div>}
        {[{l:"Members",v:getChMembers(aCh).length},{l:"Messages",v:curMsgs.length},{l:"Pinned",v:chPins.length},{l:"Files",v:curMsgs.filter(m=>m.file).length},{l:"Created",v:"Jan 2026"},{l:"Type",v:aCh.private?"🔒 Private":"# Public"}].map(r=><div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.b1}22`}}><span style={{fontSize:11,color:C.t3}}>{r.l}</span><span style={{fontSize:12,fontWeight:600}}>{r.v}</span></div>)}
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginTop:14,marginBottom:6}}>MEMBERS ({getChMembers(aCh).length})</div>
        {getChMembers(aCh).map(mid=>{const a2=ag[mid];return a2?<div key={mid} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0"}}>
          <Av i={a2.av} c={a2.color} s={24} dot={a2.status==="online"}/>
          <span style={{fontSize:12,flex:1,fontWeight:500}}>{a2.name}</span>
          {mid==="a1"?<span style={{fontSize:9,color:C.p,fontFamily:FM,fontWeight:600}}>You</span>:<button onClick={()=>removeMember(activeCh,mid)} style={{fontSize:10,color:C.r,background:"none",border:"none",cursor:"pointer",fontFamily:FM}}>Remove</button>}
        </div>:null;})}
        <button onClick={()=>setShowInvite(true)} className="hov" style={{width:"100%",padding:"8px",borderRadius:8,fontSize:12,background:C.ad,color:C.a,border:`1px dashed ${C.a}44`,cursor:"pointer",marginTop:8,fontWeight:600}}>+ Add Members</button>
        <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
          <Btn ch="✎ Edit Channel" v="ghost" full sm onClick={openEditCh}/>
          <Btn ch={aCh.muted?"🔔 Unmute":"🔕 Mute"} v="ghost" full sm onClick={()=>{setChannels(p=>p.map(c=>c.id===activeCh?{...c,muted:!c.muted}:c));showT(aCh.muted?"Unmuted":"Muted","info");}}/>
          <Btn ch={aCh.starred?"☆ Unstar":"⭐ Star"} v="ghost" full sm onClick={()=>star(activeCh)}/>
          <Btn ch="↩ Leave Channel" v="ghost" full sm onClick={()=>leaveCh(activeCh)}/>
          <button onClick={()=>setShowDeleteCh(true)} style={{width:"100%",padding:"6px",borderRadius:6,fontSize:10.5,background:C.rd,color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer",fontWeight:600}}>🗑 Delete Channel</button>
        </div>
      </div>
    </div>}
    {showAiPanel&&!showThread&&!showMembers&&!showChInfo&&<div style={{width:300,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>✦ AI Assistant</span><button onClick={()=>setShowAiPanel(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {[{l:"Summarize Channel",fn:aiSum,c:C.p,d:"Key decisions & actions",ld:aiSumLoad},{l:"Smart Reply",fn:aiReply,c:C.a,d:"3 contextual suggestions",ld:aiSugLoad},{l:"Generate Standup",fn:aiStd,c:C.g,d:"DONE / DOING / BLOCKED",ld:aiStdLoad}].map(t=>(
          <button key={t.l} onClick={t.fn} disabled={t.ld} className="hov" style={{padding:12,borderRadius:10,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:13,fontWeight:700,color:t.c}}>✦ {t.l}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:2}}>{t.ld?"Processing…":t.d}</div>
          </button>
        ))}
        {aiStandup&&<div style={{padding:10,background:C.gd,border:`1px solid ${C.g}44`,borderRadius:10}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.g,marginBottom:4}}>STANDUP</div>
          <div style={{fontSize:12,color:C.t1,lineHeight:1.5,whiteSpace:"pre-line"}}>{aiStandup}</div>
          <button onClick={()=>{navigator.clipboard?.writeText(aiStandup);showT("Copied!","success");}} style={{marginTop:6,padding:"4px 10px",borderRadius:5,fontSize:10,background:C.s2,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Copy</button>
        </div>}
        <div style={{borderTop:`1px solid ${C.b1}`,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>QUICK ACTIONS</div>
          {[{l:"Translate last message",fn:()=>showT("(Hindi translation)","info")},{l:"Detect sentiment",fn:()=>showT("Positive 😊 82%","success")},{l:"Extract action items",fn:()=>showT("1) Check Stripe 2) Monitor CSAT 3) Budget review","info")},{l:"Draft announcement",fn:()=>{setTcInp("📢 **Announcement:**\n\n");setShowAiPanel(false);}}].map(a=>(
            <button key={a.l} onClick={a.fn} className="hov" style={{width:"100%",padding:"7px 10px",borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:12,color:C.t1,textAlign:"left",marginBottom:4,display:"flex",gap:5,alignItems:"center"}}><span style={{color:C.p,fontSize:10}}>✦</span>{a.l}</button>
          ))}
        </div>
      </div>
    </div>}

    {/* Files Panel */}
    {showFilesPanel&&!showThread&&!showMembers&&!showChInfo&&!showAiPanel&&<div style={{width:250,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"7px 10px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,fontFamily:FD}}>Shared Files</span><button onClick={()=>setShowFilesPanel(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:6}}>
        {(()=>{const files=curMsgs.filter(m=>m.file);return files.length===0?<div style={{padding:"20px 10px",textAlign:"center",fontSize:10.5,color:C.t3}}>No files shared yet</div>:files.map(m=>(
          <div key={m.id} className="hov" style={{display:"flex",alignItems:"center",gap:6,padding:"7px 8px",borderRadius:6,cursor:"pointer",marginBottom:3}} onClick={()=>showT("Opening "+m.file.name,"info")}>
            <span style={{fontSize:16}}>{m.file.type==="pdf"?"📄":m.file.type==="img"?"🖼":"📁"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10.5,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.file.name}</div>
              <div style={{fontSize:10.5,color:C.t3,fontFamily:FM}}>{m.file.size} · {ag[m.uid]?.name||"Unknown"} · {m.t}</div>
            </div>
            <span style={{color:C.a,fontSize:9}}>↓</span>
          </div>
        ));})()}
      </div>
    </div>}
    {/* Channel Notification Prefs */}
    {showChNotif&&<Mdl title={"Notifications — "+chLabel} onClose={()=>setShowChNotif(false)} w={340}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {[{v:"all",l:"All messages",d:"Get notified for every message"},{v:"mentions",l:"@Mentions only",d:"Only when someone mentions you"},{v:"nothing",l:"Nothing",d:"Mute all notifications"}].map(o=>(
          <button key={o.v} onClick={()=>{setChNotifPrefs(p=>({...p,[activeCh]:o.v}));showT("Notifications: "+o.l,"success");setShowChNotif(false);}} className="hov" style={{padding:"10px 12px",borderRadius:8,background:(chNotifPrefs[activeCh]||"all")===o.v?C.ad:C.s2,border:`1.5px solid ${(chNotifPrefs[activeCh]||"all")===o.v?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:12,fontWeight:600,color:(chNotifPrefs[activeCh]||"all")===o.v?C.a:C.t1}}>{o.l}</div>
            <div style={{fontSize:10,color:C.t3}}>{o.d}</div>
          </button>
        ))}
      </div>
    </Mdl>}

    {/* ═══ MODALS ═══ */}
    {showHuddle&&<Mdl title={"Huddle — "+chLabel} onClose={()=>setShowHuddle(false)} w={400}>
      <div style={{textAlign:"center",padding:"14px 0"}}>
        <div style={{fontSize:40,marginBottom:10}}>🎧</div>
        <div style={{fontSize:16,fontWeight:700,fontFamily:FD,marginBottom:4}}>Voice Huddle</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:16}}>Live audio conversation with your team</div>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:16}}>
          {agents.filter(a=>a.status==="online").map(a=><div key={a.id} style={{textAlign:"center"}}><Av i={a.av} c={a.color} s={36} dot/><div style={{fontSize:10,color:C.t2,marginTop:3}}>{a.name.split(" ")[0]}</div></div>)}
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:8}}>
          <button onClick={()=>setHuddleMic(p=>!p)} style={{width:44,height:44,borderRadius:"50%",background:huddleMic?C.g:C.rd,border:`2px solid ${huddleMic?C.g:C.r}`,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} title={huddleMic?"Mute":"Unmute"}>{huddleMic?"🎤":"🔇"}</button>
          <button onClick={()=>setHuddleCam(p=>!p)} style={{width:44,height:44,borderRadius:"50%",background:huddleCam?C.a:C.s3,border:`2px solid ${huddleCam?C.a:C.b1}`,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} title={huddleCam?"Camera Off":"Camera On"}>{huddleCam?"📹":"📷"}</button>
          <button onClick={()=>setHuddleScreen(p=>!p)} style={{width:44,height:44,borderRadius:"50%",background:huddleScreen?C.p:C.s3,border:`2px solid ${huddleScreen?C.p:C.b1}`,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} title={huddleScreen?"Stop Share":"Share Screen"}>{huddleScreen?"🖥":"💻"}</button>
          <button onClick={()=>{setShowHuddle(false);setHuddleMic(true);setHuddleCam(false);setHuddleScreen(false);showT("Huddle ended","info");}} style={{width:44,height:44,borderRadius:"50%",background:C.r,border:"none",cursor:"pointer",fontSize:18,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:14}}>
          {[{l:"Mic",v:huddleMic,c:C.g},{l:"Camera",v:huddleCam,c:C.a},{l:"Screen",v:huddleScreen,c:C.p}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:10,color:s.v?s.c:C.t3,fontWeight:700,fontFamily:FM}}>{s.v?"ON":"OFF"}</div><div style={{fontSize:9,color:C.t3}}>{s.l}</div></div>
          ))}
        </div>
      </div>
    </Mdl>}
    {showNewCh&&<Mdl title="Create Channel" onClose={()=>setShowNewCh(false)} w={360}><Fld label="Name"><Inp val={newChName} set={setNewChName} ph="e.g. design-feedback"/></Fld><Fld label="Description"><Inp val={newChDesc} set={setNewChDesc} ph="About this channel"/></Fld><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10}}><Toggle val={newChPrivate} set={setNewChPrivate}/><span style={{fontSize:11,color:C.t2}}>Private</span></div><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNewCh(false)}/><Btn ch="Create" v="primary" onClick={createCh}/></div></Mdl>}
    {/* Invite Members */}
    {showInvite&&aCh&&<Mdl title={"Add Members to #"+aCh.name} onClose={()=>setShowInvite(false)} w={380}>
      <p style={{fontSize:11.5,color:C.t3,marginBottom:10}}>Select team members to add to this channel:</p>
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:250,overflowY:"auto"}}>
        {agents.filter(a=>!getChMembers(aCh).includes(a.id)).length===0&&<div style={{padding:"16px",textAlign:"center",color:C.t3,fontSize:11}}>All team members are already in this channel</div>}
        {agents.filter(a=>!getChMembers(aCh).includes(a.id)).map(a=>(
          <button key={a.id} onClick={()=>{addMember(activeCh,a.id);}} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",transition:"all .1s"}}>
            <Av i={a.av} c={a.color} s={28} dot={a.status==="online"}/>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{a.role} · {a.status}</div></div>
            <span style={{fontSize:10,color:C.a,fontWeight:700}}>+ Add</span>
          </button>
        ))}
      </div>
      {getChMembers(aCh).length>0&&<div style={{marginTop:10}}>
        <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:5}}>ALREADY IN CHANNEL ({getChMembers(aCh).length})</div>
        <div style={{display:"flex",gap:-2,flexWrap:"wrap"}}>{getChMembers(aCh).map(mid=>{const a2=ag[mid];return a2?<div key={mid} title={a2.name} style={{marginLeft:-2}}><Av i={a2.av} c={a2.color} s={22}/></div>:null;})}</div>
      </div>}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn ch="Done" v="primary" onClick={()=>setShowInvite(false)}/></div>
    </Mdl>}
    {/* Edit Channel */}
    {showEditCh&&aCh&&<Mdl title={"Edit #"+aCh.name} onClose={()=>setShowEditCh(false)} w={400}>
      <Fld label="Channel Name"><Inp val={editChName} set={setEditChName} ph="channel-name"/></Fld>
      <Fld label="Description"><Inp val={editChDesc} set={setEditChDesc} ph="What's this channel about?"/></Fld>
      <Fld label="Topic"><Inp val={editChTopic} set={setEditChTopic} ph="Set a topic (shown in header)"/></Fld>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}><Toggle val={editChPrivate} set={setEditChPrivate}/><span style={{fontSize:11,color:C.t2}}>{editChPrivate?"🔒 Private — invite only":"# Public — anyone can join"}</span></div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowEditCh(false)}/><Btn ch="Save Changes" v="primary" onClick={editChSave}/></div>
    </Mdl>}
    {/* Delete Channel Confirmation */}
    {showDeleteCh&&aCh&&<Mdl title="Delete Channel" onClose={()=>setShowDeleteCh(false)} w={380}>
      <div style={{padding:"12px",background:C.rd,border:`1px solid ${C.r}44`,borderRadius:10,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:C.r,marginBottom:4}}>⚠ This action cannot be undone</div>
        <div style={{fontSize:11.5,color:C.t2,lineHeight:1.5}}>Deleting <strong>#{aCh.name}</strong> will permanently remove all {curMsgs.length} messages, {chPins.length} pins, and {getChMembers(aCh).length} member associations.</div>
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowDeleteCh(false)}/><button onClick={()=>deleteCh(activeCh)} style={{padding:"7px 16px",borderRadius:7,fontSize:12,fontWeight:700,background:C.r,color:"#fff",border:"none",cursor:"pointer"}}>Delete Forever</button></div>
    </Mdl>}
    {/* New DM */}
    {showNewDm&&<Mdl title="New Direct Message" onClose={()=>setShowNewDm(false)} w={380}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:11.5,color:C.t3}}>All workspace members ({agents.length-1}):</span>{setAgents&&<button onClick={()=>{setShowNewDm(false);setShowWsInvite(true);}} style={{fontSize:10,color:C.g,background:C.gd,border:`1px solid ${C.g}44`,borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:FM}}>+ Invite New</button>}</div>
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:280,overflowY:"auto"}}>
        {agents.filter(a=>a.id!=="a1").map(a=>{const existing=tcDms.find(d=>d.agentId===a.id);return(
          <button key={a.id} onClick={()=>startDm(a.id)} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,background:existing?C.ad:C.s2,border:`1.5px solid ${existing?C.a+"44":C.b1}`,cursor:"pointer",transition:"all .1s"}}>
            <Av i={a.av} c={a.color} s={32} dot={a.status==="online"}/>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:12.5,fontWeight:600,color:C.t1,display:"flex",alignItems:"center",gap:4}}>{a.name}<span style={{fontSize:7.5,padding:"1px 4px",borderRadius:3,background:a.role==="Owner"?C.pd:a.role==="Admin"?C.ad:a.role==="Agent"?C.gd:C.s3,color:a.role==="Owner"?C.p:a.role==="Admin"?C.a:a.role==="Agent"?C.g:C.t3,fontWeight:700,fontFamily:FM}}>{a.role}</span></div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{a.email||"No email"} · {a.status}</div></div>
            {existing?<span style={{fontSize:9,color:C.a,fontFamily:FM,fontWeight:700}}>Open →</span>:<span style={{fontSize:9,color:C.g,fontFamily:FM,fontWeight:700}}>+ New</span>}
          </button>
        );})}
      </div>
    </Mdl>}
    {/* Workspace Invite (shared with Settings) */}
    {showWsInvite&&<Mdl title="Invite to Workspace" onClose={()=>setShowWsInvite(false)} w={400}>
      <div style={{background:C.ad,border:`1px solid ${C.a}33`,borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11.5,color:C.t2}}>New members appear <strong>everywhere</strong> — Settings, Team Chat, Channels, DMs. They start as <strong>Member</strong> role. Promote to <strong>Agent</strong> in Settings → Agents & Teams.</div>
      <Fld label="Full Name"><Inp val={wsInvName} set={setWsInvName} ph="e.g. Rahul Kumar"/></Fld>
      <Fld label="Email"><Inp val={wsInvEmail} set={setWsInvEmail} ph="member@company.com" type="email"/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowWsInvite(false)}/><Btn ch="Invite Member" v="primary" onClick={inviteToWorkspace}/></div>
    </Mdl>}
    {showPoll&&<Mdl title="Create Poll" onClose={()=>setShowPoll(false)} w={380}><Fld label="Question"><Inp val={pollQ} set={setPollQ} ph="Ask something"/></Fld><Fld label="Options">{pollOpts.map((o,i)=><div key={i} style={{display:"flex",gap:3,marginBottom:3}}><Inp val={o} set={v=>setPollOpts(p=>p.map((x,j)=>j===i?v:x))} ph={"Option "+(i+1)}/>{i>1&&<button onClick={()=>setPollOpts(p=>p.filter((_,j)=>j!==i))} style={{color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>}</div>)}{pollOpts.length<6&&<button onClick={()=>setPollOpts(p=>[...p,""])} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer"}}>+ Add</button>}</Fld><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowPoll(false)}/><Btn ch="Create" v="primary" onClick={createPoll}/></div></Mdl>}
    {showFwd&&<Mdl title="Forward" onClose={()=>setShowFwd(null)} w={360}><p style={{fontSize:11,color:C.t2,marginBottom:8}}>Forward to:</p>{channels.filter(c=>c.id!==activeCh).map(ch=><button key={ch.id} onClick={()=>fwd(showFwd,ch.id)} className="hov" style={{width:"100%",padding:"6px 9px",borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"left",marginBottom:3,fontSize:11,color:C.t2,display:"flex",gap:4}}><span style={{fontWeight:700,color:C.t3}}>#</span>{ch.name}</button>)}</Mdl>}
    {reminderMsg&&<Mdl title="Remind Me" onClose={()=>setReminderMsg(null)} w={340}><div style={{padding:"6px 8px",background:C.s3,borderRadius:6,marginBottom:10,fontSize:10.5,color:C.t2}}>{reminderMsg.text.slice(0,80)}…</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>{[{v:"15",l:"15m"},{v:"30",l:"30m"},{v:"60",l:"1h"},{v:"180",l:"3h"},{v:"1440",l:"Tomorrow"}].map(o=><button key={o.v} onClick={()=>setReminderTime(o.v)} style={{padding:"4px 10px",borderRadius:5,fontSize:10.5,background:reminderTime===o.v?C.ad:C.s2,color:reminderTime===o.v?C.a:C.t2,border:`1.5px solid ${reminderTime===o.v?C.a+"55":C.b1}`,cursor:"pointer",fontWeight:reminderTime===o.v?700:400}}>{o.l}</button>)}</div><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setReminderMsg(null)}/><Btn ch="Set" v="primary" onClick={()=>{showT("Reminder set","success");setReminderMsg(null);}}/></div></Mdl>}
    {profilePop&&ag[profilePop]&&(()=>{const a=ag[profilePop];return <div onClick={()=>setProfilePop(null)} style={{position:"fixed",inset:0,zIndex:100}}><div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"20%",left:"35%",width:300,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:14,padding:18,boxShadow:"0 16px 50px rgba(0,0,0,.5)",animation:"fadeUp .15s ease"}}>
      <button onClick={()=>setProfilePop(null)} style={{position:"absolute",top:8,right:10,background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:14}}>×</button>
      <div style={{textAlign:"center",marginBottom:12}}><Av i={a.av} c={a.color} s={56} dot={a.status==="online"}/><div style={{fontSize:16,fontWeight:700,fontFamily:FD,marginTop:8}}>{a.name}</div><div style={{display:"flex",justifyContent:"center",gap:4,marginTop:4}}><Tag text={a.role} color={a.role==="Owner"?C.p:a.role==="Admin"?C.a:C.g}/><Tag text={a.status} color={a.status==="online"?C.g:a.status==="busy"?C.r:C.t3}/></div></div>
      <div style={{background:C.s3,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
        {[{l:"Email",v:a.email||"—"},{l:"Role",v:a.role},{l:"Status",v:a.status},{l:"Timezone",v:"Asia/Kolkata"},{l:"Local Time",v:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}].map(r=>(
          <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <span style={{fontSize:11,color:C.t3}}>{r.l}</span>
            <span style={{fontSize:11,fontWeight:600,color:C.t1}}>{r.v}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <Btn ch="💬 Message" v="primary" full sm onClick={()=>startDm(profilePop)}/>
        <Btn ch="📞 Huddle" v="ghost" full sm onClick={()=>{setProfilePop(null);setShowHuddle(true);}}/>
      </div>
    </div></div>;})()}
  </div>;
}

export function MiniChatPanel({agents,onClose,onExpand}){
  const [activeCh,setActiveCh]=useState("ch1");
  const [msgs]=useState(TC_MSGS_INIT);
  const [inp,setInp]=useState("");
  const ag=agents.reduce((m,a)=>{m[a.id]=a;return m;},{});
  const cur=(msgs[activeCh]||[]).slice(-5);
  return <div style={{position:"fixed",bottom:78,right:20,width:350,height:450,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:13,overflow:"hidden",boxShadow:"0 16px 50px rgba(0,0,0,.5)",zIndex:79,display:"flex",flexDirection:"column",animation:"fadeUp .2s ease"}}>
    <div style={{padding:"6px 9px",background:C.s1,borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:5}}>
      <NavIcon id="teamchat" s={13} col={C.a}/><span style={{fontSize:12,fontWeight:700,fontFamily:FD,flex:1}}>Team Chat</span>
      <button onClick={onExpand} style={{width:18,height:18,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">{"\u2197"}</button>
      <button onClick={onClose} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button>
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,overflowX:"auto",flexShrink:0}}>
      {TC_CHANNELS.slice(0,4).map(ch=><button key={ch.id} onClick={()=>setActiveCh(ch.id)} style={{padding:"3px 7px",fontSize:9,fontWeight:600,fontFamily:FM,color:activeCh===ch.id?C.a:C.t3,borderBottom:`2px solid ${activeCh===ch.id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>#{ch.name.slice(0,10)}</button>)}
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"3px 5px"}}>
      {cur.map(m=>{const a2=m.isBot?{name:"AI",av:"✦",color:C.p}:ag[m.uid]||{name:"?",av:"?",color:C.t3};return(
        <div key={m.id} style={{display:"flex",gap:3,marginBottom:4}}>
          <Av i={a2.av} c={a2.color} s={16}/>
          <div style={{flex:1}}><div style={{fontSize:9}}><strong style={{color:C.t1}}>{a2.name}</strong> <span style={{color:C.t3,fontFamily:FM}}>{m.t}</span></div><div style={{fontSize:10,color:C.t2,lineHeight:1.3}}>{m.text.slice(0,80)}{m.text.length>80?"…":""}</div>
          {m.file&&<div style={{fontSize:8,color:C.a,marginTop:1}}>📎 {m.file.name}</div>}
          {m.reactions?.length>0&&<div style={{display:"flex",gap:1,marginTop:1}}>{m.reactions.map(r=><span key={r.emoji} style={{fontSize:8,background:C.s3,borderRadius:5,padding:"0 2px"}}>{r.emoji}{r.users.length}</span>)}</div>}
          </div>
        </div>
      );})}
    </div>
    <div style={{padding:"4px 5px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:3}}>
      <input value={inp} onChange={e=>setInp(e.target.value)} placeholder="Message…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 6px",fontSize:10,color:C.t1,fontFamily:FB,outline:"none"}}/>
      <button onClick={onExpand} style={{padding:"3px 6px",borderRadius:4,fontSize:8.5,fontWeight:700,background:C.a,color:"#fff",border:"none",cursor:"pointer"}}>Open</button>
    </div>
  </div>;
}

