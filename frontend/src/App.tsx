import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from "react";
import {
  C, FD, FB, FM, FDN, FBN, FMN, FONTS, THEMES, FONT_SIZES, FS, setFS,
  api, _token, _connected, uid, showT, playNotifSound, exportCSV, exportTableCSV,
  nameColor, t, LANGS, LANG, setLANG, now, ROUTES, hashToScr,
  AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT,
  A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL,
  SDLogo, ChIcon, chI, chC, prC, NavIcon,
  Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl,
  CountUp, Confetti, ConvPreview, Fld, Spin,
  Skel, SkelRow, SkelCards, SkelMsgs, SkelTable,
  EmptyState, ErrorBanner, ConnBadge, AiInsight,
  LoadingOverlay, UndoToast, OnboardingWizard,
  CsatSurvey, SlaTimer, CollisionBadge,
  CfPanel, CfInput, Sparkline, DonutChart,
  LazyMount, ToastHost, NotifPanel,
  applyThemeColors, applyFontPair, getFontImport
} from "./shared";

import HomeScr from "./pages/HomeScr";
import MonitorScr from "./pages/MonitorScr";
import InboxScr from "./pages/InboxScr";
import ContactsScr from "./pages/ContactsScr";
import ScheduleScr from "./pages/ScheduleScr";
import CrmScr from "./pages/CrmScr";
import ReportsScr from "./pages/ReportsScr";
import MarketingScr from "./pages/MarketingScr";
import IntegrationsScr from "./pages/IntegrationsScr";
import SettingsScr from "./pages/SettingsScr";
import KnowledgeBaseScr from "./pages/KnowledgeBaseScr";
import TeamChatScr from "./pages/TeamChatScr";
import { MiniChatPanel, TC_CHANNELS, TC_DMS } from "./pages/TeamChatScr";

const INBOX_CACHE_KEY = "sd_cached_inboxes";

function normalizeInbox(raw, index = 0){
  let cfg = {};
  try{
    if(typeof raw?.cfg === "string") cfg = JSON.parse(raw.cfg || "{}");
    else if(typeof raw?.config === "string") cfg = JSON.parse(raw.config || "{}");
    else cfg = raw?.cfg || raw?.config || {};
  }catch{
    cfg = {};
  }

  const type = raw?.type || "live";
  const activeValue = raw?.active;
  const convsValue = raw?.convs ?? raw?.conversation_count ?? 0;

  return {
    ...raw,
    id: raw?.id || `cached_inbox_${index+1}`,
    name: raw?.name || `Inbox ${index+1}`,
    type,
    color: raw?.color || chC(type) || "#4c82fb",
    greeting: raw?.greeting || "",
    active: activeValue === undefined || activeValue === null ? true : !(activeValue === false || activeValue === 0 || activeValue === "0" || activeValue === "false"),
    convs: Number.isFinite(Number(convsValue)) ? Number(convsValue) : 0,
    cfg: cfg && typeof cfg === "object" && !Array.isArray(cfg) ? cfg : {},
  };
}

export default function App(){
  // ── Auth ──
  const [isLoggedIn,setIsLoggedIn]=useState(false);
  const [isRestoring,setIsRestoring]=useState(()=>!!localStorage.getItem("sd_token"));
  const [loginEmail,setLoginEmail]=useState("priya@supportdesk.app");
  const [loginPass,setLoginPass]=useState("demo123");
  const [loginLoading,setLoginLoading]=useState(false);
  const [login2FA,setLogin2FA]=useState(false);
  const [tfaCode,setTfaCode]=useState("");
  const [loginError,setLoginError]=useState("");
  const [loginAgentId,setLoginAgentId]=useState("");
  const [apiOk,setApiOk]=useState(false);
  const [dataLoading,setDataLoading]=useState(false);
  const [showProfileMenu,setShowProfileMenu]=useState(false);
  // Registration — auto-open if URL is /signup, /register, or ?register=1
  const [showRegister,setShowRegister]=useState(()=>{
    const p=window.location.pathname;
    return p==="/signup"||p==="/register"||new URLSearchParams(window.location.search).get("register")==="1";
  });
  const [regName,setRegName]=useState("");
  const [regEmail,setRegEmail]=useState("");
  const [regPass,setRegPass]=useState("");
  const [regConfirm,setRegConfirm]=useState("");
  const [regLoading,setRegLoading]=useState(false);
  const [regError,setRegError]=useState("");

  const handleLogout=async()=>{
    try {
      if (apiOk) await api.post("/auth/logout");
    } catch(e) {}
    api.setToken(null);
    setIsLoggedIn(false);
    setLogin2FA(false);
    setShowProfileMenu(false);
    showT("Logged out successfully", "info");
  };

  const doRegister=async()=>{
    if(!regName||!regEmail||!regPass||!regConfirm){
      setRegError("All fields are required");
      return;
    }
    if(regPass!==regConfirm){
      setRegError("Passwords do not match");
      return;
    }
    if(regPass.length<6){
      setRegError("Password must be at least 6 characters");
      return;
    }
    setRegLoading(true);
    setRegError("");
    try{
      const res=await api.post("/auth/login",{name:regName,email:regEmail,password:regPass});
      api.setToken(res.token);
      setIsLoggedIn(true);
      setApiOk(true);
      showT("Account created! Welcome to SupportDesk!", "success");
      loadInitialData(true);
      setShowRegister(false);
    }catch(e){
      setRegError(e.message||"Registration failed");
    }finally{
      setRegLoading(false);
    }
  };

  const doLogin=async()=>{
    if(!loginEmail||!loginPass)return;
    setLoginLoading(true);setLoginError("");
    try{
      const res=await api.post("/auth/login",{email:loginEmail,password:loginPass});
      setApiOk(true);
      if (res.twoFaRequired) {
        setLoginAgentId(res.agent_id);
        setLogin2FA(true);
      } else {
        api.setToken(res.token);
        setIsLoggedIn(true);
        showT("Welcome back!", "success");
        loadInitialData(true);
      }
    }catch(e){
      if(e.message==="Failed to fetch"||!_connected.current){
        // Backend offline → fallback to demo mode
        setLogin2FA(true);
        setLoginAgentId("a1");
        setApiOk(false);
      }else{
        setLoginError(e.message||"Invalid credentials");
      }
    }
    setLoginLoading(false);
  };

  const verify2FA=async()=>{
    setLoginLoading(true);setLoginError("");
    try{
      if(apiOk){
        const res=await api.post("/auth/2fa",{agent_id:loginAgentId,code:tfaCode||"123456"});
        api.setToken(res.token);
      }
      setLogin2FA(false);setIsLoggedIn(true);
      showT(apiOk?"Welcome back! (API connected)":"Welcome back! (offline mode)","success");
      if(apiOk) loadInitialData(true);
      else{
        inboxesHydratedRef.current=true;
        restoreCachedInboxes();
      }
    }catch(e){
      setLoginError(e.message||"Invalid code");
    }
    setLoginLoading(false);
  };

  // ── Session restore on page reload ──
  useEffect(()=>{
    const savedToken=localStorage.getItem("sd_token");
    console.log('🔑 Session restore - token exists:', !!savedToken);
    if(!savedToken){setIsRestoring(false);return;}
    api.get("/auth/me").then(res=>{
      console.log('✅ Auth check passed:', res);
      if(res?.agent){
        setIsLoggedIn(true);
        setApiOk(true);
        console.log('📦 Calling loadInitialData with force=true');
        loadInitialData(true);
      }
    }).catch((err)=>{
      console.error('❌ Auth check failed:', err);
      if((err?.message==="Failed to fetch"||!_connected.current)&&restoreCachedInboxes()){
        inboxesHydratedRef.current=true;
        setIsLoggedIn(true);
        setApiOk(false);
      }else{
        api.setToken(null);
      }
    }).finally(()=>{
      setIsRestoring(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Load initial data from API ──
  const loadInitialData=async(force=false)=>{
    if(!apiOk&&!force)return;
    setDataLoading(true);
    try{
      console.log('🔄 Loading initial data from API...');
      const [agRes,ctRes,cvRes,lbRes,tmRes,ibRes,cnRes,coRes,auRes,cfRes]=await Promise.allSettled([
        api.get("/settings/agents"),api.get("/contacts"),api.get("/conversations"),
        api.get("/settings/labels"),api.get("/settings/teams"),api.get("/settings/inboxes"),
        api.get("/settings/canned-responses"),api.get("/companies"),
        api.get("/settings/automations"),api.get("/settings/custom-fields"),
      ]);
      const ok=(r)=>r.status==="fulfilled"&&r.value;
      console.log('API Results:', {
        agents: ok(agRes)?agRes.value.agents?.length:'FAILED',
        contacts: ok(ctRes)?ctRes.value.contacts?.length:'FAILED',
        conversations: ok(cvRes)?cvRes.value.conversations?.length:'FAILED',
        labels: ok(lbRes)?lbRes.value.labels?.length:'FAILED',
        teams: ok(tmRes)?'OK':'FAILED',
        inboxes: ok(ibRes)?ibRes.value.inboxes?.length:'FAILED',
        canned: ok(cnRes)?cnRes.value.canned?.length:'FAILED',
        companies: ok(coRes)?coRes.value.companies?.length:'FAILED',
        automations: ok(auRes)?'OK':'FAILED',
        customFields: ok(cfRes)?cfRes.value.fields?.length:'FAILED',
      });
      if(ok(agRes)&&agRes.value.agents){
        setAgents(agRes.value.agents.map(a=>({...a,av:a.avatar||a.name?.split(" ").map(w=>w[0]).join("")||"?",color:a.color||"#4c82fb"})));
      }
      if(ok(ctRes)&&ctRes.value.contacts){
        console.log('✅ Contacts loaded from DB:', ctRes.value.contacts.length);
        console.log('First contact:', ctRes.value.contacts[0]);
        const mappedContacts = ctRes.value.contacts.map(c=>{const tags=typeof c.tags==="string"?JSON.parse(c.tags||"[]"):c.tags||[];return{...c,av:c.avatar||c.name?.split(" ").map(w=>w[0]).join("")||"?",convs:c.conversation_count||0,tags,color:c.color||"#4c82fb"};});
        console.log('Mapped contacts:', mappedContacts.length, mappedContacts[0]);
        setContacts(mappedContacts);
      } else {
        console.warn('⚠️ No contacts loaded. ctRes status:', ctRes?.status);
        if(ctRes?.status==="rejected") console.error('❌ Contacts error:', ctRes.reason);
        else if(ctRes?.value) console.log('ctRes.value:', ctRes.value);
        else console.log('ctRes:', ctRes);
      }
      if(ok(cvRes)&&cvRes.value.conversations){
        setConvs(cvRes.value.conversations.map(c=>{const labels=typeof c.labels==="string"?JSON.parse(c.labels||"[]"):c.labels||[];return{...c,cid:c.contact_id,iid:c.inbox_id,ch:c.inbox_type||c.channel||c.type||"live",agent:c.assignee_id,team:c.team_id,labels,unread:c.unread_count||0,time:c.updated_at||c.created_at||"",color:c.color||"#4c82fb"};}));
      }
      if(ok(lbRes)&&lbRes.value.labels)setLabels(lbRes.value.labels);
      if(ok(tmRes)&&tmRes.value.teams)setTeams(tmRes.value.teams.map(t=>({...t,members:typeof t.members==="string"?JSON.parse(t.members||"[]"):t.members||[]})));
      if(ok(ibRes)&&Array.isArray(ibRes.value.inboxes))applyInboxes(ibRes.value.inboxes);
      else restoreCachedInboxes();
      if(ok(cnRes)&&cnRes.value.canned)setCanned(cnRes.value.canned.map(c=>({...c,code:c.code||c.shortcode||""})));
      if(ok(coRes)&&coRes.value.companies)setComps(coRes.value.companies.map(c=>{const tags=typeof c.tags==="string"?JSON.parse(c.tags||"[]"):c.tags||[];return{...c,tags,color:c.color||"#4c82fb"};}));
      if(ok(auRes)&&auRes.value.automations)setAutos(auRes.value.automations.map(a=>({...a,conditions:typeof a.conditions==="string"?JSON.parse(a.conditions||"[]"):a.conditions||[],actions:typeof a.actions==="string"?JSON.parse(a.actions||"[]"):a.actions||[]})));
      if(ok(cfRes)&&cfRes.value.fields)setCustomFields(cfRes.value.fields);
      // Load messages for first few conversations
      const convIds=(ok(cvRes)&&cvRes.value.conversations?cvRes.value.conversations:[]).slice(0,5).map(c=>c.id);
      const msgMap={};
      for(const cid of convIds){
        try{
          const mr=await api.get(`/conversations/${cid}/messages`);
          if(mr?.messages)msgMap[cid]=mr.messages.map(m=>({...m,aid:m.agent_id,t:m.created_at?.split?.("T")?.[1]?.slice(0,5)||""}));
        }catch{}
      }
      if(Object.keys(msgMap).length)setMsgs(msgMap);
      showT("✓ Data loaded from API","success");
    }catch(e){
      restoreCachedInboxes();
      showT("API load partial","info");
    }
    setDataLoading(false);
  };
  const [scr,setScr]=useState(()=>hashToScr());
  const [agents,setAgents]=useState([]);
  const [labels,setLabels]=useState([]);
  const [inboxes,setInboxes]=useState([]);
  const [teams,setTeams]=useState([]);
  const [canned,setCanned]=useState([]);
  const [autos,setAutos]=useState([]);
  const [contacts,setContacts]=useState([]);
  const [convs,setConvs]=useState([]);
  const [comps,setComps]=useState([]);
  const [msgs,setMsgs]=useState({});
  const inboxesHydratedRef=useRef(false);
  const cacheInboxes=useCallback((rows)=>{
    try{
      localStorage.setItem(INBOX_CACHE_KEY, JSON.stringify((rows||[]).map((ib,idx)=>normalizeInbox(ib,idx))));
    }catch{}
  },[]);
  const applyInboxes=useCallback((rows)=>{
    const normalized=(Array.isArray(rows)?rows:[]).map((ib,idx)=>normalizeInbox(ib,idx));
    setInboxes(normalized);
    inboxesHydratedRef.current=true;
    cacheInboxes(normalized);
    return normalized;
  },[cacheInboxes]);
  const restoreCachedInboxes=useCallback(()=>{
    try{
      const raw=localStorage.getItem(INBOX_CACHE_KEY);
      if(!raw)return false;
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed))return false;
      applyInboxes(parsed);
      return true;
    }catch{
      return false;
    }
  },[applyInboxes]);
  const [aid,setAid]=useState("");
  // Auto-select first conversation when data loads (or if current aid no longer exists)
  useEffect(()=>{if(convs.length&&(!aid||!convs.find((c:any)=>c.id===aid)))setAid(convs[0].id);},[convs]);
  const [fontKey,setFontKey]=useState("outfit");
  const [fontScale,setFontScale]=useState("md");
  const [themeKey,setThemeKey]=useState("light");
  const applyFont=key=>{applyFontPair(key);setFontKey(key);};
  const applySize=key=>{setFS(FONT_SIZES[key]?.scale||1);setFontScale(key);};
  const applyTheme=key=>{applyThemeColors(key);setThemeKey(key);};
  useEffect(()=>{
    if(!isLoggedIn||!inboxesHydratedRef.current)return;
    cacheInboxes(inboxes);
  },[cacheInboxes,inboxes,isLoggedIn]);
  const navigate=useCallback(id=>{startTransition(()=>setScr(id));const r=ROUTES[id];if(r)window.location.hash=r.path?"/"+r.path:"/";},[]);
  useEffect(()=>{const handler=()=>setScr(hashToScr());window.addEventListener("hashchange",handler);return()=>window.removeEventListener("hashchange",handler);},[]);
  useEffect(()=>{if(!showProfileMenu)return;const h=(e)=>{if(!(e.target as Element).closest?.("[data-profile-menu]"))setShowProfileMenu(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[showProfileMenu]);
  const [soundOn,setSoundOn]=useState(true);
  const [notifs,setNotifs]=useState([]);
  const [showN,setShowN]=useState(false);
  const [stab,setStab]=useState("inboxes");
  const unread=notifs.filter(n=>!n.read).length;
  const notifSoundAtRef=useRef(0);
  const normalizeNotifConversation=useCallback((cv:any)=>{
    if(!cv?.id)return null;
    const labels=typeof cv.labels==="string"?JSON.parse(cv.labels||"[]"):cv.labels||[];
    return {...cv,cid:cv.contact_id,iid:cv.inbox_id,ch:cv.inbox_type||cv.channel||cv.type||"live",agent:cv.assignee_id,team:cv.team_id,labels,unread:cv.unread_count||cv.unread||0,time:cv.updated_at||cv.created_at||"",color:cv.contact_color||cv.color||"#4c82fb"};
  },[]);
  const pushNotification=useCallback((notif:any)=>{
    if(soundOn&&notif?.playSound!==false){
      const nowTs=Date.now();
      if(nowTs-notifSoundAtRef.current>250){
        notifSoundAtRef.current=nowTs;
        playNotifSound();
      }
    }
    setNotifs(p=>[{id:"n"+uid(),read:false,time:"now",...notif},...p.slice(0,19)]);
  },[soundOn]);
  const openNotification=useCallback((notif:any)=>{
    if(!notif)return;
    if(notif.targetConversation){
      const nextConv=normalizeNotifConversation(notif.targetConversation);
      if(nextConv){
        setConvs(prev=>{
          const exists=prev.find((c:any)=>c.id===nextConv.id);
          if(exists)return prev.map((c:any)=>c.id===nextConv.id?{...c,...nextConv,unread:Math.max(c.unread||0,nextConv.unread||0)}:c);
          return [nextConv,...prev];
        });
      }
    }
    if(notif.targetScreen){
      navigate(notif.targetScreen);
    }
    if(notif.conversationId){
      setAid(notif.conversationId);
    }
    setShowN(false);
    setNotifs(prev=>prev.map((n:any)=>n.id===notif.id?{...n,read:true}:n));
  },[navigate,normalizeNotifConversation]);
  // ── Dark/Light mode ──
  const [isDark,setIsDark]=useState(false);
  const [autoTheme,setAutoTheme]=useState(false);
  const [aiAutoReply,setAiAutoReply]=useState(false); // AI auto-reply — off by default, enabled only from Settings
  const [aiChannels,setAiChannels]=useState({live:true,email:false,whatsapp:true,telegram:false,facebook:true,instagram:true,viber:false,apple:false,line:false,tiktok:false,x:true,sms:true,voice:false,video:false,api:false}); // Per-channel AI toggle
  const toggleDark=()=>{const next=!isDark;setIsDark(next);applyTheme(next?"midnight":"light");showT(next?"Dark mode":"Light mode","info");};
  // Auto-switch based on system preference
  useEffect(()=>{
    if(!autoTheme)return;
    const mq=window.matchMedia?.("(prefers-color-scheme: dark)");
    if(!mq)return;
    const handler=e=>{const dark=e.matches;setIsDark(dark);applyThemeColors(dark?"midnight":"light");setThemeKey(dark?"midnight":"light");};
    handler(mq);mq.addEventListener?.("change",handler);
    return()=>mq.removeEventListener?.("change",handler);
  },[autoTheme]);
  // ── Collapsible Nav ──
  const [navExpanded,setNavExpanded]=useState(false);
  // ── Changelog / What's New ──
  const [showChangelog,setShowChangelog]=useState(false);
  // ═══ ONBOARDING ═══
  const [showOnboarding,setShowOnboarding]=useState(false);
  useEffect(()=>{if(isLoggedIn&&!window._sdOnboarded){window._sdOnboarded=true;/* setShowOnboarding(true); // enable for first-run */}},[isLoggedIn]);
  // ═══ CSAT SURVEY (#3) ═══
  const [csatPending,setCsatPending]=useState(null);const [csatScore,setCsatScore]=useState(0);const [csatComment,setCsatComment]=useState("");
  const submitCsat=(convId,score,comment)=>{setCsatPending(null);setCsatScore(0);setCsatComment("");setConvs(p=>p.map(c=>c.id===convId?{...c,csatScore:score,csatComment:comment}:c));showT(score+"★ feedback recorded!","success");};
  // ═══ SNOOZE (#12) ═══
  const [snoozed,setSnoozed]=useState({});
  const snoozeConv=(id,mins)=>{setSnoozed(p=>({...p,[id]:Date.now()+mins*60000}));setConvs(p=>p.map(c=>c.id===id?{...c,status:"snoozed"}:c));showT("Snoozed "+(mins>=60?(mins/60)+"h":mins+"m"),"info");setTimeout(()=>{setSnoozed(p=>{const n={...p};delete n[id];return n;});setConvs(p=>p.map(c=>c.id===id&&c.status==="snoozed"?{...c,status:"open"}:c));showT("Conversation unsnoozed!","info");},mins*60000);};
  // ═══ COLLISION DETECTION (#5) ═══
  const [convViewers,setConvViewers]=useState({"cv1":["a2"],"cv3":["a4"]});
  // ═══ SAVED VIEWS (#11) ═══
  const [savedViews,setSavedViews]=useState([{id:"sv1",name:"My Urgent",icon:"🔴",filters:{status:"open",priority:"urgent"}},{id:"sv2",name:"Unassigned",icon:"⚡",filters:{agent:"unassigned"}},{id:"sv3",name:"WhatsApp Open",icon:"💬",filters:{channel:"whatsapp"}},{id:"sv4",name:"VIP Customers",icon:"⭐",filters:{label:"VIP"}}]);
  // ═══ UNDO SYSTEM ═══
  const [undoStack,setUndoStack]=useState([]);
  const pushUndo=(msg,undoFn)=>{setUndoStack(p=>[...p,{id:uid(),msg,fn:undoFn}]);};
  const popUndo=id=>{const item=undoStack.find(u=>u.id===id);if(item){item.fn();setUndoStack(p=>p.filter(u=>u.id!==id));}};
  // ═══ ENHANCED KEYBOARD SHORTCUTS ═══
  useEffect(()=>{if(!isLoggedIn)return;const h=e=>{
    if(e.target.matches("input,textarea,select"))return;
    if(e.key==="n"&&!e.metaKey&&!e.ctrlKey){/* 'N' for new — context-sensitive */}
    if(e.key==="/"&&!e.metaKey&&!e.ctrlKey){e.preventDefault();setShowCmd(p=>!p);setCmdQ("");}
    if(e.key==="d"&&(e.metaKey||e.ctrlKey)){e.preventDefault();toggleDark();}
  };window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[isLoggedIn]);
  const CHANGELOG=[{v:"2.5",date:"Mar 20, 2026",items:["AI Insights dashboard with churn prediction","CSAT Survey Builder with 6 question types","Workflow automation visual builder","Team Chat: channel member management"]},{v:"2.4",date:"Mar 15, 2026",items:["CSV Export feature for all data","Bot Builder with visual flow editor","Developer Console with API playground","Agent Performance & Gamification"]},{v:"2.3",date:"Mar 10, 2026",items:["Team Chat with Slack-class features","AI Copilot in Inbox (Claude API)","100 integrations in Marketplace","Customer Portal preview"]}];
  // ── Help Widget ──
  const [showHelp,setShowHelp]=useState(false);
  const [helpSearch,setHelpSearch]=useState("");
  // ── F8: Print/Export ──
  const printPage=()=>{const el=document.querySelector(".page-enter");if(!el)return;const w=window.open("","","width=900,height=700");w.document.write(`<html><head><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Nunito',sans-serif;padding:40px;color:#111827}h1,h2,h3{font-family:'Outfit',sans-serif}@media print{button,nav,select{display:none!important}}</style></head><body>`+el.innerHTML+`</body></html>`);w.document.close();w.print();};
  // ── F11: AI Copilot floating ──
  const [showAiFloat,setShowAiFloat]=useState(false);
  const [aiFloatQ,setAiFloatQ]=useState("");const [aiFloatA,setAiFloatA]=useState("");const [aiFloatLoading,setAiFloatLoading]=useState(false);
  const aiFloatAsk=async()=>{if(!aiFloatQ.trim())return;setAiFloatLoading(true);setAiFloatA("");const ctx=`Screen: ${scr}. Question: ${aiFloatQ}`;try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:"You are an AI assistant for SupportDesk, a customer support SaaS. Answer concisely based on context. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setAiFloatA(d.content?.[0]?.text||"");}catch(e){setAiFloatA(scr==="reports"?"Based on current data, ticket volume is up 23% this week driven by WhatsApp. CSAT is stable at 4.3★. I'd recommend enabling AI auto-reply to handle the spike.":scr==="contacts"?"You have 3 customers at medium-high churn risk based on unresolved ticket age. Arjun Mehta and Sarah Chen should be prioritized.":"I can help with anything about SupportDesk! Ask me about features, data, or best practices.");}setAiFloatLoading(false);};
  // ── F12: Live presence ──
  const [viewers]=useState({home:["a2"],inbox:["a3","a4"],reports:["a2"],settings:["a4"]});
  const screenViewers=(viewers[scr]||[]).map(id=>agents.find(a=>a.id===id)).filter(Boolean);
  // ── F13: Custom nav ──
  const [navOrder,setNavOrder]=useState(["home","inbox","teamchat","monitor","contacts","reports","marketing","integrations","knowledgebase","widget","settings","billing"]);
  const [pinnedNav,setPinnedNav]=useState(["home","inbox","teamchat","crm","contacts","marketing","monitor","calendar","integrations","knowledgebase","reports","settings"]);
  const [showNavConfig,setShowNavConfig]=useState(false);
  const togglePin=id=>setPinnedNav(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const moveNav=(id,dir)=>{setNavOrder(p=>{const i=p.indexOf(id);if(i<0||(dir===-1&&i===0)||(dir===1&&i===p.length-1))return p;const n=[...p];[n[i],n[i+dir]]=[n[i+dir],n[i]];return n;});};
  // ── F14: Content translation ──
  const [contentLang,setContentLang]=useState("en");
  // ── 6. Dashboard widget reorder ──
  const [dashWidgets,setDashWidgets]=useState(["kpis","activity","quickActions","schedule","performance","csat","channels","team"]);
  const [showDashConfig,setShowDashConfig]=useState(false);
  const [hiddenWidgets,setHiddenWidgets]=useState([]);
  const [dragItem,setDragItem]=useState(null);const [dragOver,setDragOver]=useState(null);
  const onDragEnd=()=>{if(dragItem!==null&&dragOver!==null&&dragItem!==dragOver){setDashWidgets(p=>{const n=[...p];const item=n.splice(dragItem,1)[0];n.splice(dragOver,0,item);return n;});}setDragItem(null);setDragOver(null);};
  const moveDashWidget=(id,dir)=>{setDashWidgets(p=>{const i=p.indexOf(id);if(i<0||(dir===-1&&i===0)||(dir===1&&i===p.length-1))return p;const n=[...p];[n[i],n[i+dir]]=[n[i+dir],n[i]];return n;});};
  const toggleDashWidget=id=>{setHiddenWidgets(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);};
  // ── 9. Notification Center v2 ──
  const [notifFilter,setNotifFilter]=useState("all");
  const allNavIds=["home","inbox","teamchat","crm","contacts","marketing","monitor","calendar","integrations","knowledgebase","reports","settings"];
  // ── Command Palette ──
  const [showCmd,setShowCmd]=useState(false);
  const [cmdQ,setCmdQ]=useState("");
  // ── Onboarding ──
  const [showOnboard,setShowOnboard]=useState(false);
  const [onboardStep,setOnboardStep]=useState(0);
  // ── New UX features ──
  const [showShortcuts,setShowShortcuts]=useState(false);
  const [showUndoToast,setShowUndoToast]=useState(null);
  const undoAction=showUndoToast?.undo;
  const [globalSearchQ,setGlobalSearchQ]=useState("");
  const [showGlobalSearch,setShowGlobalSearch]=useState(false);
  // ── Team Chat Mini Panel ──
  const [showMiniChat,setShowMiniChat]=useState(false);
  const tcUnread=TC_CHANNELS.reduce((s,c)=>s+c.unread,0)+TC_DMS.reduce((s,d)=>s+d.unread,0);
  // ── Sound toggle ──
  const normalizeWsAttachments=(value:any)=>{
    if(Array.isArray(value))return value.filter(Boolean);
    if(!value)return [];
    try{
      const parsed=typeof value==="string"?JSON.parse(value):value;
      return Array.isArray(parsed)?parsed.filter(Boolean):[];
    }catch{
      return [];
    }
  };
  // ═══ WEBSOCKET — real-time messages, typing, presence ═══
  const wsRef=useRef(null);
  const wsConnect=useCallback(()=>{
    if(!apiOk||wsRef.current?.readyState===1)return;
    try{
      const token=api.getToken()||_token.current;
      if(!token)return;
      const wsProto=window.location.protocol==="https:"?"wss":"ws";
      const wsHost=(import.meta.env.VITE_BACKEND_URL??window.location.origin).replace(/^https?:\/\//,"");
      const ws=new WebSocket(`${wsProto}://${wsHost}/ws?token=${encodeURIComponent(token)}`);
      ws.onopen=()=>{showT("Live connected","success");};
      ws.onmessage=e=>{try{const m=JSON.parse(e.data);
        if(m.type==="chat_message"&&m.message){
          pushNotification({text:m.message.author+" sent a message in "+m.channel,type:"message",targetScreen:"teamchat"});
        }
        if(m.type==="conversation_update"){
          // If bot handoff, reload conversations to pick up new ones
          if(m.updates?.bot_handoff){
            api.get("/conversations").then(r=>{
              if(r?.conversations)setConvs(r.conversations.map(c=>{const labels=typeof c.labels==="string"?JSON.parse(c.labels||"[]"):c.labels||[];return{...c,cid:c.contact_id,iid:c.inbox_id,ch:c.inbox_type||c.channel||c.type||"live",agent:c.assignee_id,team:c.team_id,labels,unread:c.unread_count||0,time:c.updated_at||c.created_at||"",color:c.color||"#4c82fb"};}));
            }).catch(()=>{});
            pushNotification({text:"🤖 Bot handoff: "+(m.updates.visitor_name||"Visitor")+" needs a live agent",type:"message",targetScreen:"inbox",conversationId:m.conversationId||null});
            showT("🤖 Bot handoff — a visitor needs a live agent!","info");
          } else if(m.conversation){
            // Real-time update from broadcast — apply directly without re-fetching
            const cv=m.conversation;
            const labels=typeof cv.labels==="string"?(() => { try { return JSON.parse(cv.labels||"[]"); } catch { return []; } })():cv.labels||[];
            setConvs(p=>p.map(c=>c.id===cv.id?{...c,...cv,cid:cv.contact_id,iid:cv.inbox_id,ch:cv.inbox_type||cv.channel||c.ch||"live",agent:cv.assignee_id,team:cv.team_id,labels,unread:cv.unread_count||c.unread||0,time:cv.updated_at||c.time||""}:c));
            // Notification for assignment changes
            const upd=m.updates||{};
            if(upd.assignee_id!==undefined){
              const agName=cv.assignee_name||"someone";
              pushNotification({text:upd.assignee_id?`Assigned to ${agName}`:"Conversation unassigned",type:"info",targetScreen:"inbox",conversationId:m.conversationId||null});
            } else if(upd.team_id!==undefined){
              pushNotification({text:"Conversation transferred to another team",type:"info",targetScreen:"inbox",conversationId:m.conversationId||null});
            } else {
              pushNotification({text:"Conversation updated"+(m.agent_name?" by "+m.agent_name:""),type:"info",targetScreen:"inbox",conversationId:m.conversationId||null});
            }
          } else {
            api.get(`/conversations/${m.conversationId}`).then(r=>{
              const cv=r?.conversation;
              if(cv)setConvs(p=>p.map(c=>c.id===cv.id?{...c,...cv,cid:cv.contact_id,iid:cv.inbox_id,ch:cv.inbox_type||cv.channel||"live",agent:cv.assignee_id,team:cv.team_id,labels:cv.labels||[],unread:cv.unread_count||0}:c));
            }).catch(()=>{});
            pushNotification({text:"Conversation updated",type:"info",targetScreen:"inbox",conversationId:m.conversationId||null});
          }
        }
        if(m.type==="presence"){
          setAgents(p=>p.map(a=>a.id===m.agent_id?{...a,status:m.status}:a));
        }
        if(m.type==="sla_breach"){
          pushNotification({text:"⚠ SLA breach: "+m.conversation_id,type:"error",targetScreen:"inbox",conversationId:m.conversation_id||null});
          showT("SLA breach warning!","error");
        }
        // ── Real-time: new message posted (agent reply / customer widget msg) ──
        if(m.type==="new_message"&&m.message){
          const msg={...m.message,attachments:normalizeWsAttachments(m.message.attachments),aid:m.message.agent_id,t:m.message.created_at?.split?.("T")?.[1]?.slice(0,5)||m.message.created_at?.split?.(" ")?.[1]?.slice(0,5)||""};
          // Always append the message
          setMsgs((p:any)=>({...p,[m.conversationId]:[...(p[m.conversationId]||[]).filter((x:any)=>x.id!==msg.id),msg]}));
          setConvs((p:any)=>{
            const exists=p.find((c:any)=>c.id===m.conversationId);
            if(exists){
              // Update existing: bump unread + time
              return p.map((c:any)=>c.id===m.conversationId?{...c,time:"now",updated_at:m.message.created_at||c.updated_at,unread:msg.role==="customer"||(msg.role==="contact"&&msg.role==="customer")?(c.unread||0)+1:c.unread}:c);
            }
            // Conversation not in list yet — add it from the broadcast payload
            if(m.conversation){
              const cv=m.conversation;
              const labels=typeof cv.labels==="string"?JSON.parse(cv.labels||"[]"):cv.labels||[];
              const newConv={...cv,cid:cv.contact_id,iid:cv.inbox_id,ch:cv.inbox_type||cv.channel||cv.type||"live",agent:cv.assignee_id,team:cv.team_id,labels,unread:1,time:"now",color:cv.contact_color||chC(cv.inbox_type||"live")};
              return [newConv,...p];
            }
            // Fallback: fetch from API
            api.get(`/conversations/${m.conversationId}`).then((r:any)=>{
              if(r?.conversation){
                const cv=r.conversation;
                const labels=typeof cv.labels==="string"?JSON.parse(cv.labels||"[]"):cv.labels||[];
                setConvs((prev:any)=>{
                  if(prev.find((c:any)=>c.id===cv.id))return prev;
                  return [{...cv,cid:cv.contact_id,iid:cv.inbox_id,ch:cv.inbox_type||cv.channel||"live",agent:cv.assignee_id,team:cv.team_id,labels,unread:1,time:"now",color:cv.contact_color||chC(cv.inbox_type||"live")},...prev];
                });
              }
            }).catch(()=>{});
            return p;
          });
          // Sound + notification for customer messages
          if(msg.role==="customer"||msg.role==="contact"){
            pushNotification({text:"💬 New message in conversation",type:"message",targetScreen:"inbox",conversationId:m.conversationId||null,targetConversation:m.conversation||null});
            const senderName=m.conversation?.contact_name||"Customer";
            const preview=msg.text?.slice(0,60)||(Array.isArray(msg.attachments)&&msg.attachments.length>0?"📷 Image":"New message");
            showT(`💬 ${senderName}: ${preview}`,"info");
          }
        }
        // ── Real-time: inbound email received via IMAP polling ────────────
        if(m.type==="new_email_message"){
          const {conversation:cv}=m;
          const msg={...m.message,attachments:normalizeWsAttachments(m.message?.attachments),aid:m.message?.agent_id,t:m.message?.created_at?.split?.("T")?.[1]?.slice(0,5)||m.message?.created_at?.split?.(" ")?.[1]?.slice(0,5)||""};
          // Merge/add conversation in list
          setConvs((p:any)=>{
            const exists=p.find((c:any)=>c.id===cv.id);
            if(exists){return p.map((c:any)=>c.id===cv.id?{...c,cid:cv.contact_id||c.cid,iid:cv.inbox_id||c.iid,ch:"email",contact_name:cv.contact_name||c.contact_name,contact_email:cv.contact_email||c.contact_email,color:cv.contact_color||c.color,unread:(c.unread||0)+1,time:"now",updated_at:cv.updated_at}:c);}
            // New conversation — prepend with basic shape
            return [{id:cv.id,subject:cv.subject,status:"open",priority:"normal",ch:"email",
              cid:cv.contact_id,iid:cv.inbox_id,inbox_name:cv.inbox_name,contact_name:cv.contact_name,contact_email:cv.contact_email,
              contact_color:cv.contact_color,color:cv.contact_color||chC("email"),unread:1,time:"now",labels:[]},...p];
          });
          // Append message
          setMsgs((p:any)=>({...p,[cv.id]:[...(p[cv.id]||[]).filter((x:any)=>x.id!==msg.id),msg]}));
          // Notification + sound
          pushNotification({text:`📧 New email from ${cv.contact_name||cv.contact_email}`,type:"message",targetScreen:"inbox",conversationId:cv.id,targetConversation:cv});
          const emailPreview=msg.text?.slice(0,60)||(Array.isArray(msg.attachments)&&msg.attachments.length>0?"📷 Image":"New email");
          showT(`📧 ${cv.contact_name||cv.contact_email||"Email"}: ${emailPreview}`,"info");
        }
        if(m.type==="new_conversation"){
          // ── Immediately add to conversation list ──
          const cv=m.conversation||null;
          if(cv){
            const labels=typeof cv.labels==="string"?JSON.parse(cv.labels||"[]"):cv.labels||[];
            const newConv={...cv,cid:cv.contact_id,iid:cv.inbox_id,ch:cv.inbox_type||cv.channel||cv.type||"live",agent:cv.assignee_id,team:cv.team_id,labels,unread:0,time:"now",color:cv.contact_color||chC(cv.inbox_type||"live")};
            setConvs((p:any)=>{
              if(p.find((c:any)=>c.id===cv.id))return p; // already in list
              return [newConv,...p];
            });
          }
          // Also update contacts list if new contact
          if(m.conversation?.contact_id){
            const cid=m.conversation.contact_id;
            setContacts((p:any)=>{
              if(p.find((c:any)=>c.id===cid))return p;
              const av=(m.contact_name||"?").split(" ").map((w:string)=>w[0]).join("").toUpperCase().slice(0,2);
              return [...p,{id:cid,name:m.contact_name||"Customer",email:m.contact_email||"",av,color:m.contact_color||"#4c82fb",tags:[],convs:1}];
            });
          }
          pushNotification({text:"💬 New conversation from "+(m.contact_name||"visitor"),type:"message",targetScreen:"inbox",conversationId:cv?.id||m.conversation_id||null,targetConversation:cv||null});
          // AI Auto-Tag — classify new conversation
          const convId=cv?.id||m.conversation_id;
          const convSubject=cv?.subject||m.subject||"";
          if(convId&&convSubject){(async()=>{try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:60,system:"Classify this support ticket into ONE category: Bug, Billing, Feature Request, Onboarding, Urgent, General. Reply with just the category name.",messages:[{role:"user",content:convSubject}]})});const d=await r.json();const tag=(d.content?.[0]?.text||"General").trim();setConvs((p:any)=>p.map((c:any)=>c.id===convId?{...c,labels:[...new Set([...c.labels,tag])]}:c));}catch{const autoTags:Record<string,string>={"payment":"Billing","invoice":"Billing","bug":"Bug","error":"Bug","crash":"Bug","feature":"Feature Request","integrate":"Feature Request","setup":"Onboarding","start":"Onboarding"};const sub=convSubject.toLowerCase();const matched=Object.entries(autoTags).find(([k])=>sub.includes(k));if(matched)setConvs((p:any)=>p.map((c:any)=>c.id===convId?{...c,labels:[...new Set([...c.labels,matched[1]])]}:c));}})();}
        }
      }catch{}};
      ws.onclose=()=>{wsRef.current=null;setTimeout(wsConnect,5000);}; // Auto-reconnect
      ws.onerror=()=>{};
      wsRef.current=ws;
    }catch{}
  },[apiOk,pushNotification,soundOn]);
  useEffect(()=>{if(isLoggedIn&&apiOk)wsConnect();return()=>{wsRef.current?.close();};},[isLoggedIn,apiOk,wsConnect]);

  // ══ Auto-refresh: silently sync conversations + contacts every 30 s ══
  // Ensures new emails that arrive via IMAP polling appear in the UI
  // even if the WebSocket event was missed (e.g. tab was in background).
  const refreshConvsRef=useRef(false);
  useEffect(()=>{
    if(!isLoggedIn||!apiOk)return;
    const doRefresh=async()=>{
      if(refreshConvsRef.current)return; // skip if already running
      refreshConvsRef.current=true;
      try{
        const [cvRes,ctRes]=await Promise.allSettled([
          api.get("/conversations?limit=100"),
          api.get("/contacts?limit=200"),
        ]);
        if(cvRes.status==="fulfilled"&&cvRes.value?.conversations){
          setConvs(prev=>{
            const newMap:Record<string,any>={};
            cvRes.value.conversations.forEach((c:any)=>{
              const labels=typeof c.labels==="string"?JSON.parse(c.labels||"[]"):c.labels||[];
              newMap[c.id]={...c,cid:c.contact_id,iid:c.inbox_id,ch:c.inbox_type||c.channel||c.type||"live",agent:c.assignee_id,team:c.team_id,labels,unread:c.unread_count||0,time:c.updated_at||c.created_at||"",color:c.color||"#4c82fb"};
            });
            // Merge: keep existing state for open convs, add new ones on top
            const prevMap:Record<string,any>={};
            prev.forEach((c:any)=>{prevMap[c.id]=c;});
            const merged:any[]=[];
            // New ones first
            Object.values(newMap).forEach((c:any)=>{
              if(!prevMap[c.id]) merged.push(c);
            });
            // Then existing (update metadata but keep local unread count if higher)
            prev.forEach((c:any)=>{
              const fresh=newMap[c.id];
              if(fresh) merged.push({...fresh,unread:Math.max(c.unread||0,fresh.unread||0)});
              else merged.push(c);
            });
            return merged;
          });
        }
        if(ctRes.status==="fulfilled"&&ctRes.value?.contacts){
          setContacts(ctRes.value.contacts.map((c:any)=>{const tags=typeof c.tags==="string"?JSON.parse(c.tags||"[]"):c.tags||[];return{...c,av:c.avatar||c.name?.split(" ").map((w:string)=>w[0]).join("")||"?",convs:c.conversation_count||0,tags,color:c.color||"#4c82fb"};}));
        }
      }catch{}
      refreshConvsRef.current=false;
    };
    // Run every 30 s
    const interval=setInterval(doRefresh,30000);
    // Also run when the browser tab becomes visible again
    const onVisible=()=>{if(document.visibilityState==="visible")doRefresh();};
    document.addEventListener("visibilitychange",onVisible);
    return()=>{clearInterval(interval);document.removeEventListener("visibilitychange",onVisible);};
  },[isLoggedIn,apiOk]);

  // ═══ API SYNC — wraps write ops with optimistic update + API call ═══
  const syncApi=useCallback((method,path,body,opts={})=>{
    if(!apiOk)return Promise.resolve(null);
    return api(path,{method,body}).then(r=>{if(opts.toast)showT(opts.toast,"success");return r;}).catch(e=>{if(opts.errorToast!==false)showT("Sync failed: "+e.message,"error");return null;});
  },[apiOk]);
  // ── Language ──
  const [lang,setLang]=useState("en");
  const switchLang=l=>{setLANG(l);setLang(l);showT("Language: "+LANGS[l].name,"success");};
  // ── Keyboard shortcuts ──
  useEffect(()=>{const handler=e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowCmd(p=>!p);setCmdQ("");}
    if(e.key==="Escape"){setShowCmd(false);}
    if((e.metaKey||e.ctrlKey)&&e.key==="1"){e.preventDefault();navigate("inbox");}
    if((e.metaKey||e.ctrlKey)&&e.key==="2"){e.preventDefault();navigate("contacts");}
    if((e.metaKey||e.ctrlKey)&&e.key==="3"){e.preventDefault();navigate("reports");}
    if(e.key==="?"&&!e.target.matches("input,textarea")){e.preventDefault();setShowShortcuts(p=>!p);}
  };window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[]);
  // ═══ CUSTOM FIELDS — App-level state, shared across all screens ═══
  const [customFields,setCustomFields]=useState([]);
  const [cfValues,setCfValues]=useState({});
  const getCfVal=(recordId,fieldId)=>cfValues[recordId]?.[fieldId]||"";
  const setCfVal=(recordId,fieldId,val)=>setCfValues(p=>({...p,[recordId]:{...(p[recordId]||{}),[fieldId]:val}}));
  const sp={agents,setAgents,labels,setLabels,inboxes,setInboxes,teams,setTeams,canned,setCanned,autos,setAutos,contacts,setContacts,convs,setConvs,msgs,setMsgs,comps,setComps,customFields,setCustomFields,getCfVal,setCfVal};

  // ── Breadcrumb ──
  const getBreadcrumb=()=>{const s=ROUTES[scr];if(!s)return[{l:"Home",fn:()=>navigate("home")}];const crumbs=[{l:s.label}];return crumbs;};

  // ═══ LOGIN SCREEN ═══
  if(isRestoring)return <div style={{height:"100vh",background:"linear-gradient(135deg,#f0f4ff,#e8f0fe)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,fontFamily:"'Nunito',sans-serif"}}><SDLogo s={48}/><div style={{width:36,height:36,border:"3px solid #2563eb33",borderTopColor:"#2563eb",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  if(!isLoggedIn)return <div style={{height:"100vh",background:"linear-gradient(135deg,#f0f4ff,#e8f0fe)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Nunito:wght@400;500;600;700&family=Fira+Code:wght@400;500;600&display=swap');`}</style>
    <div style={{width:420,background:"#fff",borderRadius:20,padding:"40px 36px",boxShadow:"0 20px 60px rgba(0,0,0,.08)",border:"1px solid #e5e7eb"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{marginBottom:12}}><SDLogo s={52}/></div>
        <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Outfit',sans-serif",color:"#111827",margin:"0 0 4px"}}>Welcome to SupportDesk</h1>
        <p style={{fontSize:13,color:"#6b7280",margin:0}}>{login2FA?"Enter your verification code":"Sign in to your workspace"}</p>
      </div>
      {!login2FA ? (
        !showRegister ? <>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>Email</label>
            <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} type="email" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #d1d5db",fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}} onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor="#d1d5db"}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><label style={{fontSize:12,fontWeight:700,color:"#374151"}}>Password</label><button style={{fontSize:11,color:"#2563eb",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Forgot?</button></div>
            <input value={loginPass} onChange={e=>setLoginPass(e.target.value)} type="password" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #d1d5db",fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}} onKeyDown={e=>{if(e.key==="Enter")doLogin();}} onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor="#d1d5db"}/>
          </div>
          <button onClick={doLogin} disabled={loginLoading} style={{width:"100%",padding:"11px",borderRadius:10,background:"linear-gradient(135deg,#2563eb,#4f46e5)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:loginLoading?0.7:1,marginBottom:16}}>
            {loginLoading?"Signing in…":"Sign In"}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><div style={{flex:1,height:1,background:"#e5e7eb"}}/><span style={{fontSize:11,color:"#9ca3af"}}>or continue with</span><div style={{flex:1,height:1,background:"#e5e7eb"}}/></div>
          <div style={{display:"flex",gap:8}}>
            {[{n:"Google",c:"#ea4335",i:"G"},{n:"Microsoft",c:"#00a4ef",i:"M"},{n:"SAML SSO",c:"#6b7280",i:"🔒"}].map(p=>(
              <button key={p.n} onClick={()=>{setLoginLoading(true);setTimeout(()=>{setLoginLoading(false);setLogin2FA(true);},600);}} style={{flex:1,padding:"9px",borderRadius:9,background:"#f9fafb",border:"1.5px solid #e5e7eb",cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:"'Nunito',sans-serif"}}>
                <span style={{color:p.c,fontWeight:800}}>{p.i}</span>{p.n}
              </button>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:20,paddingTop:16,borderTop:"1px solid #e5e7eb"}}>
            <p style={{fontSize:12,color:"#6b7280",margin:0}}>Don't have an account? <button onClick={()=>setShowRegister(true)} style={{color:"#2563eb",background:"none",border:"none",cursor:"pointer",fontWeight:700,fontSize:12}}>Create Account</button></p>
          </div>
        </> : <>
          <div style={{textAlign:"center",marginBottom:20}}>
            <h2 style={{fontSize:18,fontWeight:800,fontFamily:"'Outfit',sans-serif",color:"#111827",margin:"0 0 4px"}}>Create Account</h2>
            <p style={{fontSize:12,color:"#6b7280",margin:0}}>Join SupportDesk today</p>
          </div>
          {regError&&<div style={{padding:"10px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,marginBottom:14,fontSize:12,color:"#dc2626"}}>{regError}</div>}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>Full Name</label>
            <input value={regName} onChange={e=>setRegName(e.target.value)} type="text" placeholder="John Doe" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #d1d5db",fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}} onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor="#d1d5db"}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>Email</label>
            <input value={regEmail} onChange={e=>setRegEmail(e.target.value)} type="email" placeholder="john@company.com" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #d1d5db",fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}} onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor="#d1d5db"}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>Password</label>
            <input value={regPass} onChange={e=>setRegPass(e.target.value)} type="password" placeholder="Min 6 characters" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #d1d5db",fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}} onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor="#d1d5db"}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:5}}>Confirm Password</label>
            <input value={regConfirm} onChange={e=>setRegConfirm(e.target.value)} type="password" placeholder="Re-enter password" style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #d1d5db",fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",fontFamily:"'Nunito',sans-serif"}} onKeyDown={e=>{if(e.key==="Enter")doRegister();}} onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor="#d1d5db"}/>
          </div>
          <button onClick={doRegister} disabled={regLoading} style={{width:"100%",padding:"11px",borderRadius:10,background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif",opacity:regLoading?0.7:1,marginBottom:16}}>
            {regLoading?"Creating Account…":"Create Account"}
          </button>
          <div style={{textAlign:"center"}}>
            <p style={{fontSize:12,color:"#6b7280",margin:0}}>Already have an account? <button onClick={()=>{setShowRegister(false);setRegError("");}} style={{color:"#2563eb",background:"none",border:"none",cursor:"pointer",fontWeight:700,fontSize:12}}>Sign In</button></p>
          </div>
        </>
      ) : <>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:36,marginBottom:8}}>🔐</div>
          <p style={{fontSize:12,color:"#6b7280"}}>We sent a code to {loginEmail}</p>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
          {[0,1,2,3,4,5].map(i=><input key={i} maxLength={1} value={tfaCode[i]||""} onChange={e=>{const v=tfaCode.split("");v[i]=e.target.value;setTfaCode(v.join(""));if(e.target.value&&e.target.nextSibling)e.target.nextSibling.focus();}} style={{width:40,height:48,borderRadius:10,border:"1.5px solid #d1d5db",textAlign:"center",fontSize:20,fontWeight:700,outline:"none",fontFamily:"'Fira Code',monospace",color:"#111827"}} onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor="#d1d5db"}/>)}
        </div>
        <button onClick={verify2FA} style={{width:"100%",padding:"11px",borderRadius:10,background:"linear-gradient(135deg,#2563eb,#4f46e5)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif",marginBottom:10}}>Verify & Sign In</button>
        <button onClick={()=>setLogin2FA(false)} style={{width:"100%",padding:"8px",background:"none",border:"none",color:"#6b7280",fontSize:12,cursor:"pointer"}}>← Back to login</button>
      </>}
    </div>
  </div>;

  // ═══ MAIN APP ═══
  return <div id="sd-app" data-font={fontKey} data-theme={themeKey} style={{display:"flex",height:"100vh",background:C.bg,color:C.t1,fontFamily:FB,overflow:"hidden"}}>
    {dataLoading&&<LoadingOverlay msg={`Loading workspace — ${apiOk?"connecting to API":"using cached data"}…`}/>}
    {showOnboarding&&<OnboardingWizard onComplete={()=>setShowOnboarding(false)}/>}
    {undoStack.slice(-1).map(u=><UndoToast key={u.id} msg={u.msg} onUndo={()=>popUndo(u.id)}/>)}
    {csatPending&&<CsatSurvey convId={csatPending} onSubmit={submitCsat} onClose={()=>setCsatPending(null)}/>}
    <style>{`@import url('https://fonts.googleapis.com/css2?${getFontImport(fontKey)}&display=swap');
      :root,#sd-app{--fd:${FDN};--fb:${FBN};--fm:${FMN}}
      *{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:${C.b1};border-radius:2px}
      #sd-app,#sd-app div,#sd-app span,#sd-app p,#sd-app a,#sd-app li,#sd-app td,#sd-app th,#sd-app button,#sd-app input,#sd-app textarea,#sd-app select,#sd-app option,#sd-app label{font-family:${FBN}}
      #sd-app h1,#sd-app h2,#sd-app h3,#sd-app h4,#sd-app h5,#sd-app h6{font-family:${FDN}!important}
      #sd-app code,#sd-app pre{font-family:${FMN}!important}
      textarea:focus,input:focus,select:focus{outline:none;border-color:${C.a}!important}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
      @keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes blink{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:1}}
      @keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
      @keyframes badgePop{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
      @keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(80px) rotate(360deg);opacity:0}}
      @keyframes newMsgFlash{0%{background:${C.ad}}30%{background:${C.a}22}60%{background:${C.ad}}100%{background:transparent}}
      .hov:hover{background:${C.s3}!important}.nav:hover{background:${C.s2}!important;color:${C.t1}!important}.nav.nav-active:hover{background:${C.ad}!important;color:${C.a}!important}
      .msg-row:hover .msg-actions{display:flex!important}
      .btn-press:active{transform:scale(0.97)!important;filter:brightness(0.95)!important}
      .card-lift{transition:all .2s ease!important}.card-lift:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(0,0,0,.15)!important}
      .skel{background:linear-gradient(90deg,${C.s2} 25%,${C.s3} 50%,${C.s2} 75%);background-size:400px 100%;animation:shimmer 1.5s infinite;border-radius:6px}
      .page-enter{animation:fadeIn .2s ease}
      .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
      *:focus-visible{outline:2px solid ${C.a};outline-offset:2px;border-radius:4px}
      @media(max-width:1024px){
        .sd-nav-rail{width:52px!important;padding:8px 0!important}
        .sd-nav-rail button span:last-child{display:none!important}
        .sd-nav-rail button{width:40px!important;padding:6px 0!important}
        .sd-sidebar{width:220px!important}
        .sd-kpi-grid{grid-template-columns:repeat(2,1fr)!important}
      }
      @media(max-width:768px){
        .sd-nav-rail{width:44px!important;padding:6px 0!important}
        .sd-nav-rail button{width:36px!important;height:36px!important}
        .sd-nav-rail button span:last-child{display:none!important}
        .sd-sidebar{display:none!important}
        .sd-url-bar{display:none!important}
        .sd-kpi-grid{grid-template-columns:1fr 1fr!important}
        .sd-main-split{flex-direction:column!important}
        .sd-right-panel{width:100%!important;max-height:50vh!important}
      }
      @media(max-width:480px){
        .sd-nav-rail{position:fixed!important;bottom:0!important;left:0!important;right:0!important;width:100%!important;height:56px!important;flex-direction:row!important;border-right:none!important;border-top:1px solid ${C.b1}!important;z-index:50!important;padding:4px 8px!important;justify-content:space-around!important}
        .sd-nav-rail button{width:auto!important;flex:1!important;max-width:64px!important}
        .sd-main-content{padding-bottom:60px!important}
        .sd-kpi-grid{grid-template-columns:1fr!important}
      }`}
    </style>

    {/* RAIL */}
    <nav role="navigation" aria-label="Main navigation" className="sd-nav-rail" style={{width:82,background:C.s1,borderRight:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0 10px",gap:3,flexShrink:0,zIndex:20,overflowY:"auto",overflowX:"hidden"}}>
      <div style={{flexShrink:0,marginBottom:14}}><SDLogo s={42}/></div>
      {pinnedNav.filter(id=>ROUTES[id]).map(id=>(
        <button key={id} className={`nav${scr===id?" nav-active":""}`} onClick={()=>navigate(id)} title={ROUTES[id]?.label||id} style={{width:70,padding:"8px 0",borderRadius:11,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,color:scr===id?C.a:C.t1,background:scr===id?C.ad:"transparent",border:`1.5px solid ${scr===id?C.a+"44":"transparent"}`,cursor:"pointer",transition:"all .15s",position:"relative",flexShrink:0,marginBottom:1}}>
          <NavIcon id={id} s={22} col={scr===id?C.a:C.t2}/>
          <span style={{fontSize:10.5,fontWeight:scr===id?700:600,fontFamily:FD,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:66,textAlign:"center",lineHeight:1.15,letterSpacing:-.1,color:scr===id?C.a:C.t1}}>{(ROUTES[id]?.label||id).replace("Knowledge Base","KB").replace("Integrations & API","Integr.").replace("Live Monitor","Monitor").replace("Widget Builder","Widget").replace("Team Chat","Chat")}</span>
          {id==="teamchat"&&tcUnread>0&&scr!=="teamchat"&&<span style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:C.r,color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.s1}`}}>{tcUnread}</span>}
        </button>
      ))}
      {allNavIds.filter(id=>!pinnedNav.includes(id)).length>0&&<>
        <div style={{width:48,height:1,background:C.b2,margin:"8px 0"}}/>
        {allNavIds.filter(id=>!pinnedNav.includes(id)).map(id=>(
          <button key={"m_"+id} className={`nav${scr===id?" nav-active":""}`} onClick={()=>navigate(id)} title={ROUTES[id]?.label||id} style={{width:70,padding:"7px 0",borderRadius:11,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,color:scr===id?C.a:C.t1,background:scr===id?C.ad:"transparent",border:`1.5px solid ${scr===id?C.a+"44":"transparent"}`,cursor:"pointer",transition:"all .15s",flexShrink:0,marginBottom:1}}>
            <NavIcon id={id} s={20} col={scr===id?C.a:C.t2}/>
            <span style={{fontSize:10,fontWeight:scr===id?700:600,fontFamily:FD,whiteSpace:"nowrap",maxWidth:66,overflow:"hidden",textOverflow:"ellipsis",textAlign:"center",lineHeight:1.15,color:scr===id?C.a:C.t1}}>{(ROUTES[id]?.label||id).replace("Knowledge Base","KB").replace("Integrations & API","Integr.").replace("Live Monitor","Monitor").replace("Widget Builder","Widget").replace("Team Chat","Chat")}</span>
          </button>
        ))}
      </>}
      <div style={{flex:1}}/>
      <button className={`nav${showN?" nav-active":""}`} onClick={()=>setShowN(p=>!p)} title="Notifications" aria-pressed={showN} style={{width:70,padding:"8px 0",borderRadius:11,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,background:showN?C.ad:"transparent",border:`1.5px solid ${showN?C.a+"44":"transparent"}`,cursor:"pointer",color:showN?C.a:C.t1,transition:"all .15s",position:"relative",flexShrink:0}}>
        <NavIcon id="bell" s={22} col={showN?C.a:C.t2}/>
        <span style={{fontSize:10.5,fontWeight:showN?700:600,fontFamily:FD,color:showN?C.a:C.t1}}>Alerts</span>
        {unread>0&&<span style={{position:"absolute",top:2,right:6,minWidth:16,height:16,background:C.r,borderRadius:"50%",fontSize:8,color:"#fff",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.s1}`}}>{unread}</span>}
      </button>
      {showN&&<div style={{position:"absolute",left:82,bottom:40,zIndex:100}}><NotifPanel notifs={notifs} setNotifs={setNotifs} onClose={()=>setShowN(false)} onOpenNotification={openNotification}/></div>}
      <div data-profile-menu style={{padding:"7px 0",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}} onClick={()=>setShowProfileMenu(!showProfileMenu)}>
        <Av i="PS" c={C.a} s={30} dot={true}/>
        <span style={{fontSize:8.5,color:C.t2,fontWeight:600,fontFamily:FD}}>Priya</span>
        {showProfileMenu && <div data-profile-menu style={{position:"fixed",left:86,bottom:8,width:200,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.4)",zIndex:9999,overflow:"hidden",animation:"slideIn .15s ease"}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s1}}>
            <div style={{fontSize:13,fontWeight:700,color:C.t1}}>Priya Sharma</div>
            <div style={{fontSize:10,color:C.t3}}>priya@supportdesk.app</div>
          </div>
          <div style={{padding:4}}>
            <button className="hov" onClick={()=>{navigate("settings");setStab("profile");setShowProfileMenu(false);}} style={{width:"100%",padding:"8px 10px",borderRadius:8,display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:C.t2,fontSize:12,cursor:"pointer",textAlign:"left",transition:"all .1s"}}>
              <NavIcon id="settings" s={14} col={C.t3}/> My Profile
            </button>
            <button className="hov" onClick={handleLogout} style={{width:"100%",padding:"8px 10px",borderRadius:8,display:"flex",alignItems:"center",gap:8,background:"none",border:"none",color:C.r,fontSize:12,cursor:"pointer",textAlign:"left",transition:"all .1s"}}>
              <span style={{fontSize:14}}>📤</span> Logout
            </button>
          </div>
        </div>}
      </div>
    </nav>

    {/* MAIN BODY */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>

      {/* URL BAR */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",background:C.s1,borderBottom:`1px solid ${C.b1}`,flexShrink:0}} className="sd-url-bar">
        {/* Traffic lights */}
        <div style={{display:"flex",gap:5,marginRight:4}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#ff5f57"}}/>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#ffbd2e"}}/>
          <div style={{width:10,height:10,borderRadius:"50%",background:"#27c93f"}}/>
        </div>
        {/* Back / Forward */}
        <button onClick={()=>window.history.back()} style={{width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">←</button>
        <button onClick={()=>window.history.forward()} style={{width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">→</button>
        {/* URL pill */}
        <div style={{flex:1,display:"flex",alignItems:"center",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 12px",gap:6,maxWidth:480}}>
          <span style={{fontSize:10,color:C.g}}>🔒</span>
          <span style={{fontSize:11.5,color:C.t3,fontFamily:FM}}>supportdesk.app</span>
          <span style={{color:C.t3,fontSize:10}}>/</span>
          <span style={{fontSize:11.5,color:C.a,fontFamily:FM,fontWeight:600}}>{ROUTES[scr]?.path||""}</span>
          {scr==="settings"&&stab&&<><span style={{color:C.t3,fontSize:10}}>/</span><span style={{fontSize:10.5,color:C.p,fontFamily:FM}}>{stab}</span></>}
          {scr==="knowledgebase"&&<><span style={{color:C.t3,fontSize:10}}>/</span><span style={{fontSize:10.5,color:C.p,fontFamily:FM}}>articles</span></>}
          {scr==="integrations"&&<><span style={{color:C.t3,fontSize:10}}>/</span><span style={{fontSize:10.5,color:C.p,fontFamily:FM}}>marketplace</span></>}
          {scr==="inbox"&&aid&&<><span style={{color:C.t3,fontSize:10}}>/</span><span style={{fontSize:10.5,color:C.p,fontFamily:FM}}>{aid}</span></>}
          <span style={{fontSize:10,color:C.t2,marginLeft:4}}>{ROUTES[scr]?.label||"Home"}</span>
        </div>
        {/* Live presence */}
        {screenViewers.length>0&&<div style={{display:"flex",alignItems:"center",gap:3,marginRight:4}} title={screenViewers.map(a=>a.name).join(", ")+" also viewing"}>
          {screenViewers.map(a=><div key={a.id} style={{marginLeft:-4}}><Av i={a.av} c={a.color} s={18} dot/></div>)}
          <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{screenViewers.length>1?screenViewers.length+" viewing":"also here"}</span>
        </div>}
        {/* Quick nav pills */}
        <div style={{display:"flex",gap:4}}>
          {["inbox","contacts","marketing","knowledgebase"].map(id=>(
            <button key={id} onClick={()=>navigate(id)} style={{padding:"3px 10px",borderRadius:14,fontSize:10,fontWeight:600,fontFamily:FM,cursor:"pointer",background:scr===id?C.ad:"transparent",color:scr===id?C.a:C.t3,border:`1px solid ${scr===id?C.a+"44":C.b1}`,transition:"all .12s"}} className="hov">{ROUTES[id]?.label}</button>
          ))}
        </div>
        {/* Toolbar */}
        <ConnBadge ok={apiOk}/>
        <div style={{display:"flex",gap:3,alignItems:"center"}}>
          <button onClick={()=>{setShowCmd(true);setCmdQ("");}} title="Command Palette (Ctrl+K)" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">⌘K</button>
          <button onClick={toggleDark} title={isDark?"Light Mode":"Dark Mode"} style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">{isDark?"☀":"🌙"}</button>
          <button onClick={()=>setSoundOn(p=>{showT(p?"Sounds off":"Sounds on","info");return!p;})} title="Toggle sounds" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:C.s3,color:soundOn?C.a:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">{soundOn?"🔔":"🔕"}</button>
          <button onClick={()=>setShowChangelog(p=>!p)} title="What's New" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:showChangelog?C.pd:C.s3,color:showChangelog?C.p:C.t3,border:`1px solid ${showChangelog?C.p+"44":C.b1}`,cursor:"pointer",position:"relative"}} className="hov">✦<span style={{position:"absolute",top:1,right:1,width:6,height:6,borderRadius:"50%",background:C.p}}/></button>
          <button onClick={()=>{const w=window.open("","_blank");if(w){w.document.write("<html><head><title>SupportDesk — "+ROUTES[scr]?.label+"</title><style>body{font-family:Nunito,sans-serif;padding:40px;color:#111;max-width:800px;margin:0 auto}h1{font-family:Outfit,sans-serif}@media print{body{padding:20px}}</style></head><body><h1>SupportDesk — "+ROUTES[scr]?.label+"</h1><p>Generated: "+new Date().toLocaleString()+"</p><p>This is a print-ready export of the current screen.</p><hr/><p><em>Use Ctrl+P or Cmd+P to print/save as PDF</em></p></body></html>");w.document.close();w.print();}}} title="Export PDF / Print" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">📄</button>
          <button onClick={()=>setShowNavConfig(true)} title="Customize Nav" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">⚙</button>
          <button onClick={()=>setShowHelp(p=>!p)} title="Help & Support" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:showHelp?C.ad:C.s3,color:showHelp?C.a:C.t3,border:`1px solid ${showHelp?C.a+"44":C.b1}`,cursor:"pointer"}} className="hov">?</button>
          <button onClick={printPage} title="Print / Export" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">🖨</button>
          <button onClick={()=>setShowNavConfig(p=>!p)} title="Customize Nav" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:showNavConfig?C.ad:C.s3,color:showNavConfig?C.a:C.t3,border:`1px solid ${showNavConfig?C.a+"44":C.b1}`,cursor:"pointer"}} className="hov">⚙</button>
          <select value={lang} onChange={e=>switchLang(e.target.value)} style={{background:C.s3,border:`1px solid ${C.b1}`,borderRadius:6,color:C.t2,fontSize:10,padding:"3px 4px",cursor:"pointer",fontFamily:FM,outline:"none"}}>{Object.keys(LANGS).map(l=><option key={l} value={l}>{LANGS[l].name}</option>)}</select>
        </div>
      </div>

      {/* CHANGELOG PANEL */}
      {showChangelog&&<div style={{position:"absolute",top:42,right:120,width:340,maxHeight:400,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:14,boxShadow:"0 16px 50px rgba(0,0,0,.15)",zIndex:100,overflow:"hidden",animation:"fadeUp .15s ease"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>✦ What's New</span><button onClick={()=>setShowChangelog(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button></div>
        <div style={{overflowY:"auto",maxHeight:340,padding:"8px 0"}}>
          {CHANGELOG.map(c=><div key={c.v} style={{padding:"10px 16px",borderBottom:`1px solid ${C.b1}22`}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Tag text={"v"+c.v} color={C.p}/><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{c.date}</span></div>
            {c.items.map((item,i)=><div key={i} style={{fontSize:12,color:C.t2,paddingLeft:8,borderLeft:`2px solid ${C.p}33`,marginBottom:4,lineHeight:1.4}}>{item}</div>)}
          </div>)}
        </div>
      </div>}

      {/* HELP WIDGET PANEL */}
      {showHelp&&<div style={{position:"absolute",top:42,right:80,width:300,maxHeight:420,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:14,boxShadow:"0 16px 50px rgba(0,0,0,.15)",zIndex:100,overflow:"hidden",animation:"fadeUp .15s ease"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Help & Support</span><button onClick={()=>setShowHelp(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button></div>
        <div style={{padding:"10px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"5px 8px",marginBottom:10}}><NavIcon id="search" s={12} col={C.t3}/><input value={helpSearch} onChange={e=>setHelpSearch(e.target.value)} placeholder="Search help articles…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/></div>
          {[{i:"📚",l:"Knowledge Base",d:"Browse 42 help articles",fn:()=>{navigate("knowledgebase");setShowHelp(false);}},{i:"⌨",l:"Keyboard Shortcuts",d:"View all shortcuts (?)",fn:()=>{setShowShortcuts(true);setShowHelp(false);}},{i:"💬",l:"Contact Support",d:"Chat with our team",fn:()=>{navigate("teamchat");setShowHelp(false);}},{i:"📖",l:"API Documentation",d:"Developer guides & reference",fn:()=>{navigate("integrations");setShowHelp(false);}},{i:"✦",l:"What's New",d:"Latest features & updates",fn:()=>{setShowChangelog(true);setShowHelp(false);}},{i:"🎓",l:"Setup Wizard",d:"Re-run onboarding guide",fn:()=>{setShowOnboard(true);setShowHelp(false);}}].map(h=>(
            <button key={h.l} onClick={h.fn} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",marginBottom:2,transition:"background .1s"}}>
              <span style={{fontSize:16}}>{h.i}</span>
              <div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{h.l}</div><div style={{fontSize:10,color:C.t3}}>{h.d}</div></div>
            </button>
          ))}
        </div>
      </div>}

      {/* SCREEN CONTENT */}


      {/* API Error Banner */}
      {apiOk&&!api.isConnected()&&<ErrorBanner msg="Lost connection to API server. Data may be stale." onRetry={()=>loadInitialData()} compact/>}
      <div key={themeKey} role="main" aria-label={ROUTES[scr]?.label||"Dashboard"} style={{flex:1,display:"flex",minWidth:0,overflow:"hidden",zoom:FS!==1?FS:undefined}}>
        {scr==="home"&&<HomeScr convs={convs} contacts={contacts} agents={agents} labels={labels} inboxes={inboxes} setScr={navigate} setAid={setAid} msgs={msgs} dashWidgets={dashWidgets} hiddenWidgets={hiddenWidgets} onDashConfig={()=>setShowDashConfig(true)}/>}
        <LazyMount active={scr==="inbox"}><InboxScr {...sp} aid={aid} setAid={setAid} soundOn={soundOn} aiAutoReply={aiAutoReply} setAiAutoReply={setAiAutoReply} aiChannels={aiChannels} setAiChannels={setAiChannels} csatPending={csatPending} setCsatPending={setCsatPending} snoozeConv={snoozeConv} convViewers={convViewers} savedViews={savedViews} setSavedViews={setSavedViews} isActive={scr==="inbox"}/></LazyMount>
        <LazyMount active={scr==="teamchat"}><TeamChatScr agents={agents} setAgents={setAgents} fontKey={fontKey} themeKey={themeKey}/></LazyMount>
        <LazyMount active={scr==="crm"}><CrmScr contacts={contacts} setContacts={setContacts} convs={convs} comps={comps} setComps={setComps} customFields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} inboxes={inboxes}/></LazyMount>
        <LazyMount active={scr==="contacts"}><ContactsScr {...sp}/></LazyMount>
        <LazyMount active={scr==="marketing"}><MarketingScr contacts={contacts} pushNotification={pushNotification}/></LazyMount>
        <LazyMount active={scr==="monitor"}><MonitorScr contacts={contacts} inboxes={inboxes} setConvs={setConvs} setMsgs={setMsgs} setScr={navigate} setAid={setAid}/></LazyMount>
        <LazyMount active={scr==="calendar"}><ScheduleScr/></LazyMount>
        <LazyMount active={scr==="integrations"}><IntegrationsScr/></LazyMount>
        <LazyMount active={scr==="knowledgebase"}><KnowledgeBaseScr/></LazyMount>
        <LazyMount active={scr==="reports"}><ReportsScr convs={convs} agents={agents} labels={labels} contacts={contacts} inboxes={inboxes}/></LazyMount>
        <LazyMount active={scr==="settings"}><SettingsScr {...sp} stab={stab} setStab={setStab} fontKey={fontKey} applyFont={applyFont} fontScale={fontScale} applySize={applySize} themeKey={themeKey} applyTheme={applyTheme} autoTheme={autoTheme} setAutoTheme={setAutoTheme} inboxes={inboxes} aiAutoReply={aiAutoReply} setAiAutoReply={setAiAutoReply} aiChannels={aiChannels} setAiChannels={setAiChannels} customFields={customFields} setCustomFields={setCustomFields}/></LazyMount>
      </div>
    </div>

    {/* ═══ AI COPILOT FLOATING (Feature 11) ═══ */}
    {scr!=="teamchat"&&scr!=="inbox"&&<button onClick={()=>setShowAiFloat(p=>!p)} style={{position:"fixed",bottom:76,right:76,width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${C.p},${C.a})`,border:"none",cursor:"pointer",boxShadow:`0 4px 18px ${C.p}44`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:78,fontSize:16,color:"#fff",fontWeight:800,transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>✦</button>}
    {showAiFloat&&<div style={{position:"fixed",bottom:126,right:76,width:340,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:14,boxShadow:"0 16px 50px rgba(0,0,0,.15)",zIndex:79,overflow:"hidden",animation:"fadeUp .2s ease"}}>
      <div style={{padding:"10px 14px",background:`linear-gradient(135deg,${C.pd},${C.ad})`,borderBottom:`1px solid ${C.p}33`,display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:14,fontWeight:800,color:C.p}}>✦</span><span style={{fontSize:13,fontWeight:700,fontFamily:FD,flex:1}}>AI Copilot</span>
        <span style={{fontSize:9,color:C.t3,fontFamily:FM,background:C.s3,padding:"2px 6px",borderRadius:4}}>{ROUTES[scr]?.label}</span>
        <button onClick={()=>setShowAiFloat(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>
      </div>
      <div style={{padding:12,maxHeight:280,overflowY:"auto"}}>
        {aiFloatA&&<div style={{padding:"10px",background:C.pd,border:`1px solid ${C.p}33`,borderRadius:8,marginBottom:10,fontSize:12,color:C.t2,lineHeight:1.6,whiteSpace:"pre-line"}}>{aiFloatA}</div>}
        {aiFloatLoading&&<div style={{display:"flex",gap:6,alignItems:"center",marginBottom:10}}><Spin/><span style={{fontSize:11,color:C.t2}}>Thinking…</span></div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:8}}>
          {(scr==="reports"?[{l:"Explain this trend",q:"Explain the key trends in my support metrics"},{l:"Suggest improvements",q:"What can I improve based on these reports?"},{l:"Forecast next week",q:"Predict support volume for next week"}]:
            scr==="contacts"?[{l:"Find churn risk",q:"Which contacts are at risk of churning?"},{l:"Segment customers",q:"Suggest smart segments for my contact list"},{l:"Draft outreach",q:"Write a re-engagement email for inactive customers"}]:
            scr==="marketing"?[{l:"Optimize campaign",q:"How can I improve my campaign performance?"},{l:"Best send time",q:"When is the optimal time to send WhatsApp campaigns?"},{l:"A/B test ideas",q:"Suggest A/B test variations for my next campaign"}]:
            scr==="knowledgebase"?[{l:"Suggest articles",q:"What KB articles should I write based on common tickets?"},{l:"Improve this article",q:"How can I make my help articles more effective?"},{l:"Gap analysis",q:"What topics are missing from my knowledge base?"}]:
            [{l:"Summarize today",q:"Give me a summary of today's support activity"},{l:"Quick report",q:"Generate a quick performance report"},{l:"Suggest actions",q:"What should I focus on right now?"}]
          ).map(s=><button key={s.l} onClick={()=>{setAiFloatQ(s.q);setAiFloatLoading(true);setTimeout(()=>{setAiFloatA("Based on your "+ROUTES[scr]?.label+" data:\n\n• Ticket volume is trending up 23% this week, primarily from WhatsApp\n• Average response time has improved to 3.2 min (down from 4.8 min)\n• 3 customers show churn risk indicators — recommend proactive outreach\n• AI Auto-Reply is deflecting 40% of routine queries successfully\n\nRecommended actions: Enable AI for email channel, create KB article for CSV exports, schedule team standup for Monday peak hours.");setAiFloatLoading(false);},1200);}} className="hov" style={{padding:"4px 8px",borderRadius:12,fontSize:10,background:C.s3,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer"}}>{s.l}</button>)}
        </div>
        <div style={{display:"flex",gap:4}}>
          <input value={aiFloatQ} onChange={e=>setAiFloatQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&aiFloatQ.trim()){setAiFloatLoading(true);setTimeout(()=>{setAiFloatA("I analyzed your "+ROUTES[scr]?.label+" screen data. Here are my insights:\n\n• Current performance is above average\n• I recommend focusing on response time optimization\n• Consider enabling AI auto-reply for repetitive queries\n• Schedule a weekly review to track improvements");setAiFloatLoading(false);},1000);}}} placeholder="Ask AI anything…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"6px 10px",fontSize:11.5,color:C.t1,fontFamily:FB,outline:"none"}}/>
          <button onClick={()=>{if(!aiFloatQ.trim())return;setAiFloatLoading(true);setTimeout(()=>{setAiFloatA("Analysis complete. Key findings for "+ROUTES[scr]?.label+":\n\n• Performance trending positively\n• 3 actionable recommendations identified\n• No critical issues detected");setAiFloatLoading(false);},900);}} style={{width:30,height:30,borderRadius:7,background:C.p,color:"#fff",border:"none",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
        </div>
      </div>
    </div>}


    {/* ═══ DASHBOARD CONFIG MODAL (Feature 6) ═══ */}
    {showDashConfig&&<Mdl title="Customize Dashboard" onClose={()=>setShowDashConfig(false)} w={400}>
      <p style={{fontSize:12,color:C.t3,marginBottom:12}}>Drag to reorder, toggle to show/hide widgets:</p>
      {dashWidgets.map((w,i)=>{const names={kpis:"KPI Cards",activity:"Activity Feed",quickActions:"Quick Actions",schedule:"Today's Schedule",performance:"Performance Row",csat:"CSAT Chart",channels:"Channel Breakdown",team:"Team Status"};const hidden=hiddenWidgets.includes(w);return(
        <div key={w} draggable onDragStart={()=>setDragItem(i)} onDragOver={e=>{e.preventDefault();setDragOver(i);}} onDragEnd={onDragEnd} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:dragOver===i?C.ad:hidden?C.s3:C.s1,border:`1px solid ${dragOver===i?C.a+"55":C.b1}`,borderRadius:8,marginBottom:4,opacity:hidden?0.5:1,cursor:"grab",transition:"background .12s,border .12s"}}>
          <span style={{color:C.t3,fontSize:12,cursor:"grab",userSelect:"none"}}>⠿</span>
          <span style={{flex:1,fontSize:12,fontWeight:600,color:hidden?C.t3:C.t1}}>{names[w]||w}</span>
          <div style={{display:"flex",gap:1}}><button onClick={()=>moveDashWidget(w,-1)} style={{background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:8}}>▲</button><button onClick={()=>moveDashWidget(w,1)} style={{background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:8}}>▼</button></div>
          <Toggle val={!hidden} set={()=>toggleDashWidget(w)}/>
        </div>
      );})}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><Btn ch="Done" v="primary" onClick={()=>setShowDashConfig(false)}/></div>
    </Mdl>}

    {/* ═══ NAV CONFIG MODAL (Feature 13) ═══ */}
    {showNavConfig&&<Mdl title="Customize Navigation" onClose={()=>setShowNavConfig(false)} w={380}>
      <p style={{fontSize:12,color:C.t3,marginBottom:12}}>Pin screens to always show in the nav rail:</p>
      {allNavIds.map(id=>{const pinned=pinnedNav.includes(id);return(
        <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:pinned?C.ad:C.s1,border:`1px solid ${pinned?C.a+"44":C.b1}`,borderRadius:8,marginBottom:4,cursor:"pointer"}} onClick={()=>togglePin(id)}>
          <NavIcon id={id} s={16} col={pinned?C.a:C.t3}/>
          <span style={{flex:1,fontSize:12,fontWeight:pinned?700:400,color:pinned?C.t1:C.t2}}>{ROUTES[id]?.label||id}</span>
          <span style={{fontSize:10,color:pinned?C.a:C.t3}}>{pinned?"📌":"○"}</span>
        </div>
      );})}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><Btn ch="Done" v="primary" onClick={()=>setShowNavConfig(false)}/></div>
    </Mdl>}

    {/* ═══ MINI TEAM CHAT PANEL ═══ */}
    {scr!=="teamchat"&&<button onClick={()=>setShowMiniChat(p=>!p)} style={{position:"fixed",bottom:20,right:20,width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${C.a},${C.p})`,border:"none",cursor:"pointer",boxShadow:`0 4px 20px ${C.a}44`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:80,transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      <NavIcon id="teamchat" s={22} col="#fff"/>
      {tcUnread>0&&<span style={{position:"absolute",top:-2,right:-2,width:18,height:18,borderRadius:"50%",background:C.r,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${C.bg}`}}>{tcUnread}</span>}
    </button>}
    {showMiniChat&&scr!=="teamchat"&&<MiniChatPanel agents={agents} onClose={()=>setShowMiniChat(false)} onExpand={()=>{setShowMiniChat(false);navigate("teamchat");}}/>}

    {/* ═══ KEYBOARD SHORTCUTS PANEL ═══ */}
    {showShortcuts&&<div onClick={()=>setShowShortcuts(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:16,width:480,maxHeight:"70vh",overflow:"auto",padding:"24px",boxShadow:"0 20px 60px rgba(0,0,0,.6)",animation:"fadeUp .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:16,fontWeight:700,fontFamily:FD}}>Keyboard Shortcuts</span><button onClick={()=>setShowShortcuts(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:18}}>×</button></div>
        {[["Navigation",[["`Ctrl+K`","Command Palette"],["`Ctrl+1`","Go to Inbox"],["`Ctrl+2`","Go to Contacts"],["`Ctrl+3`","Go to Reports"],["`?`","This shortcuts panel"]]],
          ["Inbox",[["`Enter`","Send message"],["`Shift+Enter`","New line"],["`Esc`","Close panels"]]],
          ["Team Chat",[["`/`","Slash commands"],["`@`","Mention someone"],["`↑`","Edit last message"],["`Ctrl+/`","Open commands"],["`Ctrl+Shift+M`","Mute channel"],["`Esc`","Close all panels"]]]
        ].map(([section,shortcuts])=>(
          <div key={section} style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.a,fontFamily:FM,letterSpacing:"0.5px",marginBottom:8}}>{section}</div>
            {shortcuts.map(([key,desc])=>(
              <div key={desc} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <span style={{fontSize:12,color:C.t2}}>{desc}</span>
                <span style={{fontSize:11,fontFamily:FM,color:C.t1,background:C.s3,padding:"2px 8px",borderRadius:5,border:`1px solid ${C.b1}`}}>{key.replace(/`/g,"")}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>}

    {/* ═══ UNDO TOAST ═══ */}
    {showUndoToast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:998,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 10px 40px rgba(0,0,0,.5)",animation:"fadeUp .2s ease"}}>
      <span style={{fontSize:12,color:C.t2}}>{showUndoToast.msg}</span>
      <button onClick={()=>{if(undoAction)undoAction();setShowUndoToast(null);showT("Undone!","success");}} style={{padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:700,background:C.a,color:"#fff",border:"none",cursor:"pointer"}}>Undo</button>
      <button onClick={()=>setShowUndoToast(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>
    </div>}

    {/* ═══ COMMAND PALETTE ═══ */}
    {showCmd&&<div onClick={()=>setShowCmd(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:999,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:80}}>
      <div onClick={e=>e.stopPropagation()} style={{width:520,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:16,overflow:"hidden",animation:"fadeUp .15s ease",boxShadow:"0 30px 80px rgba(0,0,0,.8)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",borderBottom:`1px solid ${C.b1}`}}>
          <span style={{color:C.t3,fontSize:14}}>⌕</span>
          <input value={cmdQ} onChange={e=>setCmdQ(e.target.value)} autoFocus placeholder="Type a command or search…" style={{flex:1,background:"none",border:"none",fontSize:15,color:C.t1,fontFamily:FB,outline:"none"}}/>
          <span style={{fontSize:9,color:C.t3,fontFamily:FM,background:C.s3,padding:"2px 6px",borderRadius:4}}>ESC</span>
        </div>
        <div style={{maxHeight:340,overflowY:"auto"}}>
          {[...Object.keys(ROUTES).map(k=>({type:"nav",id:k,label:ROUTES[k].label,icon:ROUTES[k].icon,desc:"Go to "+ROUTES[k].label})),
            {type:"action",id:"resolve",label:"Resolve Conversation",icon:"resolve",desc:"Close current conversation"},
            {type:"action",id:"newconv",label:"New Conversation",icon:"newconv",desc:"Start a new conversation"},
            {type:"action",id:"dark",label:isDark?"Light Mode":"Dark Mode",icon:"theme",desc:"Toggle appearance"},
            {type:"action",id:"sound",label:soundOn?"Mute Sounds":"Enable Sounds",icon:"bell",desc:"Toggle notification sounds"},
            {type:"action",id:"export",label:"Export Conversations CSV",icon:"download",desc:"Download all conversations"},
            {type:"action",id:"shortcuts",label:"Keyboard Shortcuts",icon:"keyboard",desc:"View all shortcuts"}
          ].filter(c=>!cmdQ||c.label.toLowerCase().includes(cmdQ.toLowerCase())||c.desc.toLowerCase().includes(cmdQ.toLowerCase())).map(c=>(
            <button key={c.id} onClick={()=>{setShowCmd(false);if(c.type==="nav")navigate(c.id);else if(c.id==="dark")toggleDark();else if(c.id==="sound")setSoundOn(p=>!p);else if(c.id==="export"){exportCSV([["ID","Subject","Status","Channel","Agent","Priority"],...convs.map(cv=>[cv.id,cv.subject,cv.status,cv.ch,agents.find(a=>a.id===cv.agent)?.name||"",cv.priority])],"conversations.csv");showT("CSV exported","success");}else showT(c.label,"info");}} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"transparent",border:"none",borderBottom:`1px solid ${C.b1}22`,cursor:"pointer",transition:"background .1s",textAlign:"left"}}>
              <span style={{width:24,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon id={c.icon} s={16} col={C.t2}/></span>
              <div style={{flex:1}}><div style={{fontSize:13,color:C.t1,fontWeight:500}}>{c.label}</div><div style={{fontSize:10,color:C.t3}}>{c.desc}</div></div>
              {c.type==="nav"&&<span style={{fontSize:9,color:C.t3,fontFamily:FM,background:C.s3,padding:"2px 6px",borderRadius:4}}>Go</span>}
            </button>
          ))}
        </div>
      </div>
    </div>}

    {/* ═══ ONBOARDING WIZARD ═══ */}
    {showOnboard&&<div onClick={()=>setShowOnboard(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:540,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:18,overflow:"hidden",animation:"fadeUp .2s ease"}}>
        <div style={{padding:"28px 30px 0",textAlign:"center"}}>
          <div style={{marginBottom:14}}><SDLogo s={48}/></div>
          <div style={{fontSize:20,fontWeight:800,fontFamily:FD,marginBottom:4}}>{t("welcome")}</div>
          <div style={{fontSize:13,color:C.t3,marginBottom:20}}>Let us set up your workspace in 4 easy steps</div>
          {/* Step indicator */}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
            {[0,1,2,3].map(i=><div key={i} style={{width:i===onboardStep?40:12,height:6,borderRadius:3,background:i<=onboardStep?C.a:C.b1,transition:"all .3s"}}/>)}
          </div>
        </div>
        <div style={{padding:"0 30px 24px"}}>
          {onboardStep===0&&<div style={{textAlign:"center",padding:"10px 0"}}>
            <div style={{width:52,height:52,borderRadius:14,background:C.ad,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><NavIcon id="inbox" s={28} col={C.a}/></div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:6}}>Create Your First Inbox</div>
            <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:14}}>Inboxes are where conversations arrive. Set up a channel — Live Chat, Email, WhatsApp, or any of 15 channels.</div>
            <Btn ch="Go to Inboxes →" v="primary" full onClick={()=>{navigate("settings");setShowOnboard(false);showT("Create your first inbox!","info");}}/>
          </div>}
          {onboardStep===1&&<div style={{textAlign:"center",padding:"10px 0"}}>
            <div style={{width:52,height:52,borderRadius:14,background:C.gd,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><NavIcon id="contacts" s={28} col={C.g}/></div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:6}}>Invite Your Team</div>
            <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:14}}>Add agents who will handle conversations. Set their roles, permissions, and working hours.</div>
            <Btn ch="Invite Agents →" v="primary" full onClick={()=>{navigate("settings");setShowOnboard(false);showT("Invite your first agent!","info");}}/>
          </div>}
          {onboardStep===2&&<div style={{textAlign:"center",padding:"10px 0"}}>
            <div style={{width:52,height:52,borderRadius:14,background:C.pd,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><NavIcon id="integrations" s={28} col={C.p}/></div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:6}}>Connect Your Tools</div>
            <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:14}}>Integrate with Slack, Jira, Shopify, and 30+ more tools from the Marketplace.</div>
            <Btn ch="Browse Marketplace →" v="primary" full onClick={()=>{navigate("integrations");setShowOnboard(false);}}/>
          </div>}
          {onboardStep===3&&<div style={{textAlign:"center",padding:"10px 0"}}>
            <div style={{width:52,height:52,borderRadius:14,background:C.yd,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}><NavIcon id="settings" s={28} col={C.y}/></div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:6}}>Set Up AI Bot</div>
            <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:14}}>Enable Claude-powered AI auto-replies, smart classification, and CSAT analysis on any channel.</div>
            <Btn ch="Configure AI →" v="primary" full onClick={()=>{navigate("settings");setShowOnboard(false);showT("Configure your AI bot!","info");}}/>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
            <button onClick={()=>setOnboardStep(p=>Math.max(0,p-1))} style={{visibility:onboardStep>0?"visible":"hidden",background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:13}}>← Back</button>
            <button onClick={()=>{if(onboardStep<3)setOnboardStep(p=>p+1);else{setShowOnboard(false);showT("Setup complete!","success");}}} style={{background:"none",border:"none",color:C.a,cursor:"pointer",fontSize:13,fontWeight:600}}>{onboardStep<3?"Skip →":"Finish ✓"}</button>
          </div>
        </div>
      </div>
    </div>}
    <ToastHost/>
  </div>;
}
