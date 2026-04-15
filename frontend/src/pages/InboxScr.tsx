import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, API_BASE, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel, InfoRow } from "../shared";

// ─── INBOX SCREEN ─────────────────────────────────────────────────────────
const EMOJI_SET=["😀","😂","😍","🤔","😢","🙏","👍","👎","❤️","🔥","✅","❌","⚡","🎉","💯","👋","🤝","💡","⭐","🚀","😊","🤗","😎","🤷","😅","💪","👏","🙌","😇","🫡"];

const parseMsgSortTime=(msg)=>{
  const raw=msg?.created_at||msg?.updated_at||"";
  const ts=raw?Date.parse(raw):NaN;
  return Number.isNaN(ts)?Number.MAX_SAFE_INTEGER:ts;
};
const getMsgDateKey=(msg)=>{
  const raw=msg?.created_at||msg?.updated_at||"";if(!raw)return"";
  const d=new Date(raw.replace(" ","T"));if(isNaN(d.getTime()))return"";
  return d.toISOString().slice(0,10);
};
const formatDateLabel=(dateKey)=>{
  if(!dateKey)return"";
  const d=new Date(dateKey+"T00:00:00");const now=new Date();
  const today=now.toISOString().slice(0,10);
  const yest=new Date(now.getTime()-86400000).toISOString().slice(0,10);
  if(dateKey===today)return"Today";
  if(dateKey===yest)return"Yesterday";
  return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:d.getFullYear()!==now.getFullYear()?"numeric":undefined});
};
const formatMsgTime=(msg)=>{
  const raw=msg?.created_at||msg?.updated_at||"";if(!raw)return msg?.t||"";
  const d=new Date(raw.replace(" ","T"));if(isNaN(d.getTime()))return msg?.t||"";
  const hh=String(d.getHours()).padStart(2,"0");const mm=String(d.getMinutes()).padStart(2,"0");
  return`${hh}:${mm}`;
};
const formatConvTime=(raw)=>{
  if(!raw||raw==="now")return"now";
  const d=new Date(String(raw).replace(" ","T"));if(isNaN(d.getTime()))return raw;
  const now=new Date();const today=now.toISOString().slice(0,10);const yest=new Date(now.getTime()-86400000).toISOString().slice(0,10);
  const dk=d.toISOString().slice(0,10);
  const hh=String(d.getHours()).padStart(2,"0");const mm=String(d.getMinutes()).padStart(2,"0");
  if(dk===today)return hh+":"+mm;
  if(dk===yest)return"Yesterday";
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
};

const sortConversationMessages=(list=[])=>list
  .map((msg,index)=>({msg,index}))
  .sort((a,b)=>{
    const ta=parseMsgSortTime(a.msg);
    const tb=parseMsgSortTime(b.msg);
    if(ta!==tb)return ta-tb;
    return a.index-b.index;
  })
  .map(item=>item.msg);

const hydrateConversationMessages=(list=[])=>sortConversationMessages(
  list.map((m:any)=>({
    ...m,
    attachments:normalizeAttachmentList(m.attachments||[]),
    aid:m.agent_id,
    t:m.created_at?.split?.("T")?.[1]?.slice(0,5)||m.created_at?.split?.(" ")?.[1]?.slice(0,5)||"",
  }))
);

const BACKEND_ORIGIN=API_BASE.replace(/\/api$/,"");

const formatAttachmentSize=(value)=>{
  const size=Number(value||0);
  if(!Number.isFinite(size)||size<=0)return "";
  if(size<1024)return `${size} B`;
  if(size<1024*1024)return `${(size/1024).toFixed(1)} KB`;
  return `${(size/(1024*1024)).toFixed(1)} MB`;
};

const normalizeAttachmentMeta=(attachment:any={})=>{
  const size=Number(attachment?.size||0);
  const url=String(attachment?.url||"").trim();
  return {
    ...attachment,
    id:attachment?.id||uid(),
    name:String(attachment?.name||"Attachment").trim()||"Attachment",
    size:Number.isFinite(size)?size:0,
    sizeLabel:attachment?.sizeLabel||formatAttachmentSize(size),
    status:attachment?.status||"ready",
    url,
  };
};

const normalizeAttachmentList=(value=[])=>{
  if(Array.isArray(value))return value.filter(Boolean).map(normalizeAttachmentMeta);
  return [];
};

const attachmentHref=(attachment:any)=>{
  const url=String(attachment?.url||"").trim();
  if(!url)return "";
  if(/^https?:\/\//i.test(url))return url;
  return `${BACKEND_ORIGIN}${url.startsWith("/")?"":"/"}${url}`;
};

const sanitizeDownloadName=(value="conversation")=>String(value||"conversation")
  .replace(/[<>:"/\\|?*\x00-\x1f]/g,"-")
  .replace(/\s+/g," ")
  .trim()
  .slice(0,80)
  || "conversation";

const downloadTextFile=(content:string,filename:string)=>{
  const blob=new Blob([content],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function InboxScr({agents,labels,inboxes,teams,canned,contacts,convs,setConvs,msgs,setMsgs,aid,setAid,soundOn,aiAutoReply,setAiAutoReply,aiChannels,setAiChannels,customFields,getCfVal,setCfVal,csatPending,setCsatPending,snoozeConv,convViewers,savedViews,setSavedViews,isActive=true}){
  const [fStatus,setFStatus]=useState("open");
  const [fOwner,setFOwner]=useState("all");
  const [fCh,setFCh]=useState("all");
  const [search,setSearch]=useState("");
  const [inp,setInp]=useState("");
  const [rtab,setRtab]=useState("conv");
  const [contactSubTab,setContactSubTab]=useState("info");
  const [showAI,setShowAI]=useState(false);
  const [aiLoad,setAiLoad]=useState(false);
  const [aiSugs,setAiSugs]=useState([]);
  const [showCanned,setShowCanned]=useState(false);
  const [cQ,setCQ]=useState("");
  const [typing,setTyping]=useState(false);
  const [sumLoad,setSumLoad]=useState(false);
  const [sumData,setSumData]=useState(null);
  const [showAssign,setShowAssign]=useState(false);
  const [showTransfer,setShowTransfer]=useState(false);
  const [assignSearch,setAssignSearch]=useState("");const [assignTab,setAssignTab]=useState("agents");
  const [showSnooze,setShowSnooze]=useState(false);
  const [showNewConv,setShowNewConv]=useState(false);
  const [showLblPick,setShowLblPick]=useState(false);
  const [aiReplying,setAiReplying]=useState(false);
  const [convBotOff,setConvBotOff]=useState<Set<string>>(new Set());
  const [isNote,setIsNote]=useState(false);
  const [showEmoji,setShowEmoji]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [showMsgSearch,setShowMsgSearch]=useState(false);
  const [msgSearchQ,setMsgSearchQ]=useState("");
  const [replyTo,setReplyTo]=useState(null);
  const [editMsgId,setEditMsgId]=useState(null);
  const [editMsgText,setEditMsgText]=useState("");
  const [showConvConfig,setShowConvConfig]=useState(false);
  const [rpCollapsed,setRpCollapsed]=useState(false);
  const [popupMsg,setPopupMsg]=useState<any>(null);
  // ── Email signature ──
  const [defaultSig,setDefaultSig]=useState<any>(null);
  useEffect(()=>{
    api.get('/settings/signatures').then((r:any)=>{
      const all=r.signatures||[];
      const curAgent=agents.find((a:any)=>a.id===aid);
      const found=all.find((s:any)=>s.is_default&&s.active&&(s.agent_id===aid||s.agent_id===curAgent?.id));
      setDefaultSig(found||null);
    }).catch(()=>{});
  },[aid]);
  const resolveVars=(body:string,ag:any)=>(body||'')
    .replace(/\{\{name\}\}/g,ag?.name||'')
    .replace(/\{\{title\}\}/g,ag?.role||'')
    .replace(/\{\{email\}\}/g,ag?.email||'')
    .replace(/\{\{phone\}\}/g,ag?.phone||'')
    .replace(/\{\{company\}\}/g,'')
    .replace(/\{\{website\}\}/g,'');
  // ── Bulk actions ──
  const [bulkMode,setBulkMode]=useState(false);
  const [bulkSel,setBulkSel]=useState([]);
  const toggleBulk=id=>setBulkSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const bulkResolve=()=>{setConvs(p=>p.map(c=>bulkSel.includes(c.id)?{...c,status:"resolved"}:c));showT(bulkSel.length+" conversations resolved","success");setBulkSel([]);setBulkMode(false);};
  const bulkAssign=agId=>{setConvs(p=>p.map(c=>bulkSel.includes(c.id)?{...c,agent:agId}:c));showT(bulkSel.length+" conversations assigned","success");setBulkSel([]);setBulkMode(false);};
  const bulkLabel=lbl=>{setConvs(p=>p.map(c=>bulkSel.includes(c.id)?{...c,labels:[...new Set([...c.labels,lbl])]}:c));showT("Label added to "+bulkSel.length+" conversations","success");setBulkSel([]);setBulkMode(false);};
  // ── New message flash tracking ──
  const [flashingConvs,setFlashingConvs]=useState<Set<string>>(new Set());
  const prevUnreadRef=useRef<Record<string,number>>({});
  useEffect(()=>{
    const newFlash=new Set<string>();
    convs.forEach(cv=>{
      const prev=prevUnreadRef.current[cv.id]||0;
      if(cv.unread>prev&&cv.id!==aid)newFlash.add(cv.id);
      prevUnreadRef.current[cv.id]=cv.unread;
    });
    if(newFlash.size>0){
      setFlashingConvs(p=>{const next=new Set([...p,...newFlash]);return next;});
      const ids=[...newFlash];
      setTimeout(()=>setFlashingConvs(p=>{const next=new Set(p);ids.forEach(id=>next.delete(id));return next;}),3000);
    }
  },[convs,aid]);
  // ── Presence ──
  const [viewingAgents]=useState({"cv1":["a2"],"cv3":["a3"]});
  // ── View mode (list/kanban) ──
  const [viewMode,setViewMode]=useState("list");
  // ── SLA timer ──
  const [slaTimers]=useState(()=>{const t={};convs.forEach(cv=>{if(cv.status==="open"){const mins=Math.floor(Math.random()*12)+1;t[cv.id]={firstReply:mins,resolution:Math.floor(Math.random()*180)+30,target:5,resTarget:240};}});return t;});
  const [slaTick,setSlaTick]=useState(0);
  useEffect(()=>{const iv=setInterval(()=>setSlaTick(p=>p+1),60000);return()=>clearInterval(iv);},[]);
  // ── Saved Views (from props) ──
  const [showSaveView,setShowSaveView]=useState(false);const [svName,setSvName]=useState("");const [svIcon,setSvIcon]=useState("📌");
  const applyView=sv=>{setFStatus(sv.filters.status||"open");setFCh(sv.filters.channel||"all");showT("View: "+sv.name,"info");};
  const saveCurrentView=()=>{if(!svName.trim())return showT("Name required","error");if(setSavedViews)setSavedViews(p=>[...p,{id:"sv"+uid(),name:svName,filters:{status:fStatus,channel:fCh},icon:svIcon}]);showT("View saved!","success");setShowSaveView(false);setSvName("");};
  const delView=id=>{if(setSavedViews)setSavedViews(p=>p.filter(v=>v.id!==id));showT("View removed","success");};
  // ── Conversation Merge ──
  const [showMerge,setShowMerge]=useState(false);const [mergeTarget,setMergeTarget]=useState("");
  const mergeConvs=()=>{if(!mergeTarget)return showT("Select target","error");
    const target=convs.find(c=>c.id===mergeTarget);if(!target)return;
    const srcMsgs=msgs[aid]||[];const tgtMsgs=msgs[mergeTarget]||[];
    setMsgs(p=>({...p,[mergeTarget]:[...tgtMsgs,...srcMsgs.map(m=>({...m,text:"[Merged from #"+aid+"] "+m.text}))]}));
    setConvs(p=>p.filter(c=>c.id!==aid));setAid(mergeTarget);setShowMerge(false);
    showT("Conversations merged into #"+mergeTarget,"success");
    if(api.isConnected())api.post(`/conversations/${mergeTarget}/merge`,{source_id:aid}).catch(()=>{});
  };
  const getSlaColor=(mins,target)=>mins<=target*0.5?C.g:mins<=target*0.8?C.y:C.r;
  const getSlaText=(mins,target)=>{const rem=target-mins;return rem>0?rem+"m left":"BREACH";};
  // ── Conversation rating ──
  const [convRatings,setConvRatings]=useState({});
  const rateConv=(cvId,rating)=>{setConvRatings(p=>({...p,[cvId]:rating}));showT("Rated "+rating+"★ — Thank you!","success");};
  // ── Agent collision ──
  const [collisionAgents]=useState({"cv1":{id:"a2",name:"Dev Kumar",typing:false},"cv3":{id:"a3",name:"Meena Rao",typing:true}});
  // ── Email composer ──
  const [emailTo,setEmailTo]=useState("");
  const [emailCc,setEmailCc]=useState("");
  const [emailBcc,setEmailBcc]=useState("");
  const [emailSubject,setEmailSubject]=useState("");
  const [showCcBcc,setShowCcBcc]=useState(false);
  // ── File attachments ──
  const [attachments,setAttachments]=useState<any[]>([]);
  const [dragOver,setDragOver]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const emailLiveSyncRef=useRef(false);

  const uploadFile=async(file:File)=>{
    const tempId=uid();
    setAttachments(p=>[...p,{id:tempId,name:file.name,size:file.size,sizeLabel:formatAttachmentSize(file.size),contentType:file.type||"",status:"uploading",uploading:true}]);
    try{
      const fd=new FormData();fd.append("file",file);
      const res=await api.upload("/upload",fd);
      setAttachments(p=>p.map(a=>a.id===tempId?normalizeAttachmentMeta({...a,url:res.url,name:res.name||file.name,size:res.size??file.size,contentType:file.type||a.contentType||"",status:"ready",uploading:false}):a));
      return true;
    }catch(e:any){
      setAttachments(p=>p.map(a=>a.id===tempId?{...a,status:"error",uploading:false,error:e.message||"Upload failed"}:a));
      showT("Upload failed: "+e.message,"error");
      return false;
    }
  };

  const removeAttach=(id:string)=>setAttachments(p=>p.filter(a=>a.id!==id));

  const uploadFiles=async(files:File[])=>{
    const results=await Promise.all(files.map(f=>uploadFile(f)));
    const successCount=results.filter(Boolean).length;
    if(successCount>0)showT(successCount===1?"File attached":"Files attached","success");
  };

  const handleDrop=(e:any)=>{
    e.preventDefault();setDragOver(false);
    const files=e.dataTransfer?.files;
    if(files?.length)uploadFiles(Array.from(files) as File[]);
  };

  const handleFilePick=()=>fileInputRef.current?.click();
  const msgEnd=useRef(null);
  const replyingRef=useRef(false);
  replyingRef.current=aiReplying;

  // ── Manual inbox refresh ──────────────────────────────────────────────────
  const refreshInbox=async()=>{
    if(refreshing||!api.isConnected())return;
    setRefreshing(true);
    try{
      // 1. Trigger IMAP poll for all email inboxes (fire and forget)
      const emailInboxes=inboxes.filter((ib:any)=>ib.type==="email"&&ib.active!==false&&ib.active!==0);
      emailInboxes.forEach((ib:any)=>api.post("/email/poll-now",{inboxId:ib.id}).catch(()=>{}));
      // 2. Reload conversations + contacts
      const [cvRes,ctRes]=await Promise.allSettled([
        api.get("/conversations?limit=100"),
        api.get("/contacts?limit=200"),
      ]);
      if(cvRes.status==="fulfilled"&&cvRes.value?.conversations){
        const fresh=cvRes.value.conversations.map((c:any)=>{
          const labels=typeof c.labels==="string"?JSON.parse(c.labels||"[]"):c.labels||[];
          return{...c,cid:c.contact_id,iid:c.inbox_id,ch:c.inbox_type||c.channel||c.type||"live",agent:c.assignee_id,team:c.team_id,labels,unread:c.unread_count||0,time:c.updated_at||c.created_at||"",color:c.color||"#4c82fb"};
        });
        setConvs(fresh);
        showT("✓ Inbox synced","success");
      }
      // contacts are managed in App.tsx; skip setContacts here (not a prop)
    }catch(e:any){showT("Refresh failed: "+e.message,"error");}
    finally{setRefreshing(false);}
  };

  const conv=convs.find(c=>c.id===aid);
  const contact=conv?contacts.find(c=>c.id===conv.cid):null;
  const isEmailCh=conv?.ch==="email";
  const isWhatsAppCh=conv?.ch==="whatsapp";
  const isFacebookCh=conv?.ch==="facebook";
  const isInstagramCh=conv?.ch==="instagram";
  const isSmsCh=conv?.ch==="sms";
  const isSocialCh=isFacebookCh||isInstagramCh; // true for any social channel needing real-API send
  const activeInbox=conv?inboxes.find((ib:any)=>ib.id===conv.iid):null;
  const activeInboxCfg=(activeInbox?.cfg||activeInbox?.config||{}) as Record<string,any>;
  // ── WhatsApp config ──
  const whatsappCfg=(activeInboxCfg) as Record<string,any>;
  const whatsappPhoneNumberId=String(whatsappCfg.phoneNumberId||"").trim();
  const whatsappAccessToken=String(whatsappCfg.apiKey||whatsappCfg.accessToken||"").trim();
  const whatsappVerifyToken=String(whatsappCfg.verifyToken||"").trim();
  const whatsappWebhookUrl=String(whatsappCfg.webhookUrl||"").trim();
  const whatsappSendReady=!isWhatsAppCh||(!!whatsappPhoneNumberId&&!!whatsappAccessToken);
  const whatsappInboundReady=!isWhatsAppCh||(!!whatsappVerifyToken&&!!whatsappWebhookUrl);
  const whatsappMissingSendBits=[
    !whatsappPhoneNumberId?"Phone Number ID":"",
    !whatsappAccessToken?"Access Token":"",
  ].filter(Boolean);
  const whatsappMissingInboundBits=[
    !whatsappVerifyToken?"Verify Token":"",
    !whatsappWebhookUrl?"Webhook URL":"",
  ].filter(Boolean);
  // ── Facebook config ──
  const facebookCfg=(activeInboxCfg) as Record<string,any>;
  const facebookPageToken=String(facebookCfg.accessToken||facebookCfg.pageAccessToken||"").trim();
  const facebookPageId=String(facebookCfg.pageId||"").trim();
  const facebookSendReady=!isFacebookCh||(!!facebookPageToken&&!!facebookPageId);
  const facebookMissingSendBits=[
    !facebookPageId?"Page ID":"",
    !facebookPageToken?"Page Access Token":"",
  ].filter(Boolean);
  // ── Instagram config ──
  const instagramCfg=(activeInboxCfg) as Record<string,any>;
  const instagramPageToken=String(instagramCfg.accessToken||instagramCfg.pageAccessToken||"").trim();
  const instagramSendReady=!isInstagramCh||(!!instagramPageToken);
  const instagramMissingSendBits=[
    !instagramPageToken?"Page Access Token":"",
  ].filter(Boolean);
  // ── SMS (Twilio) config ──
  const smsCfg=(activeInboxCfg) as Record<string,any>;
  const smsAccountSid=String(smsCfg.accountSid||smsCfg.apiKey||"").trim();
  const smsAuthToken=String(smsCfg.authToken||smsCfg.accessToken||"").trim();
  const smsFromNumber=String(smsCfg.fromNumber||smsCfg.phoneNumber||"").trim();
  const smsSendReady=!isSmsCh||(!!smsAccountSid&&!!smsAuthToken&&!!smsFromNumber);
  const smsMissingSendBits=[
    !smsAccountSid?"Account SID":"",
    !smsAuthToken?"Auth Token":"",
    !smsFromNumber?"From Number":"",
  ].filter(Boolean);
  const contactEmail=(contact?.email||conv?.contact_email||"").trim();
  const contactPhone=(contact?.phone||conv?.contact_phone||"").trim().replace(/^\+/,"");
  const contactName=contact?.name||conv?.contact_name||"Customer";
  const convMsgs=useMemo(()=>sortConversationMessages(msgs[aid]||[]),[aid,msgs]);
  const assignedAg=conv?agents.find(a=>a.id===conv.agent):null;
  const lc=t=>labels.find(l=>l.title===t)?.color||C.t2;

  const filtered=convs.filter(cv=>{
    const ct=contacts.find(c=>c.id===cv.cid);
    if(fStatus!=="all"&&cv.status!==fStatus)return false;
    if(fCh==="campaign"&&!cv.campaign_id)return false;
    if(fCh!=="all"&&fCh!=="campaign"&&cv.ch!==fCh)return false;
    if(fOwner==="mine"&&cv.agent!=="a1")return false;
    if(fOwner==="unassigned"&&cv.agent)return false;
    if(search&&!ct?.name.toLowerCase().includes(search.toLowerCase())&&!cv.subject.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  }).sort((a,b)=>{
    const ta=a.time==="now"?Date.now():new Date(String(a.updated_at||a.time||"").replace(" ","T")).getTime()||0;
    const tb=b.time==="now"?Date.now():new Date(String(b.updated_at||b.time||"").replace(" ","T")).getTime()||0;
    return tb-ta;
  });
  const ownerCounts={
    all:convs.filter(cv=>fStatus==="all"||cv.status===fStatus).length,
    mine:convs.filter(cv=>(fStatus==="all"||cv.status===fStatus)&&cv.agent==="a1").length,
    unassigned:convs.filter(cv=>(fStatus==="all"||cv.status===fStatus)&&!cv.agent).length,
  };

  useEffect(()=>{
    setEmailTo(contactEmail||"");
    setEmailCc("");
    setEmailBcc("");
    setEmailSubject("");
    setShowCcBcc(false);
    setAttachments([]);
  },[aid]);

  useEffect(()=>{
    if(isEmailCh&&contactEmail&&!emailTo){
      setEmailTo(contactEmail);
    }
  },[contactEmail,emailTo,isEmailCh]);

  useEffect(()=>{msgEnd.current?.scrollIntoView({behavior:"smooth"});},[convMsgs.length,aid]);

  // ── Fetch messages from API when switching conversations ──
  const [msgsLoading,setMsgsLoading]=useState(false);
  useEffect(()=>{
    if(!api.isConnected()||!aid)return;
    const ch=conv?.ch||"";
    const isRealTimeCh=ch==="email"||ch==="whatsapp"||ch==="facebook"||ch==="instagram";
    const shouldRefresh=!msgs[aid]?.length||isRealTimeCh||(conv?.unread||0)>0;
    if(!shouldRefresh)return;
    let cancelled=false;
    setMsgsLoading(true);
    // Fire-and-forget IMAP poll for email — don't block message loading
    if(ch==="email"&&conv?.iid){
      api.post("/email/poll-now",{ inboxId: conv.iid }).catch(()=>{});
    }
    (async()=>{
      try{
        const res=await api.get(`/conversations/${aid}/messages`);
        if(cancelled)return;
        if(res?.messages?.length){
          setMsgs(p=>({...p,[aid]:hydrateConversationMessages(res.messages)}));
        }else{
          setMsgs(p=>({...p,[aid]:[]}));
        }
        // Mark as read
        setConvs(p=>p.map((c:any)=>c.id===aid?{...c,unread:0}:c));
      }catch{}
      if(!cancelled)setMsgsLoading(false);
    })();
    return()=>{cancelled=true;};
  },[aid,conv?.ch,conv?.iid,conv?.unread]);

  useEffect(()=>{
    if(!isActive||!api.isConnected()||!aid||conv?.ch!=="email"||!conv?.iid)return;

    let cancelled=false;
    const syncActiveEmailConversation=async()=>{
      if(cancelled||emailLiveSyncRef.current)return;
      if(typeof document!=="undefined"&&document.visibilityState==="hidden")return;

      emailLiveSyncRef.current=true;
      try{
        await api.post("/email/poll-now",{ inboxId: conv.iid }).catch(()=>null);
        if(cancelled)return;

        const res=await api.get(`/conversations/${aid}/messages`);
        if(cancelled)return;

        if(Array.isArray(res?.messages)){
          setMsgs(p=>({...p,[aid]:hydrateConversationMessages(res.messages)}));
          setConvs(p=>p.map((c:any)=>c.id===aid?{...c,unread:0}:c));
        }
      }catch{}
      finally{
        emailLiveSyncRef.current=false;
      }
    };

    const onVisibilityChange=()=>{
      if(typeof document==="undefined"||document.visibilityState==="visible"){
        syncActiveEmailConversation();
      }
    };

    const intervalId=window.setInterval(syncActiveEmailConversation,5000);
    syncActiveEmailConversation();
    if(typeof document!=="undefined"){
      document.addEventListener("visibilitychange",onVisibilityChange);
    }

    return()=>{
      cancelled=true;
      window.clearInterval(intervalId);
      if(typeof document!=="undefined"){
        document.removeEventListener("visibilitychange",onVisibilityChange);
      }
    };
  },[aid,conv?.ch,conv?.iid,isActive,setConvs,setMsgs]);

  // ── Real-time sync for WhatsApp / Facebook / Instagram ─────────────────────
  // WebSocket already delivers new messages instantly.  This periodic sync is a
  // safety-net that catches any missed events (tab in background, WS reconnect).
  const socialSyncRef=useRef(false);
  useEffect(()=>{
    const ch=conv?.ch||"";
    const isSocial=ch==="whatsapp"||ch==="facebook"||ch==="instagram";
    if(!isActive||!api.isConnected()||!aid||!isSocial)return;

    let cancelled=false;
    const syncSocialConversation=async()=>{
      if(cancelled||socialSyncRef.current)return;
      if(typeof document!=="undefined"&&document.visibilityState==="hidden")return;
      socialSyncRef.current=true;
      try{
        const res=await api.get(`/conversations/${aid}/messages`);
        if(cancelled)return;
        if(Array.isArray(res?.messages)&&res.messages.length){
          setMsgs(p=>{
            const incoming=hydrateConversationMessages(res.messages);
            const existing=p[aid]||[];
            // Only update if server has more messages (avoids overwriting optimistic inserts)
            if(incoming.length>=existing.length)return {...p,[aid]:incoming};
            return p;
          });
          setConvs(p=>p.map((c:any)=>c.id===aid?{...c,unread:0}:c));
        }
      }catch{}
      finally{socialSyncRef.current=false;}
    };

    const onVisibilityChange=()=>{
      if(typeof document==="undefined"||document.visibilityState==="visible"){
        syncSocialConversation();
      }
    };

    // Poll every 8 seconds for social channels (WebSocket is primary, this is backup)
    const intervalId=window.setInterval(syncSocialConversation,8000);
    syncSocialConversation();
    if(typeof document!=="undefined"){
      document.addEventListener("visibilitychange",onVisibilityChange);
    }
    return()=>{
      cancelled=true;
      window.clearInterval(intervalId);
      if(typeof document!=="undefined"){
        document.removeEventListener("visibilitychange",onVisibilityChange);
      }
    };
  },[aid,conv?.ch,isActive,setConvs,setMsgs]);

  const prevCounts=useRef({});

  const doAiAutoReply=async(allMsgs,convId)=>{
    const cv=convs.find(c=>c.id===convId);
    const ct=contacts.find(c=>c.id===cv?.cid);
    setAiReplying(true);
    try{
      const history=allMsgs.filter(m=>m.role!=="sys").slice(-14);
      const raw=history.map(m=>({role:m.role==="agent"?"assistant":"user",content:m.text||""}));
      const merged=[];
      for(const m of raw){
        if(merged.length&&merged[merged.length-1].role===m.role){
          merged[merged.length-1].content+="\n"+m.content;
        } else merged.push({...m});
      }
      if(!merged.length||merged[0].role!=="user") merged.unshift({role:"user",content:"Hello"});
      if(merged[merged.length-1].role==="assistant") merged.pop();
      const data=await api.post('/ai/chat',{
          max_tokens:350,
          system:`You are a professional, empathetic customer support agent at SupportDesk. Customer: ${ct?.name||"Customer"} (${ct?.company||""}, ${ct?.plan||""} plan). Subject: ${cv?.subject||"Support request"}. Channel: ${cv?.ch||"live chat"}. Reply directly and helpfully. Be concise (2-4 sentences), warm, solution-focused. Do not use markdown. Do not mention being an AI.`,
          messages:merged
        });
      const reply=data.content?.[0]?.text||"Thank you for your message. I am looking into this right away.";
      setMsgs(p=>({...p,[convId]:[...(p[convId]||[]),{id:uid(),role:"agent",aid:"a1",text:reply,t:now(),auto:true}]}));
      setConvs(p=>p.map(c=>c.id===convId?{...c,unread:0,time:"now"}:c));
    }catch(e){
      setMsgs(p=>({...p,[convId]:[...(p[convId]||[]),{id:uid(),role:"agent",aid:"a1",text:"Thank you for reaching out. I am on this and will get back to you with a resolution shortly.",t:now(),auto:true}]}));
    }
    setAiReplying(false);
  };

  // ── AI Auto-Reply trigger: fires on new customer messages when bot is enabled ──
  useEffect(()=>{
    if(!aiAutoReply||replyingRef.current)return;
    for(const[convId,convMsgsArr]of Object.entries(msgs)){
      const allMsgs=convMsgsArr as any[];
      const prev=(prevCounts.current as any)[convId];
      const curr=allMsgs.length;
      (prevCounts.current as any)[convId]=curr;
      if(prev!==undefined&&curr>prev){
        const last=allMsgs[allMsgs.length-1];
        if(last&&(last.role==="customer"||last.role==="contact")){
          const cv=convs.find((c:any)=>c.id===convId);
          const ch=cv?.ch||"live";
          if(aiChannels[ch]!==false&&!convBotOff.has(convId)){doAiAutoReply(allMsgs,convId);break;}
        }
      }
    }
  },[msgs]);

  useEffect(()=>{
    if(aid==="cv1"&&(msgs.cv1||[]).length<6){
      const t=setTimeout(()=>{
        setTyping(true);
        setTimeout(()=>{
          setTyping(false);
          setMsgs(p=>({...p,cv1:[...(p.cv1||[]),{id:uid(),role:"contact",text:"Is anyone there? This is really urgent!",t:now()}]}));
          setConvs(p=>p.map(c=>c.id==="cv1"?{...c,unread:(c.unread||0)+1,time:"now"}:c));
        },2500);
      },5000);
      return()=>clearTimeout(t);
    }
  },[aid]);

  const sendMsg=async()=>{
    const readyAttachments=normalizeAttachmentList(attachments.filter((a:any)=>a?.url&&a?.status!=="error"));
    if(!inp.trim()&&readyAttachments.length===0&&!editMsgId)return;
    if(!aid)return;
    const txt=inp.trim();setInp("");setShowCanned(false);setShowEmoji(false);
    const recipientEmail=(emailTo||contactEmail).trim();
    // Edit existing message
    if(editMsgId){
      setMsgs(p=>({...p,[aid]:(p[aid]||[]).map(m=>m.id===editMsgId?{...m,text:txt,edited:true}:m)}));
      setEditMsgId(null);setEditMsgText("");showT("Message edited","success");return;
    }
    if(isEmailCh&&!isNote&&!recipientEmail){
      setInp(txt);
      showT("Customer email missing for this conversation","error");
      return;
    }
    if(isWhatsAppCh&&!isNote&&!contactPhone){
      setInp(txt);
      showT("Customer phone number missing for this WhatsApp conversation","error");
      return;
    }
    if(isWhatsAppCh&&!isNote&&!whatsappSendReady){
      setInp(txt);
      showT(`WhatsApp inbox setup incomplete: ${whatsappMissingSendBits.join(", ")}`,"error");
      return;
    }
    if(isFacebookCh&&!isNote&&!facebookSendReady){
      setInp(txt);
      showT(`Facebook inbox setup incomplete: ${facebookMissingSendBits.join(", ")}`,"error");
      return;
    }
    if(isInstagramCh&&!isNote&&!instagramSendReady){
      setInp(txt);
      showT(`Instagram inbox setup incomplete: ${instagramMissingSendBits.join(", ")}`,"error");
      return;
    }
    if(isSmsCh&&!isNote&&!contactPhone){
      setInp(txt);
      showT("Customer phone number missing for this SMS conversation","error");
      return;
    }
    if(isSmsCh&&!isNote&&!smsSendReady){
      setInp(txt);
      showT(`SMS inbox setup incomplete: ${smsMissingSendBits.join(", ")}`,"error");
      return;
    }
    if((isEmailCh||isWhatsAppCh||isFacebookCh||isInstagramCh||isSmsCh)&&!isNote&&!api.isConnected()){
      setInp(txt);
      showT("API disconnected — message not sent","error");
      return;
    }
    // Block send while any file is still uploading
    const pendingUploads=attachments.filter((a:any)=>a.uploading);
    if(pendingUploads.length>0){showT("Please wait for uploads to finish","info");setInp(txt);return;}
    const failedUploads=attachments.filter((a:any)=>a.status==="error");
    if(failedUploads.length>0){showT("Remove failed attachments before sending","error");setInp(txt);return;}
    const newMsg={id:uid(),role:isNote?"note":"agent",aid:"a1",text:txt,t:now(),isNote:isNote,replyTo:replyTo?.id||null,replyText:replyTo?.text?.slice(0,60)||null,read:true,attachments:readyAttachments};
    const prevReplyTo=replyTo;
    const prevAttachments=attachments;
    setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),newMsg]}));
    setConvs(p=>p.map(c=>c.id===aid?{...c,unread:0,time:"now"}:c));
    setReplyTo(null);
    setAttachments([]);
    // ── Sync to API (background, non-blocking) ──
    if(api.isConnected()){
      const payload:Record<string,unknown>={role:isNote?"note":"agent",text:txt,attachments:readyAttachments};
      if(isEmailCh&&!isNote){
        payload.toEmail=recipientEmail;
        payload.contactId=conv?.cid||null;
        payload.contactName=contactName;
        if(emailCc.trim()) payload.cc=emailCc.trim();
        if(emailBcc.trim()) payload.bcc=emailBcc.trim();
        payload.emailSubject=(emailSubject.trim()||conv?.subject||"").trim();
      }
      if(isWhatsAppCh&&!isNote){
        payload.toPhone=contactPhone;
      }
      if(isFacebookCh&&!isNote){
        // contact.phone is stored as 'fb:<psid>' — backend normalizes it
        payload.toFacebookId=String(contact?.phone||conv?.contact_phone||"").replace(/^fb:/i,"");
      }
      if(isInstagramCh&&!isNote){
        // contact.phone is stored as 'ig:<ig_user_id>' — backend normalizes it
        payload.toInstagramId=String(contact?.phone||conv?.contact_phone||"").replace(/^ig:/i,"");
      }
      if(isSmsCh&&!isNote){
        payload.toPhone=contactPhone;
      }
      try{
        const res=await api.post(`/conversations/${aid}/messages`,payload);
        const savedMsg=res?.message;
        if(savedMsg){
          setMsgs(p=>{
            const list=p[aid]||[];
            if(list.some(m=>m.id===savedMsg.id)){
              return {...p,[aid]:list.filter(m=>m.id!==newMsg.id)};
            }
            return {...p,[aid]:list.map(m=>m.id===newMsg.id?{...m,...savedMsg,attachments:normalizeAttachmentList(savedMsg.attachments||m.attachments||[]),aid:savedMsg.agent_id,t:savedMsg.created_at?.split?.("T")?.[1]?.slice(0,5)||m.t}:m)};
          });
        }
      }catch(e){
        setMsgs(p=>({...p,[aid]:(p[aid]||[]).filter(m=>m.id!==newMsg.id)}));
        setInp(txt);
        setReplyTo(prevReplyTo);
        setAttachments(prevAttachments);
        const chLabel=isEmailCh&&!isNote?"Email":isWhatsAppCh&&!isNote?"WhatsApp":isFacebookCh&&!isNote?"Facebook":isInstagramCh&&!isNote?"Instagram":isSmsCh&&!isNote?"SMS":"Message";
        showT(`${chLabel} not sent: ${(e as any)?.message||"Delivery failed"}`,"error");
        return;
      }
    }
    if(isNote)return; // Notes don't trigger replies
    if(isEmailCh||isWhatsAppCh||isFacebookCh||isInstagramCh||isSmsCh){
      // For email: trigger IMAP poll shortly after to pick up sent copy & fast auto-replies
      if(isEmailCh&&conv?.iid){
        setTimeout(()=>api.post("/email/poll-now",{inboxId:conv.iid}).catch(()=>{}),2000);
        setTimeout(()=>api.post("/email/poll-now",{inboxId:conv.iid}).catch(()=>{}),6000);
      }
      return; // Real channels — wait for actual customer reply via WebSocket, no fake demo
    }
    const pool=REPLY_POOL[aid]||["Thanks for the reply!"];
    setTimeout(()=>{
      setTyping(true);
      setTimeout(()=>{
        setTyping(false);
        setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),{id:uid(),role:"contact",text:pool[Math.floor(Math.random()*pool.length)],t:now(),read:false}]}));
        setConvs(p=>p.map(c=>c.id===aid?{...c,unread:1,time:"now"}:c));
        if(soundOn)playNotifSound();
      },2000);
    },800);
  };
  const deleteMsg=mid=>{
    setMsgs(p=>({...p,[aid]:(p[aid]||[]).filter(m=>m.id!==mid)}));showT("Message deleted","success");
  };
  const copyMsg=text=>{navigator.clipboard?.writeText(text);showT("Copied to clipboard","success");};
  const fwdMsg=text=>{setInp("FWD: "+text);showT("Message forwarded to compose","info");};
  const startEditMsg=(mid,text)=>{setEditMsgId(mid);setEditMsgText(text);setInp(text);};
  const markSpam=()=>{setConvs(p=>p.map(c=>c.id===aid?{...c,status:"resolved",labels:[...c.labels.filter(l=>l!=="spam"),"spam"]}:c));showT("Marked as spam","warn");};
  const mergeConv=()=>showT("Merge — select target conversation","info");
  const exportChat=async()=>{
    if(!convMsgs.length){
      showT("No messages to export","info");
      return;
    }
    const lines=[
      `Conversation: ${conv?.subject||aid||"Conversation"}`,
      `Customer: ${contactName}`,
      `Channel: ${conv?.ch||"chat"}`,
      `Exported: ${new Date().toLocaleString()}`,
      "",
      ...convMsgs.map((m:any)=>{
        const stamp=m.created_at?new Date(m.created_at).toLocaleString():m.t||"";
        if(m.role==="sys")return `${stamp?`[${stamp}] `:""}[System] ${m.text||""}`.trim();
        return `${stamp?`[${stamp}] `:""}[${m.role==="agent"?"Agent":"Customer"}] ${m.text||""}`.trim();
      }),
    ];
    const txt=lines.join("\n");
    const fileName=`${sanitizeDownloadName(conv?.subject||contactName||aid||"conversation")}.txt`;
    downloadTextFile(txt,fileName);
    try{
      await navigator.clipboard.writeText(txt);
      showT("Chat exported and copied","success");
    }catch{
      showT("Chat exported as text file","success");
    }
  };
  const blockContact=()=>showT("Contact blocked","warn");
  const deleteConv=async()=>{
    if(!aid)return;
    const nextConvs=convs.filter(c=>c.id!==aid);
    setConvs(nextConvs);
    setMsgs(p=>{const n={...p};delete n[aid];return n;});
    if(api.isConnected())api.del(`/conversations/${aid}`).catch(()=>{});
    const next=nextConvs.find(c=>c.status==="open")||nextConvs[0];
    setAid(next?.id||"");
    showT("Conversation deleted","success");
  };

  const [hovConv,setHovConv]=useState(null);
  const [showConfetti,setShowConfetti]=useState(false);
  const resolve=()=>{
    const resolvedCount=convs.filter(c=>c.status==="resolved").length+1;
    setConvs(p=>p.map(c=>c.id===aid?{...c,status:"resolved"}:c));
    setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),{id:uid(),role:"sys",text:"Conversation resolved by Priya Sharma"}]}));
    if(api.isConnected())api.patch(`/conversations/${aid}`,{status:"resolved"}).catch(()=>{});
    if(resolvedCount%10===0){setShowConfetti(true);setTimeout(()=>setShowConfetti(false),2500);showT(`🎉 Milestone! ${resolvedCount} conversations resolved!`,"success");}
    else showT("Conversation resolved!","success");
    // Trigger CSAT survey (#3)
    if(setCsatPending)setTimeout(()=>setCsatPending(aid),500);
  };
  const reopen=()=>{setConvs(p=>p.map(c=>c.id===aid?{...c,status:"open"}:c));if(api.isConnected())api.patch(`/conversations/${aid}`,{status:"open"}).catch(()=>{});showT("Conversation reopened","info");};
  const setPrio=p2=>{setConvs(p=>p.map(c=>c.id===aid?{...c,priority:p2}:c));if(api.isConnected())api.patch(`/conversations/${aid}`,{priority:p2}).catch(()=>{});};
  const toggleLbl=t=>{
    setConvs(p=>p.map(c=>{
      if(c.id!==aid)return c;
      const has=c.labels.includes(t);
      const newLabels=has?c.labels.filter(x=>x!==t):[...c.labels,t];
      if(api.isConnected())api.patch(`/conversations/${aid}`,{labels:newLabels}).catch(()=>{});
      return {...c,labels:newLabels};
    }));
  };
  const assignTo=(agId,teamId)=>{
    const updates:any={};const sysTexts:string[]=[];
    if(agId!==undefined){updates.assignee_id=agId||null;sysTexts.push(agId?`Assigned to ${agents.find(a=>a.id===agId)?.name}`:"Unassigned");}
    if(teamId!==undefined){updates.team_id=teamId||null;sysTexts.push(teamId?`Transferred to team ${teams.find(t=>t.id===teamId)?.name}`:"Removed from team");}
    setConvs(p=>p.map(c=>c.id===aid?{...c,...(agId!==undefined?{agent:agId||null}:{}),...(teamId!==undefined?{team:teamId||null}:{})}:c));
    if(sysTexts.length)setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),...sysTexts.map(t=>({id:uid(),role:"sys",text:t}))]}));
    if(api.isConnected())api.patch(`/conversations/${aid}`,updates).catch(()=>{});
    setShowAssign(false);setShowTransfer(false);setAssignSearch("");showT(sysTexts.join(", ")||"Updated","success");
  };
  const doTransfer=tid=>{assignTo(undefined,tid);};
  const doSnooze=h=>{
    setConvs(p=>p.map(c=>c.id===aid?{...c,status:"snoozed"}:c));
    setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),{id:uid(),role:"sys",text:`Snoozed for ${h} hour${h>1?"s":""}`}]}));
    setShowSnooze(false);showT(`Snoozed ${h}h`,"warn");
  };
  const callClaude=async(sysprompt,userprompt)=>{
    const data=await api.post('/ai/chat',{max_tokens:1000,
        system:sysprompt,messages:[{role:"user",content:userprompt}]});
    return data.content?.[0]?.text||"";
  };

  const buildConvContext=()=>{
    const ct=contacts.find(c=>c.id===conv?.cid);
    const msgs2=convMsgs.filter(m=>m.role!=="sys").slice(-8);
    return `Customer: ${ct?.name} (${ct?.company}, ${ct?.plan} plan)\nChannel: ${conv?.ch}\nSubject: ${conv?.subject}\nPriority: ${conv?.priority}\nLabels: ${conv?.labels.join(", ")||"none"}\n\nConversation:\n${msgs2.map(m=>`[${m.role==="agent"?"Support Agent":"Customer"}]: ${m.text}`).join("\n")}`;
  };

  const genAI=async()=>{
    setShowAI(true);setAiLoad(true);setAiSugs([]);
    try{
      const ctx=buildConvContext();
      const txt=await callClaude(
        "You are an expert customer support AI copilot. Generate exactly 3 distinct reply suggestions for the support agent. Format your response as a JSON array of 3 strings: [\"reply1\",\"reply2\",\"reply3\"]. Each reply should be professional, empathetic, and directly address the customer's issue. Vary the tone and approach. Do not include any other text, just the JSON array.",
        `Here is the conversation context:\n\n${ctx}\n\nGenerate 3 reply suggestions for the support agent.`
      );
      const clean=txt.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setAiSugs(Array.isArray(parsed)?parsed:[txt]);
    }catch(e){
      setAiSugs(["I apologize for the inconvenience. Let me look into this right away and get back to you with a solution.",
        "Thank you for reaching out. I understand your frustration and I'm here to help resolve this as quickly as possible.",
        "I've reviewed your case and I'm escalating this to our specialist team who will contact you within 2 hours."]);
    }
    setAiLoad(false);
  };

  const genSum=async()=>{
    setSumLoad(true);setSumData(null);
    try{
      const ctx=buildConvContext();
      const txt=await callClaude(
        "You are a customer support AI. Analyze the conversation and return a JSON object with: {\"summary\": \"2-3 sentence summary\", \"sentiment\": \"positive|neutral|negative\", \"topics\": [\"topic1\",\"topic2\"]}. Return only valid JSON, no other text.",
        `Analyze this support conversation:\n\n${ctx}`
      );
      const clean=txt.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setSumData({text:parsed.summary,sentiment:parsed.sentiment,topics:parsed.topics||conv?.labels||["general"]});
    }catch(e){
      const msgs2=convMsgs.filter(m=>m.role!=="sys").slice(0,3);
      setSumData({text:msgs2.map(m=>`${m.role==="agent"?"Agent":"Customer"}: "${(m.text||"").slice(0,60)}..."`).join(" → "),
        sentiment:conv?.priority==="urgent"?"negative":conv?.priority==="high"?"neutral":"positive",
        topics:conv?.labels.length?conv.labels:["general"]});
    }
    setSumLoad(false);
  };

  const classifyAI=async()=>{
    showT("AI analyzing conversation…","info");
    try{
      const ctx=buildConvContext();
      const availableLabels=labels.map(l=>l.title).join(", ");
      const txt=await callClaude(
        `You are a customer support AI classifier. Analyze the conversation and return a JSON object: {"label": "one of the available labels", "priority": "urgent|high|normal", "reason": "brief explanation"}. Available labels: ${availableLabels}. Return only valid JSON.`,
        `Classify this support conversation:\n\n${ctx}`
      );
      const clean=txt.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      const lbl=parsed.label;
      if(lbl&&labels.find(l=>l.title===lbl)&&!conv?.labels.includes(lbl))toggleLbl(lbl);
      if(parsed.priority&&parsed.priority!==conv?.priority)setPrio(parsed.priority);
      showT(`AI: +${lbl||"labeled"}, priority → ${parsed.priority}. ${parsed.reason||""}`.slice(0,80),"success");
    }catch(e){
      const lbl=conv?.ch==="whatsapp"?"billing":conv?.ch==="email"?"api":"bug";
      if(!conv?.labels.includes(lbl))toggleLbl(lbl);
      if(conv?.priority==="normal")setPrio("high");
      showT(`AI classified: +${lbl} label, priority updated`,"success");
    }
  };

  return <div style={{display:"flex",flex:1,minWidth:0}}>
    {showConfetti&&<Confetti/>}

    {/* ══════════════ LEFT SIDEBAR ══════════════ */}
    <aside style={{width:272,background:C.s1,borderRight:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>

      {/* Header */}
      <div style={{padding:"11px 12px 10px",borderBottom:`1px solid ${C.b1}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <span style={{fontSize:15,fontWeight:800,fontFamily:FD,letterSpacing:"-.3px",color:C.t1}}>Inbox</span>
          <div style={{display:"flex",gap:5}}>
            <button onClick={refreshInbox} disabled={refreshing} title="Sync email" style={{height:27,padding:"0 9px",borderRadius:7,fontSize:11,fontWeight:600,fontFamily:FM,cursor:refreshing?"not-allowed":"pointer",background:refreshing?C.s2:C.gd,color:refreshing?C.t3:C.g,border:`1px solid ${C.g}44`,display:"flex",alignItems:"center",gap:3}}>
              <span style={{display:"inline-block",animation:refreshing?"spin 1s linear infinite":"none",fontSize:12}}>↻</span>{refreshing?"Syncing":"Sync"}
            </button>
            <button onClick={()=>setShowNewConv(true)} style={{height:27,padding:"0 10px",borderRadius:7,fontSize:11,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.a,color:"#fff",border:"none"}}>+ New</button>
          </div>
        </div>
        {/* AI Bot indicator */}
        {aiAutoReply&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 9px",background:`${C.p}18`,border:`1px solid ${C.p}44`,borderRadius:7,marginBottom:8,animation:"fadeUp .2s ease"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:C.p,animation:"pulse 1.5s infinite",flexShrink:0}}/>
          <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.p,letterSpacing:"0.3px",flex:1}}>✦ AI Bot Active</span>
          <Toggle val={aiAutoReply} set={v=>{setAiAutoReply(v);api.patch("/aibot/config",{ai_auto_reply:v?1:0}).catch(()=>{});showT(v?"✦ AI Bot ON":"AI Bot OFF",v?"success":"info");}}/>
        </div>}
        {/* Search */}
        <div style={{display:"flex",alignItems:"center",gap:7,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"7px 10px"}}>
          <span style={{color:C.t3,fontSize:13}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations…" style={{background:"none",border:"none",fontSize:12,color:C.t1,flex:1,outline:"none",fontFamily:FB}}/>
          {search&&<span onClick={()=>setSearch("")} style={{color:C.t3,cursor:"pointer",fontSize:14,lineHeight:1}}>×</span>}
        </div>
      </div>

      {/* Status tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`}}>
        {([["open","Open",C.a],["snoozed","Snoozed",C.y],["resolved","Done",C.g],["all","All",C.t2]] as [string,string,string][]).map(([s,lbl,col])=>{
          const cnt=convs.filter(cv=>s==="all"||cv.status===s).length;
          const active=fStatus===s;
          return <button key={s} onClick={()=>setFStatus(s)} style={{flex:1,padding:"8px 4px 6px",border:"none",borderBottom:`2.5px solid ${active?col:"transparent"}`,background:"transparent",cursor:"pointer",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:active?col:C.t3,textTransform:"uppercase",letterSpacing:"0.3px"}}>{lbl}</span>
            <span style={{fontSize:11,fontWeight:800,fontFamily:FM,color:active?col:C.t3}}>{cnt}</span>
          </button>;
        })}
      </div>

      {/* Owner + view controls */}
      <div style={{display:"flex",gap:5,padding:"7px 10px",borderBottom:`1px solid ${C.b1}`,alignItems:"center"}}>
        <div style={{display:"flex",flex:1,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,overflow:"hidden"}}>
          {([["all","All"],["mine","Mine"],["unassigned","Unassign"]] as [string,string][]).map(([id,lbl])=>(
            <button key={id} onClick={()=>setFOwner(id)} style={{flex:1,padding:"5px 2px",fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:fOwner===id?C.ad:"transparent",color:fOwner===id?C.a:C.t3,border:"none",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
              {lbl}
              <span style={{fontSize:9,fontWeight:800,background:fOwner===id?C.a+"22":C.b1+"88",color:fOwner===id?C.a:C.t3,borderRadius:8,padding:"0 4px",fontFamily:FM}}>{ownerCounts[id]}</span>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:1,background:C.s2,borderRadius:6,padding:"2px",border:`1px solid ${C.b1}`,flexShrink:0}}>
          <button onClick={()=>setViewMode("list")} title="List" style={{width:23,height:21,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:viewMode==="list"?C.ad:"transparent",color:viewMode==="list"?C.a:C.t3,border:"none",cursor:"pointer"}}>☰</button>
          <button onClick={()=>setViewMode("kanban")} title="Kanban" style={{width:23,height:21,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:viewMode==="kanban"?C.ad:"transparent",color:viewMode==="kanban"?C.a:C.t3,border:"none",cursor:"pointer"}}>▥</button>
          <button onClick={()=>setBulkMode(p=>!p)} title="Bulk select" style={{width:23,height:21,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:bulkMode?C.yd:"transparent",color:bulkMode?C.y:C.t3,border:"none",cursor:"pointer"}}>☐</button>
        </div>
      </div>

      {/* Channel filter */}
      <div style={{display:"flex",gap:4,padding:"6px 10px",borderBottom:`1px solid ${C.b1}`,overflowX:"auto"}}>
        {([["all","All",null],["live","Live","#1fd07a"],["email","Email",C.a],["whatsapp","WA","#25d366"],["facebook","FB","#1877f2"],["instagram","IG","#e1306c"],["sms","SMS",C.y],["campaign","📣 Campaign","#8b5cf6"]] as [string,string,string|null][]).map(([ch,lbl,col])=>{
          const active=fCh===ch;
          const c2=col||C.a;
          const botOn=aiAutoReply&&ch!=="all"&&aiChannels[ch];
          return <button key={ch} onClick={()=>setFCh(ch)} style={{padding:"3px 8px",borderRadius:14,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:active?c2+"22":"transparent",color:active?c2:C.t3,border:`1px solid ${active?c2+"55":botOn?"${C.p}44":"transparent"}`,flexShrink:0,whiteSpace:"nowrap",transition:"all .15s",display:"flex",alignItems:"center",gap:3}}>
            {ch!=="all"&&<span style={{fontSize:11}}>{chI(ch)}</span>}
            {lbl}
            {botOn&&<span style={{fontSize:7,color:C.p,fontWeight:900,lineHeight:1}}>✦</span>}
          </button>;
        })}
      </div>

      {/* Saved views */}
      {savedViews.length>0&&<div style={{display:"flex",padding:"3px 10px",gap:3,borderBottom:`1px solid ${C.b1}`,overflowX:"auto",alignItems:"center",whiteSpace:"nowrap"}}>
        {savedViews.map(sv=><button key={sv.id} onClick={()=>applyView(sv)} onContextMenu={e=>{e.preventDefault();delView(sv.id);}} title="Right-click to remove" style={{padding:"1px 6px",borderRadius:10,fontSize:8,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.pd,color:C.p,border:`1px solid ${C.p}33`,flexShrink:0}}>{sv.icon} {sv.name}</button>)}
        <button onClick={()=>setShowSaveView(true)} style={{padding:"1px 5px",borderRadius:10,fontSize:8,color:C.t3,background:"transparent",border:`1px dashed ${C.b2}`,cursor:"pointer",flexShrink:0}}>+</button>
      </div>}

      {/* Bulk bar */}
      {bulkMode&&bulkSel.length>0&&<div style={{padding:"6px 10px",background:C.ad,borderBottom:`1px solid ${C.a}44`,display:"flex",gap:4,alignItems:"center",animation:"fadeUp .15s ease"}}>
        <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.a}}>{bulkSel.length} selected</span>
        <button onClick={bulkResolve} style={{padding:"2px 7px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.gd,color:C.g,border:`1px solid ${C.g}44`}}>✓ Resolve</button>
        <button onClick={()=>bulkAssign("a1")} style={{padding:"2px 7px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.s3,color:C.t2,border:`1px solid ${C.b1}`}}>Assign me</button>
        <button onClick={()=>setBulkSel([])} style={{marginLeft:"auto",padding:"2px 5px",borderRadius:5,fontSize:10,cursor:"pointer",background:"none",color:C.t3,border:"none"}}>✕</button>
      </div>}

      {/* Conversation list */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.length===0&&<EmptyState icon="💬" title="No conversations" desc="No conversations match your filters." action="+ New Conversation" onAction={()=>setShowNewConv(true)}/>}
        {filtered.map(cv=>{
          const ct=contacts.find(c=>c.id===cv.cid);
          const agAv=cv.agent?agents.find(a=>a.id===cv.agent):null;
          const lastMsg=(msgs[cv.id]||[]).filter(m=>m.role!=="sys").slice(-1)[0];
          const sla=slaTimers[cv.id];
          const isAct=aid===cv.id;
          const priColor=cv.priority==="urgent"?C.r:cv.priority==="high"?C.y:"transparent";
          const isFlashing=flashingConvs.has(cv.id);
          return <div key={cv.id} className="hov" onClick={()=>{if(bulkMode){toggleBulk(cv.id);return;}setAid(cv.id);setConvs(p=>p.map(c=>c.id===cv.id?{...c,unread:0}:c));setSumData(null);setAiSugs([]);setFlashingConvs(p=>{const n=new Set(p);n.delete(cv.id);return n;});}}
            style={{padding:"10px 11px",borderBottom:`1px solid ${C.b1}22`,cursor:"pointer",transition:isFlashing?"none":"background .1s",background:bulkSel.includes(cv.id)?C.yd:isAct?C.ad:"transparent",borderLeft:`3px solid ${isAct?C.a:cv.unread>0?C.a+"aa":priColor}`,animation:isFlashing?"newMsgFlash 1s ease 3":"none"}}>
            <div style={{display:"flex",gap:8}}>
              {bulkMode&&<input type="checkbox" checked={bulkSel.includes(cv.id)} onChange={()=>toggleBulk(cv.id)} style={{accentColor:C.a,marginTop:5,flexShrink:0}} onClick={e=>e.stopPropagation()}/>}
              {/* Avatar with channel badge */}
              <div style={{position:"relative",flexShrink:0,alignSelf:"flex-start",marginTop:1}}>
                <Av i={ct?.av||"?"} c={cv.color} s={32}/>
                <span style={{position:"absolute",bottom:-2,right:-3,fontSize:9,lineHeight:"12px",background:C.s1,borderRadius:"50%",width:14,height:14,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.b1}`}}>{chI(cv.ch)}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                {/* Row 1: name + time + unread */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:1}}>
                  <span style={{fontSize:12,fontWeight:cv.unread>0?700:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"68%"}}>{ct?.name||"Unknown"}</span>
                  <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                    {cv.unread>0&&<span style={{background:C.a,color:"#fff",fontSize:9,fontWeight:700,padding:"0 5px",lineHeight:"15px",borderRadius:8,fontFamily:FM}}>{cv.unread}</span>}
                    <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{formatConvTime(cv.updated_at||cv.time)}</span>
                  </div>
                </div>
                {/* Row 2: subject */}
                <div style={{fontSize:11,fontWeight:500,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{cv.subject}</div>
                {/* Row 3: last message preview */}
                {lastMsg&&<div style={{fontSize:10,color:cv.unread>0?C.t2:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3,fontStyle:"italic",fontWeight:cv.unread>0?600:400}}>
                  {lastMsg.role==="agent"?"You: ":""}
                  {lastMsg.text?.slice(0,52)||(Array.isArray(lastMsg.attachments)&&lastMsg.attachments.length>0?(lastMsg.attachments.some((a:any)=>String(a?.contentType||a?.name||"").match(/\.(jpg|jpeg|png|gif|webp|svg)$|^image\//i))?"📷 Image":"📎 Attachment"):"")}
                </div>}
                {/* Row 4: tags + sla + assigned agent */}
                <div style={{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap"}}>
                  {cv.priority!=="normal"&&<span style={{fontSize:8,fontWeight:700,fontFamily:FM,color:prC(cv.priority),background:prC(cv.priority)+"18",padding:"1px 5px",borderRadius:3,textTransform:"uppercase"}}>{cv.priority}</span>}
                  {cv.status==="resolved"&&<Tag text="done" color={C.g}/>}
                  {cv.status==="snoozed"&&<Tag text="snoozed" color={C.y}/>}
                  {(cv.labels||[]).includes("bot-handoff")&&<Tag text="🤖 bot" color="#ef4444"/>}
                  {aiAutoReply&&aiChannels[cv.ch]&&!convBotOff.has(cv.id)&&<span style={{fontSize:8,fontWeight:700,fontFamily:FM,color:C.p,background:C.pd,padding:"1px 5px",borderRadius:3,flexShrink:0}}>✦ Bot</span>}
                  {aiAutoReply&&aiChannels[cv.ch]&&convBotOff.has(cv.id)&&<span style={{fontSize:8,fontWeight:700,fontFamily:FM,color:C.t3,background:C.s3,padding:"1px 5px",borderRadius:3,flexShrink:0,textDecoration:"line-through"}}>Bot off</span>}
                  {cv.campaign_name&&<span style={{fontSize:8,fontWeight:700,fontFamily:FM,color:"#8b5cf6",background:"#8b5cf618",padding:"1px 5px",borderRadius:3,flexShrink:0}}>📣 {cv.campaign_name}</span>}
                  {cv.labels.filter((l:string)=>l!=="bot-handoff").slice(0,1).map((l:string)=><Tag key={l} text={l} color={lc(l)}/>)}
                  {sla&&cv.status==="open"&&<span style={{fontSize:8,fontWeight:700,fontFamily:FM,color:getSlaColor(sla.firstReply,sla.target),background:getSlaColor(sla.firstReply,sla.target)+"18",padding:"1px 5px",borderRadius:3}}>{getSlaText(sla.firstReply,sla.target)}</span>}
                  {agAv&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:3}} title={agAv.name}><Av i={agAv.av} c={agAv.color} s={14}/></div>}
                </div>
              </div>
            </div>
          </div>;
        })}
      </div>
    </aside>

    {/* ══════════════ KANBAN ══════════════ */}
    {viewMode==="kanban"&&<div style={{flex:1,display:"flex",gap:12,padding:14,overflowX:"auto",background:C.bg}}>
      {([{id:"new",label:"New",color:C.a,filter:(cv:any)=>cv.status==="open"&&!cv.agent},{id:"inprogress",label:"In Progress",color:C.cy,filter:(cv:any)=>cv.status==="open"&&cv.agent},{id:"waiting",label:"Waiting",color:C.y,filter:(cv:any)=>cv.status==="snoozed"},{id:"resolved",label:"Resolved",color:C.g,filter:(cv:any)=>cv.status==="resolved"}]).map(col=>{
        const cards=convs.filter(col.filter);
        return <div key={col.id} style={{minWidth:220,flex:1,background:C.s1,borderRadius:14,border:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:col.color}}/>
            <span style={{fontSize:12,fontWeight:700,fontFamily:FD,color:C.t1}}>{col.label}</span>
            <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:col.color,background:col.color+"18",borderRadius:10,padding:"1px 7px",marginLeft:"auto"}}>{cards.length}</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:8,display:"flex",flexDirection:"column",gap:6}}>
            {cards.slice(0,10).map(cv=>{const ct=contacts.find(c=>c.id===cv.cid);const sla=slaTimers[cv.id];return(
              <div key={cv.id} onClick={()=>{setAid(cv.id);setViewMode("list");}} className="hov" style={{padding:"10px 12px",background:C.s2,border:`1px solid ${aid===cv.id?col.color+"66":C.b1}`,borderRadius:10,cursor:"pointer",transition:"all .12s",borderLeft:`3px solid ${col.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{cv.subject}</span>
                  <span style={{fontSize:9,color:C.t3,fontFamily:FM,flexShrink:0,marginLeft:6}}>{formatConvTime(cv.updated_at||cv.time)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                  <Av i={ct?.av||"?"} c={cv.color} s={18}/>
                  <span style={{fontSize:10,color:C.t2}}>{ct?.name||"Unknown"}</span>
                  <span style={{marginLeft:"auto",fontSize:9,color:chC(cv.ch)}}><ChIcon t={cv.ch} s={10}/></span>
                </div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>
                  {cv.campaign_name&&<span style={{fontSize:7,fontWeight:700,fontFamily:FM,color:"#8b5cf6",background:"#8b5cf618",padding:"1px 4px",borderRadius:3}}>📣 Campaign</span>}
                  {cv.priority!=="normal"&&<Tag text={cv.priority} color={prC(cv.priority)}/>}
                  {cv.unread>0&&<span style={{background:C.a,color:"#fff",borderRadius:8,padding:"0 5px",fontSize:8,fontWeight:700}}>{cv.unread}</span>}
                  {sla&&cv.status==="open"&&<span style={{fontSize:7,fontWeight:700,fontFamily:FM,color:getSlaColor(sla.firstReply,sla.target),background:getSlaColor(sla.firstReply,sla.target)+"18",padding:"1px 4px",borderRadius:3,marginLeft:"auto"}}>{getSlaText(sla.firstReply,sla.target)}</span>}
                </div>
              </div>
            );})}
            {cards.length===0&&<div style={{padding:"20px 10px",textAlign:"center",fontSize:11,color:C.t3}}>No conversations</div>}
          </div>
        </div>;
      })}
    </div>}

    {/* ══════════════ CHAT + RIGHT PANEL ══════════════ */}
    {viewMode==="list"&&<>
    {/* CHAT */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,position:"relative"}}>

      {/* ── Conversation Header ── */}
      <div style={{borderBottom:`1px solid ${C.b1}`,background:C.s1,position:"relative"}}>
        {/* Row 1: contact info */}
        <div style={{padding:"7px 10px 5px",display:"flex",alignItems:"center",gap:8}}>
          {contact&&<Av i={contact.av} c={conv?.color||C.a} s={28}/>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{contact?.name||"Select a conversation"}</span>
              {conv&&<><Tag text={conv.status||"open"} color={conv.status==="resolved"?C.g:conv.status==="snoozed"?C.y:C.a}/>
              {conv.priority!=="normal"&&<Tag text={conv.priority||""} color={prC(conv.priority)}/>}
              <span style={{fontSize:10,color:chC(conv.ch)}}>{chI(conv.ch)}</span></>}
            </div>
            {conv&&<div style={{fontSize:10,color:C.t3,fontFamily:FM,display:"flex",gap:5,alignItems:"center",overflow:"hidden",whiteSpace:"nowrap"}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{conv.subject}</span>
              <span style={{color:C.b1}}>·</span>
              <span style={{color:assignedAg?C.a:C.y,cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:2,flexShrink:0}} onClick={()=>setShowAssign(true)}>
                {assignedAg?<><Av i={assignedAg.av} c={assignedAg.color} s={11}/>{assignedAg.name}</>:<>⚠ Unassigned</>}
              </span>
              {inboxes.find((ib:any)=>ib.id===conv.iid)&&<><span style={{color:C.b1}}>·</span><span style={{flexShrink:0}}>{inboxes.find((ib:any)=>ib.id===conv.iid)?.name}</span></>}
            </div>}
          </div>
          {/* compact icon buttons — top right */}
          <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
            <button onClick={()=>setShowMsgSearch(p=>!p)} title="Search messages" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:showMsgSearch?C.ad:C.s3,color:showMsgSearch?C.a:C.t3,border:`1px solid ${showMsgSearch?C.a+"44":C.b1}`,cursor:"pointer"}} className="hov">⌕</button>
            <button onClick={()=>setShowConvConfig(p=>!p)} title="More options" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:showConvConfig?C.s3:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">⋯</button>
            <button onClick={()=>setAid("")} title="Close conversation" style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">✕</button>
          </div>
          {showConvConfig&&<div style={{position:"absolute",top:46,right:10,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden",zIndex:60,boxShadow:"0 10px 40px rgba(0,0,0,.5)",animation:"fadeUp .15s ease",minWidth:190}}>
            {[{l:"Export Chat",navId:"download",fn:exportChat},{l:"Merge Conversations",navId:"merge",fn:()=>setShowMerge(true)},{l:"Mark as Spam",navId:"spam",fn:markSpam,c:C.y},{l:"Delete Conversation",navId:"spam",fn:deleteConv,c:C.r},{l:"Block Contact",navId:"block",fn:blockContact,c:C.r}].map(opt=>(
              <button key={opt.l} onClick={()=>{opt.fn();setShowConvConfig(false);}} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${C.b1}22`,cursor:"pointer",color:opt.c||C.t2,fontSize:12,fontFamily:FB,textAlign:"left"}}>
                <NavIcon id={opt.navId} s={14} col={opt.c||C.t2}/>{opt.l}
              </button>
            ))}
          </div>}
        </div>
        {/* Row 2: action toolbar */}
        {conv&&<div style={{padding:"4px 10px 5px",borderTop:`1px solid ${C.b1}22`,display:"flex",gap:4,alignItems:"center",flexWrap:"nowrap",overflowX:"auto"}}>
          <Btn ch="✦ Summarize" v="ai" sm onClick={genSum}/>
          <Btn ch="✦ Classify" v="ai" sm onClick={classifyAI}/>
          {aiAutoReply&&aiChannels[conv?.ch]&&<button onClick={()=>setConvBotOff(p=>{const n=new Set(p);n.has(aid)?n.delete(aid):n.add(aid);showT(n.has(aid)?"Bot paused for this conversation":"Bot resumed for this conversation",n.has(aid)?"warn":"success");return n;})} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:convBotOff.has(aid)?C.s3:C.pd,color:convBotOff.has(aid)?C.t3:C.p,border:`1px solid ${convBotOff.has(aid)?C.b1:C.p+"44"}`,transition:"all .15s",flexShrink:0}} title={convBotOff.has(aid)?"Resume AI bot":"Pause AI bot"}>
            <span style={{width:5,height:5,borderRadius:"50%",background:convBotOff.has(aid)?C.t3:C.p,flexShrink:0}}/>
            ✦ Bot {convBotOff.has(aid)?"Off":"On"}
          </button>}
          <div style={{width:1,height:16,background:C.b1,flexShrink:0}}/>
          {conv.status==="open"?<Btn ch="⊘ Resolve" v="success" sm onClick={resolve}/>:<Btn ch="↺ Reopen" v="warn" sm onClick={reopen}/>}
          <Btn ch="👤 Assign" v="ghost" sm onClick={()=>{setAssignTab("agents");setAssignSearch("");setShowAssign(true);}}/>
          <Btn ch="👥 Team" v="ghost" sm onClick={()=>{setAssignTab("teams");setAssignSearch("");setShowAssign(true);}}/>
          <Btn ch="⊖ Snooze" v="ghost" sm onClick={()=>setShowSnooze(true)}/>
        </div>}
      </div>

      {/* Collision banner */}
      {aid&&collisionAgents[aid]&&collisionAgents[aid].id!=="a1"&&<div style={{padding:"5px 16px",background:C.pd,borderBottom:`1px solid ${C.p}33`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:C.p,animation:"pulse 1.5s infinite"}}/>
        <span style={{fontSize:11,color:C.p,fontFamily:FM,fontWeight:600}}>{collisionAgents[aid].name} is {collisionAgents[aid].typing?"typing in":"viewing"} this conversation</span>
      </div>}

      {/* Campaign reply banner */}
      {aid&&conv?.campaign_name&&<div style={{margin:"0",padding:"10px 16px",background:"linear-gradient(135deg,#8b5cf618,#6366f118)",borderBottom:"1px solid #8b5cf633",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:30,height:30,borderRadius:8,background:"#8b5cf622",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>📣</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:11,fontWeight:700,color:"#8b5cf6",fontFamily:FM}}>Campaign Reply</span>
            <span style={{fontSize:10,fontWeight:600,color:C.t1}}>{conv.campaign_name}</span>
          </div>
          <div style={{fontSize:10,color:C.t3,lineHeight:1.4}}>This conversation was started when the contact replied to your <strong>{conv.campaign_name}</strong> campaign</div>
        </div>
        <button onClick={()=>{if((window as any).setScreen)(window as any).setScreen("marketing");}} style={{padding:"4px 10px",borderRadius:6,fontSize:9,fontWeight:700,color:"#8b5cf6",background:"#8b5cf614",border:"1px solid #8b5cf644",cursor:"pointer",fontFamily:FM,whiteSpace:"nowrap"}}>View Campaign</button>
      </div>}

      {/* AI Summary bar */}
      {(sumLoad||sumData)&&<div style={{margin:"10px 14px 0",padding:"11px 14px",background:`linear-gradient(135deg,${C.pd},${C.ad})`,border:`1px solid ${C.p}44`,borderRadius:12,animation:"fadeUp .25s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <Tag text="✦ AI SUMMARY" color={C.p}/>
          {sumData&&<Tag text={sumData.sentiment} color={sumData.sentiment==="negative"?C.r:sumData.sentiment==="neutral"?C.y:C.g}/>}
          <button onClick={()=>{setSumData(null);setSumLoad(false);}} style={{marginLeft:"auto",background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:15}}>×</button>
        </div>
        {sumLoad?<div style={{display:"flex",gap:8,alignItems:"center"}}><Spin/><span style={{fontSize:12,color:C.t2}}>Analyzing conversation…</span></div>:
        <><p style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:7}}>{sumData.text}</p>
        <div style={{display:"flex",gap:5}}>{sumData.topics.map((tp:string)=><Tag key={tp} text={tp} color={C.p}/>)}</div></>}
      </div>}

      {/* Message search bar */}
      {showMsgSearch&&<div style={{padding:"8px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",gap:8,alignItems:"center",animation:"fadeUp .15s ease"}}>
        <span style={{color:C.t3,fontSize:12}}>⌕</span>
        <input value={msgSearchQ} onChange={e=>setMsgSearchQ(e.target.value)} placeholder="Search in this conversation…" autoFocus style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none"}}/>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{msgSearchQ?convMsgs.filter(m=>m.text?.toLowerCase().includes(msgSearchQ.toLowerCase())).length+" found":""}</span>
        <button onClick={()=>{setShowMsgSearch(false);setMsgSearchQ("");}} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>
      </div>}

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {!aid?<EmptyState icon="💬" title="Select a conversation" desc="Choose a conversation from the left to start messaging"/>:
        msgsLoading?<SkelMsgs n={5}/>:convMsgs.length===0?<EmptyState icon="💬" title="No messages yet" desc="Start the conversation by sending a message below"/>:
        convMsgs.filter(m=>!msgSearchQ||m.text?.toLowerCase().includes(msgSearchQ.toLowerCase())).map((m,i,arr)=>{
          const dateKey=getMsgDateKey(m);
          const prevDateKey=i>0?getMsgDateKey(arr[i-1]):"";
          const showDateSep=dateKey&&dateKey!==prevDateKey;
          const dateSep=showDateSep?<div key={"date-"+dateKey+i} style={{textAlign:"center",margin:"8px 0",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:1,background:C.b1}}/>
            <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,letterSpacing:"0.4px",padding:"3px 10px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,flexShrink:0}}>{formatDateLabel(dateKey)}</span>
            <div style={{flex:1,height:1,background:C.b1}}/>
          </div>:null;
          if(m.role==="sys")return <>{dateSep}<div key={m.id||i} style={{textAlign:"center",fontSize:10.5,color:C.t3,fontFamily:FM,letterSpacing:"0.3px",animation:"fadeUp .2s ease"}}>── {m.text} ──</div></>;
          const isAg=m.role==="agent";
          const ag=isAg?agents.find(a=>a.id===m.aid):null;
          const isAuto=!!(m.auto);
          const isNt=!!(m.isNote);
          const highlight=!!(msgSearchQ&&m.text?.toLowerCase().includes(msgSearchQ.toLowerCase()));
          return <>{dateSep}<div key={m.id||i} style={{display:"flex",justifyContent:isAg?"flex-end":"flex-start",animation:"fadeUp .2s ease",flexDirection:"column",alignItems:isAg?"flex-end":"flex-start"}}>
            <div style={{display:"flex",justifyContent:isAg?"flex-end":"flex-start",width:"100%",position:"relative"}} className="msg-row">
              {!isAg&&contact&&<div style={{marginRight:8,flexShrink:0}}><Av i={contact.av} c={conv?.color||C.a} s={26}/></div>}
              <div onDoubleClick={()=>setPopupMsg({...m,ag,isAg,isNt,conv})} style={{maxWidth:m.html&&!isAg&&isEmailCh?"92%":"72%",background:isNt?C.yd:isAg?(isAuto?`linear-gradient(135deg,${C.p},#6b3fc0)`:`linear-gradient(135deg,${C.a},#2a5de8)`):m.html&&isEmailCh?"#fff":C.s3,border:isNt?`1px solid ${C.y}44`:isAg?"none":`1px solid ${C.b1}`,borderRadius:isAg?"14px 14px 4px 14px":"4px 14px 14px 14px",padding:m.html&&!isAg&&isEmailCh?"0":"10px 13px",position:"relative",outline:highlight?`2px solid ${C.y}`:"none",overflow:"hidden",cursor:"default"}}>
                {isNt&&<div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.y,letterSpacing:"0.4px",marginBottom:4,padding:m.html?"10px 13px 0":0}}>📝 INTERNAL NOTE</div>}
                {isAg&&ag&&<div style={{fontSize:10,color:isNt?"#8b7a2e":"rgba(255,255,255,.6)",marginBottom:4,fontFamily:FM,display:"flex",alignItems:"center",gap:5,padding:m.html?"10px 13px 0":0}}>{ag.name}{isAuto&&<span style={{background:"rgba(255,255,255,.18)",borderRadius:4,padding:"1px 5px",fontSize:9,letterSpacing:"0.3px"}}>✦ AI</span>}</div>}
                {m.replyTo&&<div style={{fontSize:10,color:isNt?C.t2:isAg?"rgba(255,255,255,.5)":C.t3,padding:"4px 8px",borderLeft:`2px solid ${isAg?"rgba(255,255,255,.3)":C.b1}`,marginBottom:6,fontStyle:"italic",margin:m.html?"10px 13px 6px":0}}>↩ {m.replyText||"…"}</div>}
                {m.html&&!isAg&&isEmailCh
                  ?<iframe srcDoc={m.html} sandbox="" style={{width:"100%",minHeight:100,border:"none",display:"block"}} onLoad={(e:any)=>{try{const h=e.target.contentDocument?.documentElement?.scrollHeight||200;e.target.style.height=Math.min(Math.max(h,80),600)+"px";}catch{}}}/>
                  :m.text&&<p style={{fontSize:13.5,lineHeight:1.55,color:isNt?"#5a4e1a":isAg?"#fff":C.t1,margin:0}}>{highlight?(()=>{const re=new RegExp(`(${msgSearchQ.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');return m.text.split(re).map((p:string,k:number)=>re.test(p)?<mark key={k} style={{background:C.y+"88",color:isAg?"#fff":C.t1,borderRadius:2,padding:"0 1px"}}>{p}</mark>:p);})():m.text}</p>}
                {normalizeAttachmentList(m.attachments||[]).length>0&&<div style={{marginTop:m.text?6:0,display:"flex",flexWrap:"wrap",gap:4}}>
                  {normalizeAttachmentList(m.attachments||[]).map((att:any,ai:number)=>{
                    const isImg=/\.(png|jpe?g|gif|webp|svg)$/i.test(att.name||att.url||"");
                    const href=attachmentHref(att)||"#";
                    return isImg?(<a key={ai} href={href} target="_blank" rel="noreferrer" style={{display:"block"}}><img src={href} alt={att.name} style={{maxWidth:200,maxHeight:160,borderRadius:8,border:`1px solid ${isAg?"rgba(255,255,255,.2)":C.b1}`,objectFit:"cover"}} onError={(e:any)=>{e.target.style.display="none";}}/></a>):
                    (<a key={ai} href={href} target="_blank" rel="noreferrer" download={att.name} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 9px",borderRadius:7,background:isAg?"rgba(255,255,255,.15)":"rgba(0,0,0,.07)",border:`1px solid ${isAg?"rgba(255,255,255,.2)":C.b1}`,textDecoration:"none",maxWidth:220}}>
                      <span style={{fontSize:14}}>{/\.pdf$/i.test(att.name||"")?"📄":/\.(doc|docx)$/i.test(att.name||"")?"📝":/\.(xls|xlsx|csv)$/i.test(att.name||"")?"📊":/\.(zip|rar|gz)$/i.test(att.name||"")?"🗜️":"📎"}</span>
                      <span style={{fontSize:10.5,color:isAg?"rgba(255,255,255,.85)":C.t2,fontFamily:FB,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{att.name||"Attachment"}</span>
                      {(att.size||att.sizeLabel)&&<span style={{fontSize:9,color:isAg?"rgba(255,255,255,.5)":C.t3,flexShrink:0}}>{att.sizeLabel||formatAttachmentSize(att.size)}</span>}
                    </a>);
                  })}
                </div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5,padding:m.html&&!isAg&&isEmailCh?"2px 13px 8px":0}}>
                  {(m.t||m.created_at)&&<span style={{fontSize:9.5,color:isNt?"#8b7a2e":isAg?"rgba(255,255,255,.45)":C.t3,fontFamily:FM}}>{formatMsgTime(m)}{m.edited?" · edited":""}{m.html&&!isAg&&isEmailCh?" · 📧 HTML":""}</span>}
                  {isAg&&!isNt&&(isWhatsAppCh?(
                    <span style={{fontSize:9,fontFamily:FM,color:isAg?"rgba(255,255,255,.55)":C.t3}} title={m.whatsapp_message_id?"Sent to WhatsApp":"Pending send"}>{m.whatsapp_message_id?"✓":"..."}</span>
                  ):isSmsCh?(
                    <span style={{fontSize:9,fontFamily:FM,color:isAg?"rgba(255,255,255,.55)":C.t3}} title={m.sms_message_id?"Sent via SMS":"Pending send"}>{m.sms_message_id?"✓":"..."}</span>
                  ):(
                    <span style={{fontSize:9,fontFamily:FM,color:isAg?"rgba(255,255,255,.4)":C.t3}}>{m.read!==false?"✓✓":"✓"}</span>
                  ))}
                </div>
              </div>
              <div className="msg-actions" style={{position:"absolute",top:-14,[isAg?"right":"left"]:8,display:"none",gap:2,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:6,padding:"2px",boxShadow:"0 4px 16px rgba(0,0,0,.4)",zIndex:10}}>
                  <button onClick={()=>setReplyTo(m)} title="Reply" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">↩</button>
                  <button onClick={()=>copyMsg(m.text)} title="Copy" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">⎘</button>
                  <button onClick={()=>setPopupMsg({...m,ag,isAg,isNt,conv})} title="Expand" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.a}} className="hov">⛶</button>
                  {isAg&&<button onClick={()=>startEditMsg(m.id,m.text)} title="Edit" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">✎</button>}
                  {isAg&&<button onClick={()=>deleteMsg(m.id)} title="Delete" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.r}} className="hov">✕</button>}
                  <button onClick={()=>fwdMsg(m.text)} title="Forward" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">↗</button>
                </div>
            </div>
          </div></>;
        })}
        {typing&&<div style={{display:"flex",justifyContent:"flex-start",animation:"fadeUp .2s ease"}}>
          {contact&&<div style={{marginRight:8}}><Av i={contact.av} c={conv?.color||C.a} s={26}/></div>}
          <div style={{background:C.s3,border:`1px solid ${C.b1}`,borderRadius:"4px 14px 14px 14px",padding:"12px 16px",display:"flex",gap:4}}>
            {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",background:C.t3,display:"block",animation:`blink 1.2s infinite ${i*.2}s`}}/>)}
          </div>
        </div>}
        {aiReplying&&<div style={{display:"flex",justifyContent:"flex-end",animation:"fadeUp .2s ease"}}>
          <div style={{background:`linear-gradient(135deg,${C.p}33,${C.a}22)`,border:`1px solid ${C.p}44`,borderRadius:"14px 14px 4px 14px",padding:"10px 16px",display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10,color:C.p,fontFamily:FM,fontWeight:700}}>✦ AI</span>
            {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:C.p,display:"block",animation:`blink 1.2s infinite ${i*.2}s`}}/>)}
            <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>composing…</span>
          </div>
        </div>}
        <div ref={msgEnd}/>
      </div>

      {/* AI suggestion panel */}
      {showAI&&<div style={{borderTop:`1px solid ${C.b1}`,padding:"10px 14px",background:C.s1}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <span style={{fontSize:10,color:C.t3,fontFamily:FM,letterSpacing:"0.5px"}}>✦ AI COPILOT</span>
          <button onClick={genAI} style={{fontSize:10,color:C.p,background:C.pd,border:`1px solid ${C.p}44`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:FM,fontWeight:600}}>{aiLoad?"Thinking…":"Regenerate"}</button>
          <button onClick={()=>{setShowAI(false);setAiSugs([]);}} style={{marginLeft:"auto",color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button>
        </div>
        {aiLoad&&<div style={{display:"flex",gap:8,alignItems:"center"}}><Spin/><span style={{fontSize:12,color:C.t2}}>Analyzing context…</span></div>}
        {aiSugs.map((s,i)=>(
          <button key={i} onClick={()=>{setInp(s);setShowAI(false);setAiSugs([]);}} className="hov" style={{width:"100%",padding:"8px 11px",borderRadius:8,fontSize:12,color:C.t2,border:`1px solid ${C.b1}`,background:"transparent",cursor:"pointer",textAlign:"left",lineHeight:1.5,marginBottom:5,transition:"background .12s",display:"block"}}>
            <span style={{color:C.p,fontSize:10,fontFamily:FM,marginRight:6}}>{i+1}.</span>{s.slice(0,110)}…
          </button>
        ))}
      </div>}

      {/* canned popup */}
      {showCanned&&<div style={{position:"absolute",bottom:130,left:"30%",width:340,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",animation:"fadeUp .2s ease",boxShadow:"0 20px 50px rgba(0,0,0,.6)",zIndex:50}}>
        <div style={{padding:"9px 12px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:C.t3}}>⌕</span>
          <input value={cQ} onChange={e=>setCQ(e.target.value)} placeholder="Search canned responses…" style={{flex:1,background:"transparent",border:"none",fontSize:12,color:C.t1,fontFamily:FB,outline:"none"}}/>
          <button onClick={()=>setShowCanned(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer"}}>×</button>
        </div>
        {canned.filter(c=>!cQ||c.code.includes(cQ)||c.content.toLowerCase().includes(cQ.toLowerCase())).map(c=>(
          <div key={c.id} className="hov" onClick={()=>{setInp(c.content);setShowCanned(false);setCQ("");}} style={{padding:"9px 12px",cursor:"pointer",borderBottom:`1px solid ${C.b1}`,transition:"background .12s"}}>
            <div style={{fontSize:10.5,color:C.a,fontFamily:FM,marginBottom:2}}>/{c.code}</div>
            <div style={{fontSize:12,color:C.t2}}>{c.content.slice(0,75)}…</div>
          </div>
        ))}
        {canned.filter(c=>!cQ||c.code.includes(cQ)).length===0&&<div style={{padding:"14px 12px",fontSize:12,color:C.t3,textAlign:"center"}}>No matches</div>}
      </div>}

      {/* compose */}
      <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} style={{borderTop:`1px solid ${C.b1}`,background:dragOver?C.ad:isNote?C.yd:C.s1,padding:"8px 10px",transition:"background .2s",position:"relative"}}>
        {dragOver&&<div style={{position:"absolute",inset:0,background:C.a+"22",border:`2px dashed ${C.a}`,borderRadius:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.a,fontWeight:700,fontFamily:FM}}>Drop files here</div>}
        {/* WhatsApp header */}
        {isWhatsAppCh&&!isNote&&<div style={{marginBottom:6,display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#25d36611",border:"1px solid #25d36633",borderRadius:6,flexWrap:"wrap"}}>
          <span style={{fontSize:12}}>💬</span>
          <span style={{fontSize:10,color:"#128C7E",fontFamily:FM,fontWeight:600}}>WhatsApp</span>
          <span style={{fontSize:10,color:C.t2,fontFamily:FB,flex:1}}>To: {contact?.name||contactName}{contactPhone?" · +"+contactPhone:""}</span>
          {!contactPhone&&<span style={{fontSize:9,color:C.r,fontFamily:FM}}>⚠ No phone on contact</span>}
          {contactPhone&&!whatsappSendReady&&<span style={{fontSize:9,color:C.r,fontFamily:FM}}>⚠ Send setup missing: {whatsappMissingSendBits.join(", ")}</span>}
          {whatsappSendReady&&!whatsappInboundReady&&<span style={{fontSize:9,color:C.y,fontFamily:FM}}>⚠ Reply sync missing: {whatsappMissingInboundBits.join(", ")}</span>}
        </div>}
        {/* Facebook Messenger header */}
        {isFacebookCh&&!isNote&&<div style={{marginBottom:6,display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#1877f211",border:"1px solid #1877f233",borderRadius:6,flexWrap:"wrap"}}>
          <span style={{fontSize:12}}>💬</span>
          <span style={{fontSize:10,color:"#1877f2",fontFamily:FM,fontWeight:600}}>Facebook Messenger</span>
          <span style={{fontSize:10,color:C.t2,fontFamily:FB,flex:1}}>To: {contact?.name||contactName}</span>
          {!facebookSendReady&&<span style={{fontSize:9,color:C.r,fontFamily:FM}}>⚠ Setup missing: {facebookMissingSendBits.join(", ")}</span>}
          {facebookSendReady&&<span style={{fontSize:9,color:"#1877f2",fontFamily:FM}}>🔒 Connected</span>}
        </div>}
        {/* Instagram header */}
        {isInstagramCh&&!isNote&&<div style={{marginBottom:6,display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#e1306c11",border:"1px solid #e1306c33",borderRadius:6,flexWrap:"wrap"}}>
          <span style={{fontSize:12}}>📸</span>
          <span style={{fontSize:10,color:"#e1306c",fontFamily:FM,fontWeight:600}}>Instagram DM</span>
          <span style={{fontSize:10,color:C.t2,fontFamily:FB,flex:1}}>To: {contact?.name||contactName}</span>
          {!instagramSendReady&&<span style={{fontSize:9,color:C.r,fontFamily:FM}}>⚠ Setup missing: {instagramMissingSendBits.join(", ")}</span>}
          {instagramSendReady&&<span style={{fontSize:9,color:"#e1306c",fontFamily:FM}}>🔒 Connected</span>}
        </div>}
        {/* Email fields — compact single-area */}
        {isEmailCh&&!isNote&&<div style={{marginBottom:6,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:0,borderBottom:`1px solid ${C.b1}`}}>
            <span style={{fontSize:10,color:C.t3,fontFamily:FM,padding:"4px 8px",borderRight:`1px solid ${C.b1}`,minWidth:32,textAlign:"center"}}>To</span>
            <input value={emailTo} onChange={e=>setEmailTo(e.target.value)} placeholder="customer@email.com" style={{flex:1,background:"transparent",border:"none",padding:"4px 8px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/>
            <button onClick={()=>setShowCcBcc(p=>!p)} style={{fontSize:9,color:showCcBcc?C.a:C.t3,background:"none",border:"none",borderLeft:`1px solid ${C.b1}`,padding:"4px 8px",cursor:"pointer",fontFamily:FM,whiteSpace:"nowrap"}}>{showCcBcc?"▲ CC":"CC/BCC"}</button>
          </div>
          {showCcBcc&&<>
            <div style={{display:"flex",alignItems:"center",borderBottom:`1px solid ${C.b1}`}}><span style={{fontSize:10,color:C.t3,fontFamily:FM,padding:"4px 8px",borderRight:`1px solid ${C.b1}`,minWidth:32,textAlign:"center"}}>CC</span><input value={emailCc} onChange={e=>setEmailCc(e.target.value)} placeholder="cc@email.com" style={{flex:1,background:"transparent",border:"none",padding:"4px 8px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/></div>
            <div style={{display:"flex",alignItems:"center",borderBottom:`1px solid ${C.b1}`}}><span style={{fontSize:10,color:C.t3,fontFamily:FM,padding:"4px 8px",borderRight:`1px solid ${C.b1}`,minWidth:32,textAlign:"center"}}>BCC</span><input value={emailBcc} onChange={e=>setEmailBcc(e.target.value)} placeholder="bcc@email.com" style={{flex:1,background:"transparent",border:"none",padding:"4px 8px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/></div>
          </>}
          <div style={{display:"flex",alignItems:"center"}}><span style={{fontSize:10,color:C.t3,fontFamily:FM,padding:"4px 8px",borderRight:`1px solid ${C.b1}`,minWidth:32,textAlign:"center"}}>Subj</span><input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} placeholder={conv?.subject||"Re: "} style={{flex:1,background:"transparent",border:"none",padding:"4px 8px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/></div>
        </div>}
        {/* Reply-to preview */}
        {replyTo&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:6,marginBottom:6}}>
          <span style={{fontSize:10,color:C.a}}>↩</span>
          <div style={{flex:1,fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Replying to: {replyTo.text?.slice(0,60)}…</div>
          <button onClick={()=>setReplyTo(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button>
        </div>}
        {/* Edit indicator */}
        {editMsgId&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:C.ad,border:`1px solid ${C.a}44`,borderRadius:6,marginBottom:6}}>
          <span style={{fontSize:10,color:C.a}}>✎</span>
          <span style={{flex:1,fontSize:11,color:C.a}}>Editing message…</span>
          <button onClick={()=>{setEditMsgId(null);setInp("");}} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>Cancel</button>
        </div>}
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" multiple style={{display:"none"}}
          onChange={e=>{if(e.target.files?.length)uploadFiles(Array.from(e.target.files) as File[]);e.target.value="";}}/>
        {/* Attachments */}
        {attachments.length>0&&<div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>
          {attachments.map((a:any)=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 7px",background:a.status==="error"?C.rd:a.uploading?C.ad:C.s2,border:`1px solid ${a.status==="error"?C.r+"55":a.uploading?C.a+"55":C.b1}`,borderRadius:6,fontSize:10,transition:"all .2s"}}>
              {a.uploading?<span style={{animation:"spin 1s linear infinite"}}>⟳</span>:<span>{a.status==="error"?"⚠":"📎"}</span>}
              <span style={{color:C.t2,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
              <span style={{color:a.status==="error"?C.r:C.t3,fontFamily:FM}}>{a.status==="error"?"failed":a.sizeLabel||formatAttachmentSize(a.size)}</span>
              {!a.uploading&&<button onClick={()=>removeAttach(a.id)} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:10}}>✕</button>}
            </div>
          ))}
        </div>}
        {/* Textarea — full width, taller */}
        <textarea value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&!isEmailCh&&(e.preventDefault(),sendMsg())}
          placeholder={isNote?"Internal note (not visible to customer)…":isEmailCh?"Compose email reply…":isWhatsAppCh?"Type WhatsApp message…":isFacebookCh?"Type Facebook message…":isInstagramCh?"Type Instagram DM…":"Type reply… (Enter to send)"}
          rows={isEmailCh?3:2}
          style={{width:"100%",boxSizing:"border-box",background:isNote?"#fffbe6":C.bg,border:`1px solid ${isNote?C.y+"66":C.b2}`,borderRadius:8,padding:"8px 10px",fontSize:13,color:isNote?"#5a4e1a":C.t1,resize:"vertical",lineHeight:1.5,fontFamily:FB,transition:"background .15s",outline:"none"}}/>
        {/* Signature preview */}
        {isEmailCh&&!isNote&&defaultSig&&<div style={{padding:"3px 10px",fontSize:10,color:C.t3,fontFamily:FM,whiteSpace:"pre-line",lineHeight:1.4,opacity:.8}}>{resolveVars(defaultSig.body?.replace(/\*\*(.*?)\*\*/g,'$1').replace(/_(.*?)_/g,'$1'),agents.find((a:any)=>a.id===aid))}</div>}
        {/* Emoji picker */}
        {showEmoji&&<div style={{display:"flex",flexWrap:"wrap",gap:2,padding:"6px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,marginTop:5,animation:"fadeUp .15s ease"}}>
          {EMOJI_SET.map(e=>(
            <button key={e} onClick={()=>{setInp(p=>p+e);setShowEmoji(false);}} style={{width:26,height:26,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,background:"transparent",border:"none",cursor:"pointer"}} className="hov">{e}</button>
          ))}
        </div>}
        {/* Bottom action bar — toolbar + send in one row */}
        <div style={{display:"flex",gap:3,marginTop:6,alignItems:"center"}}>
          <button onClick={()=>{setIsNote(p=>!p);showT(isNote?"Switched to reply":"Switched to internal note",isNote?"info":"warn");}} style={{padding:"4px 9px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:isNote?C.y+"22":"transparent",color:isNote?C.y:C.t3,border:`1px solid ${isNote?C.y+"55":C.b1}`,transition:"all .15s",whiteSpace:"nowrap"}}>{isNote?"📝 Note":"💬 Reply"}</button>
          <div style={{width:1,height:16,background:C.b1,margin:"0 2px"}}/>
          {[{i:"B",tip:"Bold",fn:()=>setInp(p=>p+"**bold**"),fw:700,fs:"normal"},{i:"I",tip:"Italic",fn:()=>setInp(p=>p+"_italic_"),fw:400,fs:"italic"},{i:"~",tip:"Strike",fn:()=>setInp(p=>p+"~~text~~"),fw:400,fs:"normal"}].map(f=>(
            <button key={f.tip} onClick={f.fn} title={f.tip} className="nav" style={{width:24,height:24,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",color:C.t3,background:"transparent",border:"none",cursor:"pointer",fontSize:11,fontStyle:f.fs,fontWeight:f.fw}}>{f.i}</button>
          ))}
          <button onClick={()=>setShowEmoji(p=>!p)} title="Emoji" style={{width:24,height:24,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:showEmoji?C.ad:"transparent",color:C.t3,border:"none",cursor:"pointer"}}>😊</button>
          <button onClick={handleFilePick} title="Attach" style={{width:24,height:24,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:attachments.length?C.a:C.t3,background:"transparent",border:"none",cursor:"pointer"}}>📎{attachments.length>0&&<span style={{fontSize:8,color:C.a,marginLeft:1}}>({attachments.length})</span>}</button>
          <div style={{flex:1}}/>
          <button onClick={()=>{setShowCanned(p=>!p);setCQ("");}} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,color:C.t2,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>⚡ Canned</button>
          <button onClick={genAI} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,color:C.p,background:C.pd,border:`1px solid ${C.p}44`,cursor:"pointer"}}>✦ AI</button>
          <button onClick={sendMsg} style={{padding:"5px 16px",borderRadius:7,fontSize:12,fontWeight:700,background:isNote?C.y:isWhatsAppCh?"#25d366":isFacebookCh?"#1877f2":isInstagramCh?"#e1306c":C.a,color:isNote?"#5a4e1a":"#fff",border:"none",cursor:"pointer",fontFamily:FM,transition:"background .15s"}} title={isWhatsAppCh?"Send via WhatsApp":isFacebookCh?"Send via Facebook":isInstagramCh?"Send via Instagram":"Send"}>{editMsgId?"Save":isWhatsAppCh?"Send 💬":isFacebookCh?"Send 💬":isInstagramCh?"Send 📸":"Send ↑"}</button>
        </div>
        {/* Channel status footer */}
        {isWhatsAppCh&&!isNote&&<div style={{marginTop:4,display:"flex",alignItems:"center",gap:5,fontSize:9,color:whatsappSendReady&&whatsappInboundReady?"#25d366":whatsappSendReady?C.y:C.r,fontFamily:FM}}>
          <span>{whatsappSendReady&&whatsappInboundReady?"🔒":"⚠"}</span>
          <span>{whatsappSendReady&&whatsappInboundReady?"WhatsApp ready · Real-time via webhook":"Setup incomplete — check Meta API credentials and webhook"}</span>
        </div>}
        {isFacebookCh&&!isNote&&<div style={{marginTop:4,display:"flex",alignItems:"center",gap:5,fontSize:9,color:facebookSendReady?"#1877f2":C.r,fontFamily:FM}}>
          <span>{facebookSendReady?"🔒":"⚠"}</span>
          <span>{facebookSendReady?"Facebook Messenger ready · Real-time via webhook":"Setup incomplete — check Facebook App credentials"}</span>
        </div>}
        {isInstagramCh&&!isNote&&<div style={{marginTop:4,display:"flex",alignItems:"center",gap:5,fontSize:9,color:instagramSendReady?"#e1306c":C.r,fontFamily:FM}}>
          <span>{instagramSendReady?"🔒":"⚠"}</span>
          <span>{instagramSendReady?"Instagram DM ready · Real-time via webhook":"Setup incomplete — check Instagram Page Access Token"}</span>
        </div>}
      </div>
    </div>

    {/* ══ RIGHT PANEL ══ */}
    {!rpCollapsed&&<aside style={{width:300,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`}}>
        {([["conv","Conv"],["contact","Contact"],["history","History"]] as [string,string][]).map(([id,lbl])=>(
          <button key={id} onClick={()=>setRtab(id)} style={{flex:1,padding:"12px 0",fontSize:10,fontWeight:700,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase",color:rtab===id?C.a:C.t3,background:"transparent",border:"none",borderBottom:`2.5px solid ${rtab===id?C.a:"transparent"}`,cursor:"pointer",transition:"all .15s"}}>{lbl}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12}}>

        {/* ── CONV TAB ── */}
        {rtab==="conv"&&conv&&<div style={{display:"flex",flexDirection:"column",gap:12,animation:"fadeUp .2s ease"}}>

          {/* Assignee */}
          <div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:6}}>ASSIGNEE</div>
            <div className="hov" onClick={()=>setShowAssign(true)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,cursor:"pointer"}}>
              {assignedAg?<>
                <Av i={assignedAg.av} c={assignedAg.color} s={30} dot={assignedAg.status==="online"}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{assignedAg.name}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{assignedAg.role} · <span style={{color:assignedAg.status==="online"?C.g:C.y}}>{assignedAg.status}</span></div>
                </div>
              </>:<div style={{fontSize:12,color:C.y,flex:1,display:"flex",alignItems:"center",gap:5}}><span>⚠</span><span>Unassigned</span></div>}
              <span style={{fontSize:10,color:C.a,fontFamily:FM}}>✎</span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:6}}>PRIORITY</div>
            <div style={{display:"flex",gap:5}}>
              {(["urgent","high","normal"] as string[]).map(p=>{
                const c2=prC(p)||C.t3;const active=conv.priority===p;
                return <button key={p} onClick={()=>setPrio(p)} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:9,fontWeight:700,fontFamily:FM,letterSpacing:"0.3px",background:active?c2+"25":"transparent",color:active?c2:C.t3,border:`1.5px solid ${active?c2+"66":C.b1}`,textTransform:"uppercase",cursor:"pointer",transition:"all .15s"}}>{p}</button>;
              })}
            </div>
          </div>

          {/* Labels */}
          <div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:6}}>LABELS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
              {conv.labels.map((l:string)=><Tag key={l} text={l} color={lc(l)} onRemove={()=>toggleLbl(l)}/>)}
              <button onClick={()=>setShowLblPick(p=>!p)} style={{padding:"2px 8px",borderRadius:5,fontSize:10,color:C.t3,border:`1px dashed ${C.b1}`,background:"transparent",cursor:"pointer",fontFamily:FM}}>+ add</button>
            </div>
            {showLblPick&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:8,display:"flex",flexWrap:"wrap",gap:5}}>
              {labels.map((l:any)=>(
                <button key={l.id} onClick={()=>toggleLbl(l.title)} style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,fontFamily:FM,textTransform:"uppercase",background:conv.labels.includes(l.title)?l.color+"25":"transparent",color:conv.labels.includes(l.title)?l.color:C.t3,border:`1px solid ${conv.labels.includes(l.title)?l.color+"44":C.b1}`,cursor:"pointer"}}>
                  {conv.labels.includes(l.title)?"✓ ":""}{l.title}
                </button>
              ))}
              <button onClick={()=>setShowLblPick(false)} style={{width:"100%",marginTop:4,padding:"4px",fontSize:11,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>Done</button>
            </div>}
          </div>

          {/* Quick Actions */}
          <div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:6}}>QUICK ACTIONS</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {conv.status==="open"?<Btn ch="⊘ Resolve Conversation" v="success" full onClick={resolve}/>:<Btn ch="↺ Reopen Conversation" v="warn" full onClick={reopen}/>}
              <Btn ch="↗ Transfer to Team" v="ghost" full onClick={()=>setShowTransfer(true)}/>
              <Btn ch="⊖ Snooze Conversation" v="ghost" full onClick={()=>setShowSnooze(true)}/>
              <Btn ch="✦ AI Classify + Label" v="ai" full onClick={classifyAI}/>
            </div>
          </div>

          {/* Metrics */}
          <div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:6}}>METRICS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {([{l:"First Reply",v:"3.2m",c:C.g},{l:"Avg Response",v:"4.8m",c:C.a},{l:"Messages",v:String(convMsgs.filter((m:any)=>m.role!=="sys").length),c:C.cy},{l:"Duration",v:conv.time,c:C.t2}]).map((m:any)=>(
                <div key={m.l} style={{padding:"8px",background:C.s2,borderRadius:8,textAlign:"center",border:`1px solid ${C.b1}`}}>
                  <div style={{fontSize:8,color:C.t3,fontFamily:FM,letterSpacing:"0.3px",marginBottom:3}}>{m.l}</div>
                  <div style={{fontSize:15,fontWeight:800,fontFamily:FM,color:m.c}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:6}}>DETAILS</div>
            <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,overflow:"hidden"}}>
              {([
                {l:"Channel",v:<span style={{display:"inline-flex",alignItems:"center",gap:4}}><ChIcon t={conv.ch} s={12}/>{conv.ch}</span>},
                {l:"Inbox",v:(inboxes as any[]).find((ib:any)=>ib.id===conv.iid)?.name||"Default"},
                {l:"ID",v:aid?.slice(0,18)+"…"},
                {l:"Created",v:conv.time}
              ]).map((d:any,i:number)=>(
                <div key={d.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",borderBottom:i<3?`1px solid ${C.b1}22`:"none"}}>
                  <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{d.l}</span>
                  <span style={{fontSize:11,color:C.t1,fontFamily:FM}}>{d.v}</span>
                </div>
              ))}
            </div>
          </div>

          {customFields&&<CfPanel entity="conversation" recordId={conv.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/>}
        </div>}

        {/* ── CONTACT TAB ── */}
        {rtab==="contact"&&contact&&<div style={{animation:"fadeUp .2s ease"}}>
          {/* Contact header */}
          <div style={{textAlign:"center",padding:"4px 0 14px",borderBottom:`1px solid ${C.b1}`,marginBottom:12}}>
            <Av i={contact.av} c={conv?.color||C.a} s={52}/>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginTop:8,color:C.t1}}>{contact.name}</div>
            {contact.email&&<div style={{fontSize:11,color:C.a,marginTop:3,cursor:"pointer",fontFamily:FM}} onClick={()=>navigator.clipboard?.writeText(contact.email)}>{contact.email}</div>}
            {contact.phone&&<div style={{fontSize:11,color:C.t3,marginTop:2,fontFamily:FM}}>{contact.phone}</div>}
            <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:8,flexWrap:"wrap"}}>
              {contact.plan&&<Tag text={contact.plan} color={contact.plan==="Enterprise"?C.p:contact.plan==="Pro"?C.a:C.t3}/>}
              {(contact.tags||[]).slice(0,3).map((tg:string)=><Tag key={tg} text={tg} color={C.t3}/>)}
            </div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:12}}>
            {([{l:"Convs",v:contact.convs||"—",c:C.a},{l:"Spend",v:contact.totalSpend||"—",c:C.g},{l:"CSAT",v:contact.csat?contact.csat+"★":"—",c:contact.csat>=4.5?C.g:contact.csat>=3.5?C.y:contact.csat?C.r:C.t3}]).map((s:any)=>(
              <div key={s.l} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"7px 4px",textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Sub-tabs */}
          <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,marginBottom:10}}>
            {([["info","Info"],["session","Session"],["timeline","Timeline"]] as [string,string][]).map(([id,lbl])=>(
              <button key={id} onClick={()=>setContactSubTab(id)} style={{flex:1,padding:"7px 0",fontSize:9,fontWeight:700,fontFamily:FM,color:contactSubTab===id?C.a:C.t3,borderBottom:`2px solid ${contactSubTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",letterSpacing:"0.3px",textTransform:"uppercase"}}>{lbl}</button>
            ))}
          </div>

          {contactSubTab==="info"&&<div>
            <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,overflow:"hidden",marginBottom:10}}>
              <InfoRow label="Email" value={contact.email} copy/>
              <InfoRow label="Phone" value={contact.phone} copy/>
              <InfoRow label="Company" value={contact.company}/>
              <InfoRow label="Location" value={contact.location}/>
              <InfoRow label="Timezone" value={contact.timezone} mono/>
            </div>
            <div style={{background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,overflow:"hidden"}}>
              <InfoRow label="User ID" value={contact.uid} copy color={C.a} mono/>
              <InfoRow label="User Type" value={contact.userType}/>
              <InfoRow label="Last Active" value={contact.lastActivity} mono/>
            </div>
            {contact.notes&&<div style={{marginTop:10,background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"9px 11px",fontSize:11,color:C.t1,lineHeight:1.55}}>{contact.notes}</div>}
            {(contact.tags||[]).length>0&&<div style={{marginTop:10}}>
              <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:5}}>TAGS</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(contact.tags||[]).map((tg:string)=><Tag key={tg} text={tg} color={C.t2}/>)}</div>
            </div>}
            {customFields&&<CfPanel entity="contact" recordId={contact.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/>}
          </div>}

          {contactSubTab==="session"&&<div>
            <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:C.g,boxShadow:`0 0 6px ${C.g}`}}/>
                <span style={{fontSize:10,color:C.g,fontWeight:700,fontFamily:FM}}>LIVE SESSION</span>
              </div>
              <InfoRow label="URL" value={contact.currentUrl||conv?.subject||"—"} copy color={C.a} mono/>
              <InfoRow label="IP" value={contact.ip||"192.168.1.42"} copy mono/>
              <InfoRow label="Browser" value={contact.browser||"Chrome 124"}/>
              <InfoRow label="OS" value={contact.os||"macOS 15"}/>
            </div>
            <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:20,marginBottom:4}}>{contact.location?.includes("India")?"🇮🇳":contact.location?.includes("US")?"🇺🇸":contact.location?.includes("UK")?"🇬🇧":contact.location?.includes("Japan")?"🇯🇵":"🌍"}</div>
              <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>{contact.location||"Unknown"}</div>
              <InfoRow label="Language" value={contact.language} mono/>
              <InfoRow label="Currency" value={contact.currency} mono/>
            </div>
          </div>}

          {contactSubTab==="timeline"&&<div>
            {([{t:"2m",icon:"💬",text:"Sent message",sub:conv?.subject||"Support",c:C.a},{t:"1h",icon:"📧",text:"Email received",sub:"Re: Invoice",c:C.a},{t:"3h",icon:"🏷",text:"Tag added",sub:(contact.tags||[])[0]||"vip",c:C.y},{t:"1d",icon:"✅",text:"Resolved conv",sub:"Fixed",c:C.g},{t:"2d",icon:"👤",text:"Assigned",sub:assignedAg?.name||"Agent",c:C.p},{t:"1w",icon:"📋",text:"CSAT: "+(contact.csat||"4.2")+"★",sub:"Feedback",c:C.g},{t:"2w",icon:"🆕",text:"Created",sub:"Signup",c:C.a}]).map((ev:any,i:number,arr:any[])=>(
              <div key={i} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.b1}22`,position:"relative"}}>
                {i<arr.length-1&&<div style={{position:"absolute",left:11,top:26,width:1,height:"calc(100% - 10px)",background:C.b1}}/>}
                <div style={{width:22,height:22,borderRadius:"50%",background:ev.c+"18",border:`1px solid ${ev.c}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,zIndex:1}}>{ev.icon}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:C.t1}}>{ev.text}</div><div style={{fontSize:9,color:C.t3,marginTop:1}}>{ev.sub}</div></div>
                <span style={{fontSize:8,color:C.t3,fontFamily:FM,flexShrink:0}}>{ev.t}</span>
              </div>
            ))}
          </div>}
        </div>}

        {rtab==="history"&&<div style={{animation:"fadeUp .2s ease"}}>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:12}}>ACTIVITY TIMELINE</div>
          {[{icon:"●",text:"Conversation opened",time:conv?.time+" ago",color:C.g},
            {icon:"⊕",text:`Assigned to ${assignedAg?.name||"nobody"}`,time:conv?.time+" ago",color:C.a},
            {icon:"▲",text:`Priority: ${conv?.priority}`,time:conv?.time+" ago",color:prC(conv?.priority)||C.t3},
            {icon:"⬤",text:`Channel: ${conv?.ch}`,time:conv?.time+" ago",color:chC(conv?.ch)},
            ...(conv?.status==="resolved"?[{icon:"⊘",text:"Conversation resolved",time:"recently",color:C.g}]:[])
          ].map((ev,i,arr)=>(
            <div key={i} style={{display:"flex",gap:10,paddingBottom:14}}>
              <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{color:ev.color,fontSize:13}}>{ev.icon}</span>
                {i<arr.length-1&&<div style={{width:1,flex:1,background:C.b1,minHeight:10}}/>}
              </div>
              <div><div style={{fontSize:12,color:C.t1,lineHeight:1.4}}>{ev.text}</div><div style={{fontSize:9.5,color:C.t3,marginTop:2,fontFamily:FM}}>{ev.time}</div></div>
            </div>
          ))}
        </div>}
      </div>
    </aside>}
    {/* Panel toggle */}
    <button onClick={()=>setRpCollapsed(p=>!p)} style={{position:"absolute",right:rpCollapsed?4:300,top:"50%",transform:"translateY(-50%)",width:20,height:40,borderRadius:rpCollapsed?"0 6px 6px 0":"6px 0 0 6px",background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.t3,zIndex:10,transition:"right .2s"}}>{rpCollapsed?"◂":"▸"}</button>
    </>}

    {/* MODALS */}

    {/* Conversation rating (after resolve) */}
    {conv?.status==="resolved"&&!convRatings[aid]&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:30,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:14,padding:"14px 20px",boxShadow:"0 10px 40px rgba(0,0,0,.5)",animation:"fadeUp .3s ease",textAlign:"center"}}>
      <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:8}}>How was this conversation?</div>
      <div style={{display:"flex",gap:4,justifyContent:"center"}}>
        {[1,2,3,4,5].map(s=>(
          <button key={s} onClick={()=>rateConv(aid,s)} style={{width:36,height:36,borderRadius:8,fontSize:18,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}} className="hov" onMouseEnter={e=>{e.currentTarget.style.background=C.y+"22";e.currentTarget.style.transform="scale(1.15)";}} onMouseLeave={e=>{e.currentTarget.style.background=C.s3;e.currentTarget.style.transform="scale(1)";}}>{s<=3?["😞","😐","🙂"][s-1]:s===4?"😊":"🤩"}</button>
        ))}
      </div>
      <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:6}}>Rate to close this prompt</div>
    </div>}
    {convRatings[aid]&&conv?.status==="resolved"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:30,background:C.gd,border:`1px solid ${C.g}44`,borderRadius:10,padding:"8px 16px",fontSize:11,color:C.g,fontWeight:700,fontFamily:FM}}>Rated {convRatings[aid]}★ — Thanks!</div>}

    {showAssign&&<Mdl title="Assign Conversation" onClose={()=>{setShowAssign(false);setAssignSearch("");setAssignTab("agents");}} w={440}>
      {/* Search */}
      <div style={{marginBottom:10}}><input value={assignSearch} onChange={e=>setAssignSearch(e.target.value)} placeholder="Search agents or teams…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none",boxSizing:"border-box"}}/></div>
      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:10}}>
        {[["agents","👤 Agents"],["teams","👥 Teams"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAssignTab(id)} style={{padding:"8px 16px",fontSize:12,fontWeight:700,fontFamily:FM,color:assignTab===id?C.a:C.t3,borderBottom:`2.5px solid ${assignTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      {/* Agents tab */}
      {assignTab==="agents"&&<div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:350,overflowY:"auto"}}>
        <button onClick={()=>assignTo(null)} className="hov" style={{padding:"9px 12px",borderRadius:10,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"left",color:C.y,fontSize:12,fontFamily:FB}}>⚠ Unassign</button>
        {/* Online agents first */}
        {(()=>{
          const q=assignSearch.toLowerCase();
          const filtered=agents.filter(a=>!q||a.name?.toLowerCase().includes(q)||a.email?.toLowerCase().includes(q)||a.role?.toLowerCase().includes(q));
          const online=filtered.filter(a=>a.status==="online");
          const offline=filtered.filter(a=>a.status!=="online");
          const renderAgent=(a)=>(
            <button key={a.id} onClick={()=>assignTo(a.id)} className="hov" style={{padding:"9px 12px",borderRadius:10,background:conv?.agent===a.id?C.ad:"transparent",border:`1px solid ${conv?.agent===a.id?C.a+"44":C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,width:"100%"}}>
              <div style={{position:"relative"}}><Av i={a.av} c={a.color} s={30}/><span style={{position:"absolute",bottom:-1,right:-1,width:9,height:9,borderRadius:"50%",border:`2px solid ${C.s2}`,background:a.status==="online"?C.g:a.status==="busy"?C.y:C.t3}}/></div>
              <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{a.role} · {a.email}</div></div>
              <span style={{fontSize:9,fontWeight:700,fontFamily:FM,padding:"2px 7px",borderRadius:5,background:a.status==="online"?C.g+"18":a.status==="busy"?C.y+"18":C.s3,color:a.status==="online"?C.g:a.status==="busy"?C.y:C.t3}}>{a.status}</span>
              {conv?.agent===a.id&&<span style={{color:C.a,fontSize:14}}>✓</span>}
            </button>
          );
          return<>{online.length>0&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.g,letterSpacing:".5px",padding:"4px 4px 2px",display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:C.g}}/>ONLINE ({online.length})</div>{online.map(renderAgent)}</>}
          {offline.length>0&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,letterSpacing:".5px",padding:"6px 4px 2px"}}>OFFLINE ({offline.length})</div>{offline.map(renderAgent)}</>}
          {filtered.length===0&&<div style={{padding:16,textAlign:"center",color:C.t3,fontSize:12}}>No agents found</div>}</>;
        })()}
      </div>}
      {/* Teams tab */}
      {assignTab==="teams"&&<div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:350,overflowY:"auto"}}>
        {conv?.team&&<button onClick={()=>assignTo(undefined,null)} className="hov" style={{padding:"9px 12px",borderRadius:10,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"left",color:C.y,fontSize:12,fontFamily:FB}}>⚠ Remove from team</button>}
        {(()=>{
          const q=assignSearch.toLowerCase();
          const filtered=teams.filter(t=>!q||t.name?.toLowerCase().includes(q)||(t.desc||"").toLowerCase().includes(q));
          return<>{filtered.map(t=>{
            const isCurrent=conv?.team===t.id;
            const teamAgents=agents.filter(a=>(t.members||[]).includes(a.id));
            const onlineCount=teamAgents.filter(a=>a.status==="online").length;
            return(
            <div key={t.id} style={{borderRadius:10,border:`1px solid ${isCurrent?C.a+"44":C.b1}`,background:isCurrent?C.ad:C.s1,overflow:"hidden"}}>
              <div className="hov" onClick={()=>assignTo(undefined,t.id)} style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:C.a+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>👥</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700}}>{t.name}{isCurrent&&<span style={{color:C.a,marginLeft:6,fontSize:11}}>✓ Current</span>}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{t.desc||"No description"} · {teamAgents.length} members · {onlineCount} online</div>
                </div>
              </div>
              {/* Team members - assign directly */}
              {teamAgents.length>0&&<div style={{borderTop:`1px solid ${C.b1}22`,padding:"6px 10px",display:"flex",gap:4,flexWrap:"wrap"}}>
                {teamAgents.map(a=>(
                  <button key={a.id} onClick={()=>assignTo(a.id,t.id)} className="hov" title={`Assign to ${a.name} (${t.name})`} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:6,background:conv?.agent===a.id?C.a+"18":"transparent",border:`1px solid ${conv?.agent===a.id?C.a+"44":C.b1}`,cursor:"pointer",fontSize:10,fontWeight:600,color:conv?.agent===a.id?C.a:C.t2}}>
                    <div style={{position:"relative"}}><Av i={a.av} c={a.color} s={18}/><span style={{position:"absolute",bottom:-1,right:-1,width:6,height:6,borderRadius:"50%",border:`1.5px solid ${C.s1}`,background:a.status==="online"?C.g:C.t3}}/></div>
                    {a.name}
                  </button>
                ))}
              </div>}
            </div>
          );})}{filtered.length===0&&<div style={{padding:16,textAlign:"center",color:C.t3,fontSize:12}}>No teams found</div>}</>;
        })()}
      </div>}
    </Mdl>}

    {showTransfer&&<Mdl title="Transfer to Team" onClose={()=>setShowTransfer(false)} w={380}>
      <p style={{fontSize:13,color:C.t2,marginBottom:14}}>Select a team to transfer this conversation:</p>
      {teams.map(t=>{
        const teamAgents=agents.filter(a=>(t.members||[]).includes(a.id));
        const onlineCount=teamAgents.filter(a=>a.status==="online").length;
        return(
        <div key={t.id} className="hov" onClick={()=>doTransfer(t.id)} style={{padding:"12px 14px",borderRadius:10,background:conv?.team===t.id?C.ad:C.s1,border:`1px solid ${conv?.team===t.id?C.a+"44":C.b1}`,cursor:"pointer",marginBottom:8}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{t.name}{conv?.team===t.id&&<span style={{color:C.a,marginLeft:6,fontSize:10}}>✓</span>}</div>
          <div style={{fontSize:11.5,color:C.t3}}>{t.desc} · {teamAgents.length} agents · {onlineCount} online</div>
        </div>
      );})}
    </Mdl>}

    {showSnooze&&<Mdl title="Snooze Conversation" onClose={()=>setShowSnooze(false)} w={360}>
      <p style={{fontSize:13,color:C.t2,marginBottom:14}}>Resume this conversation after:</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[[1,"1 hour"],[2,"2 hours"],[4,"4 hours"],[8,"8 hours"],[24,"Tomorrow"],[72,"3 days"]].map(([h,lbl])=>(
          <button key={h} onClick={()=>doSnooze(h)} className="hov" style={{padding:"12px",borderRadius:10,background:C.s1,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:13,color:C.t1,fontFamily:FB,transition:"background .12s"}}>{lbl}</button>
        ))}
      </div>
    </Mdl>}

    {/* Merge conversation modal */}
    {showMerge&&<Mdl title="Merge Conversations" onClose={()=>setShowMerge(false)} w={440}>
      <p style={{fontSize:12.5,color:C.t2,marginBottom:14,lineHeight:1.5}}>Merge <strong style={{color:C.t1}}>#{aid}</strong> into another conversation. Messages will be combined and this conversation will be closed.</p>
      <Fld label="Merge into:">
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflowY:"auto"}}>
          {convs.filter(c=>c.id!==aid&&c.status==="open").map(cv=>{const ct=contacts.find(x=>x.id===cv.cid);return(
            <button key={cv.id} onClick={()=>setMergeTarget(cv.id)} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:mergeTarget===cv.id?C.ad:C.s2,border:`1.5px solid ${mergeTarget===cv.id?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"left",transition:"all .12s"}}>
              <Av i={ct?.av||"?"} c={cv.color} s={24}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{cv.subject}</div><div style={{fontSize:10,color:C.t3}}>{ct?.name} · {cv.ch}</div></div>
              {mergeTarget===cv.id&&<span style={{color:C.a}}>✓</span>}
            </button>
          );})}
        </div>
      </Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowMerge(false)}/><Btn ch="Merge Conversations" v="primary" onClick={mergeConvs}/></div>
    </Mdl>}

    {showSaveView&&<Mdl title="Save Current View" onClose={()=>setShowSaveView(false)} w={360}>
      <Fld label="View Name"><Inp val={svName} set={setSvName} ph="e.g. My Open Chats"/></Fld>
      <Fld label="Icon">
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {["📌","⭐","🔥","✅","💬","📧","🚀","🏷","👤","⚡"].map(ic=>(
            <button key={ic} onClick={()=>setSvIcon(ic)} style={{width:32,height:32,borderRadius:7,fontSize:16,background:svIcon===ic?C.ad:"transparent",border:`1.5px solid ${svIcon===ic?C.a:C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</button>
          ))}
        </div>
      </Fld>
      <div style={{fontSize:11,color:C.t3,marginBottom:14}}>Saves: status=<strong>{fStatus}</strong>, channel=<strong>{fCh}</strong>, owner=<strong>{fOwner}</strong></div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowSaveView(false)}/><Btn ch="Save View" v="primary" onClick={saveCurrentView}/></div>
    </Mdl>}

    {showNewConv&&<NewConvMdl contacts={contacts} inboxes={inboxes} agents={agents} onClose={()=>setShowNewConv(false)}
      onCreate={async data=>{
        const ct=contacts.find(c=>c.id===data.cid);
        const ib=inboxes.find(i=>i.id===data.iid);
        const subject=(data.subject||"New conversation").trim();
        const firstMsg=(data.msg||"").trim();
        const isEmailInbox=(ib?.type||"live")==="email";
        if(!api.isConnected()){
          showT("API disconnected. Conversation was not created","error");
          return;
        }
        if(isEmailInbox&&firstMsg&&!ct?.email){
          showT("Selected contact has no email address","error");
          return;
        }
        try{
          const created=await api.post("/conversations",{
            subject,
            contact_id:data.cid,
            inbox_id:data.iid,
            assignee_id:data.agent||null,
          });
          const savedConv=created?.conversation;
          if(!savedConv?.id){
            throw new Error("Conversation create failed");
          }
          const convRow={
            ...savedConv,
            cid:savedConv.contact_id||data.cid,
            iid:savedConv.inbox_id||data.iid,
            ch:ib?.type||savedConv.inbox_type||"live",
            agent:savedConv.assignee_id??data.agent??null,
            team:savedConv.team_id??null,
            labels:typeof savedConv.labels==="string"?JSON.parse(savedConv.labels||"[]"):savedConv.labels||[],
            unread:0,
            time:savedConv.updated_at||savedConv.created_at||"now",
            color:ct?.color||savedConv.color||C.a,
            contact_name:ct?.name||savedConv.contact_name,
            contact_email:ct?.email||savedConv.contact_email,
            inbox_name:ib?.name||savedConv.inbox_name,
          };
          setConvs(p=>[convRow,...p.filter(c=>c.id!==savedConv.id)]);
          if(firstMsg){
            const msgRes=await api.post(`/conversations/${savedConv.id}/messages`,{
              role:"agent",
              text:firstMsg,
              ...(isEmailInbox?{
                toEmail:ct?.email||"",
                contactId:ct?.id||data.cid,
                contactName:ct?.name||"Customer",
                emailSubject:subject,
              }:{})
            });
            if(msgRes?.message){
              setMsgs(p=>({...p,[savedConv.id]:[{...msgRes.message,aid:msgRes.message.agent_id,t:msgRes.message.created_at?.split?.("T")?.[1]?.slice(0,5)||""}]}));
            }
          }
          setAid(savedConv.id);setShowNewConv(false);showT(isEmailInbox&&firstMsg?"Conversation created and email sent!":"Conversation created!","success");
        }catch(e){
          showT(e?.message||"Failed to create conversation","error");
        }
      }}/>}

    {/* ══ MESSAGE POPUP ══ */}
    {popupMsg&&<div onClick={e=>{if(e.target===e.currentTarget)setPopupMsg(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,animation:"fadeIn .15s ease"}}>
      <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:16,width:"min(860px,92vw)",maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 30px 80px rgba(0,0,0,.6)",animation:"fadeUp .2s ease",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"flex-start",gap:12,flexShrink:0}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
              {popupMsg.isNt&&<span style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.y,background:C.y+"22",padding:"2px 7px",borderRadius:4,letterSpacing:"0.4px"}}>📝 INTERNAL NOTE</span>}
              {popupMsg.isAg
                ?<><span style={{fontSize:12,fontWeight:700,color:C.t1}}>{popupMsg.ag?.name||"Agent"}</span><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>→ agent reply</span></>
                :<><span style={{fontSize:12,fontWeight:700,color:C.t1}}>{popupMsg.conv?.contact_name||"Customer"}</span><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>→ inbound</span></>}
              {popupMsg.html&&<span style={{fontSize:9,color:C.a,background:C.ad,padding:"2px 6px",borderRadius:4,fontFamily:FM,fontWeight:600}}>📧 HTML Email</span>}
            </div>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{popupMsg.created_at||popupMsg.t||""}{popupMsg.conv?.subject?` · ${popupMsg.conv.subject}`:""}</div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>copyMsg(popupMsg.text)} title="Copy text" style={{padding:"5px 10px",borderRadius:7,fontSize:11,color:C.t2,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FM}}>⎘ Copy</button>
            <button onClick={()=>{setReplyTo(popupMsg);setPopupMsg(null);}} title="Reply to this message" style={{padding:"5px 10px",borderRadius:7,fontSize:11,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>↩ Reply</button>
            <button onClick={()=>setPopupMsg(null)} style={{width:30,height:30,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:C.t3,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer"}}>×</button>
          </div>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:0}}>
          {popupMsg.html
            ?<iframe srcDoc={popupMsg.html} sandbox="" style={{width:"100%",minHeight:400,border:"none",display:"block"}}
                onLoad={(e:any)=>{try{const h=e.target.contentDocument?.documentElement?.scrollHeight||400;e.target.style.height=Math.min(Math.max(h,200),700)+"px";}catch{}}}/>
            :<pre style={{margin:0,padding:"18px 22px",fontSize:13.5,color:C.t1,fontFamily:FB,lineHeight:1.65,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{popupMsg.text}</pre>}
          {normalizeAttachmentList(popupMsg.attachments||[]).length>0&&<div style={{padding:"10px 18px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:"100%",marginBottom:4}}>Attachments</span>
            {normalizeAttachmentList(popupMsg.attachments||[]).map((att:any,i:number)=>{
              const href=attachmentHref(att)||"#";
              const isImg=/\.(png|jpe?g|gif|webp|svg)$/i.test(att.name||att.url||"");
              return isImg
                ?<a key={i} href={href} target="_blank" rel="noreferrer"><img src={href} alt={att.name} style={{maxWidth:200,maxHeight:160,borderRadius:8,border:`1px solid ${C.b1}`,objectFit:"cover"}}/></a>
                :<a key={i} href={href} target="_blank" rel="noreferrer" download={att.name} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,background:C.bg,border:`1px solid ${C.b1}`,textDecoration:"none",fontSize:11,color:C.t2}}>
                  <span>📎</span><span style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</span>
                </a>;
            })}
          </div>}
        </div>
      </div>
    </div>}
  </div>;
}

function NewConvMdl({contacts,inboxes,agents,onClose,onCreate}){
  const [cid,setCid]=useState(contacts[0]?.id||"");
  const [iid,setIid]=useState(inboxes[0]?.id||"");
  const [subject,setSubject]=useState("");
  const [msg,setMsg]=useState("");
  const [agent,setAgent]=useState("");
  const [creating,setCreating]=useState(false);
  const [fbUsers,setFbUsers]=useState([]);
  const [fbLoading,setFbLoading]=useState(false);
  const [fbQ,setFbQ]=useState("");
  const selInbox=inboxes.find(i=>i.id===iid);
  const isFbInbox=selInbox?.type==="facebook";

  const loadFb=async(q?:string)=>{
    setFbLoading(true);
    try{const r=await api.get("/facebook/users"+(q?"?q="+encodeURIComponent(q):""));setFbUsers(r?.users||[]);}catch{setFbUsers([]);}
    setFbLoading(false);
  };
  useEffect(()=>{if(isFbInbox)loadFb();},[iid]);

  // Filter contacts for Facebook inbox: show fb contacts first
  const sortedContacts=isFbInbox
    ?[...contacts].sort((a,b)=>{const aFb=(a.tags||[]).includes("facebook")||String(a.phone||"").startsWith("fb:");const bFb=(b.tags||[]).includes("facebook")||String(b.phone||"").startsWith("fb:");if(aFb!==bFb)return aFb?-1:1;return 0;})
    :contacts;

  return <Mdl title="New Conversation" onClose={onClose} w={isFbInbox?600:undefined}>
    <Fld label="Inbox"><Sel val={iid} set={setIid} opts={inboxes.map(i=>({v:i.id,l:i.name+(i.type==="facebook"?" (Facebook)":i.type==="whatsapp"?" (WhatsApp)":"")}))}/></Fld>
    <Fld label="Contact"><Sel val={cid} set={setCid} opts={sortedContacts.map(c=>({v:c.id,l:c.name+((c.tags||[]).includes("facebook")?" [FB]":"")}))}/></Fld>

    {/* Facebook users quick pick */}
    {isFbInbox&&<div style={{margin:"0 0 12px",padding:"10px 12px",background:"#1877F208",border:"1px solid #1877F222",borderRadius:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:"#1877F2",fontFamily:FM}}>Facebook Page Users</span>
        <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{fbUsers.length} users</span>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        <input value={fbQ} onChange={e=>setFbQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")loadFb(fbQ);}} placeholder="Search FB users..." style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.b1}`,fontSize:11,background:C.bg,color:C.t1,outline:"none",fontFamily:FB}}/>
        <button onClick={()=>loadFb(fbQ)} style={{padding:"5px 10px",borderRadius:6,fontSize:10,fontWeight:700,color:"#fff",background:"#1877F2",border:"none",cursor:"pointer"}}>Search</button>
      </div>
      {fbLoading&&<div style={{textAlign:"center",padding:"8px 0"}}><Spin/></div>}
      {!fbLoading&&<div style={{maxHeight:150,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
        {fbUsers.map(u=>{
          // Find matching contact
          const matchCt=contacts.find(c=>String(c.phone||"")===("fb:"+u.fbId));
          return <div key={u.fbId} onClick={()=>{if(matchCt)setCid(matchCt.id);}} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:matchCt&&cid===matchCt.id?"#1877F218":C.s1,border:`1px solid ${matchCt&&cid===matchCt.id?"#1877F244":C.b1}`,borderRadius:8,cursor:matchCt?"pointer":"default",opacity:matchCt?1:0.6}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"#1877F218",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#1877F2"}}>{(u.name||"?")[0]?.toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{u.messageCount||0} msgs</div>
            </div>
            {matchCt
              ?<span style={{fontSize:9,color:cid===matchCt.id?"#1877F2":C.g,fontWeight:700,fontFamily:FM}}>{cid===matchCt.id?"Selected":"Select"}</span>
              :<span style={{fontSize:9,color:C.t3,fontFamily:FM}}>Not in contacts</span>
            }
          </div>;
        })}
        {fbUsers.length===0&&!fbLoading&&<div style={{textAlign:"center",fontSize:10,color:C.t3,padding:"8px 0"}}>No Facebook users found</div>}
      </div>}
    </div>}

    <Fld label="Subject"><Inp val={subject} set={setSubject} ph="What is this conversation about?"/></Fld>
    <Fld label="First Message (optional)"><textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type a first message…" rows={3} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none"}}/></Fld>
    <Fld label="Assign To (optional)"><Sel val={agent} set={setAgent} opts={[{v:"",l:"Unassigned"},...agents.map(a=>({v:a.id,l:a.name}))]}/></Fld>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
      <Btn ch="Cancel" v="ghost" onClick={()=>{if(!creating)onClose();}}/>
      <Btn ch={creating?"Creating...":"Create Conversation"} v="primary" onClick={async()=>{if(creating)return;setCreating(true);try{await onCreate({cid,iid,subject,msg,agent:agent||null});}finally{setCreating(false);}}}/>
    </div>
  </Mdl>;
}
