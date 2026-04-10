import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ═══════════════════════════════════════════════════════════════
//  AI SALES AGENT — Real-time AI-powered sales system
//  Connected to /api/sales-agent backend
// ═══════════════════════════════════════════════════════════════

const pj=(v:any,fb:any=null)=>{try{return typeof v==="string"?JSON.parse(v):v||fb;}catch{return fb;}};
const sj=(v:any)=>typeof v==="string"?v:JSON.stringify(v);

export default function AISalesAgentScr(){
  const [agents,setAgents]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [selAgent,setSelAgent]=useState<string|null>(null);
  const [showNewAgent,setShowNewAgent]=useState(false);const [editAgent,setEditAgent]=useState<any>(null);
  const [naName,setNaName]=useState("");const [naRole,setNaRole]=useState("");const [naEmoji,setNaEmoji]=useState("🤖");const [naColor,setNaColor]=useState(C.a);const [naTone,setNaTone]=useState("consultative");const [naLang,setNaLang]=useState("en");const [naChannels,setNaChannels]=useState<any>({live:true,whatsapp:false,email:false,instagram:false,facebook:false});

  // ── Dashboard data ──
  const [dashboard,setDashboard]=useState<any>(null);

  // ── Load agents from backend ──
  const loadAgents=useCallback(async()=>{
    try{const r=await api.get("/sales-agent/agents");
      setAgents((r.agents||[]).map((a:any)=>({...a,channels:pj(a.channels,{})})));
    }catch(e){console.error("Load agents error:",e);}finally{setLoading(false);}
  },[]);

  const loadDashboard=useCallback(async(agentId?:string)=>{
    try{const url=agentId?`/sales-agent/dashboard?agent_id=${agentId}`:"/sales-agent/dashboard";
      const r=await api.get(url);setDashboard(r);
    }catch(e){console.error("Dashboard error:",e);}
  },[]);

  useEffect(()=>{loadAgents();loadDashboard();},[loadAgents,loadDashboard]);

  // ── Agent CRUD ──
  const saveAgent=async()=>{
    if(!naName.trim())return showT("Name required","error");
    if(!naRole.trim())return showT("Role required","error");
    const body={name:naName,role:naRole,emoji:naEmoji,color:naColor,tone:naTone,language:naLang,channels:naChannels};
    try{
      if(editAgent){await api.patch(`/sales-agent/agents/${editAgent.id}`,body);showT("Agent updated","success");}
      else{await api.post("/sales-agent/agents",body);showT("Agent created!","success");}
      loadAgents();
    }catch(e:any){showT(e.message||"Failed","error");}
    setShowNewAgent(false);setEditAgent(null);
  };
  const openAgentEdit=(a:any)=>{setNaName(a.name);setNaRole(a.role||"");setNaEmoji(a.emoji||"🤖");setNaColor(a.color||C.a);setNaTone(a.tone||"consultative");setNaLang(a.language||"en");setNaChannels(pj(a.channels,{live:true}));setEditAgent(a);setShowNewAgent(true);};
  const openAgentNew=()=>{setNaName("");setNaRole("");setNaEmoji("🤖");setNaColor(C.a);setNaTone("consultative");setNaLang("en");setNaChannels({live:true,whatsapp:false,email:false,instagram:false,facebook:false});setEditAgent(null);setShowNewAgent(true);};
  const delAgent=async(id:string)=>{
    if(agents.length<=1)return showT("Keep at least one agent","error");
    try{await api.del(`/sales-agent/agents/${id}`);if(selAgent===id)setSelAgent(null);loadAgents();showT("Agent removed","success");}catch{showT("Failed to delete","error");}
  };
  const toggleAgent=async(id:string)=>{
    try{await api.patch(`/sales-agent/agents/${id}/toggle`,{});loadAgents();}catch{showT("Failed","error");}
  };
  const dupAgent=async(a:any)=>{
    try{await api.post("/sales-agent/agents",{name:a.name+" (Copy)",role:a.role,emoji:a.emoji,color:a.color,tone:a.tone,language:a.language,channels:pj(a.channels,{})});loadAgents();showT("Duplicated","success");}catch{showT("Failed","error");}
  };

  const EMOJIS=["💼","🎯","💬","🤖","🧠","⚡","🔥","🌟","🛡","📊","🚀","💎","🎧","👋","📈","🏆"];
  const COLORS=[C.a,C.p,C.g,C.y,C.cy,C.r,"#ff6b35","#e91e63"];
  const activeAgent=agents.find((a:any)=>a.id===selAgent);

  // ═══ AGENT LIST VIEW ═══
  if(!selAgent){
    if(loading)return <div style={{padding:"24px 28px",flex:1}}><SkelCards/></div>;
    const totalLeads=dashboard?.total_leads||0;const convRate=dashboard?.conversion_rate||0;
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
        {[{l:"Total Agents",v:agents.length,c:C.p,bg:C.pd,d:agents.filter((a:any)=>a.active).length+" active"},{l:"Total Leads",v:totalLeads,c:C.a,bg:C.ad,d:"Across all agents"},{l:"Pipeline Value",v:"$"+(dashboard?.pipeline_value||0),c:C.g,bg:C.gd,d:"Active deals"},{l:"Conversion Rate",v:convRate+"%",c:C.y,bg:C.yd,d:"Leads to deals"}].map(k=>
          <div key={k.l} style={{background:k.bg,border:`1px solid ${k.c}33`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:9,fontWeight:700,color:k.c,fontFamily:FM,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</div>
            <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c,margin:"4px 0"}}>{k.v}</div>
            <div style={{fontSize:10,color:C.t3}}>{k.d}</div>
          </div>)}
      </div>

      {/* Agent Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
        {agents.map((a:any)=>{const ch=pj(a.channels,{});return <div key={a.id} className="card-lift" style={{background:C.s1,border:`1.5px solid ${a.active?a.color+"44":C.b1}`,borderRadius:14,padding:18,cursor:"pointer",transition:"all .15s",position:"relative"}}
          onClick={()=>setSelAgent(a.id)} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
          <div style={{position:"absolute",top:12,right:12,display:"flex",gap:4}}>
            <Tag text={a.active?"Active":"Paused"} color={a.active?C.g:C.t3}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:48,height:48,borderRadius:14,background:a.color+"22",border:`2px solid ${a.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{a.emoji||"🤖"}</div>
            <div>
              <div style={{fontSize:16,fontWeight:800,fontFamily:FD}}>{a.name}</div>
              <div style={{fontSize:11,color:C.t3,fontFamily:FM}}>{a.role}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
            {Object.entries(ch).filter(([,v])=>v).map(([c])=><span key={c} style={{padding:"2px 8px",borderRadius:6,fontSize:9,fontWeight:700,background:a.color+"15",color:a.color,border:`1px solid ${a.color}33`,fontFamily:FM,textTransform:"capitalize"}}>{c}</span>)}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>TONE </span><span style={{fontSize:12,fontWeight:700,color:a.color,fontFamily:FM,textTransform:"capitalize"}}>{a.tone}</span></div>
            <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
              <Toggle val={!!a.active} set={()=>toggleAgent(a.id)}/>
              <button onClick={()=>openAgentEdit(a)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer"}} className="hov">✎</button>
              <button onClick={()=>dupAgent(a)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">⎘</button>
              <button onClick={()=>delAgent(a.id)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.rd,color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer"}} className="hov">✕</button>
            </div>
          </div>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:8}}>Lang: {a.language} · Handoff: {a.handoff_threshold||70}</div>
        </div>;})}

        <div onClick={openAgentNew} className="hov" style={{background:C.s1,border:`2px dashed ${C.b2}`,borderRadius:14,padding:18,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.a;e.currentTarget.style.background=C.ad;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.b2;e.currentTarget.style.background=C.s1;}}>
          <div style={{fontSize:32,marginBottom:8,opacity:.5}}>+</div>
          <div style={{fontSize:14,fontWeight:700,color:C.t2,fontFamily:FD}}>Create New Agent</div>
          <div style={{fontSize:11,color:C.t3,marginTop:4,textAlign:"center"}}>Specialized AI for a specific sales scenario</div>
        </div>
      </div>

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
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{Object.entries(naChannels).map(([ch,on])=><button key={ch} onClick={()=>setNaChannels((p:any)=>({...p,[ch]:!on}))} style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,background:on?naColor+"18":C.s2,color:on?naColor:C.t3,border:`1.5px solid ${on?naColor+"55":C.b1}`,cursor:"pointer",textTransform:"capitalize"}}>{ch}</button>)}</div>
        </Fld>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:10}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowNewAgent(false);setEditAgent(null);}}/><Btn ch={editAgent?"Save Changes":"Create Agent"} v="primary" onClick={saveAgent}/></div>
      </Mdl>}
    </div>;
  }

  // ═══ AGENT DETAIL VIEW ═══
  return <AgentDetail agent={activeAgent} onBack={()=>setSelAgent(null)} onReload={loadAgents}/>;
}

// ═══════════════════════════════════════════════════════════════
//  AGENT DETAIL — Tabs with real backend data
// ═══════════════════════════════════════════════════════════════
function AgentDetail({agent,onBack,onReload}:{agent:any,onBack:()=>void,onReload:()=>void}){
  const [tab,setTab]=useState("overview");
  const [playbooks,setPlaybooks]=useState<any[]>([]);
  const [qualRules,setQualRules]=useState<any[]>([]);
  const [objections,setObjections]=useState<any[]>([]);
  const [products,setProducts]=useState<any[]>([]);
  const [activities,setActivities]=useState<any[]>([]);
  const [dashboard,setDashboard]=useState<any>(null);
  const [loadingData,setLoadingData]=useState(true);

  // ── Agent config state ──
  const [agentName,setAgentName]=useState(agent?.name||"");
  const [tone,setTone]=useState(agent?.tone||"consultative");
  const [language,setLanguage]=useState(agent?.language||"en");
  const [prompt,setPrompt]=useState(agent?.system_prompt||"You are an AI Sales Agent. Your goal is to qualify leads, recommend the right product plan, handle objections empathetically, and book demos. Always be consultative, never pushy.");
  const [handoffThreshold,setHandoffThreshold]=useState(agent?.handoff_threshold||70);
  const [maxTurns,setMaxTurns]=useState(agent?.max_turns||10);
  const [followUpDays,setFollowUpDays]=useState(agent?.followup_days||3);
  const [channels,setChannels]=useState(pj(agent?.channels,{live:true,whatsapp:false,email:false,instagram:false,facebook:false}));
  const [enabled,setEnabled]=useState(!!agent?.active);

  // ── Form states ──
  const [showPbForm,setShowPbForm]=useState(false);const [editPb,setEditPb]=useState<any>(null);
  const [pbName,setPbName]=useState("");const [pbTrigger,setPbTrigger]=useState("visitor_starts_chat");const [pbProduct,setPbProduct]=useState("Pro");const [pbAssigned,setPbAssigned]=useState("");const [pbSteps,setPbSteps]=useState(["Greet prospect","Qualify needs","Recommend plan"]);const [pbNewStep,setPbNewStep]=useState("");

  const [showQrForm,setShowQrForm]=useState(false);const [editQr,setEditQr]=useState<any>(null);
  const [qrField,setQrField]=useState("budget");const [qrOp,setQrOp]=useState("greater_than");const [qrValue,setQrValue]=useState("");const [qrScore,setQrScore]=useState(20);

  const [showObjForm,setShowObjForm]=useState(false);const [editObj,setEditObj]=useState<any>(null);
  const [objTrigger,setObjTrigger]=useState("");const [objResponse,setObjResponse]=useState("");const [objCat,setObjCat]=useState("Price");

  const [showProdForm,setShowProdForm]=useState(false);const [editProd,setEditProd]=useState<any>(null);
  const [prName,setPrName]=useState("");const [prPrice,setPrPrice]=useState("");const [prIdeal,setPrIdeal]=useState("");const [prQualifier,setPrQualifier]=useState("");const [prFeatures,setPrFeatures]=useState("");

  // ── Test state ──
  const [testInput,setTestInput]=useState("");const [testResult,setTestResult]=useState<string|null>(null);const [testLoading,setTestLoading]=useState(false);const [testHistory,setTestHistory]=useState<any[]>([]);
  const [intentResult,setIntentResult]=useState<any>(null);

  // ── Load all data for this agent ──
  const loadAll=useCallback(async()=>{
    if(!agent?.id)return;
    setLoadingData(true);
    try{
      const [pb,qr,ob,pr,act,db]=await Promise.all([
        api.get(`/sales-agent/playbooks?agent_id=${agent.id}`),
        api.get(`/sales-agent/qualification?agent_id=${agent.id}`),
        api.get(`/sales-agent/objections?agent_id=${agent.id}`),
        api.get(`/sales-agent/products?agent_id=${agent.id}`),
        api.get(`/sales-agent/leads/activity?agent_id=${agent.id}&limit=20`),
        api.get(`/sales-agent/dashboard?agent_id=${agent.id}`)
      ]);
      setPlaybooks((pb.playbooks||[]).map((p:any)=>({...p,steps:pj(p.steps,[])})));
      setQualRules(qr.rules||[]);
      setObjections(ob.objections||[]);
      setProducts((pr.products||[]).map((p:any)=>({...p,features:pj(p.features,[])})));
      setActivities(act.activities||[]);
      setDashboard(db);
    }catch(e){console.error("Load data error:",e);}
    setLoadingData(false);
  },[agent?.id]);

  useEffect(()=>{loadAll();},[loadAll]);

  // ── Playbook CRUD ──
  const savePb=async()=>{
    if(!pbName.trim())return showT("Name required","error");
    if(pbSteps.length<2)return showT("At least 2 steps","error");
    const body={agent_id:agent.id,name:pbName,trigger:pbTrigger,steps:pbSteps,product_tier:pbProduct,owner_name:pbAssigned};
    try{
      if(editPb)await api.patch(`/sales-agent/playbooks/${editPb.id}`,body);
      else await api.post("/sales-agent/playbooks",body);
      showT(editPb?"Updated":"Created!","success");loadAll();
    }catch{showT("Failed","error");}
    setShowPbForm(false);setEditPb(null);
  };
  const openPbEdit=(pb:any)=>{setPbName(pb.name);setPbTrigger(pb.trigger||"");setPbProduct(pb.product_tier||"Pro");setPbAssigned(pb.owner_name||"");setPbSteps([...(pj(pb.steps,["Step 1"]))]);setPbNewStep("");setEditPb(pb);setShowPbForm(true);};
  const openPbNew=()=>{setPbName("");setPbTrigger("visitor_starts_chat");setPbProduct("Pro");setPbAssigned("");setPbSteps(["Greet prospect","Qualify needs","Recommend plan"]);setPbNewStep("");setEditPb(null);setShowPbForm(true);};
  const delPb=async(id:string)=>{try{await api.del(`/sales-agent/playbooks/${id}`);loadAll();showT("Deleted","success");}catch{showT("Failed","error");}};
  const togglePb=async(pb:any)=>{try{await api.patch(`/sales-agent/playbooks/${pb.id}`,{active:pb.active?0:1});loadAll();}catch{}};
  const addStep=()=>{if(!pbNewStep.trim())return;setPbSteps(p=>[...p,pbNewStep.trim()]);setPbNewStep("");};
  const moveStep=(i:number,dir:number)=>{setPbSteps(p=>{const n=[...p];const t=n[i];n[i]=n[i+dir];n[i+dir]=t;return n;});};

  // ── Qualification CRUD ──
  const saveQr=async()=>{
    if(!qrField.trim()||!qrValue.trim())return showT("Field and value required","error");
    const body={agent_id:agent.id,field:qrField,operator:qrOp,value:qrValue,points:Number(qrScore)||10};
    try{
      if(editQr)await api.patch(`/sales-agent/qualification/${editQr.id}`,body);
      else await api.post("/sales-agent/qualification",body);
      showT(editQr?"Updated":"Added!","success");loadAll();
    }catch{showT("Failed","error");}
    setShowQrForm(false);setEditQr(null);
  };
  const openQrEdit=(r:any)=>{setQrField(r.field);setQrOp(r.operator||"equals");setQrValue(r.value);setQrScore(r.points);setEditQr(r);setShowQrForm(true);};
  const openQrNew=()=>{setQrField("budget");setQrOp("greater_than");setQrValue("");setQrScore(20);setEditQr(null);setShowQrForm(true);};
  const delQr=async(id:string)=>{try{await api.del(`/sales-agent/qualification/${id}`);loadAll();showT("Removed","success");}catch{showT("Failed","error");}};
  const toggleQr=async(r:any)=>{try{await api.patch(`/sales-agent/qualification/${r.id}`,{active:r.active?0:1});loadAll();}catch{}};

  // ── Objection CRUD ──
  const saveObj=async()=>{
    if(!objTrigger.trim()||!objResponse.trim())return showT("Trigger and response required","error");
    const body={agent_id:agent.id,trigger_phrase:objTrigger,response:objResponse,category:objCat};
    try{
      if(editObj)await api.patch(`/sales-agent/objections/${editObj.id}`,body);
      else await api.post("/sales-agent/objections",body);
      showT(editObj?"Updated":"Added!","success");loadAll();
    }catch{showT("Failed","error");}
    setShowObjForm(false);setEditObj(null);
  };
  const openObjEdit=(o:any)=>{setObjTrigger(o.trigger_phrase);setObjResponse(o.response);setObjCat(o.category||"Price");setEditObj(o);setShowObjForm(true);};
  const openObjNew=()=>{setObjTrigger("");setObjResponse("");setObjCat("Price");setEditObj(null);setShowObjForm(true);};
  const delObj=async(id:string)=>{try{await api.del(`/sales-agent/objections/${id}`);loadAll();showT("Removed","success");}catch{showT("Failed","error");}};

  // ── Product CRUD ──
  const saveProd=async()=>{
    if(!prName.trim())return showT("Name required","error");
    const body={agent_id:agent.id,name:prName,price:prPrice,features:prFeatures.split("\n").filter((f:string)=>f.trim()),segment:prIdeal,qualifier_rule:prQualifier};
    try{
      if(editProd)await api.patch(`/sales-agent/products/${editProd.id}`,body);
      else await api.post("/sales-agent/products",body);
      showT(editProd?"Updated":"Added!","success");loadAll();
    }catch{showT("Failed","error");}
    setShowProdForm(false);setEditProd(null);
  };
  const openProdEdit=(p:any)=>{setPrName(p.name);setPrPrice(p.price||"");setPrIdeal(p.segment||"");setPrQualifier(p.qualifier_rule||"");setPrFeatures((pj(p.features,[])).join("\n"));setEditProd(p);setShowProdForm(true);};
  const openProdNew=()=>{setPrName("");setPrPrice("");setPrIdeal("");setPrQualifier("");setPrFeatures("");setEditProd(null);setShowProdForm(true);};
  const delProd=async(id:string)=>{try{await api.del(`/sales-agent/products/${id}`);loadAll();showT("Removed","success");}catch{showT("Failed","error");}};

  // ── AI Test Chat (via backend Gemini) ──
  const runTest=async()=>{
    if(!testInput.trim())return;setTestLoading(true);setTestResult(null);setIntentResult(null);
    try{
      const r=await api.post("/sales-agent/ai/chat",{agent_id:agent.id,messages:testHistory.slice(-6),message:testInput});
      setTestResult(r.reply);setIntentResult(r.intent||null);
      setTestHistory(p=>[...p,{role:"user",content:testInput},{role:"assistant",content:r.reply}]);
    }catch(e:any){
      const fb="I'm sorry, I couldn't process that. Please check that your GOOGLE_API_KEY is configured in the backend .env file.";
      setTestResult(fb);setTestHistory(p=>[...p,{role:"user",content:testInput},{role:"assistant",content:fb}]);
    }
    setTestLoading(false);setTestInput("");
  };

  // ── Save config ──
  const saveConfig=async()=>{
    try{await api.patch(`/sales-agent/agents/${agent.id}`,{name:agentName,tone,language,channels,system_prompt:prompt,handoff_threshold:handoffThreshold,max_turns:maxTurns,followup_days:followUpDays});
      onReload();showT("Configuration saved","success");
    }catch{showT("Save failed","error");}
  };

  // ── Toggle agent active ──
  const toggleEnabled=async(v:boolean)=>{
    setEnabled(v);
    try{await api.patch(`/sales-agent/agents/${agent.id}/toggle`,{});onReload();}catch{}
    showT(v?"Agent activated":"Agent paused","info");
  };

  const TABS:[string,string][]=[ ["overview","📊 Overview"],["playbooks","📋 Playbooks"],["qualification","🎯 Qualification"],["objections","🛡 Objections"],["products","📦 Products"],["prompt","⚙ Config"],["test","🧪 Test"]];
  const TRIGGERS=[{v:"visitor_starts_chat",l:"Visitor starts chat"},{v:"trial_day_3",l:"Trial day 3"},{v:"trial_day_7",l:"Trial day 7"},{v:"trial_expiring",l:"Trial expiring"},{v:"wa_first_message",l:"WhatsApp first message"},{v:"subscription_cancelled",l:"Subscription cancelled"},{v:"pricing_page_visit",l:"Pricing page visit"},{v:"manual_trigger",l:"Manual trigger"},{v:"lead_score_above_60",l:"Lead score ≥ 60"},{v:"cart_abandoned",l:"Cart abandoned"}];
  const OBJ_CATS=["Price","Competition","Timing","Authority","Complexity","Security","Feature Gap","Other"];
  const OBJ_COLORS:any={Price:C.r,Competition:C.y,Timing:C.cy,Authority:C.p,Complexity:C.a,Security:C.g,"Feature Gap":"#ff6b35",Other:C.t3};
  const FIELDS=["budget","team_size","timeline","decision_maker","current_tool","industry","company_size","use_case","channel_preference","compliance_required"];
  const OPS=[{v:"greater_than",l:">="},{v:"less_than",l:"<="},{v:"equals",l:"=="},{v:"not_equals",l:"!="},{v:"contains",l:"contains"},{v:"exists",l:"exists"}];

  if(loadingData)return <div style={{padding:"24px 28px",flex:1}}><SkelCards/></div>;

  return <div style={{padding:"24px 28px",overflowY:"auto",flex:1}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:C.s3,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">←</button>
        <div style={{width:40,height:40,borderRadius:12,background:(agent?.color||C.a)+"22",border:`2px solid ${(agent?.color||C.a)}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{agent?.emoji||"🤖"}</div>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,display:"flex",alignItems:"center",gap:8}}>{agent?.name||"Agent"} <Tag text={agent?.role||"Sales"} color={agent?.color||C.p}/></h2>
          <p style={{fontSize:12,color:C.t3,marginTop:2}}>Configure playbooks, qualification, objections, products, and test this agent</p>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Toggle val={enabled} set={toggleEnabled}/>
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
        {[{l:"Total Leads",v:dashboard?.total_leads||0,c:C.a,bg:C.ad,d:"All sources"},{l:"Pipeline Value",v:"$"+(dashboard?.pipeline_value||0),c:C.g,bg:C.gd,d:"Active deals"},{l:"Conversion Rate",v:(dashboard?.conversion_rate||0)+"%",c:C.p,bg:C.pd,d:"Leads to deals"},{l:"Playbooks",v:playbooks.length,c:C.y,bg:C.yd,d:playbooks.filter((p:any)=>p.active).length+" active"}].map(k=>
          <div key={k.l} style={{background:k.bg,border:`1px solid ${k.c}33`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:9,fontWeight:700,color:k.c,fontFamily:FM,textTransform:"uppercase",letterSpacing:"0.5px"}}>{k.l}</div>
            <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c,margin:"4px 0"}}>{k.v}</div>
            <div style={{fontSize:10,color:C.t3}}>{k.d}</div>
          </div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Recent Activity</div>
          {activities.length===0?<div style={{fontSize:12,color:C.t3,fontStyle:"italic",padding:20,textAlign:"center"}}>No activity yet. Start testing the AI agent or create leads to see activity here.</div>:
          activities.slice(0,8).map((a:any,i:number)=>
            <div key={a.id||i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<7?`1px solid ${C.b1}22`:"none"}}>
              <span style={{fontSize:16}}>{a.type==="scored"?"🎯":a.type==="demo"?"📅":a.type==="objection"?"🛡":a.type==="deal"?"💼":a.type==="handoff"?"🤝":"📋"}</span>
              <div style={{flex:1,fontSize:12,color:C.t2,lineHeight:1.5}}>{a.details||a.type}</div>
              <span style={{fontSize:9,color:C.t3,fontFamily:FM,flexShrink:0}}>{a.created_at?.slice(11,16)||""}</span>
            </div>)}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Leads by Score</div>
          {(dashboard?.leads_by_score||[]).length===0?<div style={{fontSize:12,color:C.t3,fontStyle:"italic",padding:20,textAlign:"center"}}>No scored leads yet</div>:
          (dashboard?.leads_by_score||[]).map((s:any)=>{
            const colors:any={Hot:C.r,Warm:C.y,MQL:C.a,Cold:C.cy,Unscored:C.t3};
            return <div key={s.tier} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:700,color:colors[s.tier]||C.t2,width:70}}>{s.tier}</span>
              <div style={{flex:1,height:6,borderRadius:3,background:C.s3}}><div style={{height:6,borderRadius:3,background:colors[s.tier]||C.t2,width:Math.min((s.count/(dashboard?.total_leads||1))*100,100)+"%"}}/></div>
              <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.t1,width:30,textAlign:"right"}}>{s.count}</span>
            </div>;
          })}
          <div style={{marginTop:14,padding:10,background:C.pd,borderRadius:8,border:`1px solid ${C.p}33`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.p,fontFamily:FM}}>AI INSIGHT</div>
            <div style={{fontSize:11,color:C.t2,marginTop:4,lineHeight:1.5}}>
              {playbooks.length===0?"Create playbooks to enable AI-driven sales automation.":
              `${playbooks.filter((p:any)=>p.active).length} active playbooks. ${qualRules.filter((r:any)=>r.active).length} scoring rules configured. ${objections.length} objection handlers ready.`}
            </div>
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
      {playbooks.length===0&&<EmptyState icon="📋" title="No playbooks yet" desc="Create your first sales playbook to automate conversations"/>}
      {playbooks.map((pb:any)=>{const steps=pj(pb.steps,[]);return <div key={pb.id} style={{background:C.s1,border:`1px solid ${pb.active?C.g+"33":C.b1}`,borderRadius:12,padding:16,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:pb.active?C.gd:C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{pb.active?"📋":"⏸"}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:14,fontWeight:700}}>{pb.name}</span>
              {pb.product_tier&&<Tag text={pb.product_tier} color={C.p}/>}
              <Tag text={pb.active?"Active":"Paused"} color={pb.active?C.g:C.t3}/>
            </div>
            <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginBottom:8}}>Trigger: {(pb.trigger||"").replace(/_/g," ")}{pb.owner_name?" · Owner: "+pb.owner_name:""}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {steps.map((s:string,i:number)=><div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                <span style={{width:16,height:16,borderRadius:"50%",background:C.a+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:10,color:C.t2,whiteSpace:"nowrap"}}>{s}</span>
                {i<steps.length-1&&<span style={{color:C.b2,fontSize:10}}>→</span>}
              </div>)}
            </div>
          </div>
          <div style={{display:"flex",gap:3,flexShrink:0}}>
            <Toggle val={!!pb.active} set={()=>togglePb(pb)}/>
            <button onClick={()=>openPbEdit(pb)} style={{padding:"4px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>Edit</button>
            <button onClick={()=>delPb(pb.id)} style={{padding:"4px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:C.rd,color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer",fontFamily:FM}}>✕</button>
          </div>
        </div>
      </div>;})}
      {showPbForm&&<Mdl title={editPb?"Edit Playbook":"New Playbook"} onClose={()=>{setShowPbForm(false);setEditPb(null);}} w={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Playbook Name"><Inp val={pbName} set={setPbName} ph="e.g. Inbound Website Lead"/></Fld>
          <Fld label="Trigger"><Sel val={pbTrigger} set={setPbTrigger} opts={TRIGGERS}/></Fld>
          <Fld label="Target Product"><Inp val={pbProduct} set={setPbProduct} ph="e.g. Pro"/></Fld>
          <Fld label="Assigned To"><Inp val={pbAssigned} set={setPbAssigned} ph="e.g. Priya"/></Fld>
        </div>
        <Fld label={"Steps ("+pbSteps.length+")"}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {pbSteps.map((s:string,i:number)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 8px",background:C.s2,borderRadius:6,border:`1px solid ${C.b1}`}}>
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
        <div><div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Lead Scoring Rules</div><div style={{fontSize:11,color:C.t3}}>AI scores leads 0-100 based on these signals</div></div>
        <Btn ch="+ Add Rule" v="primary" onClick={openQrNew}/>
      </div>
      {qualRules.length===0&&<EmptyState icon="🎯" title="No scoring rules" desc="Add qualification rules to automatically score leads"/>}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {qualRules.map((r:any)=><div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:C.s1,border:`1px solid ${r.active?C.a+"33":C.b1}`,borderRadius:10}}>
          <Toggle val={!!r.active} set={()=>toggleQr(r)}/>
          <div style={{flex:1}}>
            <span style={{fontSize:12,fontWeight:600}}>{(r.field||"").replace(/_/g," ")}</span>
            <span style={{fontSize:11,color:C.t3,fontFamily:FM}}> {(OPS.find(o=>o.v===r.operator)||{l:r.operator}).l} </span>
            <span style={{fontSize:12,fontWeight:600,color:C.a}}>{r.value}</span>
          </div>
          <div style={{width:50,height:26,borderRadius:8,background:C.pd,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:12,fontWeight:800,color:C.p,fontFamily:FM}}>+{r.points}</span>
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
      </div>
      {showQrForm&&<Mdl title={editQr?"Edit Scoring Rule":"Add Scoring Rule"} onClose={()=>{setShowQrForm(false);setEditQr(null);}} w={420}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Fld label="Field"><Sel val={qrField} set={setQrField} opts={FIELDS.map(f=>({v:f,l:f.replace(/_/g," ")}))}/></Fld>
          <Fld label="Operator"><Sel val={qrOp} set={setQrOp} opts={OPS}/></Fld>
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
      {objections.length===0&&<EmptyState icon="🛡" title="No objection handlers" desc="Add responses for common sales objections"/>}
      {objections.map((o:any)=><div key={o.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <Tag text={o.category||"General"} color={OBJ_COLORS[o.category]||C.t3}/>
          <span style={{fontSize:13,fontWeight:700,flex:1}}>"{o.trigger_phrase}"</span>
          <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>Used {o.usage_count||0}x</span>
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
      {products.length===0&&<EmptyState icon="📦" title="No products" desc="Add products so the AI can recommend them to leads"/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(products.length||1,3)+",1fr)",gap:12}}>
        {products.map((p:any)=>{const feats=pj(p.features,[]);return <div key={p.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{fontSize:16,fontWeight:800,fontFamily:FD}}>{p.name}</div>
            <div style={{display:"flex",gap:2}}>
              <button onClick={()=>openProdEdit(p)} style={{fontSize:9,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>✎</button>
              <button onClick={()=>delProd(p.id)} style={{fontSize:9,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>✕</button>
            </div>
          </div>
          <div style={{fontSize:20,fontWeight:800,color:C.a,fontFamily:FD,marginBottom:8}}>{p.price||"Custom"}</div>
          <div style={{fontSize:11,color:C.t3,marginBottom:10,fontStyle:"italic"}}>{p.segment||"All segments"}</div>
          <div style={{flex:1}}>{feats.map((f:string,i:number)=><div key={i} style={{display:"flex",gap:5,padding:"3px 0",fontSize:11,color:C.t2}}><span style={{color:C.g}}>✓</span>{f}</div>)}</div>
          {p.qualifier_rule&&<div style={{marginTop:10,padding:8,background:C.s2,borderRadius:6,fontSize:10,color:C.t3,fontFamily:FM}}><strong>Qualifier:</strong> {p.qualifier_rule}</div>}
        </div>;})}
      </div>
      {showProdForm&&<Mdl title={editProd?"Edit Product":"Add Product"} onClose={()=>{setShowProdForm(false);setEditProd(null);}} w={420}>
        <Fld label="Product Name"><Inp val={prName} set={setPrName} ph="e.g. Pro Plus"/></Fld>
        <Fld label="Price"><Inp val={prPrice} set={setPrPrice} ph="e.g. $49/agent/mo"/></Fld>
        <Fld label="Ideal Segment"><Inp val={prIdeal} set={setPrIdeal} ph="e.g. Growing teams (5-50 agents)"/></Fld>
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
          <Fld label={"Handoff threshold: "+handoffThreshold}><input type="range" min={30} max={90} step={5} value={handoffThreshold} onChange={e=>setHandoffThreshold(Number(e.target.value))} style={{width:"100%",accentColor:C.a}}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Max AI turns"><Inp val={String(maxTurns)} set={v=>setMaxTurns(Number(v)||10)} ph="10"/></Fld>
            <Fld label="Follow-up (days)"><Inp val={String(followUpDays)} set={v=>setFollowUpDays(Number(v)||3)} ph="3"/></Fld>
          </div>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:8}}>Active Channels</div>
          {Object.entries(channels).map(([ch,on])=><div key={ch} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.s1,borderRadius:8,border:`1px solid ${on?C.g+"33":C.b1}`,marginBottom:4}}>
            <span style={{fontSize:12,textTransform:"capitalize"}}>{ch}</span>
            <Toggle val={!!on} set={(v:boolean)=>setChannels((p:any)=>({...p,[ch]:v}))}/>
          </div>)}
        </div>
      </div>
      <Fld label="System Prompt"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={6} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:C.t1,fontFamily:FM,resize:"vertical",outline:"none",lineHeight:1.6}}/></Fld>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <Btn ch="Save Configuration" v="primary" onClick={saveConfig}/>
      </div>
    </div>}

    {/* ═══ TEST ═══ */}
    {tab==="test"&&<div>
      <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:4}}>Test AI Sales Agent</div>
      <p style={{fontSize:12,color:C.t3,marginBottom:14}}>Multi-turn conversation powered by Gemini AI. Tests against your configured playbooks, products, and objection handlers.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          {testHistory.length>0&&<div style={{maxHeight:240,overflowY:"auto",marginBottom:10,border:`1px solid ${C.b1}`,borderRadius:10,padding:10,background:C.s1}}>
            {testHistory.map((m:any,i:number)=><div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:700,color:m.role==="user"?C.t1:C.p,fontFamily:FM,flexShrink:0,width:36}}>{m.role==="user"?"You":"AI"}</span>
              <span style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{m.content.slice(0,200)}{m.content.length>200?"…":""}</span>
            </div>)}
          </div>}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <input value={testInput} onChange={e=>setTestInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();runTest();}}} placeholder="Type a prospect message…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 14px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
            <Btn ch={testLoading?"…":"▶"} v="primary" onClick={runTest}/>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {['"Hi, we have 30 agents on Zendesk"','"What\'s the pricing?"','"Too expensive for us"','"Need to check with my boss"','"Can I see a demo?"','"Not ready yet"'].map(q=><button key={q} onClick={()=>setTestInput(q.slice(1,-1))} style={{padding:"4px 8px",borderRadius:6,fontSize:9.5,background:C.s2,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer"}}>{q.slice(1,28)}{q.length>29?"…":""}</button>)}
          </div>
          {testHistory.length>0&&<button onClick={()=>{setTestHistory([]);setTestResult(null);setIntentResult(null);showT("Cleared","info");}} style={{marginTop:8,padding:"4px 10px",borderRadius:6,fontSize:10,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Clear conversation</button>}
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.p,marginBottom:6}}>AI SALES AGENT RESPONSE</div>
          <div style={{minHeight:180,padding:14,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,fontSize:13,color:C.t1,lineHeight:1.6,whiteSpace:"pre-wrap",overflowY:"auto",maxHeight:350}}>
            {testLoading?<div style={{display:"flex",gap:6,alignItems:"center"}}><Spin/><span style={{fontSize:12,color:C.t3}}>Analyzing prospect via Gemini AI…</span></div>:
            testResult||<span style={{color:C.t3,fontStyle:"italic"}}>Send a message to start a test conversation</span>}
          </div>
          {intentResult&&<div style={{marginTop:10,padding:10,background:C.pd,borderRadius:8,border:`1px solid ${C.p}33`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.p,fontFamily:FM,marginBottom:4}}>DETECTED INTENT</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Tag text={intentResult.intent||"general"} color={C.a}/>
              <span style={{fontSize:11,color:C.t2}}>Confidence: {Math.round((intentResult.confidence||0)*100)}%</span>
              {intentResult.should_handoff&&<Tag text="Needs handoff" color={C.r}/>}
            </div>
          </div>}
        </div>
      </div>
    </div>}

    </div>
  </div>;
}
