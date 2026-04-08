import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── CUSTOMER PORTAL PREVIEW ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
//  AI SALES AGENT — Proactive sales AI for lead qualification,
//  product recommendation, objection handling, and demo booking
// ═══════════════════════════════════════════════════════════════════
export default function AISalesAgentScr(){
  // ═══ MULTI-AGENT SYSTEM ═══
  const [agents,setAgentsLocal]=useState([
    {id:"sa1",name:"Aria",role:"Inbound Sales",emoji:"💼",color:C.a,tone:"consultative",language:"en",active:true,channels:{live:true,whatsapp:true,email:false,instagram:false,facebook:true},leads:156,demos:43,deals:28,revenue:"$515K",convRate:"32%",created:"01/03/26"},
    {id:"sa2",name:"Max",role:"Enterprise Closer",emoji:"🎯",color:C.p,tone:"challenger",language:"en",active:true,channels:{live:true,whatsapp:false,email:true,instagram:false,facebook:false},leads:42,demos:18,deals:12,revenue:"$864K",convRate:"28%",created:"10/03/26"},
    {id:"sa3",name:"Zara",role:"WhatsApp & Social",emoji:"💬",color:C.g,tone:"friendly",language:"auto",active:false,channels:{live:false,whatsapp:true,email:false,instagram:true,facebook:true},leads:89,demos:12,deals:7,revenue:"$84K",convRate:"8%",created:"15/03/26"}
  ]);
  const [selAgent,setSelAgent]=useState(null);
  const [showNewAgent,setShowNewAgent]=useState(false);const [editAgent,setEditAgent]=useState(null);
  const [naName,setNaName]=useState("");const [naRole,setNaRole]=useState("");const [naEmoji,setNaEmoji]=useState("🤖");const [naColor,setNaColor]=useState(C.a);const [naTone,setNaTone]=useState("consultative");const [naLang,setNaLang]=useState("en");const [naChannels,setNaChannels]=useState({live:true,whatsapp:false,email:false,instagram:false,facebook:false});

  const saveAgent=()=>{if(!naName.trim())return showT("Name required","error");if(!naRole.trim())return showT("Role required","error");
    const p={name:naName,role:naRole,emoji:naEmoji,color:naColor,tone:naTone,language:naLang,channels:{...naChannels}};
    if(editAgent){setAgentsLocal(pr=>pr.map(a=>a.id===editAgent.id?{...a,...p}:a));showT("Agent updated","success");}
    else{setAgentsLocal(pr=>[...pr,{id:"sa"+uid(),...p,active:true,leads:0,demos:0,deals:0,revenue:"$0",convRate:"0%",created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"})}]);showT("Agent created!","success");}
    setShowNewAgent(false);setEditAgent(null);};
  const openAgentEdit=a=>{setNaName(a.name);setNaRole(a.role);setNaEmoji(a.emoji);setNaColor(a.color);setNaTone(a.tone);setNaLang(a.language);setNaChannels({...a.channels});setEditAgent(a);setShowNewAgent(true);};
  const openAgentNew=()=>{setNaName("");setNaRole("");setNaEmoji("🤖");setNaColor(C.a);setNaTone("consultative");setNaLang("en");setNaChannels({live:true,whatsapp:false,email:false,instagram:false,facebook:false});setEditAgent(null);setShowNewAgent(true);};
  const delAgent=id=>{if(agents.length<=1)return showT("Keep at least one agent","error");setAgentsLocal(p=>p.filter(a=>a.id!==id));if(selAgent===id)setSelAgent(null);showT("Agent removed","success");};
  const dupAgent=a=>{setAgentsLocal(p=>[...p,{...a,id:"sa"+uid(),name:a.name+" (Copy)",active:false,leads:0,demos:0,deals:0,revenue:"$0",convRate:"0%"}]);showT("Duplicated","success");};

  const EMOJIS=["💼","🎯","💬","🤖","🧠","⚡","🔥","🌟","🛡","📊","🚀","💎","🎧","👋","📈","🏆"];
  const COLORS=[C.a,C.p,C.g,C.y,C.cy,C.r,"#ff6b35","#e91e63"];
  const activeAgent=agents.find(a=>a.id===selAgent);

  // ═══ AGENT LIST VIEW ═══
  if(!selAgent){
    const totalLeads=agents.reduce((s,a)=>s+a.leads,0);const totalDeals=agents.reduce((s,a)=>s+a.deals,0);const totalDemos=agents.reduce((s,a)=>s+a.demos,0);
    return <div style={{padding:"24px 28px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,display:"flex",alignItems:"center",gap:8}}>AI Sales Agents <Tag text={agents.length+" agents"} color={C.p}/></h2>
          <p style={{fontSize:12,color:C.t3,marginTop:4}}>Create specialized AI agents for different sales scenarios — each with its own personality, channels, and playbooks</p>
        </div>
        <Btn ch="+ New Agent" v="primary" onClick={openAgentNew}/>
      </div>

      {/* Summary KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[{l:"Total Agents",v:agents.length,c:C.p,bg:C.pd,d:agents.filter(a=>a.active).length+" active"},{l:"Leads Qualified",v:totalLeads,c:C.a,bg:C.ad,d:"Across all agents"},{l:"Demos Booked",v:totalDemos,c:C.g,bg:C.gd,d:"This month"},{l:"Deals Created",v:totalDeals,c:C.y,bg:C.yd,d:"Pipeline value"}].map(k=>
          <div key={k.l} style={{background:k.bg,border:`1px solid ${k.c}33`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:9,fontWeight:700,color:k.c,fontFamily:FM,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</div>
            <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c,margin:"4px 0"}}>{k.v}</div>
            <div style={{fontSize:10,color:C.t3}}>{k.d}</div>
          </div>)}
      </div>

      {/* Agent Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {agents.map(a=><div key={a.id} className="card-lift" style={{background:C.s1,border:`1.5px solid ${a.active?a.color+"44":C.b1}`,borderRadius:14,padding:18,cursor:"pointer",transition:"all .15s",position:"relative"}}
          onClick={()=>setSelAgent(a.id)} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
          {/* Status badge */}
          <div style={{position:"absolute",top:12,right:12,display:"flex",gap:4}}>
            <Tag text={a.active?"Active":"Paused"} color={a.active?C.g:C.t3}/>
          </div>
          {/* Agent identity */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:48,height:48,borderRadius:14,background:a.color+"22",border:`2px solid ${a.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{a.emoji}</div>
            <div>
              <div style={{fontSize:16,fontWeight:800,fontFamily:FD}}>{a.name}</div>
              <div style={{fontSize:11,color:C.t3,fontFamily:FM}}>{a.role}</div>
            </div>
          </div>
          {/* Channels */}
          <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
            {Object.entries(a.channels).filter(([,v])=>v).map(([ch])=><span key={ch} style={{padding:"2px 8px",borderRadius:6,fontSize:9,fontWeight:700,background:a.color+"15",color:a.color,border:`1px solid ${a.color}33`,fontFamily:FM,textTransform:"capitalize"}}>{ch}</span>)}
          </div>
          {/* Metrics */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
            {[{l:"Leads",v:a.leads},{l:"Demos",v:a.demos},{l:"Deals",v:a.deals},{l:"Conv",v:a.convRate}].map(m=>
              <div key={m.l} style={{textAlign:"center",padding:"6px 0",background:C.s2,borderRadius:6}}>
                <div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.t1}}>{m.v}</div>
                <div style={{fontSize:8,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{m.l}</div>
              </div>)}
          </div>
          {/* Revenue + actions */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>REVENUE </span><span style={{fontSize:14,fontWeight:800,color:a.color,fontFamily:FD}}>{a.revenue}</span></div>
            <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
              <Toggle val={a.active} set={v=>setAgentsLocal(p=>p.map(x=>x.id===a.id?{...x,active:v}:x))}/>
              <button onClick={()=>openAgentEdit(a)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer"}} className="hov">✎</button>
              <button onClick={()=>dupAgent(a)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">⎘</button>
              <button onClick={()=>delAgent(a.id)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.rd,color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer"}} className="hov">✕</button>
            </div>
          </div>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:8}}>Created {a.created} · Tone: {a.tone} · Lang: {a.language}</div>
        </div>)}

        {/* New agent card */}
        <div onClick={openAgentNew} className="hov" style={{background:C.s1,border:`2px dashed ${C.b2}`,borderRadius:14,padding:18,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.a;e.currentTarget.style.background=C.ad;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b2;e.currentTarget.style.background=C.s1;}}>
          <div style={{fontSize:32,marginBottom:8,opacity:.5}}>+</div>
          <div style={{fontSize:14,fontWeight:700,color:C.t2,fontFamily:FD}}>Create New Agent</div>
          <div style={{fontSize:11,color:C.t3,marginTop:4,textAlign:"center"}}>Specialized AI for a specific sales scenario</div>
        </div>
      </div>

      {/* New/Edit Agent Modal */}
      {showNewAgent&&<Mdl title={editAgent?"Edit Agent":"Create AI Sales Agent"} onClose={()=>{setShowNewAgent(false);setEditAgent(null);}} w={480}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Agent Name"><Inp val={naName} set={setNaName} ph="e.g. Aria, Max, Zara"/></Fld>
          <Fld label="Role / Specialty"><Inp val={naRole} set={setNaRole} ph="e.g. Inbound Sales, Enterprise Closer"/></Fld>
        </div>
        <Fld label="Avatar">
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{EMOJIS.map(e=><button key={e} onClick={()=>setNaEmoji(e)} style={{width:32,height:32,borderRadius:8,fontSize:18,background:naEmoji===e?C.ad:C.s2,border:`2px solid ${naEmoji===e?C.a:C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{e}</button>)}</div>
        </Fld>
        <Fld label="Color">
          <div style={{display:"flex",gap:6}}>{COLORS.map(c=><button key={c} onClick={()=>setNaColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${naColor===c?"#fff":"transparent"}`,outline:naColor===c?`2px solid ${c}`:"none",cursor:"pointer"}}/>)}</div>
        </Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Sales Tone"><Sel val={naTone} set={setNaTone} opts={[{v:"consultative",l:"Consultative"},{v:"friendly",l:"Friendly"},{v:"professional",l:"Professional"},{v:"challenger",l:"Challenger"},{v:"solution",l:"Solution Selling"}]}/></Fld>
          <Fld label="Language"><Sel val={naLang} set={setNaLang} opts={[{v:"en",l:"English"},{v:"hi",l:"Hindi"},{v:"es",l:"Spanish"},{v:"ar",l:"Arabic"},{v:"auto",l:"Auto-detect"}]}/></Fld>
        </div>
        <Fld label="Channels">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{Object.entries(naChannels).map(([ch,on])=><button key={ch} onClick={()=>setNaChannels(p=>({...p,[ch]:!on}))} style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,background:on?naColor+"18":C.s2,color:on?naColor:C.t3,border:`1.5px solid ${on?naColor+"55":C.b1}`,cursor:"pointer",textTransform:"capitalize"}}>{ch}</button>)}</div>
        </Fld>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:10}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowNewAgent(false);setEditAgent(null);}}/><Btn ch={editAgent?"Save Changes":"Create Agent"} v="primary" onClick={saveAgent}/></div>
      </Mdl>}
    </div>;
  }

  // ═══ SELECTED AGENT — CONFIG VIEW (existing 7 tabs) ═══
  const [tab,setTab]=useState("overview");
  const [enabled,setEnabled]=useState(activeAgent?.active??true);
  const [agentName,setAgentName]=useState(activeAgent?.name||"Aria Sales");
  const [tone,setTone]=useState(activeAgent?.tone||"consultative");
  const [language,setLanguage]=useState(activeAgent?.language||"en");
  const [autoQualify,setAutoQualify]=useState(true);
  const [autoBook,setAutoBook]=useState(true);
  const [autoCRM,setAutoCRM]=useState(true);
  const [channels,setChannels]=useState(activeAgent?.channels||{live:true,whatsapp:true,email:false,instagram:false,facebook:true});
  const [qualRules,setQualRules]=useState([
    {id:"qr1",field:"budget",op:">=",value:"5000",score:30,active:true},
    {id:"qr2",field:"team_size",op:">=",value:"10",score:25,active:true},
    {id:"qr3",field:"timeline",op:"<=",value:"30 days",score:20,active:true},
    {id:"qr4",field:"decision_maker",op:"==",value:"yes",score:25,active:true},
    {id:"qr5",field:"current_tool",op:"!=",value:"none",score:10,active:true},
    {id:"qr6",field:"industry",op:"in",value:"SaaS,Finance,E-Commerce",score:15,active:false}
  ]);
  const [playbooks,setPlaybooks]=useState([
    {id:"pb1",name:"Inbound Website Lead",trigger:"visitor_starts_chat",active:true,steps:["Greet by name","Ask about goals","Identify pain points","Recommend plan","Handle objections","Book demo or send proposal"],product:"Pro/Enterprise",avgDealSize:"$24K",convRate:"32%",assigned:"Priya"},
    {id:"pb2",name:"Trial User Upgrade",trigger:"trial_day_7",active:true,steps:["Check usage metrics","Ask about experience","Highlight unused features","Present upgrade path","Offer limited discount","Close or schedule follow-up"],product:"Pro",avgDealSize:"$12K",convRate:"18%",assigned:"Dev"},
    {id:"pb3",name:"Churned Win-Back",trigger:"subscription_cancelled",active:false,steps:["Empathize with decision","Ask for feedback","Address specific issue","Present improvement","Offer incentive","Final offer or graceful close"],product:"Any",avgDealSize:"$8K",convRate:"8%",assigned:"Meena"},
    {id:"pb4",name:"WhatsApp Inquiry",trigger:"wa_first_message",active:true,steps:["Quick greeting","Qualify: company + size","Identify use case","Send brochure/case study","Suggest demo","Route to sales rep"],product:"Starter/Pro",avgDealSize:"$6K",convRate:"15%",assigned:"Dev"},
    {id:"pb5",name:"Enterprise Outbound",trigger:"manual_trigger",active:true,steps:["Research company beforehand","Personalized opening","Executive pain points","ROI framework","Security/compliance assurance","C-suite meeting request"],product:"Enterprise",avgDealSize:"$72K",convRate:"5%",assigned:"Priya"}
  ]);
  const [objections,setObjections]=useState([
    {id:"ob1",trigger:"too expensive",response:"I understand budget is important. Let me show you the ROI — our average customer saves 40% on support costs within 3 months. Would a cost comparison help?",category:"Price",useCount:47,successRate:68},
    {id:"ob2",trigger:"using competitor",response:"Great that you have a system in place! Many of our customers switched from {competitor} because of our AI auto-reply and omnichannel support. What's your biggest pain point currently?",category:"Competition",useCount:31,successRate:55},
    {id:"ob3",trigger:"not ready",response:"No rush at all. Would it help if I sent you a case study from a similar company? When would be a good time to revisit this conversation?",category:"Timing",useCount:23,successRate:42},
    {id:"ob4",trigger:"need to check with team",response:"Absolutely — team buy-in is crucial. I can prepare a one-pager with ROI projections specifically for your team size. Would that be useful for the internal discussion?",category:"Authority",useCount:19,successRate:61},
    {id:"ob5",trigger:"too complex",response:"I hear you. Our onboarding takes under 30 minutes and we assign a dedicated success manager. Want me to show you a 5-minute quick-start demo?",category:"Complexity",useCount:15,successRate:72},
    {id:"ob6",trigger:"data security concern",response:"Security is our top priority. We're SOC 2 Type II certified, GDPR compliant, and offer data residency options. I can share our security whitepaper — would that help?",category:"Security",useCount:12,successRate:78}
  ]);
  const [products,setProducts]=useState([
    {id:"pr1",name:"Starter",price:"$29/agent/mo",features:["5 inboxes","Live chat + email","Basic reports","1,000 contacts"],idealFor:"Small teams (1-5 agents)",qualifier:"team_size <= 5 AND budget < 3000"},
    {id:"pr2",name:"Pro",price:"$79/agent/mo",features:["15 inboxes","All channels","AI auto-reply","CRM integration","10,000 contacts"],idealFor:"Growing teams (5-50 agents)",qualifier:"team_size > 5 AND team_size <= 50"},
    {id:"pr3",name:"Enterprise",price:"Custom",features:["Unlimited inboxes","All channels + API","AI Sales Agent","SSO + HIPAA","Dedicated CSM","Unlimited contacts"],idealFor:"Large orgs (50+ agents)",qualifier:"team_size > 50 OR budget >= 50000 OR compliance_required"}
  ]);
  // ── Objection form ──
  const [showObjForm,setShowObjForm]=useState(false);const [editObj,setEditObj]=useState(null);
  const [objTrigger,setObjTrigger]=useState("");const [objResponse,setObjResponse]=useState("");const [objCat,setObjCat]=useState("Price");
  // ── Playbook form ──
  const [showPbForm,setShowPbForm]=useState(false);const [editPb,setEditPb]=useState(null);
  const [pbName,setPbName]=useState("");const [pbTrigger,setPbTrigger]=useState("visitor_starts_chat");const [pbProduct,setPbProduct]=useState("Pro");const [pbAssigned,setPbAssigned]=useState("Priya");const [pbSteps,setPbSteps]=useState(["Greet prospect","Qualify needs","Recommend plan"]);const [pbNewStep,setPbNewStep]=useState("");
  // ── Qualification rule form ──
  const [showQrForm,setShowQrForm]=useState(false);const [editQr,setEditQr]=useState(null);
  const [qrField,setQrField]=useState("budget");const [qrOp,setQrOp]=useState(">=");const [qrValue,setQrValue]=useState("");const [qrScore,setQrScore]=useState(20);
  // ── Product form ──
  const [showProdForm,setShowProdForm]=useState(false);const [editProd,setEditProd]=useState(null);
  const [prName,setPrName]=useState("");const [prPrice,setPrPrice]=useState("");const [prIdeal,setPrIdeal]=useState("");const [prQualifier,setPrQualifier]=useState("");const [prFeatures,setPrFeatures]=useState("");
  // ── Test ──
  const [testInput,setTestInput]=useState("");const [testResult,setTestResult]=useState(null);const [testLoading,setTestLoading]=useState(false);const [testHistory,setTestHistory]=useState([]);
  // ── Config ──
  const [prompt,setPrompt]=useState("You are an AI Sales Agent for SupportDesk. Your goal is to qualify leads, recommend the right product plan, handle objections empathetically, and book demos. Always be consultative, never pushy. Ask questions to understand the prospect's needs before recommending. If budget/timeline/authority signals are weak, nurture rather than hard-close.");
  const [handoffThreshold,setHandoffThreshold]=useState(60);const [maxTurns,setMaxTurns]=useState(8);const [followUpDays,setFollowUpDays]=useState(3);

  const metrics={leadsQualified:156,demosBooked:43,dealsCreated:28,convRate:"17.9%",avgDealSize:"$18.4K",revenue:"$515K",responseTime:"1.8s",csatScore:"4.6"};

  // ── Objection CRUD ──
  const saveObj=()=>{if(!objTrigger.trim()||!objResponse.trim())return showT("Trigger and response required","error");if(editObj)setObjections(p=>p.map(o=>o.id===editObj.id?{...o,trigger:objTrigger,response:objResponse,category:objCat}:o));else setObjections(p=>[{id:"ob"+uid(),trigger:objTrigger,response:objResponse,category:objCat,useCount:0,successRate:0},...p]);showT(editObj?"Updated":"Added!","success");setShowObjForm(false);setEditObj(null);};
  const openObjEdit=o=>{setObjTrigger(o.trigger);setObjResponse(o.response);setObjCat(o.category);setEditObj(o);setShowObjForm(true);};
  const delObj=id=>{setObjections(p=>p.filter(o=>o.id!==id));showT("Objection removed","success");};
  const openObjNew=()=>{setObjTrigger("");setObjResponse("");setObjCat("Price");setEditObj(null);setShowObjForm(true);};

  // ── Playbook CRUD ──
  const savePb=()=>{if(!pbName.trim())return showT("Name required","error");if(pbSteps.length<2)return showT("At least 2 steps required","error");const p={name:pbName,trigger:pbTrigger,product:pbProduct,assigned:pbAssigned,steps:[...pbSteps],active:true,avgDealSize:"—",convRate:"0%"};if(editPb)setPlaybooks(pr=>pr.map(x=>x.id===editPb.id?{...x,...p}:x));else setPlaybooks(pr=>[{id:"pb"+uid(),...p},...pr]);showT(editPb?"Playbook updated":"Playbook created!","success");setShowPbForm(false);setEditPb(null);};
  const openPbEdit=pb=>{setPbName(pb.name);setPbTrigger(pb.trigger);setPbProduct(pb.product);setPbAssigned(pb.assigned);setPbSteps([...pb.steps]);setPbNewStep("");setEditPb(pb);setShowPbForm(true);};
  const openPbNew=()=>{setPbName("");setPbTrigger("visitor_starts_chat");setPbProduct("Pro");setPbAssigned("Priya");setPbSteps(["Greet prospect","Qualify needs","Recommend plan"]);setPbNewStep("");setEditPb(null);setShowPbForm(true);};
  const delPb=id=>{setPlaybooks(p=>p.filter(x=>x.id!==id));showT("Playbook deleted","success");};
  const dupPb=pb=>{setPlaybooks(p=>[{...pb,id:"pb"+uid(),name:pb.name+" (Copy)",active:false},...p]);showT("Duplicated","success");};
  const addStep=()=>{if(!pbNewStep.trim())return;setPbSteps(p=>[...p,pbNewStep.trim()]);setPbNewStep("");};
  const moveStep=(i,dir)=>{setPbSteps(p=>{const n=[...p];const t=n[i];n[i]=n[i+dir];n[i+dir]=t;return n;});};

  // ── Qualification rule CRUD ──
  const saveQr=()=>{if(!qrField.trim()||!qrValue.trim())return showT("Field and value required","error");const p={field:qrField,op:qrOp,value:qrValue,score:Number(qrScore)||10,active:true};if(editQr)setQualRules(pr=>pr.map(r=>r.id===editQr.id?{...r,...p}:r));else setQualRules(pr=>[...pr,{id:"qr"+uid(),...p}]);showT(editQr?"Rule updated":"Rule added!","success");setShowQrForm(false);setEditQr(null);};
  const openQrEdit=r=>{setQrField(r.field);setQrOp(r.op);setQrValue(r.value);setQrScore(r.score);setEditQr(r);setShowQrForm(true);};
  const openQrNew=()=>{setQrField("budget");setQrOp(">=");setQrValue("");setQrScore(20);setEditQr(null);setShowQrForm(true);};
  const delQr=id=>{setQualRules(p=>p.filter(r=>r.id!==id));showT("Rule removed","success");};

  // ── Product CRUD ──
  const saveProd=()=>{if(!prName.trim())return showT("Name required","error");const p={name:prName,price:prPrice,idealFor:prIdeal,qualifier:prQualifier,features:prFeatures.split("\n").filter(f=>f.trim())};if(editProd)setProducts(pr=>pr.map(x=>x.id===editProd.id?{...x,...p}:x));else setProducts(pr=>[...pr,{id:"pr"+uid(),...p}]);showT(editProd?"Updated":"Product added!","success");setShowProdForm(false);setEditProd(null);};
  const openProdEdit=p=>{setPrName(p.name);setPrPrice(p.price);setPrIdeal(p.idealFor);setPrQualifier(p.qualifier);setPrFeatures((p.features||[]).join("\n"));setEditProd(p);setShowProdForm(true);};
  const openProdNew=()=>{setPrName("");setPrPrice("");setPrIdeal("");setPrQualifier("");setPrFeatures("");setEditProd(null);setShowProdForm(true);};
  const delProd=id=>{if(products.length<=1)return showT("Keep at least one product","error");setProducts(p=>p.filter(x=>x.id!==id));showT("Removed","success");};

  // ── Test with Claude ──
  const runTest=async()=>{if(!testInput.trim())return;setTestLoading(true);setTestResult(null);
    const fullPrompt=prompt+"\n\nQualification rules: "+qualRules.filter(r=>r.active).map(r=>r.field+" "+r.op+" "+r.value+" (+"+r.score+"pts)").join(", ")+"\n\nProducts: "+products.map(p=>p.name+": "+p.price+" — "+p.idealFor).join(" | ")+"\n\nObjection playbook: "+objections.slice(0,4).map(o=>'"'+o.trigger+'" → '+o.response.slice(0,100)).join(" | ")+"\n\nSales playbooks: "+playbooks.filter(p=>p.active).map(p=>p.name+": "+p.steps.join(" → ")).join(" | ");
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:fullPrompt,messages:[...testHistory.slice(-6),{role:"user",content:testInput}]})});const d=await r.json();const reply=d.content?.[0]?.text||"No response";setTestResult(reply);setTestHistory(p=>[...p,{role:"user",content:testInput},{role:"assistant",content:reply}]);
    }catch{const fb="👋 Hi! Thanks for reaching out to SupportDesk.\n\nTo find the best fit for your team, I'd love to understand:\n\n1. **How many support agents** does your team have?\n2. **Which channels** do your customers prefer? (chat, email, WhatsApp, etc.)\n3. **What's your timeline** for getting started?\n4. **Are you using any tools** currently?\n\nThis helps me recommend the perfect plan — we have options from $29/mo for small teams to custom Enterprise plans with SSO and dedicated support.";setTestResult(fb);setTestHistory(p=>[...p,{role:"user",content:testInput},{role:"assistant",content:fb}]);}
    setTestLoading(false);setTestInput("");};

  // ── Config save ──
  const saveConfig=()=>{setAgentsLocal(p=>p.map(a=>a.id===selAgent?{...a,name:agentName,tone,language,channels:{...channels}}:a));if(api.isConnected())api.post("/ai/sales-agent/config",{agent_id:selAgent,name:agentName,tone,language,prompt,channels,autoQualify,autoBook,autoCRM,handoffThreshold,maxTurns,followUpDays}).catch(()=>{});showT("Configuration saved ✓","success");};

  const TABS=[["overview","📊 Overview"],["playbooks","📋 Playbooks"],["qualification","🎯 Qualification"],["objections","🛡 Objections"],["products","📦 Products"],["prompt","⚙ Config"],["test","🧪 Test"]];
  const TRIGGERS=[{v:"visitor_starts_chat",l:"Visitor starts chat"},{v:"trial_day_3",l:"Trial day 3"},{v:"trial_day_7",l:"Trial day 7"},{v:"trial_expiring",l:"Trial expiring"},{v:"wa_first_message",l:"WhatsApp first message"},{v:"subscription_cancelled",l:"Subscription cancelled"},{v:"pricing_page_visit",l:"Pricing page visit"},{v:"manual_trigger",l:"Manual trigger"},{v:"lead_score_above_60",l:"Lead score ≥ 60"},{v:"cart_abandoned",l:"Cart abandoned"}];
  const OBJ_CATS=["Price","Competition","Timing","Authority","Complexity","Security","Feature Gap","Other"];
  const OBJ_COLORS={Price:C.r,Competition:C.y,Timing:C.cy,Authority:C.p,Complexity:C.a,Security:C.g,"Feature Gap":"#ff6b35",Other:C.t3};
  const FIELDS=["budget","team_size","timeline","decision_maker","current_tool","industry","company_size","use_case","channel_preference","compliance_required"];
  const OPS=[">=","<=","==","!=","in","not_in","contains"];

  return <div style={{padding:"24px 28px",overflowY:"auto",flex:1}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setSelAgent(null)} style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:C.s3,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">←</button>
        <div style={{width:40,height:40,borderRadius:12,background:(activeAgent?.color||C.a)+"22",border:`2px solid ${(activeAgent?.color||C.a)}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{activeAgent?.emoji||"🤖"}</div>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,display:"flex",alignItems:"center",gap:8}}>{activeAgent?.name||"Agent"} <Tag text={activeAgent?.role||"Sales"} color={activeAgent?.color||C.p}/></h2>
          <p style={{fontSize:12,color:C.t3,marginTop:2}}>Configure playbooks, qualification, objections, products, and test this agent</p>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Toggle val={enabled} set={v=>{setEnabled(v);setAgentsLocal(p=>p.map(a=>a.id===selAgent?{...a,active:v}:a));showT(v?"Agent activated":"Agent paused","info");}}/>
        <Tag text={enabled?"Active":"Paused"} color={enabled?C.g:C.t3}/>
      </div>
    </div>

    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:20}}>
      {TABS.map(([id,lbl])=><button key={id} onClick={()=>setTab(id)} style={{padding:"9px 14px",fontSize:11,fontWeight:700,fontFamily:FM,color:tab===id?C.p:C.t3,background:"transparent",border:"none",borderBottom:`2px solid ${tab===id?C.p:"transparent"}`,cursor:"pointer"}}>{lbl}</button>)}
    </div>

    <div style={{opacity:enabled?1:.5,pointerEvents:enabled?"auto":"none",transition:"opacity .2s"}}>

    {/* ═══ OVERVIEW ═══ */}
    {tab==="overview"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[{l:"Leads Qualified",v:metrics.leadsQualified,c:C.a,bg:C.ad,d:"↑ 23% this month"},{l:"Demos Booked",v:metrics.demosBooked,c:C.g,bg:C.gd,d:"↑ 15% vs last month"},{l:"Deals Created",v:metrics.dealsCreated,c:C.p,bg:C.pd,d:metrics.convRate+" conv. rate"},{l:"Revenue Influenced",v:metrics.revenue,c:C.y,bg:C.yd,d:"Avg "+metrics.avgDealSize}].map(k=>
          <div key={k.l} style={{background:k.bg,border:`1px solid ${k.c}33`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:9,fontWeight:700,color:k.c,fontFamily:FM,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</div>
            <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c,margin:"4px 0"}}>{k.v}</div>
            <div style={{fontSize:10,color:C.t3}}>{k.d}</div>
          </div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Recent Sales AI Activity</div>
          {[{icon:"🎯",text:"Qualified lead: Vikram Sinha (CloudNine) → Score: 82/100",time:"12m ago"},{icon:"📅",text:"Demo booked: Ananya Reddy (FreshMart) → Tomorrow 2pm",time:"28m ago"},{icon:"🛡",text:'Objection handled: "too expensive" → sent ROI calculator',time:"1h ago"},{icon:"📦",text:"Recommended Enterprise plan to James Wilson (Globex)",time:"2h ago"},{icon:"💼",text:"Deal created: PayEase Upgrade → $36K pipeline",time:"3h ago"},{icon:"🤝",text:"Handoff to Priya: TechCorp needs security review",time:"4h ago"}].map((a,i)=>
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<5?`1px solid ${C.b1}22`:"none"}}>
              <span style={{fontSize:16}}>{a.icon}</span>
              <div style={{flex:1,fontSize:12,color:C.t2,lineHeight:1.5}}>{a.text}</div>
              <span style={{fontSize:9,color:C.t3,fontFamily:FM,flexShrink:0}}>{a.time}</span>
            </div>)}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Performance</div>
          {[{l:"Avg Response Time",v:metrics.responseTime,pct:36,c:C.g},{l:"CSAT Score",v:metrics.csatScore+"/5",pct:92,c:C.a},{l:"Qualification Accuracy",v:"87%",pct:87,c:C.p},{l:"Objection Win Rate",v:"62%",pct:62,c:C.y},{l:"Demo Show Rate",v:"78%",pct:78,c:C.cy},{l:"Lead → Deal",v:metrics.convRate,pct:17.9,c:C.g}].map(m=>
            <div key={m.l} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:C.t2}}>{m.l}</span><span style={{fontSize:11,fontWeight:700,color:m.c,fontFamily:FM}}>{m.v}</span></div>
              <div style={{height:6,borderRadius:3,background:C.s3}}><div style={{height:6,borderRadius:3,background:m.c,width:Math.min(m.pct,100)+"%"}}/></div>
            </div>)}
          <div style={{marginTop:14,padding:10,background:C.pd,borderRadius:8,border:`1px solid ${C.p}33`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.p,fontFamily:FM}}>✦ AI INSIGHT</div>
            <div style={{fontSize:11,color:C.t2,marginTop:4,lineHeight:1.5}}>Top playbook: <strong>Inbound Website Lead</strong> at 32% conversion. Enable Instagram channel — high engagement, 0% AI coverage.</div>
          </div>
        </div>
      </div>
    </div>}

    {/* ═══ PLAYBOOKS ═══ */}
    {tab==="playbooks"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{playbooks.length} Sales Playbooks</div>
        <Btn ch="+ New Playbook" v="primary" onClick={openPbNew}/>
      </div>
      {playbooks.map(pb=><div key={pb.id} style={{background:C.s1,border:`1px solid ${pb.active?C.g+"33":C.b1}`,borderRadius:12,padding:16,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:pb.active?C.gd:C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{pb.active?"📋":"⏸"}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:14,fontWeight:700}}>{pb.name}</span>
              <Tag text={pb.product} color={C.p}/>
              <Tag text={pb.active?"Active":"Paused"} color={pb.active?C.g:C.t3}/>
            </div>
            <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginBottom:8}}>Trigger: {pb.trigger.replace(/_/g," ")} · Owner: {pb.assigned} · Avg deal: {pb.avgDealSize} · Conv: {pb.convRate}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {pb.steps.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                <span style={{width:16,height:16,borderRadius:"50%",background:C.a+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:10,color:C.t2,whiteSpace:"nowrap"}}>{s}</span>
                {i<pb.steps.length-1&&<span style={{color:C.b2,fontSize:10}}>→</span>}
              </div>)}
            </div>
          </div>
          <div style={{display:"flex",gap:3,flexShrink:0}}>
            <Toggle val={pb.active} set={v=>setPlaybooks(p=>p.map(x=>x.id===pb.id?{...x,active:v}:x))}/>
            <button onClick={()=>openPbEdit(pb)} style={{padding:"4px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>Edit</button>
            <button onClick={()=>dupPb(pb)} style={{padding:"4px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FM}}>⎘</button>
            <button onClick={()=>delPb(pb.id)} style={{padding:"4px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:C.rd,color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer",fontFamily:FM}}>✕</button>
          </div>
        </div>
      </div>)}
      {showPbForm&&<Mdl title={editPb?"Edit Playbook":"New Playbook"} onClose={()=>{setShowPbForm(false);setEditPb(null);}} w={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Playbook Name"><Inp val={pbName} set={setPbName} ph="e.g. Inbound Website Lead"/></Fld>
          <Fld label="Trigger"><Sel val={pbTrigger} set={setPbTrigger} opts={TRIGGERS}/></Fld>
          <Fld label="Target Product"><Sel val={pbProduct} set={setPbProduct} opts={products.map(p=>({v:p.name,l:p.name}))}/></Fld>
          <Fld label="Assigned To"><Sel val={pbAssigned} set={setPbAssigned} opts={[{v:"Priya",l:"Priya"},{v:"Dev",l:"Dev"},{v:"Meena",l:"Meena"},{v:"Aryan",l:"Aryan"}]}/></Fld>
        </div>
        <Fld label={"Steps ("+pbSteps.length+")"}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {pbSteps.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 8px",background:C.s2,borderRadius:6,border:`1px solid ${C.b1}`}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:C.a+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{i+1}</span>
              <input value={s} onChange={e=>setPbSteps(p=>p.map((x,j)=>j===i?e.target.value:x))} style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
              {i>0&&<button onClick={()=>moveStep(i,-1)} style={{fontSize:10,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>↑</button>}
              {i<pbSteps.length-1&&<button onClick={()=>moveStep(i,1)} style={{fontSize:10,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>↓</button>}
              {pbSteps.length>2&&<button onClick={()=>setPbSteps(p=>p.filter((_,j)=>j!==i))} style={{fontSize:10,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>}
            </div>)}
            <div style={{display:"flex",gap:4}}>
              <input value={pbNewStep} onChange={e=>setPbNewStep(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addStep();}}} placeholder="Add a step…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
              <button onClick={addStep} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:C.a,color:"#fff",border:"none",cursor:"pointer"}}>+ Add</button>
            </div>
          </div>
        </Fld>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:10}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowPbForm(false);setEditPb(null);}}/><Btn ch={editPb?"Save Changes":"Create Playbook"} v="primary" onClick={savePb}/></div>
      </Mdl>}
    </div>}

    {/* ═══ QUALIFICATION ═══ */}
    {tab==="qualification"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Lead Scoring Rules</div><div style={{fontSize:11,color:C.t3}}>AI scores leads 0-100 based on these signals. Score ≥ {handoffThreshold} = Sales Qualified</div></div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Toggle val={autoQualify} set={v=>{setAutoQualify(v);showT(v?"Auto-qualify ON":"Auto-qualify OFF","info");}}/><span style={{fontSize:11,color:autoQualify?C.g:C.t3,fontFamily:FM,fontWeight:700}}>Auto-qualify</span>
          <Btn ch="+ Add Rule" v="primary" onClick={openQrNew}/>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {qualRules.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:C.s1,border:`1px solid ${r.active?C.a+"33":C.b1}`,borderRadius:10}}>
          <Toggle val={r.active} set={v=>setQualRules(p=>p.map(x=>x.id===r.id?{...x,active:v}:x))}/>
          <div style={{flex:1}}>
            <span style={{fontSize:12,fontWeight:600}}>{r.field.replace(/_/g," ")}</span>
            <span style={{fontSize:11,color:C.t3,fontFamily:FM}}> {r.op} </span>
            <span style={{fontSize:12,fontWeight:600,color:C.a}}>{r.value}</span>
          </div>
          <div style={{width:50,height:26,borderRadius:8,background:C.pd,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:12,fontWeight:800,color:C.p,fontFamily:FM}}>+{r.score}</span>
          </div>
          <button onClick={()=>openQrEdit(r)} style={{fontSize:9,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:5,padding:"3px 7px",cursor:"pointer",fontFamily:FM}}>Edit</button>
          <button onClick={()=>delQr(r.id)} style={{fontSize:9,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,borderRadius:5,padding:"3px 7px",cursor:"pointer",fontFamily:FM}}>✕</button>
        </div>)}
      </div>
      <div style={{marginTop:16,padding:14,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12}}>
        <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:8}}>Score Thresholds</div>
        <div style={{display:"flex",gap:12}}>
          {[{l:"Hot Lead",range:"80-100",c:C.r,emoji:"🔥"},{l:"SQL",range:"60-79",c:C.g,emoji:"✅"},{l:"MQL",range:"40-59",c:C.y,emoji:"⚡"},{l:"Nurture",range:"20-39",c:C.cy,emoji:"💧"},{l:"Cold",range:"0-19",c:C.t3,emoji:"❄️"}].map(t=>
            <div key={t.l} style={{flex:1,padding:10,borderRadius:8,background:t.c+"11",border:`1px solid ${t.c}33`,textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:2}}>{t.emoji}</div>
              <div style={{fontSize:11,fontWeight:700,color:t.c}}>{t.l}</div>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{t.range} pts</div>
            </div>)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Toggle val={autoCRM} set={setAutoCRM}/><span style={{fontSize:11,color:C.t2}}>Auto-create CRM lead when score ≥ 40</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Toggle val={autoBook} set={setAutoBook}/><span style={{fontSize:11,color:C.t2}}>Auto-suggest demo booking when score ≥ {handoffThreshold}</span></div>
        </div>
      </div>
      {showQrForm&&<Mdl title={editQr?"Edit Scoring Rule":"Add Scoring Rule"} onClose={()=>{setShowQrForm(false);setEditQr(null);}} w={420}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Field"><Sel val={qrField} set={setQrField} opts={FIELDS.map(f=>({v:f,l:f.replace(/_/g," ")}))}/></Fld>
          <Fld label="Operator"><Sel val={qrOp} set={setQrOp} opts={OPS.map(o=>({v:o,l:o}))}/></Fld>
        </div>
        <Fld label="Value"><Inp val={qrValue} set={setQrValue} ph='e.g. 5000, "yes", "SaaS,Finance"'/></Fld>
        <Fld label={"Score Points: +"+qrScore}><input type="range" min={5} max={50} step={5} value={qrScore} onChange={e=>setQrScore(Number(e.target.value))} style={{width:"100%",accentColor:C.p}}/></Fld>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowQrForm(false);setEditQr(null);}}/><Btn ch={editQr?"Save":"Add Rule"} v="primary" onClick={saveQr}/></div>
      </Mdl>}
    </div>}

    {/* ═══ OBJECTIONS ═══ */}
    {tab==="objections"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{objections.length} Objection Handlers</div>
        <Btn ch="+ Add Response" v="primary" onClick={openObjNew}/>
      </div>
      {objections.map(o=><div key={o.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <Tag text={o.category} color={OBJ_COLORS[o.category]||C.t3}/>
          <span style={{fontSize:13,fontWeight:700,flex:1}}>"{o.trigger}"</span>
          <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>Used {o.useCount}× · {o.successRate}% win</span>
          <button onClick={()=>openObjEdit(o)} style={{fontSize:9,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:FM}}>Edit</button>
          <button onClick={()=>delObj(o.id)} style={{fontSize:9,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:FM}}>✕</button>
        </div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.6,padding:"8px 12px",background:C.s2,borderRadius:8,borderLeft:`3px solid ${C.p}`}}>{o.response}</div>
      </div>)}
      {showObjForm&&<Mdl title={editObj?"Edit Objection":"Add Objection Response"} onClose={()=>{setShowObjForm(false);setEditObj(null);}} w={480}>
        <Fld label="Category"><Sel val={objCat} set={setObjCat} opts={OBJ_CATS.map(v=>({v,l:v}))}/></Fld>
        <Fld label="Trigger phrase"><Inp val={objTrigger} set={setObjTrigger} ph='e.g. "too expensive", "not ready"'/></Fld>
        <Fld label="AI Response"><textarea value={objResponse} onChange={e=>setObjResponse(e.target.value)} rows={4} placeholder="Empathetic response…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none"}}/></Fld>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowObjForm(false);setEditObj(null);}}/><Btn ch={editObj?"Save":"Add"} v="primary" onClick={saveObj}/></div>
      </Mdl>}
    </div>}

    {/* ═══ PRODUCTS ═══ */}
    {tab==="products"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Product Recommendation Matrix</div>
        <Btn ch="+ Add Product" v="primary" onClick={openProdNew}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(products.length,3)+",1fr)",gap:12}}>
        {products.map(p=><div key={p.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{fontSize:16,fontWeight:800,fontFamily:FD}}>{p.name}</div>
            <div style={{display:"flex",gap:2}}>
              <button onClick={()=>openProdEdit(p)} style={{fontSize:9,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>✎</button>
              <button onClick={()=>delProd(p.id)} style={{fontSize:9,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>✕</button>
            </div>
          </div>
          <div style={{fontSize:20,fontWeight:800,color:C.a,fontFamily:FD,marginBottom:8}}>{p.price}</div>
          <div style={{fontSize:11,color:C.t3,marginBottom:10,fontStyle:"italic"}}>{p.idealFor}</div>
          <div style={{flex:1}}>{(p.features||[]).map((f,i)=><div key={i} style={{display:"flex",gap:5,padding:"3px 0",fontSize:11,color:C.t2}}><span style={{color:C.g}}>✓</span>{f}</div>)}</div>
          <div style={{marginTop:10,padding:8,background:C.s2,borderRadius:6,fontSize:10,color:C.t3,fontFamily:FM}}><strong>Qualifier:</strong> {p.qualifier}</div>
        </div>)}
      </div>
      <div style={{marginTop:16,padding:14,background:C.pd,borderRadius:12,border:`1px solid ${C.p}33`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.p,fontFamily:FM,marginBottom:4}}>✦ HOW AI RECOMMENDS</div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.6}}>AI evaluates qualification signals against product qualifier rules. It explains recommendations with prospect-specific reasons and compares plans when the prospect is between tiers.</div>
      </div>
      {showProdForm&&<Mdl title={editProd?"Edit Product":"Add Product"} onClose={()=>{setShowProdForm(false);setEditProd(null);}} w={420}>
        <Fld label="Product Name"><Inp val={prName} set={setPrName} ph="e.g. Pro Plus"/></Fld>
        <Fld label="Price"><Inp val={prPrice} set={setPrPrice} ph="e.g. $49/agent/mo"/></Fld>
        <Fld label="Ideal For"><Inp val={prIdeal} set={setPrIdeal} ph="e.g. Growing teams (5-50 agents)"/></Fld>
        <Fld label="AI Qualifier Rule"><Inp val={prQualifier} set={setPrQualifier} ph="e.g. team_size > 5 AND budget < 10000"/></Fld>
        <Fld label="Features (one per line)"><textarea value={prFeatures} onChange={e=>setPrFeatures(e.target.value)} rows={4} placeholder={"Feature 1\nFeature 2\nFeature 3"} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FM,resize:"vertical",outline:"none"}}/></Fld>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowProdForm(false);setEditProd(null);}}/><Btn ch={editProd?"Save":"Add Product"} v="primary" onClick={saveProd}/></div>
      </Mdl>}
    </div>}

    {/* ═══ CONFIG ═══ */}
    {tab==="prompt"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div>
          <Fld label="Agent Name"><Inp val={agentName} set={setAgentName} ph="e.g. Aria Sales"/></Fld>
          <Fld label="Sales Tone"><Sel val={tone} set={setTone} opts={[{v:"consultative",l:"Consultative (recommended)"},{v:"friendly",l:"Friendly & Casual"},{v:"professional",l:"Professional & Formal"},{v:"challenger",l:"Challenger Sale"},{v:"solution",l:"Solution Selling"}]}/></Fld>
          <Fld label="Language"><Sel val={language} set={setLanguage} opts={[{v:"en",l:"English"},{v:"hi",l:"Hindi"},{v:"es",l:"Spanish"},{v:"ar",l:"Arabic"},{v:"auto",l:"Auto-detect"}]}/></Fld>
          <Fld label={"Handoff to human when score ≥ "+handoffThreshold}><input type="range" min={30} max={90} step={5} value={handoffThreshold} onChange={e=>setHandoffThreshold(Number(e.target.value))} style={{width:"100%",accentColor:C.a}}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Max AI turns"><Inp val={String(maxTurns)} set={v=>setMaxTurns(Number(v)||8)} ph="8"/></Fld>
            <Fld label="Follow-up (days)"><Inp val={String(followUpDays)} set={v=>setFollowUpDays(Number(v)||3)} ph="3"/></Fld>
          </div>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:8}}>Active Channels</div>
          {Object.entries(channels).map(([ch,on])=><div key={ch} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.s1,borderRadius:8,border:`1px solid ${on?C.g+"33":C.b1}`,marginBottom:4}}>
            <span style={{fontSize:12,textTransform:"capitalize"}}>{ch}</span>
            <Toggle val={on} set={v=>setChannels(p=>({...p,[ch]:v}))}/>
          </div>)}
        </div>
      </div>
      <Fld label="System Prompt"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={6} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.t1,fontFamily:FM,resize:"vertical",outline:"none",lineHeight:1.6}}/></Fld>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <Btn ch="Save Configuration" v="primary" onClick={saveConfig}/>
        <Btn ch="Reset to Default" v="ghost" onClick={()=>{setAgentName("Aria Sales");setTone("consultative");setLanguage("en");setHandoffThreshold(60);setMaxTurns(8);setFollowUpDays(3);showT("Reset to defaults","info");}}/>
      </div>
    </div>}

    {/* ═══ TEST ═══ */}
    {tab==="test"&&<div>
      <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:4}}>Test AI Sales Agent</div>
      <p style={{fontSize:12,color:C.t3,marginBottom:14}}>Multi-turn conversation test. History carries forward — ask follow-up questions to test qualification flow.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          {testHistory.length>0&&<div style={{maxHeight:200,overflowY:"auto",marginBottom:10,border:`1px solid ${C.b1}`,borderRadius:10,padding:10,background:C.s1}}>
            {testHistory.map((m,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:700,color:m.role==="user"?C.t1:C.p,fontFamily:FM,flexShrink:0,width:36}}>{m.role==="user"?"You":"AI"}</span>
              <span style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{m.content.slice(0,120)}{m.content.length>120?"…":""}</span>
            </div>)}
          </div>}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <input value={testInput} onChange={e=>setTestInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();runTest();}}} placeholder="Type a prospect message…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 14px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
            <Btn ch={testLoading?"…":"▶"} v="primary" onClick={runTest}/>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {['"Hi, we have 30 agents on Zendesk"','"What\'s the pricing?"','"Too expensive for us"','"Need to check with my boss"','"Can I see a demo?"','"Not ready yet"'].map(q=><button key={q} onClick={()=>setTestInput(q.slice(1,-1))} style={{padding:"4px 8px",borderRadius:6,fontSize:9.5,background:C.s2,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer"}}>{q.slice(1,28)}{q.length>29?"…":""}</button>)}
          </div>
          {testHistory.length>0&&<button onClick={()=>{setTestHistory([]);setTestResult(null);showT("Conversation cleared","info");}} style={{marginTop:8,padding:"4px 10px",borderRadius:6,fontSize:10,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Clear conversation</button>}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.p,marginBottom:6}}>✦ AI SALES AGENT RESPONSE</div>
          <div style={{minHeight:180,padding:14,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,fontSize:13,color:C.t1,lineHeight:1.6,whiteSpace:"pre-wrap",overflowY:"auto",maxHeight:350}}>
            {testLoading?<div style={{display:"flex",gap:6,alignItems:"center"}}><Spin/><span style={{fontSize:12,color:C.t3}}>Analyzing prospect…</span></div>:
            testResult||<span style={{color:C.t3,fontStyle:"italic"}}>Send a message to start a test conversation</span>}
          </div>
        </div>
      </div>
    </div>}

    </div>
  </div>;
}


