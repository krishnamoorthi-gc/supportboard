import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

export default function HomeScr({me,convs,contacts,agents,labels,inboxes,setScr,setAid,msgs,dashWidgets,hiddenWidgets,onDashConfig}){
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const [apiKpis,setApiKpis]=useState<any>(null);
  const [apiActivity,setApiActivity]=useState<any[]>([]);
  const [aiBriefing,setAiBriefing]=useState(null);const [aiBriefLoad,setAiBriefLoad]=useState(false);
  const genBriefing=async()=>{setAiBriefLoad(true);try{const ctx=`Open: ${convs.filter(c=>c.status==="open").length}, Unread: ${convs.reduce((s,c)=>s+(c.unread||0),0)}, Contacts: ${contacts.length}, Agents: ${agents.length}, Urgent: ${convs.filter(c=>c.priority==="urgent").length}, Resolution rate: ${apiKpis?.resolutionRate??0}%, Avg reply: ${apiKpis?.responseTime||"N/A"}`;const d=await api.post('/ai/chat',{max_tokens:300,system:"You are a daily briefing AI for a support team. Give 4-5 bullet points: key metrics, anomalies, action items. Be specific with numbers. No markdown.",messages:[{role:"user",content:ctx}]});setAiBriefing(d.content?.[0]?.text);}catch{setAiBriefing(null);}setAiBriefLoad(false);};
  const loadDash=useCallback(async()=>{
    if(!api.isConnected())return;
    try{
      const[k,a]=await Promise.all([api.get("/dashboard/kpis"),api.get("/dashboard/activity-feed")]);
      if(k?.kpis)setApiKpis(k.kpis);
      if(a?.activity)setApiActivity(a.activity);
    }catch(e){}
  },[]);
  useEffect(()=>{
    loadDash();
    const t=setInterval(loadDash,30000);
    return()=>clearInterval(t);
  },[loadDash]);
  const openConvs=useMemo(()=>convs.filter(c=>c.status==="open"),[convs]);
  const urgentConvs=useMemo(()=>convs.filter(c=>c.priority==="urgent"||c.priority==="high"),[convs]);
  const unassigned=useMemo(()=>convs.filter(c=>!c.agent&&c.status==="open"),[convs]);
  const unreadTotal=useMemo(()=>apiKpis?.unreadTotal??convs.reduce((s,c)=>s+(c.unread||0),0),[convs,apiKpis]);
  const resolved=convs.filter(c=>c.status==="resolved");
  const ctMap=useMemo(()=>contacts.reduce((m,c)=>{m[c.id]=c;return m;},{}),[contacts]);

  const prC=p=>p==="urgent"?C.r:p==="high"?C.y:p==="normal"?C.a:C.t3;
  const chColors={live:C.g,email:C.a,whatsapp:"#25d366",telegram:"#0088cc",facebook:"#1877f2",instagram:"#e1306c",viber:"#7360f2",apple:"#555",line:"#06c755",tiktok:"#ff0050",x:"#e7e9ea",sms:"#f5a623",voice:"#1fd07a",video:"#9b6dff",api:"#22d4e8"};


  const channelBreakdown=useMemo(()=>{
    const src=apiKpis?.channelBreakdown?.length?apiKpis.channelBreakdown:inboxes.slice(0,6).map(ib=>({name:ib.name,type:ib.type,convs:ib.convs||0}));
    return src.map((ch:any)=>({...ch,color:chColors[ch.type]||C.t3}));
  },[apiKpis,inboxes]);
  const maxCh=Math.max(...channelBreakdown.map(c=>c.convs),1);

  const agentStatus=useMemo(()=>agents.map(a=>({...a,online:a.status==='active'||a.status==='online'})),[agents]);

  const quickActions=[
    {label:"New Conversation",iconId:"inbox",color:C.a,sub:"Start fresh",fn:()=>setScr("inbox")},
    {label:"View All Open",iconId:"inbox",color:C.p,sub:openConvs.length+" open",fn:()=>setScr("inbox")},
    {label:"Contacts",iconId:"contacts",color:C.g,sub:contacts.length+" total",fn:()=>setScr("contacts")},
    {label:"Live Monitor",iconId:"monitor",color:C.r,sub:"Real-time",fn:()=>setScr("monitor")},
    {label:"Reports",iconId:"reports",color:C.y,sub:"Analytics",fn:()=>setScr("reports")},
    {label:"AI Bot",iconId:"settings",color:"#9b6dff",sub:"Settings",fn:()=>setScr("settings")},
  ];

  return <div style={{flex:1,overflowY:"auto",background:C.bg}}>
    {/* Hero header */}
    <div style={{background:"linear-gradient(135deg,"+C.s1+" 0%,"+C.s2+" 100%)",borderBottom:"1px solid "+C.b1,padding:"28px 32px 24px",position:"relative",overflow:"hidden"}}>
      {/* Background glow orbs */}
      <div style={{position:"absolute",top:-60,right:80,width:240,height:240,borderRadius:"50%",background:"radial-gradient(circle,"+C.a+"18 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-80,right:300,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,"+C.p+"12 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
        <div>
          <div style={{fontSize:11,color:C.t3,fontFamily:FM,letterSpacing:"0.6px",marginBottom:6}}>
            {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </div>
          <h1 style={{fontSize:26,fontWeight:800,fontFamily:FD,marginBottom:6,lineHeight:1.2}}>
            {greeting}, <span style={{background:"linear-gradient(90deg,"+C.a+","+C.p+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{me?.name?.split(" ")[0]||"there"}</span> 👋
          </h1>
          <p style={{fontSize:13.5,color:C.t2,maxWidth:480}}>
            {unreadTotal>0?`You have ${unreadTotal} unread message${unreadTotal>1?"s":""} and ${unassigned.length} unassigned conversation${unassigned.length!==1?"s":""}. Let's get to work.`:"All caught up! No urgent items right now. Great job."}
          </p>
        </div>
        <div style={{display:"flex",gap:10,flexShrink:0}}>
          {onDashConfig&&<button onClick={onDashConfig} style={{padding:"10px 16px",borderRadius:10,fontSize:13,fontWeight:700,fontFamily:FB,background:C.s3,color:C.t2,border:`1px solid ${C.b2}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>⚙ Customize</button>}
          <button onClick={()=>setScr("inbox")} style={{padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:700,fontFamily:FB,background:"linear-gradient(135deg,"+C.a+","+C.p+")",color:"#fff",border:"none",cursor:"pointer",boxShadow:"0 4px 20px "+C.ag,display:"flex",alignItems:"center",gap:7}}>
            <NavIcon id="inbox" s={14} col="#fff"/> Open Inbox
          </button>
          <button onClick={()=>setScr("monitor")} style={{padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:700,fontFamily:FB,background:C.s3,color:C.t2,border:"1px solid "+C.b2,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
            <NavIcon id="monitor" s={14} col={C.t2}/> Monitor
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginTop:24}}>
        {[
          {label:"Open Conversations",value:apiKpis?.openConversations??openConvs.length,iconId:"inbox",color:C.a,bg:C.ad,delta:"active now",fn:()=>setScr("inbox")},
          {label:"Urgent / High",value:apiKpis?.urgentConversations??urgentConvs.length,iconId:null,emoji:"🔴",color:C.r,bg:C.rd,delta:(apiKpis?.urgentConversations??urgentConvs.length)>0?"Needs attention":"All clear",fn:()=>setScr("inbox")},
          {label:"Unassigned",value:apiKpis?.unassigned??unassigned.length,iconId:"contacts",color:C.y,bg:C.yd,delta:"waiting for agent",fn:()=>setScr("inbox")},
          {label:"Resolved Today",value:apiKpis?.resolvedToday??resolved.length,iconId:null,emoji:"✓",color:C.g,bg:C.gd,delta:`${apiKpis?.resolutionRate??0}% overall rate`,fn:null},
          {label:"CSAT Score",value:apiKpis?.avgCsat>0?apiKpis.avgCsat+"★":"N/A",iconId:"reports",color:C.p,bg:C.pd,delta:apiKpis?.responseTime?`Avg reply: ${apiKpis.responseTime}`:"Last 7 days",fn:()=>setScr("reports")},
        ].map(kpi=>(
          <div key={kpi.label} onClick={kpi.fn} className="card-lift" style={{background:kpi.bg,border:"1px solid "+kpi.color+"33",borderRadius:12,padding:"14px 16px",cursor:kpi.fn?"pointer":"default",transition:"transform .15s",position:"relative",overflow:"hidden"}}
            onMouseEnter={e=>kpi.fn&&(e.currentTarget.style.transform="translateY(-2px)")}
            onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <span style={{fontSize:9,fontWeight:700,color:kpi.color,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>{kpi.label}</span>
              <span style={{fontSize:14,opacity:0.7}}>{kpi.iconId?<NavIcon id={kpi.iconId} s={16} col={kpi.color}/>:kpi.emoji}</span>
            </div>
            <div style={{fontSize:28,fontWeight:800,fontFamily:FD,color:kpi.color,lineHeight:1}}><CountUp value={kpi.value} color={kpi.color} size={28}/></div>
            <div style={{fontSize:10.5,color:kpi.color,opacity:0.7,marginTop:5,fontFamily:FM}}>{kpi.delta}</div>
          </div>
        ))}
      </div>
    </div>

    <div style={{padding:"24px 32px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,alignItems:"start"}}>

      {/* LEFT COL: recent convs + activity */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {/* Quick Actions */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:12,color:C.t2}}>Quick Actions</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {quickActions.map(qa=>(
              <button key={qa.label} onClick={qa.fn} className="card-lift" style={{padding:"12px 10px",borderRadius:10,background:C.s2,border:"1px solid "+C.b1,cursor:"pointer",textAlign:"left",transition:"all .15s",position:"relative",overflow:"hidden"}}
                onMouseEnter={e=>{e.currentTarget.style.background=qa.color+"14";e.currentTarget.style.borderColor=qa.color+"44";}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.s2;e.currentTarget.style.borderColor=C.b1;}}>
                <div style={{marginBottom:6}}><NavIcon id={qa.iconId} s={22} col={qa.color}/></div>
                <div style={{fontSize:12,fontWeight:700,color:C.t1,marginBottom:2}}>{qa.label}</div>
                <div style={{fontSize:10,color:qa.color,fontFamily:FM}}>{qa.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Conversations */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,color:C.t2}}>Recent Conversations</div>
            <button onClick={()=>setScr("inbox")} style={{fontSize:11,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontFamily:FB}}>View all →</button>
          </div>
          {convs.length===0&&<div style={{padding:"24px 18px",textAlign:"center",color:C.t3,fontSize:12}}>No conversations yet</div>}
          {convs.slice(0,5).map(cv=>{
            const ct=ctMap[cv.cid];
            const msgCount=(msgs[cv.id]||[]).filter(m=>m.role==="contact"||m.role==="agent").length;
            return <div key={cv.id} className="hov" onClick={()=>{setAid(cv.id);setScr("inbox");}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",borderBottom:"1px solid "+C.b1,cursor:"pointer",borderLeft:"3px solid "+(cv.unread>0?C.a:"transparent"),transition:"background .12s"}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:36,height:36,borderRadius:10,background:(ct?.color||C.a)+"22",color:ct?.color||C.a,border:"1.5px solid "+(ct?.color||C.a)+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,fontFamily:FM}}>{ct?.av||"?"}</div>
                <span style={{position:"absolute",bottom:-2,right:-2,width:16,height:16,borderRadius:"50%",background:chColors[cv.ch]||C.t3,border:"2px solid "+C.s1,display:"flex",alignItems:"center",justifyContent:"center"}}><ChIcon t={cv.ch} s={9} col="#fff"/></span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:cv.unread>0?700:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:cv.unread>0?C.t1:C.t2}}>{cv.subject}</span>
                  <span style={{fontSize:10,color:C.t3,fontFamily:FM,flexShrink:0,marginLeft:8}}>{cv.time}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:C.t3}}>{ct?.name||"Unknown"}</span>
                  <span style={{fontSize:9,color:C.t3}}>·</span>
                  <span style={{fontSize:10,fontFamily:FM,color:prC(cv.priority)}}>{cv.priority}</span>
                  {cv.unread>0&&<span style={{background:C.a,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700}}>{cv.unread}</span>}
                  {cv.labels.slice(0,2).map(l=><span key={l} style={{fontSize:9,color:C.t3,fontFamily:FM}}>#{l}</span>)}
                </div>
              </div>
            </div>;
          })}
        </div>

      </div>

      {/* MIDDLE COL: activity feed + channels */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {/* Alerts banner */}
        {(urgentConvs.length>0||unassigned.length>0)&&<div style={{background:C.rd,border:"1px solid "+C.r+"44",borderRadius:12,padding:"12px 16px",display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12.5,fontWeight:700,color:C.r,marginBottom:2}}>Action Required</div>
            <div style={{fontSize:12,color:C.t2}}>
              {urgentConvs.length>0&&<span>{urgentConvs.length} urgent/high priority conversation{urgentConvs.length>1?"s":""} need attention. </span>}
              {unassigned.length>0&&<span>{unassigned.length} unassigned conversation{unassigned.length>1?"s":""} waiting for an agent.</span>}
            </div>
          </div>
          <button onClick={()=>setScr("inbox")} style={{padding:"6px 12px",borderRadius:7,fontSize:11,fontWeight:700,color:C.r,background:C.rd,border:"1px solid "+C.r+"55",cursor:"pointer",whiteSpace:"nowrap"}}>View Now</button>
        </div>}

        {/* Channel breakdown */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:14,color:C.t2}}>Channel Activity</div>
          {channelBreakdown.length===0&&<div style={{padding:"16px 0",textAlign:"center",color:C.t3,fontSize:12}}>No channels configured</div>}
          {channelBreakdown.map(ch=>(
            <div key={ch.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}>
              <div style={{width:28,height:28,borderRadius:7,background:ch.color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChIcon t={ch.type} s={16}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11.5,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</span>
                  <span style={{fontSize:10,color:ch.color,fontFamily:FM,fontWeight:700,flexShrink:0,marginLeft:8}}>{ch.convs}</span>
                </div>
                <div style={{height:5,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:(ch.convs/maxCh*100)+"%",height:"100%",background:"linear-gradient(90deg,"+ch.color+"aa,"+ch.color+")",borderRadius:3,transition:"width .5s ease"}}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,color:C.t2}}>Recent Activity</div>
            <span style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:C.g,fontFamily:FM,fontWeight:700}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:C.g,animation:"pulse 1.5s infinite"}}/>LIVE
            </span>
          </div>
          {apiActivity.length>0?apiActivity.map((ev:any,i:number)=>(
            <div key={ev.id} className="hov" onClick={()=>{setAid(ev.convId);setScr("inbox");}} style={{display:"flex",gap:12,padding:"11px 18px",borderBottom:i<apiActivity.length-1?"1px solid "+C.b1:"none",cursor:"pointer",borderLeft:"2px solid "+(i===0?ev.color:"transparent"),transition:"background .12s"}}>
              <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{ev.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,color:C.t1,fontWeight:500,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.text}</div>
                <div style={{fontSize:11,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.sub}</div>
              </div>
              <span style={{fontSize:9.5,color:C.t3,fontFamily:FM,flexShrink:0,marginTop:2}}>{ev.time}</span>
            </div>
          )):<div style={{padding:"24px 18px",textAlign:"center",color:C.t3,fontSize:12}}>No recent activity yet</div>}
        </div>
      </div>

      {/* RIGHT COL: agents + contacts */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {/* AI Daily Briefing */}
        <div style={{background:`linear-gradient(135deg,${C.a}12,${C.p}08)`,border:`1px solid ${C.a}44`,borderRadius:14,padding:"16px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>🧠</span>
              <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>AI Daily Briefing</div>
            </div>
            <button onClick={genBriefing} style={{padding:"4px 10px",borderRadius:6,fontSize:9,fontWeight:700,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>{aiBriefLoad?"Thinking…":"✦ Generate"}</button>
          </div>
          {aiBriefLoad?<div style={{display:"flex",gap:6,alignItems:"center"}}><Spin/><span style={{fontSize:11,color:C.t3}}>Analyzing your workspace…</span></div>:
          aiBriefing?<div style={{fontSize:11.5,color:C.t2,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiBriefing}</div>:
          <div style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>Click Generate to get your personalized morning briefing with key metrics, alerts, and action items.</div>}
        </div>

        {/* AI Bot status */}
        <div style={{background:"linear-gradient(135deg,"+C.p+"18,"+C.a+"08)",border:"1px solid "+C.p+"44",borderRadius:14,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{width:36,height:36,borderRadius:10,background:C.p+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>✦</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>AI Bot</div>
              <div style={{fontSize:10,color:C.p,fontFamily:FM}}>{inboxes.length} inbox{inboxes.length!==1?"es":""} configured</div>
            </div>
          </div>
          <button onClick={()=>setScr("settings")} style={{width:"100%",padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,color:C.p,background:C.pd,border:"1px solid "+C.p+"44",cursor:"pointer",fontFamily:FB}}>Configure AI Bot</button>
        </div>

        {/* CSAT Score */}
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:12}}>CSAT Score</div>
          {apiKpis?.avgCsat>0
            ?<div style={{textAlign:"center",padding:"16px 0"}}>
               <div style={{fontSize:52,fontWeight:800,fontFamily:FD,color:C.g,lineHeight:1}}>{apiKpis.avgCsat}</div>
               <div style={{fontSize:13,color:C.t3,marginTop:6}}>★ average rating</div>
               <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>{apiKpis?.resolutionRate??0}% resolution rate</div>
             </div>
            :<div style={{padding:"24px 0",textAlign:"center",color:C.t3,fontSize:12}}>No CSAT ratings yet</div>}
        </div>

        {/* Team Status */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:12,color:C.t2,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            Team Status
            <span style={{fontSize:10,color:C.g,fontFamily:FM}}>{agentStatus.filter(a=>a.online).length} online</span>
          </div>
          {agentStatus.length===0&&<div style={{padding:"16px 0",textAlign:"center",color:C.t3,fontSize:12}}>No team members yet</div>}
          {agentStatus.map(ag=>(
            <div key={ag.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:34,height:34,borderRadius:9,background:ag.color+"22",color:ag.color,border:"1.5px solid "+ag.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,fontFamily:FM}}>{ag.av}</div>
                <span style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",background:ag.online?C.g:C.t3,border:"2px solid "+C.s1}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:ag.online?C.t1:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ag.name}</div>
                <div style={{fontSize:10,color:ag.online?C.g:C.t3,fontFamily:FM,marginTop:3}}>{ag.role||"agent"}</div>
              </div>
              <span style={{fontSize:9,color:ag.online?C.g:C.t3,fontFamily:FM,flexShrink:0}}>{ag.online?"Active":"Away"}</span>
            </div>
          ))}
        </div>

        {/* Recent Contacts */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,color:C.t2}}>Recent Contacts</div>
            <button onClick={()=>setScr("contacts")} style={{fontSize:11,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>All →</button>
          </div>
          {contacts.length===0&&<div style={{padding:"24px 18px",textAlign:"center",color:C.t3,fontSize:12}}>No contacts yet</div>}
          {contacts.slice(0,5).map(ct=>(
            <div key={ct.id} className="hov" onClick={()=>setScr("contacts")} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px",borderBottom:"1px solid "+C.b1,cursor:"pointer",transition:"background .12s"}}>
              <div style={{width:30,height:30,borderRadius:8,background:ct.color+"22",color:ct.color,border:"1.5px solid "+ct.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,fontFamily:FM,flexShrink:0}}>{ct.av}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.name}</div>
                <div style={{fontSize:10,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.company}</div>
              </div>
              <div style={{flexShrink:0}}>
                <div style={{fontSize:9,fontWeight:700,color:ct.plan==="Enterprise"?C.p:ct.plan==="Pro"?C.a:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{ct.plan}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>

    {/* BOTTOM ROW — Today's Performance */}
    <div style={{padding:"0 32px 24px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
      {[
        {l:"Messages Today",v:String(apiKpis?.todayMessages??0),c:C.a,icon:"inbox"},
        {l:"Avg First Reply",v:apiKpis?.responseTime||"N/A",c:C.g,icon:"reports"},
        {l:"Resolution Rate",v:(apiKpis?.resolutionRate??0)+"%",c:C.p,icon:"reports"},
        {l:"Total Contacts",v:String(apiKpis?.totalContacts??contacts.length),c:C.y,icon:"contacts"},
      ].map(m=>(
        <div key={m.l} style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"18px 20px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:10}}>{m.l}</div>
          <div style={{fontSize:32,fontWeight:800,fontFamily:FD,color:m.c,lineHeight:1}}>{m.v}</div>
        </div>
      ))}
    </div>
  </div>;
}



