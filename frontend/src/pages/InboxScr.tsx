import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel, InfoRow } from "../shared";

// ─── INBOX SCREEN ─────────────────────────────────────────────────────────
const EMOJI_SET=["😀","😂","😍","🤔","😢","🙏","👍","👎","❤️","🔥","✅","❌","⚡","🎉","💯","👋","🤝","💡","⭐","🚀","😊","🤗","😎","🤷","😅","💪","👏","🙌","😇","🫡"];

export default function InboxScr({agents,labels,inboxes,teams,canned,contacts,convs,setConvs,msgs,setMsgs,aid,setAid,soundOn,aiAutoReply,setAiAutoReply,aiChannels,setAiChannels,customFields,getCfVal,setCfVal,csatPending,setCsatPending,snoozeConv,convViewers,savedViews,setSavedViews}){
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
  const [showSnooze,setShowSnooze]=useState(false);
  const [showNewConv,setShowNewConv]=useState(false);
  const [showLblPick,setShowLblPick]=useState(false);
  const [aiReplying,setAiReplying]=useState(false);
  const [isNote,setIsNote]=useState(false);
  const [showEmoji,setShowEmoji]=useState(false);
  const [showMsgSearch,setShowMsgSearch]=useState(false);
  const [msgSearchQ,setMsgSearchQ]=useState("");
  const [replyTo,setReplyTo]=useState(null);
  const [editMsgId,setEditMsgId]=useState(null);
  const [editMsgText,setEditMsgText]=useState("");
  const [showConvConfig,setShowConvConfig]=useState(false);
  const [rpCollapsed,setRpCollapsed]=useState(false);
  // ── Bulk actions ──
  const [bulkMode,setBulkMode]=useState(false);
  const [bulkSel,setBulkSel]=useState([]);
  const toggleBulk=id=>setBulkSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const bulkResolve=()=>{setConvs(p=>p.map(c=>bulkSel.includes(c.id)?{...c,status:"resolved"}:c));showT(bulkSel.length+" conversations resolved","success");setBulkSel([]);setBulkMode(false);};
  const bulkAssign=agId=>{setConvs(p=>p.map(c=>bulkSel.includes(c.id)?{...c,agent:agId}:c));showT(bulkSel.length+" conversations assigned","success");setBulkSel([]);setBulkMode(false);};
  const bulkLabel=lbl=>{setConvs(p=>p.map(c=>bulkSel.includes(c.id)?{...c,labels:[...new Set([...c.labels,lbl])]}:c));showT("Label added to "+bulkSel.length+" conversations","success");setBulkSel([]);setBulkMode(false);};
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
  const [emailCc,setEmailCc]=useState("");
  const [emailBcc,setEmailBcc]=useState("");
  const [emailSubject,setEmailSubject]=useState("");
  const [showCcBcc,setShowCcBcc]=useState(false);
  // ── File attachments ──
  const [attachments,setAttachments]=useState([]);
  const [dragOver,setDragOver]=useState(false);
  const addAttach=(name,size)=>setAttachments(p=>[...p,{id:uid(),name,size,progress:100}]);
  const removeAttach=id=>setAttachments(p=>p.filter(a=>a.id!==id));
  const handleDrop=e=>{e.preventDefault();setDragOver(false);const files=e.dataTransfer?.files;if(files)Array.from(files).forEach(f=>addAttach(f.name,(f.size/1024).toFixed(1)+"KB"));};
  const handleFilePick=()=>{addAttach("document_"+uid()+".pdf","245KB");showT("File attached","success");};
  const msgEnd=useRef(null);
  const autoRef=useRef(false);
  const replyingRef=useRef(false);
  const aiChRef=useRef(aiChannels);
  autoRef.current=aiAutoReply;
  replyingRef.current=aiReplying;
  aiChRef.current=aiChannels;

  const conv=convs.find(c=>c.id===aid);
  const contact=conv?contacts.find(c=>c.id===conv.cid):null;
  const isEmailCh=conv?.ch==="email";
  const convMsgs=msgs[aid]||[];
  const assignedAg=conv?agents.find(a=>a.id===conv.agent):null;
  const lc=t=>labels.find(l=>l.title===t)?.color||C.t2;

  const filtered=convs.filter(cv=>{
    const ct=contacts.find(c=>c.id===cv.cid);
    if(fStatus!=="all"&&cv.status!==fStatus)return false;
    if(fCh!=="all"&&cv.ch!==fCh)return false;
    if(fOwner==="mine"&&cv.agent!=="a1")return false;
    if(fOwner==="unassigned"&&cv.agent)return false;
    if(search&&!ct?.name.toLowerCase().includes(search.toLowerCase())&&!cv.subject.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const ownerCounts={
    all:convs.filter(cv=>fStatus==="all"||cv.status===fStatus).length,
    mine:convs.filter(cv=>(fStatus==="all"||cv.status===fStatus)&&cv.agent==="a1").length,
    unassigned:convs.filter(cv=>(fStatus==="all"||cv.status===fStatus)&&!cv.agent).length,
  };

  useEffect(()=>{msgEnd.current?.scrollIntoView({behavior:"smooth"});},[convMsgs.length,aid]);

  // ── Fetch messages from API when switching conversations ──
  const [msgsLoading,setMsgsLoading]=useState(false);
  useEffect(()=>{
    if(!api.isConnected()||!aid)return;
    if(msgs[aid]?.length>0)return; // Already loaded
    setMsgsLoading(true);
    (async()=>{
      try{
        const res=await api.get(`/conversations/${aid}/messages`);
        if(res?.messages?.length){
          setMsgs(p=>({...p,[aid]:res.messages.map(m=>({...m,aid:m.agent_id,t:m.created_at?.split("T")[1]?.slice(0,5)||""}))}));
        }
      }catch{}
      setMsgsLoading(false);
    })();
  },[aid]);

  const prevCounts=useRef({});
  useEffect(()=>{
    Object.keys(msgs).forEach(convId=>{
      const allM=msgs[convId]||[];
      const prev=prevCounts.current[convId]||0;
      const cur=allM.length;
      if(cur>prev){
        const last=allM[cur-1];
        if(last?.role==="contact"&&autoRef.current&&!replyingRef.current){
          const cv=convs.find(c=>c.id===convId);
          if(cv&&aiChRef.current[cv.ch]!==false){
            doAiAutoReply(allM,convId);
          }
        }
      }
      prevCounts.current[convId]=cur;
    });
  },[msgs]);

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
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:350,
          system:`You are a professional, empathetic customer support agent at SupportDesk. Customer: ${ct?.name||"Customer"} (${ct?.company||""}, ${ct?.plan||""} plan). Subject: ${cv?.subject||"Support request"}. Channel: ${cv?.ch||"live chat"}. Reply directly and helpfully. Be concise (2-4 sentences), warm, solution-focused. Do not use markdown. Do not mention being an AI.`,
          messages:merged
        })
      });
      const data=await res.json();
      const reply=data.content?.[0]?.text||"Thank you for your message. I am looking into this right away.";
      setMsgs(p=>({...p,[convId]:[...(p[convId]||[]),{id:uid(),role:"agent",aid:"a1",text:reply,t:now(),auto:true}]}));
      setConvs(p=>p.map(c=>c.id===convId?{...c,unread:0,time:"now"}:c));
    }catch(e){
      setMsgs(p=>({...p,[convId]:[...(p[convId]||[]),{id:uid(),role:"agent",aid:"a1",text:"Thank you for reaching out. I am on this and will get back to you with a resolution shortly.",t:now(),auto:true}]}));
    }
    setAiReplying(false);
  };

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

  const sendMsg=()=>{
    if(!inp.trim()&&!editMsgId)return;
    const txt=inp.trim();setInp("");setShowCanned(false);setShowEmoji(false);
    // Edit existing message
    if(editMsgId){
      setMsgs(p=>({...p,[aid]:(p[aid]||[]).map(m=>m.id===editMsgId?{...m,text:txt,edited:true}:m)}));
      setEditMsgId(null);setEditMsgText("");showT("Message edited","success");return;
    }
    const newMsg={id:uid(),role:isNote?"note":"agent",aid:"a1",text:txt,t:now(),isNote:isNote,replyTo:replyTo?.id||null,replyText:replyTo?.text?.slice(0,60)||null,read:true};
    setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),newMsg]}));
    setConvs(p=>p.map(c=>c.id===aid?{...c,unread:0,time:"now"}:c));
    setReplyTo(null);
    // ── Sync to API (background, non-blocking) ──
    if(api.isConnected()){
      api.post(`/conversations/${aid}/messages`,{role:isNote?"note":"agent",text:txt}).catch(()=>{});
    }
    if(isNote)return; // Notes don't trigger replies
    const pool=REPLY_POOL[aid]||["Thanks for the reply!"];
    setTimeout(()=>{
      setTyping(true);
      setTimeout(()=>{
        setTyping(false);
        setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),{id:uid(),role:"contact",text:pool[Math.floor(Math.random()*pool.length)],t:now(),read:false}]}));
        setConvs(p=>p.map(c=>c.id===aid?{...c,unread:autoRef.current?0:1,time:"now"}:c));
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
  const exportChat=()=>{const txt=convMsgs.map(m=>m.role==="sys"?`[${m.text}]`:`[${m.role==="agent"?"Agent":"Customer"}] ${m.text}`).join("\n");navigator.clipboard?.writeText(txt);showT("Chat exported to clipboard","success");};
  const blockContact=()=>showT("Contact blocked","warn");

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
  const assignTo=agId=>{
    setConvs(p=>p.map(c=>c.id===aid?{...c,agent:agId||null}:c));
    setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),{id:uid(),role:"sys",text:agId?`Assigned to ${agents.find(a=>a.id===agId)?.name}`:"Unassigned"}]}));
    if(api.isConnected())api.patch(`/conversations/${aid}`,{agent_id:agId||null}).catch(()=>{});
    setShowAssign(false);showT("Assignment updated","success");
  };
  const doTransfer=tid=>{
    setConvs(p=>p.map(c=>c.id===aid?{...c,team:tid}:c));
    setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),{id:uid(),role:"sys",text:`Transferred to ${teams.find(t=>t.id===tid)?.name}`}]}));
    if(api.isConnected())api.patch(`/conversations/${aid}`,{team_id:tid}).catch(()=>{});
    setShowTransfer(false);showT("Transferred","success");
  };
  const doSnooze=h=>{
    setConvs(p=>p.map(c=>c.id===aid?{...c,status:"snoozed"}:c));
    setMsgs(p=>({...p,[aid]:[...(p[aid]||[]),{id:uid(),role:"sys",text:`Snoozed for ${h} hour${h>1?"s":""}`}]}));
    setShowSnooze(false);showT(`Snoozed ${h}h`,"warn");
  };
  const callClaude=async(sysprompt,userprompt)=>{
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
        system:sysprompt,messages:[{role:"user",content:userprompt}]})
    });
    const data=await res.json();
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
    {/* LIST */}
    <aside style={{width:282,background:C.s1,borderRight:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 12px 10px",borderBottom:`1px solid ${C.b1}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:16,fontWeight:700,fontFamily:FD}}>Inbox</span>
          <button onClick={()=>setShowNewConv(true)} style={{background:C.ad,border:`1px solid ${C.a}44`,borderRadius:7,padding:"4px 10px",fontSize:11,color:C.a,cursor:"pointer",fontWeight:600}}>+ New</button>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",gap:2,background:C.s2,borderRadius:6,padding:2,border:`1px solid ${C.b1}`}}>
            <button onClick={()=>setViewMode("list")} title="List view" style={{width:26,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:viewMode==="list"?C.ad:"transparent",color:viewMode==="list"?C.a:C.t3,border:"none",cursor:"pointer"}}>☰</button>
            <button onClick={()=>setViewMode("kanban")} title="Kanban view" style={{width:26,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:viewMode==="kanban"?C.ad:"transparent",color:viewMode==="kanban"?C.a:C.t3,border:"none",cursor:"pointer"}}>▥</button>
          </div>
          <button onClick={()=>setBulkMode(p=>!p)} title="Bulk select" style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:bulkMode?C.yd:"transparent",color:bulkMode?C.y:C.t3,border:`1px solid ${bulkMode?C.y+"55":C.b1}`}}>{bulkMode?"✓ Bulk":"☐"}</button>
          <div style={{flex:1}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"7px 10px"}}>
          <span style={{color:C.t3}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{background:"none",border:"none",fontSize:12,color:C.t1,flex:1,outline:"none",fontFamily:FB}}/>
          {search&&<span onClick={()=>setSearch("")} style={{color:C.t3,cursor:"pointer"}}>×</span>}
        </div>
      </div>

      {/* ALL / MINE / UNASSIGNED tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`}}>
        {[["all","All"],["mine","Mine"],["unassigned","Unassigned"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setFOwner(id)} style={{flex:1,padding:"9px 4px",fontSize:11,fontWeight:700,fontFamily:FM,letterSpacing:"0.3px",color:fOwner===id?C.a:C.t3,background:fOwner===id?C.ad:"transparent",borderBottom:`2px solid ${fOwner===id?C.a:"transparent"}`,border:"none",cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {lbl}
            <span style={{minWidth:18,height:16,borderRadius:10,background:fOwner===id?C.a+"22":C.b1,color:fOwner===id?C.a:C.t3,fontSize:9,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 5px",fontFamily:FM,transition:"all .15s"}}>{ownerCounts[id]}</span>
          </button>
        ))}
      </div>

      <div style={{display:"flex",padding:"7px 10px",gap:3,borderBottom:`1px solid ${C.b1}`,flexWrap:"wrap",alignItems:"center"}}>
        {savedViews.map(sv=><button key={sv.id} onClick={()=>applyView(sv)} onContextMenu={e=>{e.preventDefault();delView(sv.id);}} title="Right-click to remove" style={{padding:"3px 8px",borderRadius:16,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.pd,color:C.p,border:`1px solid ${C.p}33`}}>{sv.icon} {sv.name}</button>)}
        <button onClick={()=>setShowSaveView(true)} style={{padding:"3px 6px",borderRadius:16,fontSize:9,color:C.t3,background:"transparent",border:`1px dashed ${C.b2}`,cursor:"pointer"}}>+ Save View</button>
      </div>
      <div style={{display:"flex",padding:"7px 10px",gap:3,borderBottom:`1px solid ${C.b1}`,flexWrap:"wrap"}}>
        {["open","resolved","snoozed","all"].map(s=>(
          <button key={s} onClick={()=>setFStatus(s)} style={{padding:"3px 8px",borderRadius:20,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:fStatus===s?C.ad:"transparent",color:fStatus===s?C.a:C.t3,border:`1px solid ${fStatus===s?C.a+"50":C.b1}`,textTransform:"uppercase"}}>{s}</button>
        ))}
      </div>
      <div style={{display:"flex",padding:"4px 10px",gap:3,borderBottom:`1px solid ${C.b1}`,overflowX:"auto"}}>
        {["all","live","email","whatsapp","facebook","instagram","sms"].map(ch=>(
          <button key={ch} onClick={()=>setFCh(ch)} style={{padding:"3px 7px",borderRadius:6,fontSize:10,cursor:"pointer",background:fCh===ch?C.s3:"transparent",color:fCh===ch?chC(ch):C.t3,border:`1px solid ${fCh===ch?C.b2:"transparent"}`,fontFamily:FM,flexShrink:0,whiteSpace:"nowrap"}}>
            {ch==="all"?"All":<><span style={{color:chC(ch)}}>{chI(ch)}</span> {ch}</>}
          </button>
        ))}
      </div>
      {/* Bulk action bar */}
      {bulkMode&&bulkSel.length>0&&<div style={{padding:"7px 10px",background:C.ad,borderBottom:`1px solid ${C.a}44`,display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",animation:"fadeUp .15s ease"}}>
        <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.a}}>{bulkSel.length} selected</span>
        <div style={{flex:1}}/>
        <button onClick={bulkResolve} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.gd,color:C.g,border:`1px solid ${C.g}44`}}>✓ Resolve</button>
        <button onClick={()=>bulkAssign("a1")} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.s3,color:C.t2,border:`1px solid ${C.b1}`}}>Assign to me</button>
        <button onClick={()=>bulkLabel("urgent")} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,cursor:"pointer",background:C.rd,color:C.r,border:`1px solid ${C.r}44`}}>+ urgent</button>
        <button onClick={()=>{setBulkSel([]);}} style={{padding:"3px 6px",borderRadius:5,fontSize:10,cursor:"pointer",background:"none",color:C.t3,border:"none"}}>✕</button>
      </div>}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.length===0&&<EmptyState icon="💬" title="No conversations" desc="No conversations match your current filters. Try adjusting your filters or start a new conversation." action="+ New Conversation" onAction={()=>setShowNewConv(true)}/>}
        {filtered.map(cv=>{
          const ct=contacts.find(c=>c.id===cv.cid);
          const viewingAg=viewingAgents[cv.id]?agents.find(a=>a.id===viewingAgents[cv.id][0]):null;
          const lastMsg=(msgs[cv.id]||[]).filter(m=>m.role!=="sys").slice(-1)[0];
          return <div key={cv.id} className="hov" title={lastMsg?`Last: ${lastMsg.text?.slice(0,80)}…`:""} onClick={()=>{if(bulkMode){toggleBulk(cv.id);return;}setAid(cv.id);setConvs(p=>p.map(c=>c.id===cv.id?{...c,unread:0}:c));setSumData(null);setAiSugs([]);}}
            style={{padding:"11px 12px",borderBottom:`1px solid ${C.b1}`,cursor:"pointer",transition:"background .12s",background:bulkSel.includes(cv.id)?C.yd:aid===cv.id?C.ad:"transparent",borderLeft:`2.5px solid ${aid===cv.id?C.a:"transparent"}`}}>
            <div style={{display:"flex",gap:9}}>
              {bulkMode&&<input type="checkbox" checked={bulkSel.includes(cv.id)} onChange={()=>toggleBulk(cv.id)} style={{accentColor:C.a,marginTop:4,flexShrink:0}} onClick={e=>e.stopPropagation()}/>}
              <Av i={ct?.av||"?"} c={cv.color} s={34}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:12.5,fontWeight:600}}>{ct?.name||"Unknown"}</span>
                    <span style={{fontSize:10,color:chC(cv.ch)}}>{chI(cv.ch)}</span>
                    {cv.priority==="urgent"&&<span style={{width:6,height:6,borderRadius:"50%",background:C.r,animation:"pulse 1.4s infinite"}}/>}
                    {cv.priority==="high"&&<span style={{width:6,height:6,borderRadius:"50%",background:C.y}}/>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {cv.unread>0&&<span style={{background:C.a,color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:10,fontFamily:FM}}>{cv.unread}</span>}
                    <span style={{fontSize:9.5,color:C.t3,fontFamily:FM}}>{cv.time}</span>
                  </div>
                </div>
                <div style={{fontSize:11.5,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4}}>{cv.subject}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {cv.status==="resolved"&&<Tag text="resolved" color={C.g}/>}
                  {cv.status==="snoozed"&&<Tag text="snoozed" color={C.y}/>}
                  {cv.labels.slice(0,2).map(l=><Tag key={l} text={l} color={lc(l)}/>)}
                  {viewingAg&&viewingAg.id!=="a1"&&<span style={{fontSize:9,color:C.p,fontFamily:FM,display:"flex",alignItems:"center",gap:3}}>👁 {viewingAg.name.split(" ")[0]}</span>}
                  {slaTimers[cv.id]&&cv.status==="open"&&<span style={{fontSize:8,fontWeight:700,fontFamily:FM,color:getSlaColor(slaTimers[cv.id].firstReply,slaTimers[cv.id].target),background:getSlaColor(slaTimers[cv.id].firstReply,slaTimers[cv.id].target)+"18",padding:"1px 5px",borderRadius:4}}>{getSlaText(slaTimers[cv.id].firstReply,slaTimers[cv.id].target)}</span>}
                </div>
              </div>
            </div>
          </div>;
        })}
      </div>
    </aside>

    {/* ═══ KANBAN BOARD ═══ */}
    {viewMode==="kanban"&&<div style={{flex:1,display:"flex",gap:12,padding:14,overflowX:"auto",background:C.bg}}>
      {[{id:"new",label:"New",color:C.a,filter:cv=>cv.status==="open"&&!cv.agent},{id:"inprogress",label:"In Progress",color:C.cy,filter:cv=>cv.status==="open"&&cv.agent},{id:"waiting",label:"Waiting on Customer",color:C.y,filter:cv=>cv.status==="snoozed"},{id:"resolved",label:"Resolved",color:C.g,filter:cv=>cv.status==="resolved"}].map(col=>{
        const cards=convs.filter(col.filter);
        return <div key={col.id} style={{minWidth:220,flex:1,background:C.s1,borderRadius:14,border:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:col.color}}/>
            <span style={{fontSize:12,fontWeight:700,fontFamily:FD,color:C.t1}}>{col.label}</span>
            <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:col.color,background:col.color+"18",borderRadius:10,padding:"1px 7px",marginLeft:"auto"}}>{cards.length}</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:8,display:"flex",flexDirection:"column",gap:6}}>
            {cards.slice(0,10).map(cv=>{const ct=contacts.find(c=>c.id===cv.cid);const sla=slaTimers[cv.id];return(
              <div key={cv.id} onClick={()=>{setAid(cv.id);setViewMode("list");}} className="hov" style={{padding:"10px 12px",background:C.s2,border:`1px solid ${aid===cv.id?col.color+"66":C.b1}`,borderRadius:10,cursor:"pointer",transition:"all .12s",borderLeft:`3px solid ${col.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{cv.subject}</span>
                  <span style={{fontSize:9,color:C.t3,fontFamily:FM,flexShrink:0,marginLeft:6}}>{cv.time}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                  <Av i={ct?.av||"?"} c={cv.color} s={18}/>
                  <span style={{fontSize:10,color:C.t2}}>{ct?.name||"Unknown"}</span>
                  <span style={{marginLeft:"auto",fontSize:9,color:chC(cv.ch)}}><ChIcon t={cv.ch} s={10}/></span>
                </div>
                <div style={{display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>
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

    {/* ═══ CHAT + RIGHT PANEL (list mode) ═══ */}
    {viewMode==="list"&&<>
    {/* CHAT */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,position:"relative"}}>
      {showConfetti&&<Confetti/>}
      {/* header */}
      <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        {contact&&<Av i={contact.av} c={conv.color} s={36}/>}
        <div style={{flex:1,minWidth:120}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2,flexWrap:"wrap"}}>
            <span style={{fontSize:14.5,fontWeight:700,fontFamily:FD}}>{contact?.name}</span>
            <Tag text={conv?.status||"open"} color={conv?.status==="resolved"?C.g:conv?.status==="snoozed"?C.y:C.a}/>
            {conv?.priority!=="normal"&&<Tag text={conv?.priority||""} color={prC(conv?.priority)}/>}
          </div>
          <div style={{fontSize:10.5,color:C.t3,fontFamily:FM}}>#{aid} · <span style={{color:assignedAg?C.a:C.y,cursor:"pointer"}} onClick={()=>setShowAssign(true)}>{assignedAg?assignedAg.name:"⚠ Unassigned"}</span></div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
          {(()=>{const ch=conv?.ch||"live";const chOn=aiAutoReply&&aiChannels[ch];const chLabel={live:"Live Chat",email:"Email",whatsapp:"WhatsApp",telegram:"Telegram",facebook:"Facebook",instagram:"Instagram",viber:"Viber",apple:"Apple",line:"LINE",tiktok:"TikTok",x:"X",sms:"SMS",voice:"Voice",video:"Video",api:"API"}[ch]||ch;return <button onClick={()=>{if(!aiAutoReply){setAiAutoReply(true);setAiChannels(p=>({...p,[ch]:true}));showT("✦ AI enabled — "+chLabel+" channel active","success");}else{const next=!aiChannels[ch];setAiChannels(p=>({...p,[ch]:next}));showT(next?"✦ AI enabled for "+chLabel:"AI disabled for "+chLabel+" — other channels unchanged",next?"success":"info");}}} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:700,fontFamily:FM,cursor:"pointer",background:chOn?"linear-gradient(135deg,#9b6dff22,#4c82fb22)":C.s3,color:chOn?C.p:aiAutoReply?C.y:C.t3,border:`1.5px solid ${chOn?C.p+"66":aiAutoReply?C.y+"44":C.b1}`,transition:"all .2s",letterSpacing:"0.3px"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:chOn?C.p:C.t3,boxShadow:chOn?`0 0 8px ${C.p}`:"none",transition:"all .3s",animation:chOn?"pulse 1.5s infinite":"none"}}/>
            {aiReplying?<><Spin/> Replying…</>:chOn?<>✦ AI ON</>:aiAutoReply?<>✦ {chLabel} OFF</>:<>✦ AI OFF</>}
          </button>;})()}
          <Btn ch="✦ Summarize" v="ai" sm onClick={genSum}/>
          <Btn ch="✦ Classify" v="ai" sm onClick={classifyAI}/>
          {conv?.status==="open"?<Btn ch="⊘ Resolve" v="success" sm onClick={resolve}/>:<Btn ch="↺ Reopen" v="warn" sm onClick={reopen}/>}
          <Btn ch="↗ Transfer" v="ghost" sm onClick={()=>setShowTransfer(true)}/>
          <Btn ch="⊖ Snooze" v="ghost" sm onClick={()=>setShowSnooze(true)}/>
          <button onClick={()=>setShowMsgSearch(p=>!p)} title="Search messages" style={{width:28,height:28,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:showMsgSearch?C.ad:C.s3,color:showMsgSearch?C.a:C.t3,border:`1px solid ${showMsgSearch?C.a+"44":C.b1}`,cursor:"pointer"}} className="hov">⌕</button>
          <button onClick={()=>setShowConvConfig(p=>!p)} title="More options" style={{width:28,height:28,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">⋯</button>
        </div>
        {/* Config dropdown */}
        {showConvConfig&&<div style={{position:"absolute",top:50,right:270,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden",zIndex:60,boxShadow:"0 10px 40px rgba(0,0,0,.6)",animation:"fadeUp .15s ease",minWidth:180}}>
          {[{l:"Export Chat",navId:"download",fn:exportChat},{l:"Merge Conversations",navId:"merge",fn:()=>setShowMerge(true)},{l:"Mark as Spam",navId:"spam",fn:markSpam,c:C.y},{l:"Block Contact",navId:"block",fn:blockContact,c:C.r}].map(opt=>(
            <button key={opt.l} onClick={()=>{opt.fn();setShowConvConfig(false);}} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${C.b1}22`,cursor:"pointer",color:opt.c||C.t2,fontSize:12,fontFamily:FB,textAlign:"left",transition:"background .12s"}}>
              <span style={{width:18,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon id={opt.navId} s={14} col={opt.c||C.t2}/></span>{opt.l}
            </button>
          ))}
        </div>}
      </div>

      {/* Agent collision banner (inline) */}
      {collisionAgents[aid]&&collisionAgents[aid].id!=="a1"&&<div style={{padding:"5px 16px",background:C.pd,borderBottom:`1px solid ${C.p}33`,display:"flex",alignItems:"center",gap:8,animation:"fadeUp .15s ease"}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:C.p,animation:"pulse 1.5s infinite"}}/>
        <span style={{fontSize:11,color:C.p,fontFamily:FM,fontWeight:600}}>{collisionAgents[aid].name} is {collisionAgents[aid].typing?"typing in":"also viewing"} this conversation</span>
      </div>}

      {/* summary bar */}
      {(sumLoad||sumData)&&<div style={{margin:"10px 14px 0",padding:"11px 14px",background:`linear-gradient(135deg,${C.pd},${C.ad})`,border:`1px solid ${C.p}44`,borderRadius:12,animation:"fadeUp .25s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <Tag text="✦ AI SUMMARY" color={C.p}/>
          {sumData&&<Tag text={sumData.sentiment} color={sumData.sentiment==="negative"?C.r:sumData.sentiment==="neutral"?C.y:C.g}/>}
          <button onClick={()=>{setSumData(null);setSumLoad(false);}} style={{marginLeft:"auto",background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:15}}>×</button>
        </div>
        {sumLoad?<div style={{display:"flex",gap:8,alignItems:"center"}}><Spin/><span style={{fontSize:12,color:C.t2}}>Analyzing conversation…</span></div>:
        <><p style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:7}}>{sumData.text}</p>
        <div style={{display:"flex",gap:5}}>{sumData.topics.map(t=><Tag key={t} text={t} color={C.p}/>)}</div></>}
      </div>}

      {/* message search */}
      {showMsgSearch&&<div style={{padding:"8px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",gap:8,alignItems:"center",animation:"fadeUp .15s ease"}}>
        <span style={{color:C.t3,fontSize:12}}>⌕</span>
        <input value={msgSearchQ} onChange={e=>setMsgSearchQ(e.target.value)} placeholder="Search in this conversation…" autoFocus style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none"}}/>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{msgSearchQ?convMsgs.filter(m=>m.text?.toLowerCase().includes(msgSearchQ.toLowerCase())).length+" found":""}</span>
        <button onClick={()=>{setShowMsgSearch(false);setMsgSearchQ("");}} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>
      </div>}

      {/* messages */}
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {msgsLoading?<SkelMsgs n={5}/>:convMsgs.length===0?<EmptyState icon="💬" title="No messages yet" desc="Start the conversation by sending a message below"/>:
        convMsgs.filter(m=>!msgSearchQ||m.text?.toLowerCase().includes(msgSearchQ.toLowerCase())).map((m,i)=>{
          if(m.role==="sys")return <div key={m.id||i} style={{textAlign:"center",fontSize:10.5,color:C.t3,fontFamily:FM,letterSpacing:"0.3px",animation:"fadeUp .2s ease"}}>── {m.text} ──</div>;
          const isAg=m.role==="agent";
          const ag=isAg?agents.find(a=>a.id===m.aid):null;
          const isAuto=!!(m.auto);
          const isNt=!!(m.isNote);
          const highlight=msgSearchQ&&m.text?.toLowerCase().includes(msgSearchQ.toLowerCase());
          return <div key={m.id||i} style={{display:"flex",justifyContent:isAg?"flex-end":"flex-start",animation:"fadeUp .2s ease",flexDirection:"column",alignItems:isAg?"flex-end":"flex-start"}}>
            <div style={{display:"flex",justifyContent:isAg?"flex-end":"flex-start",width:"100%",position:"relative"}} className="msg-row">
              {!isAg&&contact&&<div style={{marginRight:8,flexShrink:0}}><Av i={contact.av} c={conv.color} s={26}/></div>}
              <div style={{maxWidth:"72%",background:isNt?C.yd:isAg?(isAuto?`linear-gradient(135deg,${C.p},#6b3fc0)`:`linear-gradient(135deg,${C.a},#2a5de8)`):C.s3,border:isNt?`1px solid ${C.y}44`:isAg?"none":`1px solid ${C.b1}`,borderRadius:isAg?"14px 14px 4px 14px":"4px 14px 14px 14px",padding:"10px 13px",position:"relative",outline:highlight?`2px solid ${C.y}`:"none"}}>
                {isNt&&<div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.y,letterSpacing:"0.4px",marginBottom:4}}>📝 INTERNAL NOTE</div>}
                {isAg&&ag&&<div style={{fontSize:10,color:isNt?"#8b7a2e":"rgba(255,255,255,.6)",marginBottom:4,fontFamily:FM,display:"flex",alignItems:"center",gap:5}}>{ag.name}{isAuto&&<span style={{background:"rgba(255,255,255,.18)",borderRadius:4,padding:"1px 5px",fontSize:9,letterSpacing:"0.3px"}}>✦ AI</span>}</div>}
                {m.replyTo&&<div style={{fontSize:10,color:isNt?C.t2:isAg?"rgba(255,255,255,.5)":C.t3,padding:"4px 8px",borderLeft:`2px solid ${isAg?"rgba(255,255,255,.3)":C.b1}`,marginBottom:6,fontStyle:"italic"}}>↩ {m.replyText||"…"}</div>}
                <p style={{fontSize:13.5,lineHeight:1.55,color:isNt?"#5a4e1a":isAg?"#fff":C.t1}}>{highlight?(()=>{const re=new RegExp(`(${msgSearchQ.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');return m.text.split(re).map((p,k)=>re.test(p)?<mark key={k} style={{background:C.y+"88",color:isAg?"#fff":C.t1,borderRadius:2,padding:"0 1px"}}>{p}</mark>:p);})():m.text}</p>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
                  {m.t&&<span style={{fontSize:9.5,color:isNt?"#8b7a2e":isAg?"rgba(255,255,255,.45)":C.t3,fontFamily:FM}}>{m.t}{m.edited?" · edited":""}</span>}
                  {isAg&&!isNt&&<span style={{fontSize:9,fontFamily:FM,color:isAg?"rgba(255,255,255,.4)":C.t3}}>{m.read!==false?"✓✓":"✓"}</span>}
                </div>
                {/* Hover action bar */}
                <div className="msg-actions" style={{position:"absolute",top:-14,[isAg?"right":"left"]:8,display:"none",gap:2,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:6,padding:"2px",boxShadow:"0 4px 16px rgba(0,0,0,.4)",zIndex:10}}>
                  <button onClick={()=>setReplyTo(m)} title="Reply" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">↩</button>
                  <button onClick={()=>copyMsg(m.text)} title="Copy" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">⎘</button>
                  {isAg&&<button onClick={()=>startEditMsg(m.id,m.text)} title="Edit" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">✎</button>}
                  {isAg&&<button onClick={()=>deleteMsg(m.id)} title="Delete" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.r}} className="hov">✕</button>}
                  <button onClick={()=>fwdMsg(m.text)} title="Forward" style={{width:22,height:22,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:"transparent",border:"none",cursor:"pointer",color:C.t3}} className="hov">↗</button>
                </div>
              </div>
            </div>
          </div>;
        })}
        {typing&&<div style={{display:"flex",justifyContent:"flex-start",animation:"fadeUp .2s ease"}}>
          {contact&&<div style={{marginRight:8}}><Av i={contact.av} c={conv.color} s={26}/></div>}
          <div style={{background:C.s3,border:`1px solid ${C.b1}`,borderRadius:"4px 14px 14px 14px",padding:"12px 16px",display:"flex",gap:4}}>
            {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",background:C.t3,display:"block",animation:`blink 1.2s infinite ${i*.2}s`}}/>)}
          </div>
        </div>}
        {aiReplying&&<div style={{display:"flex",justifyContent:"flex-end",animation:"fadeUp .2s ease"}}>
          <div style={{background:`linear-gradient(135deg,${C.p}33,${C.a}22)`,border:`1px solid ${C.p}44`,borderRadius:"14px 14px 4px 14px",padding:"10px 16px",display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10,color:C.p,fontFamily:FM,fontWeight:700,letterSpacing:"0.4px"}}>✦ AI</span>
            {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:C.p,display:"block",animation:`blink 1.2s infinite ${i*.2}s`}}/>)}
            <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>composing reply…</span>
          </div>
        </div>}
        <div ref={msgEnd}/>
      </div>

      {/* AI panel */}
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
      <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} style={{borderTop:`1px solid ${C.b1}`,background:dragOver?C.ad:isNote?C.yd:C.s1,padding:"10px 14px",transition:"background .2s",position:"relative"}}>
        {dragOver&&<div style={{position:"absolute",inset:0,background:C.a+"22",border:`2px dashed ${C.a}`,borderRadius:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.a,fontWeight:700,fontFamily:FM}}>Drop files here</div>}
        {/* Email fields (only for email channel) */}
        {isEmailCh&&!isNote&&<div style={{marginBottom:8,display:"flex",flexDirection:"column",gap:4}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:30}}>To:</span>
            <span style={{fontSize:11,color:C.t1,flex:1}}>{contact?.email||"customer@email.com"}</span>
            <button onClick={()=>setShowCcBcc(p=>!p)} style={{fontSize:9,color:C.a,background:"none",border:"none",cursor:"pointer",fontFamily:FM}}>{showCcBcc?"Hide":"CC/BCC"}</button>
          </div>
          {showCcBcc&&<>
            <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:10,color:C.t3,fontFamily:FM,width:30}}>CC:</span><input value={emailCc} onChange={e=>setEmailCc(e.target.value)} placeholder="cc@email.com" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 8px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/></div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:10,color:C.t3,fontFamily:FM,width:30}}>BCC:</span><input value={emailBcc} onChange={e=>setEmailBcc(e.target.value)} placeholder="bcc@email.com" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 8px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/></div>
          </>}
          <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:10,color:C.t3,fontFamily:FM,width:30}}>Subj:</span><input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} placeholder={conv?.subject||"Re: "} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 8px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/></div>
        </div>}
        {/* Reply-to preview */}
        {replyTo&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,marginBottom:8}}>
          <span style={{fontSize:10,color:C.a}}>↩</span>
          <div style={{flex:1,fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Replying to: {replyTo.text?.slice(0,60)}…</div>
          <button onClick={()=>setReplyTo(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button>
        </div>}
        {/* Edit indicator */}
        {editMsgId&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.ad,border:`1px solid ${C.a}44`,borderRadius:8,marginBottom:8}}>
          <span style={{fontSize:10,color:C.a}}>✎</span>
          <span style={{flex:1,fontSize:11,color:C.a}}>Editing message…</span>
          <button onClick={()=>{setEditMsgId(null);setInp("");}} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>Cancel</button>
        </div>}
        {/* File attachments preview */}
        {attachments.length>0&&<div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {attachments.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,fontSize:10}}>
              <NavIcon id="knowledgebase" s={12} col={C.a}/><span style={{color:C.t2}}>{a.name}</span><span style={{color:C.t3,fontFamily:FM}}>{a.size}</span>
              <button onClick={()=>removeAttach(a.id)} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:10}}>✕</button>
            </div>
          ))}
        </div>}
        {/* Toolbar */}
        <div style={{display:"flex",gap:5,marginBottom:8,alignItems:"center"}}>
          <button onClick={()=>{setIsNote(p=>!p);showT(isNote?"Switched to reply":"Switched to internal note",isNote?"info":"warn");}} title={isNote?"Internal Note":"Reply"} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:isNote?C.y+"22":"transparent",color:isNote?C.y:C.t3,border:`1px solid ${isNote?C.y+"55":C.b1}`,transition:"all .15s"}}>{isNote?"📝 Note":"💬 Reply"}</button>
          {[{i:"B",tip:"Bold",fn:()=>{setInp(p=>p+"**bold**");}},{i:"I",tip:"Italic",fn:()=>{setInp(p=>p+"_italic_");}},{i:"~",tip:"Strikethrough",fn:()=>{setInp(p=>p+"~~text~~");}}].map(f=>(
            <button key={f.tip} onClick={f.fn} title={f.tip} className="nav" style={{width:26,height:26,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",color:C.t3,background:"transparent",border:"none",cursor:"pointer",fontSize:12,fontStyle:f.i==="I"?"italic":"normal",fontWeight:f.i==="B"?700:400}}>{f.i}</button>
          ))}
          <button onClick={()=>setShowEmoji(p=>!p)} title="Emoji" style={{width:26,height:26,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:showEmoji?C.ad:"transparent",color:C.t3,border:"none",cursor:"pointer"}}>😊</button>
          <button onClick={handleFilePick} title="Attach file" style={{width:26,height:26,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:attachments.length?C.a:C.t3,background:"transparent",border:"none",cursor:"pointer"}}>📎{attachments.length>0&&<span style={{fontSize:8,color:C.a,marginLeft:1}}>({attachments.length})</span>}</button>
          <div style={{flex:1}}/>
          <button onClick={()=>{setShowCanned(p=>!p);setCQ("");}} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:600,color:C.t2,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>⚡ /canned</button>
          <button onClick={genAI} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:600,color:C.p,background:C.pd,border:`1px solid ${C.p}44`,cursor:"pointer"}}>✦ AI Draft</button>
        </div>
        {showEmoji&&<div style={{display:"flex",flexWrap:"wrap",gap:2,padding:"8px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:8,animation:"fadeUp .15s ease"}}>
          {EMOJI_SET.map(e=>(
            <button key={e} onClick={()=>{setInp(p=>p+e);setShowEmoji(false);}} style={{width:28,height:28,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,background:"transparent",border:"none",cursor:"pointer"}} className="hov">{e}</button>
          ))}
        </div>}
        <div style={{display:"flex",gap:9,alignItems:"flex-end"}}>
          <textarea value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),sendMsg())}
            placeholder={isNote?"Write an internal note (not visible to customer)…":isEmailCh?"Compose email reply…":"Type reply… (Enter to send, Shift+Enter for new line)"} rows={isEmailCh?5:3}
            style={{flex:1,background:isNote?"#fffbe6":C.bg,border:`1px solid ${isNote?C.y+"66":C.b2}`,borderRadius:10,padding:"10px 13px",fontSize:13,color:isNote?"#5a4e1a":C.t1,resize:"none",lineHeight:1.5,fontFamily:FB,transition:"all .15s"}}/>
          <button onClick={sendMsg} style={{width:42,height:42,borderRadius:10,fontSize:18,background:isNote?C.y:C.a,color:isNote?"#5a4e1a":"#fff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}>{editMsgId?"✓":"↑"}</button>
        </div>
        {/* Email signature preview */}
        {isEmailCh&&!isNote&&<div style={{marginTop:6,padding:"6px 10px",borderTop:`1px solid ${C.b1}22`,fontSize:10,color:C.t3,fontFamily:FM,whiteSpace:"pre-line",lineHeight:1.4}}>— Priya Sharma · Head of Support · SupportDesk</div>}
      </div>
    </div>

    {/* RIGHT PANEL */}
    {!rpCollapsed&&<aside style={{width:310,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0,animation:"slideIn .2s ease"}}>
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`}}>
        {[["conv","Conv"],["contact","Contact"],["history","History"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setRtab(id)} style={{flex:1,padding:"13px 0",fontSize:10,fontWeight:700,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase",color:rtab===id?C.a:C.t3,background:"transparent",border:"none",borderBottom:`2px solid ${rtab===id?C.a:"transparent"}`,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14}}>
        {rtab==="conv"&&conv&&<div style={{display:"flex",flexDirection:"column",gap:14,animation:"fadeUp .2s ease"}}>
          {/* assignee */}
          <div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:7}}>ASSIGNEE</div>
            <div className="hov" onClick={()=>setShowAssign(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,cursor:"pointer",transition:"background .12s"}}>
              {assignedAg?<><Av i={assignedAg.av} c={assignedAg.color} s={28} dot={assignedAg.status==="online"}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{assignedAg.name}</div><div style={{fontSize:10,color:C.t3}}>{assignedAg.role}</div></div></>:<div style={{fontSize:12,color:C.y,flex:1}}>⚠ Unassigned</div>}
              <span style={{fontSize:10,color:C.a}}>✎</span>
            </div>
          </div>
          {/* priority */}
          <div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:7}}>PRIORITY</div>
            <div style={{display:"flex",gap:5}}>
              {["urgent","high","normal"].map(p=>{
                const c2=prC(p)||C.t3;const active=conv.priority===p;
                return <button key={p} onClick={()=>setPrio(p)} style={{flex:1,padding:"6px 0",borderRadius:7,fontSize:9,fontWeight:700,fontFamily:FM,letterSpacing:"0.3px",background:active?c2+"25":"transparent",color:active?c2:C.t3,border:`1px solid ${active?c2+"55":C.b1}`,textTransform:"uppercase",cursor:"pointer",transition:"all .15s"}}>{p}</button>;
              })}
            </div>
          </div>
          {/* labels */}
          <div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:7}}>LABELS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
              {conv.labels.map(l=><Tag key={l} text={l} color={lc(l)} onRemove={()=>toggleLbl(l)}/>)}
              <button onClick={()=>setShowLblPick(p=>!p)} style={{padding:"2px 8px",borderRadius:5,fontSize:10,color:C.t3,border:`1px dashed ${C.b1}`,background:"transparent",cursor:"pointer",fontFamily:FM}}>+ add</button>
            </div>
            {showLblPick&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:8,display:"flex",flexWrap:"wrap",gap:5}}>
              {labels.map(l=>(
                <button key={l.id} onClick={()=>toggleLbl(l.title)} style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,fontFamily:FM,textTransform:"uppercase",background:conv.labels.includes(l.title)?l.color+"25":"transparent",color:conv.labels.includes(l.title)?l.color:C.t3,border:`1px solid ${conv.labels.includes(l.title)?l.color+"44":C.b1}`,cursor:"pointer"}}>
                  {conv.labels.includes(l.title)?"✓ ":""}{l.title}
                </button>
              ))}
              <button onClick={()=>setShowLblPick(false)} style={{width:"100%",marginTop:4,padding:"4px",fontSize:11,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>Done</button>
            </div>}
          </div>
          {/* actions */}
          <div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:7}}>QUICK ACTIONS</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {conv.status==="open"?<Btn ch="⊘ Resolve Conversation" v="success" full onClick={resolve}/>:<Btn ch="↺ Reopen Conversation" v="warn" full onClick={reopen}/>}
              <Btn ch="↗ Transfer to Team" v="ghost" full onClick={()=>setShowTransfer(true)}/>
              <Btn ch="⊖ Snooze Conversation" v="ghost" full onClick={()=>setShowSnooze(true)}/>
              <Btn ch="✦ AI Classify + Label" v="ai" full onClick={classifyAI}/>
            </div>
          </div>
          {/* SLA / Metrics */}
          <div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:7}}>METRICS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[{l:"First Reply",v:"3.2m",c:C.g},{l:"Avg Response",v:"4.8m",c:C.a},{l:"Messages",v:String(convMsgs.filter(m=>m.role!=="sys").length),c:C.cy},{l:"Duration",v:conv.time,c:C.t2}].map(m=>(
                <div key={m.l} style={{padding:"8px",background:C.s2,borderRadius:8,textAlign:"center"}}>
                  <div style={{fontSize:8,color:C.t3,fontFamily:FM,letterSpacing:"0.3px"}}>{m.l}</div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:FM,color:m.c}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Channel & Inbox */}
          <div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.7px",textTransform:"uppercase",marginBottom:7}}>DETAILS</div>
            {[{l:"Channel",v:<span style={{display:"inline-flex",alignItems:"center",gap:4}}><ChIcon t={conv.ch} s={12}/> {conv.ch}</span>},{l:"Inbox",v:inboxes.find(ib=>ib.id===conv.iid)?.name||"Default"},{l:"ID",v:aid},{l:"Created",v:conv.time+" ago"}].map(d=>(
              <div key={d.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{d.l}</span>
                <span style={{fontSize:11,color:C.t1}}>{d.v}</span>
              </div>
            ))}
          </div>
        </div>}
        {/* Custom Fields for conversation */}
        {rtab==="conv"&&conv&&customFields&&<CfPanel entity="conversation" recordId={conv.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/>}

        {rtab==="contact"&&contact&&<div style={{animation:"fadeUp .2s ease"}}>
          {/* Rich header matching Contacts screen */}
          <div style={{textAlign:"center",paddingBottom:12,borderBottom:`1px solid ${C.b1}`,marginBottom:10}}>
            <Av i={contact.av} c={conv.color} s={48}/>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginTop:8}}>{contact.name}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>{contact.uid} · {contact.userType||"User"}</div>
            <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:6,flexWrap:"wrap"}}>
              <Tag text={contact.plan} color={contact.plan==="Enterprise"?C.p:contact.plan==="Pro"?C.a:C.t3}/>
              {(contact.tags||[]).slice(0,3).map(t=><Tag key={t} text={t} color={C.t3}/>)}
            </div>
          </div>
          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:12}}>
            {[{l:"Convs",v:contact.convs,c:C.a},{l:"Spend",v:contact.totalSpend||"—",c:C.g},{l:"CSAT",v:contact.csat?contact.csat+"★":"—",c:contact.csat>=4.5?C.g:contact.csat>=3.5?C.y:contact.csat?C.r:C.t3}].map(s=>(
              <div key={s.l} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:"6px",textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
                <div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Contact detail sub-tabs */}
          {(()=>{const [cstab,setCstab]=[contactSubTab,setContactSubTab];return <>
          <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:10}}>
            {[["info","Info"],["session","Session"],["timeline","Timeline"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setCstab(id)} style={{flex:1,padding:"7px 0",fontSize:9,fontWeight:700,fontFamily:FM,color:cstab===id?C.a:C.t3,borderBottom:`2px solid ${cstab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",letterSpacing:"0.3px",textTransform:"uppercase"}}>{lbl}</button>
            ))}
          </div>
          {/* Info sub-tab */}
          {cstab==="info"&&<div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:6}}>CONTACT INFO</div>
            <InfoRow label="Email" value={contact.email} copy/>
            <InfoRow label="Phone" value={contact.phone} copy/>
            <InfoRow label="Company" value={contact.company}/>
            <InfoRow label="Location" value={contact.location}/>
            <InfoRow label="Language" value={contact.language} mono/>
            <InfoRow label="Currency" value={contact.currency} mono/>
            <InfoRow label="Timezone" value={contact.timezone} mono/>
            <div style={{marginTop:10,marginBottom:6,fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px"}}>ACCOUNT</div>
            <InfoRow label="User ID" value={contact.uid} copy color={C.a} mono/>
            <InfoRow label="User Type" value={contact.userType}/>
            <InfoRow label="Created" value={contact.createdAt} mono/>
            <InfoRow label="Last Active" value={contact.lastActivity} mono/>
            {contact.notes&&<>
              <div style={{marginTop:10,marginBottom:6,fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px"}}>NOTES</div>
              <div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:7,padding:"7px 10px",fontSize:11,color:C.t1,lineHeight:1.5}}>{contact.notes}</div>
            </>}
            {(contact.tags||[]).length>0&&<>
              <div style={{marginTop:10,marginBottom:6,fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px"}}>TAGS</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(contact.tags||[]).map(t=><Tag key={t} text={t} color={C.t2}/>)}</div>
            </>}
          </div>}
          {/* Session sub-tab */}
          {cstab==="session"&&<div>
            <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:C.g,boxShadow:`0 0 6px ${C.g}`}}/>
                <span style={{fontSize:10,color:C.g,fontWeight:700,fontFamily:FM}}>LIVE</span>
              </div>
              <InfoRow label="URL" value={contact.currentUrl||conv?.subject||"—"} copy color={C.a} mono/>
              <InfoRow label="IP" value={contact.ip||"192.168.1.42"} copy mono/>
              <InfoRow label="Browser" value={contact.browser||"Chrome 124"}/>
              <InfoRow label="OS" value={contact.os||"macOS 15"}/>
            </div>
            <div style={{fontSize:8.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:6}}>LOCATION</div>
            <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:20,marginBottom:4}}>{contact.location?.includes("India")?"🇮🇳":contact.location?.includes("US")?"🇺🇸":contact.location?.includes("UK")?"🇬🇧":contact.location?.includes("Japan")?"🇯🇵":"🌍"}</div>
              <div style={{fontSize:12,fontWeight:600}}>{contact.location||"Unknown"}</div>
              <InfoRow label="Language" value={contact.language} mono/>
              <InfoRow label="Currency" value={contact.currency} mono/>
            </div>
          </div>}
          {/* Timeline sub-tab */}
          {cstab==="timeline"&&<div>
            {[{t:"2m",icon:"💬",text:"Sent message",sub:conv?.subject||"Support",c:C.a},{t:"1h",icon:"📧",text:"Email received",sub:"Re: Invoice",c:C.a},{t:"3h",icon:"🏷",text:"Tag: "+((contact.tags||[])[0]||"vip"),sub:"By agent",c:C.y},{t:"1d",icon:"✅",text:"Resolved conv",sub:"Fixed",c:C.g},{t:"2d",icon:"👤",text:"Assigned",sub:assignedAg?.name||"Agent",c:C.p},{t:"5d",icon:"🤖",text:"AI replied",sub:"FAQ",c:C.p},{t:"1w",icon:"📋",text:"CSAT: "+(contact.csat||"4.2")+"★",sub:"Feedback",c:C.g},{t:"2w",icon:"🆕",text:"Created",sub:"Signup",c:C.a}].map((ev,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.b1}22`,position:"relative"}}>
                {i<7&&<div style={{position:"absolute",left:11,top:28,width:1,height:"calc(100% - 12px)",background:C.b1}}/>}
                <div style={{width:22,height:22,borderRadius:"50%",background:ev.c+"18",border:`1px solid ${ev.c}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,zIndex:1}}>{ev.icon}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:C.t1}}>{ev.text}</div><div style={{fontSize:9,color:C.t3}}>{ev.sub}</div></div>
                <span style={{fontSize:8,color:C.t3,fontFamily:FM,flexShrink:0}}>{ev.t}</span>
              </div>
            ))}
          </div>}
          </>;})()}
          {/* Custom fields for this contact */}
          {customFields&&<CfPanel entity="contact" recordId={contact.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/>}
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
    <button onClick={()=>setRpCollapsed(p=>!p)} style={{position:"absolute",right:rpCollapsed?4:256,top:"50%",transform:"translateY(-50%)",width:20,height:40,borderRadius:rpCollapsed?"0 6px 6px 0":"6px 0 0 6px",background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.t3,zIndex:10,transition:"right .2s"}}>{rpCollapsed?"◂":"▸"}</button>
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

    {showAssign&&<Mdl title="Assign Agent" onClose={()=>setShowAssign(false)} w={380}>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={()=>assignTo(null)} className="hov" style={{padding:"10px 12px",borderRadius:10,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"left",color:C.y,fontSize:13,fontFamily:FB,transition:"background .12s"}}>⚠ Unassign</button>
        {agents.map(a=>(
          <button key={a.id} onClick={()=>assignTo(a.id)} className="hov" style={{padding:"10px 12px",borderRadius:10,background:conv?.agent===a.id?C.ad:"transparent",border:`1px solid ${conv?.agent===a.id?C.a+"44":C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"background .12s"}}>
            <Av i={a.av} c={a.color} s={30} dot={a.status==="online"}/>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:11,color:C.t3}}>{a.role} · {a.status}</div></div>
            {conv?.agent===a.id&&<span style={{color:C.a}}>✓</span>}
          </button>
        ))}
      </div>
    </Mdl>}

    {showTransfer&&<Mdl title="Transfer to Team" onClose={()=>setShowTransfer(false)} w={380}>
      <p style={{fontSize:13,color:C.t2,marginBottom:14}}>Select a team to transfer this conversation:</p>
      {teams.map(t=>(
        <div key={t.id} className="hov" onClick={()=>doTransfer(t.id)} style={{padding:"12px 14px",borderRadius:10,background:C.s1,border:`1px solid ${C.b1}`,cursor:"pointer",marginBottom:8,transition:"background .12s"}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{t.name}</div>
          <div style={{fontSize:11.5,color:C.t3}}>{t.desc} · {t.members.length} agents</div>
        </div>
      ))}
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

    {showNewConv&&<NewConvMdl contacts={contacts} inboxes={inboxes} agents={agents} onClose={()=>setShowNewConv(false)}
      onCreate={data=>{
        const id="cv"+uid();const ct=contacts.find(c=>c.id===data.cid);
        setConvs(p=>[{id,cid:data.cid,iid:data.iid,ch:inboxes.find(i=>i.id===data.iid)?.type||"live",status:"open",priority:"normal",subject:data.subject||"New conversation",agent:data.agent||null,team:null,labels:[],unread:0,time:"now",color:ct?.color||C.a},...p]);
        if(data.msg)setMsgs(p=>({...p,[id]:[{id:uid(),role:"agent",aid:"a1",text:data.msg,t:now()}]}));
        setAid(id);setShowNewConv(false);showT("Conversation created!","success");
      }}/>}
  </div>;
}

function NewConvMdl({contacts,inboxes,agents,onClose,onCreate}){
  const [cid,setCid]=useState(contacts[0]?.id||"");
  const [iid,setIid]=useState(inboxes[0]?.id||"");
  const [subject,setSubject]=useState("");
  const [msg,setMsg]=useState("");
  const [agent,setAgent]=useState("");
  return <Mdl title="New Conversation" onClose={onClose}>
    <Fld label="Contact"><Sel val={cid} set={setCid} opts={contacts.map(c=>({v:c.id,l:c.name}))}/></Fld>
    <Fld label="Inbox"><Sel val={iid} set={setIid} opts={inboxes.map(i=>({v:i.id,l:i.name}))}/></Fld>
    <Fld label="Subject"><Inp val={subject} set={setSubject} ph="What is this conversation about?"/></Fld>
    <Fld label="First Message (optional)"><textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type a first message…" rows={3} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none"}}/></Fld>
    <Fld label="Assign To (optional)"><Sel val={agent} set={setAgent} opts={[{v:"",l:"Unassigned"},...agents.map(a=>({v:a.id,l:a.name}))]}/></Fld>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:6}}>
      <Btn ch="Cancel" v="ghost" onClick={onClose}/>
      <Btn ch="Create Conversation" v="primary" onClick={()=>onCreate({cid,iid,subject,msg,agent:agent||null})}/>
    </div>
  </Mdl>;
}


