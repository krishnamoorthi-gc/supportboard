import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";
import InsightsScr from "./InsightsScr";
import SlaDashScr from "./SlaDashScr";
import SurveyBuilderScr from "./SurveyBuilderScr";
import GamificationScr from "./GamificationScr";

// ─── REPORTS ──────────────────────────────────────────────────────────────
export default function ReportsScr({convs,agents,labels,contacts,inboxes}){
  const [period,setPeriod]=useState("7D");
  const [rtab,setRtab]=useState("overview");
  const [rptAi,setRptAi]=useState(null);const [rptAiLoad,setRptAiLoad]=useState(false);
  const genRptAi=async()=>{setRptAiLoad(true);try{const ctx=`Period: ${period}. Convs: ${convs.length}. Open: ${convs.filter(c=>c.status==="open").length}. Agents: ${agents.length}. Tab: ${rtab}. Channels: ${inboxes.map(i=>i.type).join(",")}.`;const d=await api.post('/ai/chat',{max_tokens:250,system:"You are a support analytics AI. Analyze the "+rtab+" report for period "+period+". Give 3-4 specific insights: trends, anomalies, recommendations. Use numbers. No markdown.",messages:[{role:"user",content:ctx}]});setRptAi(d.content?.[0]?.text);}catch{setRptAi("• Conversation volume up 23% vs last period — WhatsApp driving 40% of growth\n• Average first reply time improved to 3.2 min (from 4.8 min) — AI auto-reply contributing\n• CSAT dipped to 4.3★ on email channel — investigate slow resolution times\n• Top performer: Dev Kumar (42 resolved, 4.8★ CSAT) — consider as team lead candidate");}setRptAiLoad(false);};
  const mult={"7D":1,"30D":4.3,"90D":12.9,"1Y":52}[period]||1;

  // ── API STATE ──
  const [apiOverview,setApiOverview]=useState(null);
  const [apiAgentStats,setApiAgentStats]=useState(null);
  const [apiChStats,setApiChStats]=useState(null);
  const [apiSlaStats,setApiSlaStats]=useState(null);
  const [apiLabelStats,setApiLabelStats]=useState(null);
  useEffect(()=>{
    if(!api.isConnected())return;
    const p2=period.toLowerCase();
    Promise.allSettled([
      api.get(`/reports/overview?period=${p2}`).then(r=>{if(r?.overview)setApiOverview(r);}).catch(()=>{}),
      api.get("/reports/agents").then(r=>{if(r?.agents)setApiAgentStats(r.agents);}).catch(()=>{}),
      api.get("/reports/channels").then(r=>{if(r?.channels)setApiChStats(r.channels);}).catch(()=>{}),
      api.get("/reports/sla").then(r=>{if(r?.sla)setApiSlaStats(r.sla);}).catch(()=>{}),
      api.get("/reports/labels").then(r=>{if(r?.labels)setApiLabelStats(r.labels);}).catch(()=>{}),
    ]);
  },[period]);

  // ── DATA (API when available, synthetic fallback) ──
  const days={"7D":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"30D":["W1","W2","W3","W4"],"90D":["Jan","Feb","Mar"],"1Y":["Q1","Q2","Q3","Q4"]}[period]||[];
  const seed=(i,base,range)=>Math.round((base+((i*37+13)%range))*mult/Math.max(days.length,1));
  const trendData=apiOverview?.daily?.length
    ?apiOverview.daily.map((d,i)=>({day:new Date(d.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short"}).slice(0,3),opened:d.conversations,resolved:d.resolved,pending:Math.max(d.conversations-d.resolved,0)}))
    :days.map((d,i)=>({day:d,opened:seed(i,14,30),resolved:seed(i,11,28),pending:seed(i,3,8)}));
  const maxTrend=Math.max(...trendData.map(d=>Math.max(d.opened,d.resolved)),1);
  const total=apiOverview?.overview?.total??Math.round(convs.length*mult);
  const resolved=apiOverview?.overview?.resolved??Math.round(total*0.68);
  const pending=Math.round(total*0.18);
  const unresolved=total-resolved-pending;

  // Response time distribution
  const rtDist=[{range:"< 1m",pct:18,c:C.g},{range:"1-5m",pct:34,c:C.g},{range:"5-15m",pct:26,c:C.y},{range:"15-30m",pct:14,c:C.y},{range:"30m-1h",pct:6,c:C.r},{range:"> 1h",pct:2,c:C.r}];
  // Hourly heatmap data (7 days x 24 hours)
  const heatmap=Array.from({length:7},(_,d)=>Array.from({length:24},(_,h)=>{
    const base=h>=9&&h<=17?0.6:h>=7&&h<=20?0.3:0.05;
    return Math.min(Math.round((base+((d*24+h)*17%10)/30)*100)/100,1);
  }));
  const dayLabels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  // SLA data
  const slaTot=apiSlaStats?.total||1;
  const slaTargets=[
    {name:"First Response",target:"< 5 min",met:apiSlaStats?Math.round((apiSlaStats.compliant||0)/slaTot*100):87,c:C.a},
    {name:"Resolution Time",target:"< 4 hours",met:apiSlaStats?Math.round((1-(apiSlaStats.atRisk||0)/slaTot)*100):74,c:C.g},
    {name:"CSAT Score",target:"> 4.5★",met:92,c:C.p},
    {name:"Escalation Rate",target:"< 10%",met:apiSlaStats?Math.round((1-(apiSlaStats.breached||0)/slaTot)*100):95,c:C.cy},
  ];
  // Channel data
  const chData=apiChStats?.length
    ?apiChStats.map(s=>({name:s.inbox.name,type:s.inbox.type,convs:s.conversations,resolved:s.resolved,avgReply:s.avgResponseTime,csat:"—",color:chC(s.inbox.type)}))
    :(inboxes||[]).slice(0,8).map((ib,i)=>({name:ib.name,type:ib.type,convs:Math.round((ib.convs||0)*mult*0.7),resolved:Math.round((ib.convs||0)*mult*0.48),avgReply:`${(1.5+i*0.8).toFixed(1)}m`,csat:(4.9-i*0.12).toFixed(1),color:chC(ib.type)}));
  // Agent leaderboard
  const agentData=apiAgentStats?.length
    ?apiAgentStats.map(s=>({...s.agent,av:s.agent.avatar||s.agent.name?.slice(0,2)?.toUpperCase()||"?",resolved:s.resolved,avgReply:s.avgResponseTime,csat:s.csat,load:0,conversations:s.assigned,score:Math.min(100,Math.round((s.resolved||0)/Math.max(s.assigned||1,1)*100))}))
    :agents.map((a,i)=>({...a,resolved:Math.round((95-i*18)*mult/7),avgReply:`${(1.8+i*1.2).toFixed(1)}m`,csat:(4.9-i*0.1).toFixed(1),load:Math.round(78-i*12),conversations:Math.round((30-i*6)*mult/7),score:Math.round(96-i*5)}));
  // CSAT breakdown
  const csatDist=[{r:5,pct:62,c:C.g},{r:4,pct:24,c:C.g},{r:3,pct:9,c:C.y},{r:2,pct:3,c:C.r},{r:1,pct:2,c:C.r}];
  const avgCsat=4.7;
  // Resolution funnel
  const funnel=[{label:"Total Opened",val:total,c:C.a},{label:"Agent Replied",val:Math.round(total*0.92),c:C.cy},{label:"In Progress",val:Math.round(total*0.54),c:C.y},{label:"Resolved",val:resolved,c:C.g},{label:"Rated (CSAT)",val:Math.round(resolved*0.6),c:C.p}];
  const maxFunnel=Math.max(...funnel.map(f=>f.val),1);

  // ── KPI CARDS ──
  const KPI=({label,value,delta,color:kc,icon,sub})=>(
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,right:0,width:60,height:60,background:kc+"08",borderRadius:"0 0 0 60px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase"}}>{label}</span>
        <span style={{opacity:0.7}}><NavIcon id={icon} s={18} col={kc}/></span>
      </div>
      <div style={{fontSize:28,fontWeight:800,fontFamily:FD,color:kc,marginBottom:4}}>{value}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:delta.startsWith("+")||delta.startsWith("-")?delta.startsWith("+")?C.g:C.r:C.t3,fontFamily:FM,fontWeight:600}}>{delta}</span>
        {sub&&<span style={{fontSize:10,color:C.t3}}>{sub}</span>}
      </div>
      {/* Mini sparkline */}
      <svg style={{width:"100%",height:24,marginTop:8}} viewBox="0 0 100 24">
        <polyline fill="none" stroke={kc} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          points={days.map((d,i)=>`${(i/(days.length-1||1))*100},${24-((trendData[i]?.opened||5)/maxTrend)*20}`).join(" ")}/>
        <polyline fill="none" stroke={kc} strokeWidth="0" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1s"/>
        </polyline>
      </svg>
    </div>
  );

  // ── MINI BAR CHART COMPONENT ──
  const Bar=({data,maxVal,colorKey})=>(
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height:130}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%"}}>
          <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:2,width:"100%"}}>
            <div title={`Opened: ${d.opened}`} style={{flex:1,background:C.a+"70",borderRadius:"3px 3px 0 0",height:`${(d.opened/maxVal)*100}%`,minHeight:2,transition:"height .6s ease"}}/>
            <div title={`Resolved: ${d.resolved}`} style={{flex:1,background:C.g+"70",borderRadius:"3px 3px 0 0",height:`${(d.resolved/maxVal)*100}%`,minHeight:2,transition:"height .6s ease"}}/>
          </div>
          <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{d.day}</span>
        </div>
      ))}
    </div>
  );
  const AreaLine=({data,color:ac,w=320,h=100,label})=>{
    if(!data||data.length<2)return null;
    const max=Math.max(...data,1);const min=Math.min(...data,0);const range=max-min||1;const pad=6;
    const pts=data.map((v,i)=>[pad+(i/(data.length-1||1))*(w-pad*2),pad+((max-v)/range)*(h-pad*2)]);
    const line=pts.map(p=>p.join(",")).join(" ");
    const area=`${pad},${h-pad} ${line} ${w-pad},${h-pad}`;
    return <svg width="100%" viewBox={`0 0 ${w} ${h+16}`} style={{display:"block"}}>
      <defs><linearGradient id={"ag_"+label} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ac} stopOpacity="0.25"/><stop offset="100%" stopColor={ac} stopOpacity="0.02"/></linearGradient></defs>
      <polygon points={area} fill={`url(#ag_${label})`}/>
      <polyline points={line} fill="none" stroke={ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3" fill={ac} stroke={C.s1} strokeWidth="1.5" opacity={i===pts.length-1?1:0}/>)}
      {data.map((v,i)=><text key={i} x={pad+(i/(data.length-1||1))*(w-pad*2)} y={h+12} textAnchor="middle" style={{fontSize:8,fill:C.t3,fontFamily:"monospace"}}>{trendData[i]?.day||""}</text>)}
    </svg>;
  };

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    {/* ── HEADER ── */}
    <div style={{padding:"14px 24px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD}}>Reports & Analytics</h2>
      <div style={{flex:1}}/>
      <div style={{display:"flex",gap:4}}>
        {["7D","30D","90D","1Y"].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{padding:"5px 14px",borderRadius:7,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:period===p?C.ad:"transparent",color:period===p?C.a:C.t3,border:`1px solid ${period===p?C.a+"50":C.b1}`}}>{p}</button>
        ))}
      </div>
      <button onClick={()=>{exportTableCSV(["Day","Opened","Resolved","Pending"],trendData.map(d=>[d.day,d.opened,d.resolved,d.pending]),"reports_"+rtab+"_"+period+".csv");showT("Report exported","success");}} style={{padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:600,color:C.t2,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FB}}>↓ Export CSV</button>
    </div>

    {/* ── TAB BAR ── */}
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,background:C.s1,padding:"0 24px"}}>
      {[["overview","Overview"],["conversations","Conversations"],["agents","Agents"],["channels","Channels"],["sla","SLA"],["csat","CSAT"],["insights","AI Insights"],["sladash","SLA Live"],["surveys","Surveys"],["gamification","Performance"]].map(([id,lbl])=>(
        <button key={id} onClick={()=>setRtab(id)} style={{padding:"11px 18px",fontSize:11,fontWeight:700,fontFamily:FM,letterSpacing:"0.3px",color:rtab===id?C.a:C.t3,borderBottom:`2px solid ${rtab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lbl}</button>
      ))}
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

      {/* AI Report Insights */}
      <AiInsight title={"REPORT INSIGHTS — "+rtab.toUpperCase()+" ("+period+")"} loading={rptAiLoad} onRefresh={genRptAi} items={rptAi?rptAi.split("\n").filter(l=>l.trim()).map(l=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh for AI analysis of trends, anomalies, and actionable recommendations for this report."}]}/>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {rtab==="overview"&&<>
        {/* KPI Row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          <KPI label="Total Conversations" value={total} delta={`+${Math.round(12*mult/7)}%`} color={C.a} icon="inbox" sub="vs last period"/>
          <KPI label="Resolved" value={resolved} delta={`+${Math.round(18*mult/7)}%`} color={C.g} icon="resolve" sub={`${Math.round(resolved/total*100)}% rate`}/>
          <KPI label="Avg First Reply" value="3.8m" delta="-24%" color={C.y} icon="send" sub="target < 5m"/>
          <KPI label="CSAT Score" value={`${avgCsat}★`} delta="+0.3" color={C.p} icon="reports" sub="from 4.4"/>
        </div>

        {/* Main Charts Row */}
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,marginBottom:16}}>
          {/* Volume Chart */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Conversation Volume</span>
              <div style={{display:"flex",gap:12}}>
                {[{c:C.a,l:"Opened"},{c:C.g,l:"Resolved"}].map(x=><span key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.t3}}><span style={{width:10,height:10,background:x.c+"80",borderRadius:2}}/>{x.l}</span>)}
              </div>
            </div>
            <Bar data={trendData} maxVal={maxTrend}/>
          </div>

          {/* Resolution Funnel */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Resolution Funnel</div>
            {funnel.map((f,i)=>(
              <div key={f.label} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,color:C.t2}}>{f.label}</span>
                  <span style={{fontSize:11,fontWeight:700,color:f.c,fontFamily:FM}}>{f.val}</span>
                </div>
                <div style={{height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${(f.val/maxFunnel)*100}%`,height:"100%",background:`linear-gradient(90deg,${f.c}aa,${f.c})`,borderRadius:4,transition:"width .8s ease"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Line Charts */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>CSAT Trend</span>
              <span style={{fontSize:18,fontWeight:800,fontFamily:FD,color:C.g}}>{avgCsat}★</span>
            </div>
            <AreaLine data={trendData.map(d=>3.8+((d.resolved/Math.max(d.opened,1))*1.2))} color={C.g} label="csat"/>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Avg Reply Time</span>
              <span style={{fontSize:18,fontWeight:800,fontFamily:FD,color:C.a}}>3.8m</span>
            </div>
            <AreaLine data={trendData.map((d,i)=>2+(d.opened*0.08)+[0.8,1.2,0.5,1.4,0.3,1.1,0.9][i%7])} color={C.a} label="reply"/>
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          {/* Response Time Distribution */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Response Time</div>
            {rtDist.map(d=>(
              <div key={d.range} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:42,flexShrink:0}}>{d.range}</span>
                <div style={{flex:1,height:7,background:C.bg,borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${d.pct}%`,height:"100%",background:d.c,borderRadius:4,transition:"width .8s"}}/>
                </div>
                <span style={{fontSize:10,color:C.t2,fontFamily:FM,width:28,textAlign:"right"}}>{d.pct}%</span>
              </div>
            ))}
          </div>

          {/* Status Breakdown Donut */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14,textAlign:"left"}}>Status Breakdown</div>
            <svg viewBox="0 0 100 100" style={{width:110,height:110,margin:"0 auto"}}>
              {[{pct:68,c:C.g,off:0},{pct:18,c:C.y,off:68},{pct:14,c:C.r,off:86}].map((s,i)=>(
                <circle key={i} cx="50" cy="50" r="38" fill="none" stroke={s.c} strokeWidth="12"
                  strokeDasharray={`${s.pct*2.39} ${100*2.39}`} strokeDashoffset={`${-s.off*2.39}`}
                  transform="rotate(-90 50 50)" style={{transition:"all .8s"}}/>
              ))}
              <text x="50" y="48" textAnchor="middle" style={{fontSize:16,fontWeight:800,fill:C.t1}}>{total}</text>
              <text x="50" y="60" textAnchor="middle" style={{fontSize:6,fill:C.t3}}>total</text>
            </svg>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:12}}>
              {[{l:"Resolved",v:`${Math.round(68)}%`,c:C.g},{l:"Pending",v:`${Math.round(18)}%`,c:C.y},{l:"Open",v:`${Math.round(14)}%`,c:C.r}].map(x=>(
                <div key={x.l} style={{textAlign:"center"}}>
                  <div style={{width:8,height:8,borderRadius:2,background:x.c,margin:"0 auto 3px"}}/>
                  <div style={{fontSize:10,fontWeight:700,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:9,color:C.t3}}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Labels */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Top Labels</div>
            {labels.map((l,i)=>{const apiL=apiLabelStats?.find(s=>s.label?.id===l.id||s.label?.title===l.title);const count=apiL?.count??Math.round((42-i*6)*mult/7);return(
              <div key={l.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                <Tag text={l.title} color={l.color}/>
                <div style={{flex:1,height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:`${Math.min((count/50)*100,100)}%`,height:"100%",background:l.color+"80",borderRadius:3}}/></div>
                <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:22,textAlign:"right"}}>{count}</span>
              </div>
            );})}
          </div>
        </div>
      </>}

      {/* ═══════════ CONVERSATIONS TAB ═══════════ */}
      {rtab==="conversations"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
          {[{l:"Opened",v:total,c:C.a},{l:"Resolved",v:resolved,c:C.g},{l:"Pending",v:pending,c:C.y},{l:"Unresolved",v:unresolved,c:C.r},{l:"Avg Handle Time",v:"18m",c:C.cy}].map(k=>(
            <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:6,letterSpacing:"0.3px"}}>{k.l}</div>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Volume Trend</div>
            <Bar data={trendData} maxVal={maxTrend}/>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Resolution Funnel</div>
            {funnel.map(f=>(
              <div key={f.label} style={{marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:C.t2}}>{f.label}</span><span style={{fontSize:11,fontWeight:700,color:f.c,fontFamily:FM}}>{f.val}</span></div>
                <div style={{height:7,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:`${(f.val/maxFunnel)*100}%`,height:"100%",background:f.c,borderRadius:4,transition:"width .8s"}}/></div>
              </div>
            ))}
          </div>
        </div>
        {/* Busiest Hours Heatmap */}
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Busiest Hours Heatmap</div>
          <div style={{display:"flex",gap:2}}>
            <div style={{width:32,display:"flex",flexDirection:"column",gap:2,paddingTop:18}}>
              {dayLabels.map(d=><div key={d} style={{height:16,display:"flex",alignItems:"center",fontSize:9,color:C.t3,fontFamily:FM}}>{d}</div>)}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:2,marginBottom:2}}>
                {Array.from({length:24},(_,h)=><div key={h} style={{flex:1,fontSize:7,color:C.t3,fontFamily:FM,textAlign:"center"}}>{h}</div>)}
              </div>
              {heatmap.map((row,d)=>(
                <div key={d} style={{display:"flex",gap:2,marginBottom:2}}>
                  {row.map((v,h)=><div key={h} style={{flex:1,height:16,borderRadius:2,background:C.a,opacity:Math.max(v,0.04),transition:"opacity .3s"}} title={`${dayLabels[d]} ${h}:00 — ${Math.round(v*100)}%`}/>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:8,justifyContent:"flex-end"}}>
            <span style={{fontSize:9,color:C.t3}}>Less</span>
            {[0.05,0.2,0.4,0.6,0.8,1].map(v=><div key={v} style={{width:12,height:12,borderRadius:2,background:C.a,opacity:v}}/>)}
            <span style={{fontSize:9,color:C.t3}}>More</span>
          </div>
        </div>
      </>}

      {/* ═══════════ AGENTS TAB ═══════════ */}
      {rtab==="agents"&&<>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Agent Leaderboard</span>
            <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>Ranked by performance score</span>
          </div>
          {/* Table header */}
          <div style={{display:"grid",gridTemplateColumns:"50px 1.8fr 1fr 1fr 1fr 1fr 1fr 80px",padding:"8px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["#","Agent","Resolved","Avg Reply","CSAT","Load","Convs","Score"].map(h=>(
              <span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.4px"}}>{h}</span>
            ))}
          </div>
          {agentData.map((a,i)=>(
            <div key={a.id} style={{display:"grid",gridTemplateColumns:"50px 1.8fr 1fr 1fr 1fr 1fr 1fr 80px",padding:"12px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center",background:i===0?C.ad:"transparent"}}>
              <span style={{fontSize:14,fontWeight:800,fontFamily:FD,color:i===0?C.g:i===1?C.y:i===2?"#cd7f32":C.t3}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Av i={a.av} c={a.color} s={30} dot={a.status==="online"}/>
                <div><div style={{fontSize:12,fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:C.t3}}>{a.role}</div></div>
              </div>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FM,color:C.g}}>{a.resolved}</span>
              <span style={{fontSize:12,fontFamily:FM,color:C.t2}}>{a.avgReply}</span>
              <span style={{fontSize:12,fontWeight:700,color:parseFloat(a.csat)>=4.5?C.g:C.y}}>{a.csat}★</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1,height:6,background:C.bg,borderRadius:3,maxWidth:50}}><div style={{width:`${a.load}%`,height:"100%",background:a.load>80?C.r:a.load>60?C.y:C.g,borderRadius:3}}/></div>
                <span style={{fontSize:10,fontFamily:FM,color:C.t3}}>{a.load}%</span>
              </div>
              <span style={{fontSize:12,fontFamily:FM,color:C.t2}}>{a.conversations}</span>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:36,height:36,borderRadius:8,background:a.score>=90?C.g+"18":a.score>=75?C.y+"18":C.r+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,fontFamily:FM,color:a.score>=90?C.g:a.score>=75?C.y:C.r}}>{a.score}</div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ═══════════ CHANNELS TAB ═══════════ */}
      {rtab==="channels"&&<>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`}}>
            <span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Channel Performance</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"40px 1.6fr 1fr 1fr 1fr 1fr",padding:"8px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["","Channel","Conversations","Resolved","Avg Reply","CSAT"].map(h=>(
              <span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.4px"}}>{h}</span>
            ))}
          </div>
          {chData.map(ch=>(
            <div key={ch.name} style={{display:"grid",gridTemplateColumns:"40px 1.6fr 1fr 1fr 1fr 1fr",padding:"12px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center"}}>
              <div style={{width:28,height:28,borderRadius:7,background:ch.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{chI(ch.type)}</div>
              <div><div style={{fontSize:12,fontWeight:600}}>{ch.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{ch.type}</div></div>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FM,color:C.a}}>{ch.convs}</span>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FM,color:C.g}}>{ch.resolved}</span>
              <span style={{fontSize:12,fontFamily:FM,color:C.t2}}>{ch.avgReply}</span>
              <span style={{fontSize:12,fontWeight:700,color:parseFloat(ch.csat)>=4.5?C.g:C.y}}>{ch.csat}★</span>
            </div>
          ))}
        </div>
        {/* Channel volume bars */}
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Volume Comparison</div>
          {chData.sort((a,b)=>b.convs-a.convs).map(ch=>(
            <div key={ch.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:11.5,color:C.t2,width:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</span>
              <div style={{flex:1,height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:`${(ch.convs/Math.max(...chData.map(c=>c.convs),1))*100}%`,height:"100%",background:`linear-gradient(90deg,${ch.color}aa,${ch.color})`,borderRadius:4}}/></div>
              <span style={{fontSize:11,color:C.t2,fontFamily:FM,width:32,textAlign:"right"}}>{ch.convs}</span>
            </div>
          ))}
        </div>
      </>}

      {/* ═══════════ SLA TAB ═══════════ */}
      {rtab==="sla"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {slaTargets.map(s=>(
            <div key={s.name} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,letterSpacing:"0.3px",marginBottom:10}}>{s.name}</div>
              <svg viewBox="0 0 100 50" style={{width:100,height:50,margin:"0 auto 8px"}}>
                <path d="M10 45 A 35 35 0 0 1 90 45" fill="none" stroke={C.b1} strokeWidth="6" strokeLinecap="round"/>
                <path d="M10 45 A 35 35 0 0 1 90 45" fill="none" stroke={s.c} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${s.met*1.1} 110`} style={{transition:"stroke-dasharray .8s"}}/>
              </svg>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:s.met>=90?C.g:s.met>=75?C.y:C.r}}>{s.met}%</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>Target: {s.target}</div>
              <Tag text={s.met>=90?"On Track":s.met>=75?"At Risk":"Breached"} color={s.met>=90?C.g:s.met>=75?C.y:C.r}/>
            </div>
          ))}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>SLA Compliance Trend</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:140}}>
            {days.map((d,i)=>{const v=Math.round(82+((i*23)%15));return(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%"}}>
                <div style={{flex:1,display:"flex",alignItems:"flex-end",width:"100%"}}>
                  <div style={{width:"100%",background:v>=90?C.g+"70":v>=75?C.y+"70":C.r+"70",borderRadius:"3px 3px 0 0",height:`${v}%`,transition:"height .6s"}}/>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:v>=90?C.g:v>=75?C.y:C.r,fontFamily:FM}}>{v}%</span>
                <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{d}</span>
              </div>
            );})}
          </div>
        </div>
      </>}

      {/* ═══════════ CSAT TAB ═══════════ */}
      {rtab==="csat"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:8}}>OVERALL CSAT</div>
            <div style={{fontSize:42,fontWeight:800,fontFamily:FD,color:C.g}}>{avgCsat}</div>
            <div style={{fontSize:12,color:C.t3}}>out of 5.0</div>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:8}}>TOTAL RATINGS</div>
            <div style={{fontSize:42,fontWeight:800,fontFamily:FD,color:C.a}}>{Math.round(resolved*0.6)}</div>
            <div style={{fontSize:12,color:C.t3}}>{Math.round(0.6*100)}% response rate</div>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:8}}>NPS SCORE</div>
            <div style={{fontSize:42,fontWeight:800,fontFamily:FD,color:C.p}}>+72</div>
            <div style={{fontSize:12,color:C.t3}}>Excellent</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Rating Distribution</div>
            {csatDist.map(d=>(
              <div key={d.r} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:12,color:C.t2,fontFamily:FM,width:20}}>{d.r}★</span>
                <div style={{flex:1,height:10,background:C.bg,borderRadius:5,overflow:"hidden"}}><div style={{width:`${d.pct}%`,height:"100%",background:d.c,borderRadius:5,transition:"width .8s"}}/></div>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:30,textAlign:"right"}}>{d.pct}%</span>
              </div>
            ))}
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>CSAT by Agent</div>
            {agentData.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <Av i={a.av} c={a.color} s={28}/>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div></div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:50,height:6,background:C.bg,borderRadius:3}}><div style={{width:`${(parseFloat(a.csat)/5)*100}%`,height:"100%",background:parseFloat(a.csat)>=4.5?C.g:C.y,borderRadius:3}}/></div>
                  <span style={{fontSize:12,fontWeight:700,color:parseFloat(a.csat)>=4.5?C.g:C.y,fontFamily:FM}}>{a.csat}★</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>}
      {rtab==="insights"&&<InsightsScr/>}
      {rtab==="sladash"&&<SlaDashScr convs={convs} agents={agents}/>}
      {rtab==="surveys"&&<SurveyBuilderScr/>}
      {rtab==="gamification"&&<GamificationScr agents={agents}/>}
    </div>
  </div>;
}


