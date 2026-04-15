import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, api, showT, exportTableCSV, chI, chC, NavIcon, Av, Tag, Spin, AiInsight } from "../shared";
import InsightsScr from "./InsightsScr";
import SlaDashScr from "./SlaDashScr";
import SurveyBuilderScr from "./SurveyBuilderScr";
import GamificationScr from "./GamificationScr";

// ─── REPORTS — ALL DATA FROM API (NO STATIC FALLBACKS) ───────────────────
export default function ReportsScr({convs,agents,labels,contacts,inboxes}:any){
  const [period,setPeriod]=useState("7D");
  const [rtab,setRtab]=useState("overview");
  const [loading,setLoading]=useState(true);
  const [rptAi,setRptAi]=useState<string|null>(null);const [rptAiLoad,setRptAiLoad]=useState(false);
  const genRptAi=async()=>{setRptAiLoad(true);try{const ctx=`Period: ${period}. Convs: ${ov.total}. Open: ${ov.open}. Resolved: ${ov.resolved}. Agents: ${agents.length}. Tab: ${rtab}. AvgReply: ${ov.avgFirstReply}m. CSAT: ${ov.avgCsat}.`;const d=await api.post('/ai/chat',{max_tokens:250,system:"You are a support analytics AI. Analyze the "+rtab+" report for period "+period+". Give 3-4 specific insights: trends, anomalies, recommendations. Use numbers. No markdown.",messages:[{role:"user",content:ctx}]});setRptAi(d.content?.[0]?.text);}catch{setRptAi(null);}setRptAiLoad(false);};

  // ── API STATE ──
  const [apiData,setApiData]=useState<any>({});
  const fetchAll=useCallback(async()=>{
    setLoading(true);
    const p2=period.toLowerCase();
    try{
      const [ovR,agR,chR,slaR,lblR,csatR]=await Promise.allSettled([
        api.get(`/reports/overview?period=${p2}`),
        api.get(`/reports/agents?period=${p2}`),
        api.get(`/reports/channels?period=${p2}`),
        api.get(`/reports/sla?period=${p2}`),
        api.get(`/reports/labels?period=${p2}`),
        api.get(`/reports/csat?period=${p2}`),
      ]);
      setApiData({
        overview: ovR.status==='fulfilled'?ovR.value:null,
        agents: agR.status==='fulfilled'?agR.value?.agents:null,
        channels: chR.status==='fulfilled'?chR.value?.channels:null,
        sla: slaR.status==='fulfilled'?slaR.value?.sla:null,
        labels: lblR.status==='fulfilled'?lblR.value?.labels:null,
        csat: csatR.status==='fulfilled'?csatR.value?.csat:null,
      });
    }catch{}
    setLoading(false);
  },[period]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  // ── DERIVED DATA (all from API) ──
  const ov=apiData.overview?.overview||{total:0,resolved:0,open:0,pending:0,urgent:0,resolutionRate:0,avgFirstReply:0,avgCsat:0,totalRated:0};
  const deltas=apiData.overview?.deltas||{totalDelta:0,resolvedDelta:0,replyDelta:0,csatDelta:0};
  const daily=apiData.overview?.daily||[];
  const rtDistApi=apiData.overview?.rtDist||[];
  const heatmapApi=apiData.overview?.heatmap||Array.from({length:7},()=>Array(24).fill(0));

  // Trend data for charts
  const trendData=daily.length>0
    ?daily.map((d:any)=>({day:new Date(d.date+"T00:00:00").toLocaleDateString("en-GB",{weekday:"short"}).slice(0,3),opened:d.conversations,resolved:d.resolved,pending:d.pending}))
    :[];
  const maxTrend=Math.max(...trendData.map((d:any)=>Math.max(d.opened,d.resolved)),1);

  const total=ov.total;const resolved=ov.resolved;const open=ov.open;const pending=ov.pending;
  const unresolved=Math.max(total-resolved-pending,0);
  const resolvedPct=total?Math.round(resolved/total*100):0;
  const pendingPct=total?Math.round(pending/total*100):0;
  const openPct=total?100-resolvedPct-pendingPct:0;

  // Response time distribution with colors
  const rtDist=rtDistApi.map((d:any,i:number)=>({...d,c:i<2?C.g:i<4?C.y:C.r}));

  // Funnel from real data
  const funnel=[
    {label:"Total Opened",val:total,c:C.a},
    {label:"Pending",val:pending,c:C.y},
    {label:"Open",val:open,c:C.cy},
    {label:"Resolved",val:resolved,c:C.g},
    {label:"Rated (CSAT)",val:ov.totalRated,c:C.p},
  ];
  const maxFunnel=Math.max(...funnel.map(f=>f.val),1);

  // SLA data
  const sla=apiData.sla||{total:0,breached:0,atRisk:0,compliant:0,resCompliant:0,resTotal:0,slaFirstResponse:60,slaResolution:480,slaTrend:[]};
  const slaTot=sla.total||1;
  const slaTargets=[
    {name:"First Response",target:`< ${sla.slaFirstResponse}m`,met:Math.round((sla.compliant||0)/slaTot*100),c:C.a},
    {name:"Resolution Time",target:`< ${Math.round((sla.slaResolution||480)/60)}h`,met:sla.resTotal?Math.round((sla.resCompliant||0)/Math.max(sla.resTotal,1)*100):0,c:C.g},
    {name:"Compliant",target:"SLA Met",met:Math.round((sla.compliant||0)/slaTot*100),c:C.p},
    {name:"Breach Rate",target:"< 10%",met:Math.max(100-Math.round((sla.breached||0)/slaTot*100),0),c:C.cy},
  ];

  // Channel data
  const chData=(apiData.channels||[]).map((s:any)=>({name:s.inbox.name,type:s.inbox.type,convs:s.conversations,resolved:s.resolved,avgReply:s.avgResponseTime,csat:s.csat,color:chC(s.inbox.type)}));

  // Agent leaderboard
  const agentData=(apiData.agents||[]).map((s:any)=>({...s.agent,av:s.agent.avatar||s.agent.name?.slice(0,2)?.toUpperCase()||"?",resolved:s.resolved,avgReply:s.avgResponseTime,csat:s.csat,load:s.load||0,conversations:s.assigned,score:s.assigned?Math.min(100,Math.round((s.resolved||0)/Math.max(s.assigned,1)*100)):0}));

  // CSAT data
  const csatData=apiData.csat||{avgCsat:0,totalRated:0,totalResolved:0,responseRate:0,nps:0,distribution:[],byAgent:[]};
  const csatDist=(csatData.distribution||[]).map((d:any)=>({r:d.rating,pct:d.pct,c:d.rating>=4?C.g:d.rating===3?C.y:C.r}));

  // Label stats
  const labelStats=apiData.labels||[];

  const dayLabels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const fmtDelta=(v:number)=>v>0?`+${v}%`:v<0?`${v}%`:"0%";

  // ── KPI CARDS ──
  const KPI=({label,value,delta,color:kc,icon,sub}:any)=>(
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,right:0,width:60,height:60,background:kc+"08",borderRadius:"0 0 0 60px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase"}}>{label}</span>
        <span style={{opacity:0.7}}><NavIcon id={icon} s={18} col={kc}/></span>
      </div>
      <div style={{fontSize:28,fontWeight:800,fontFamily:FD,color:kc,marginBottom:4}}>{value}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:String(delta).startsWith("+")?C.g:String(delta).startsWith("-")?C.r:C.t3,fontFamily:FM,fontWeight:600}}>{delta}</span>
        {sub&&<span style={{fontSize:10,color:C.t3}}>{sub}</span>}
      </div>
      {trendData.length>1&&<svg style={{width:"100%",height:24,marginTop:8}} viewBox="0 0 100 24">
        <polyline fill="none" stroke={kc} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          points={trendData.slice(-7).map((d:any,i:number,a:any[])=>`${(i/(a.length-1||1))*100},${24-((d.opened||0)/maxTrend)*20}`).join(" ")}/>
      </svg>}
    </div>
  );

  // ── MINI BAR CHART ──
  const Bar=({data,maxVal}:any)=>(
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height:130}}>
      {data.map((d:any,i:number)=>(
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
  const AreaLine=({data,color:ac,w=320,h=100,label,xLabels}:any)=>{
    if(!data||data.length<2)return null;
    const max=Math.max(...data,1);const min=Math.min(...data,0);const range=max-min||1;const pad=6;
    const pts=data.map((v:number,i:number)=>[pad+(i/(data.length-1||1))*(w-pad*2),pad+((max-v)/range)*(h-pad*2)]);
    const line=pts.map((p:number[])=>p.join(",")).join(" ");
    const area=`${pad},${h-pad} ${line} ${w-pad},${h-pad}`;
    return <svg width="100%" viewBox={`0 0 ${w} ${h+16}`} style={{display:"block"}}>
      <defs><linearGradient id={"ag_"+label} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ac} stopOpacity="0.25"/><stop offset="100%" stopColor={ac} stopOpacity="0.02"/></linearGradient></defs>
      <polygon points={area} fill={`url(#ag_${label})`}/>
      <polyline points={line} fill="none" stroke={ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p:number[],i:number)=><circle key={i} cx={p[0]} cy={p[1]} r="3" fill={ac} stroke={C.s1} strokeWidth="1.5" opacity={i===pts.length-1?1:0}/>)}
      {(xLabels||[]).map((l:string,i:number)=><text key={i} x={pad+(i/((xLabels.length-1)||1))*(w-pad*2)} y={h+12} textAnchor="middle" style={{fontSize:8,fill:C.t3,fontFamily:"monospace"}}>{l}</text>)}
    </svg>;
  };

  if(loading)return <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><Spin/></div>;

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
      <button onClick={()=>{exportTableCSV(["Day","Opened","Resolved","Pending"],trendData.map((d:any)=>[d.day,d.opened,d.resolved,d.pending]),"reports_"+rtab+"_"+period+".csv");showT("Report exported","success");}} style={{padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:600,color:C.t2,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FB}}>↓ Export CSV</button>
    </div>

    {/* ── TAB BAR ── */}
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,background:C.s1,padding:"0 24px",overflowX:"auto"}}>
      {[["overview","Overview"],["conversations","Conversations"],["agents","Agents"],["channels","Channels"],["sla","SLA"],["csat","CSAT"],["insights","AI Insights"],["sladash","SLA Live"],["surveys","Surveys"],["gamification","Performance"]].map(([id,lbl])=>(
        <button key={id} onClick={()=>setRtab(id)} style={{padding:"11px 18px",fontSize:11,fontWeight:700,fontFamily:FM,letterSpacing:"0.3px",color:rtab===id?C.a:C.t3,borderTop:"none",borderLeft:"none",borderRight:"none",borderBottom:`2px solid ${rtab===id?C.a:"transparent"}`,background:"transparent",cursor:"pointer",whiteSpace:"nowrap"}}>{lbl}</button>
      ))}
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

      {/* AI Report Insights */}
      <AiInsight title={"REPORT INSIGHTS — "+rtab.toUpperCase()+" ("+period+")"} loading={rptAiLoad} onRefresh={genRptAi} items={rptAi?rptAi.split("\n").filter((l:string)=>l.trim()).map((l:string)=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh for AI analysis of trends, anomalies, and actionable recommendations for this report."}]}/>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {rtab==="overview"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          <KPI label="Total Conversations" value={total} delta={fmtDelta(deltas.totalDelta)} color={C.a} icon="inbox" sub="vs last period"/>
          <KPI label="Resolved" value={resolved} delta={fmtDelta(deltas.resolvedDelta)} color={C.g} icon="resolve" sub={`${ov.resolutionRate}% rate`}/>
          <KPI label="Avg First Reply" value={ov.avgFirstReply?`${ov.avgFirstReply}m`:"N/A"} delta={deltas.replyDelta?fmtDelta(deltas.replyDelta):"—"} color={C.y} icon="send" sub=""/>
          <KPI label="CSAT Score" value={ov.avgCsat?`${ov.avgCsat}★`:"N/A"} delta={deltas.csatDelta?(deltas.csatDelta>0?"+":"")+deltas.csatDelta:"—"} color={C.p} icon="reports" sub={ov.totalRated?`${ov.totalRated} rated`:""}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,marginBottom:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Conversation Volume</span>
              <div style={{display:"flex",gap:12}}>
                {[{c:C.a,l:"Opened"},{c:C.g,l:"Resolved"}].map(x=><span key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.t3}}><span style={{width:10,height:10,background:x.c+"80",borderRadius:2}}/>{x.l}</span>)}
              </div>
            </div>
            {trendData.length>0?<Bar data={trendData} maxVal={maxTrend}/>:<div style={{textAlign:"center",padding:30,color:C.t3,fontSize:12}}>No data for this period</div>}
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Resolution Funnel</div>
            {funnel.map(f=>(
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

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>CSAT Trend</span>
              <span style={{fontSize:18,fontWeight:800,fontFamily:FD,color:C.g}}>{ov.avgCsat||0}★</span>
            </div>
            <AreaLine data={trendData.map((d:any)=>d.opened?((d.resolved/d.opened)*5):0)} color={C.g} label="csat" xLabels={trendData.slice(-7).map((d:any)=>d.day)}/>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Avg Reply Time</span>
              <span style={{fontSize:18,fontWeight:800,fontFamily:FD,color:C.a}}>{ov.avgFirstReply?`${ov.avgFirstReply}m`:"N/A"}</span>
            </div>
            <AreaLine data={trendData.map((d:any)=>d.opened||0)} color={C.a} label="reply" xLabels={trendData.slice(-7).map((d:any)=>d.day)}/>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Response Time</div>
            {rtDist.length>0?rtDist.map((d:any)=>(
              <div key={d.range} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:42,flexShrink:0}}>{d.range}</span>
                <div style={{flex:1,height:7,background:C.bg,borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${d.pct}%`,height:"100%",background:d.c,borderRadius:4,transition:"width .8s"}}/>
                </div>
                <span style={{fontSize:10,color:C.t2,fontFamily:FM,width:28,textAlign:"right"}}>{d.pct}%</span>
              </div>
            )):<div style={{color:C.t3,fontSize:12,textAlign:"center",padding:20}}>No reply data</div>}
          </div>

          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14,textAlign:"left"}}>Status Breakdown</div>
            <svg viewBox="0 0 100 100" style={{width:110,height:110,margin:"0 auto"}}>
              {[{pct:resolvedPct,c:C.g,off:0},{pct:pendingPct,c:C.y,off:resolvedPct},{pct:openPct,c:C.r,off:resolvedPct+pendingPct}].map((s,i)=>(
                <circle key={i} cx="50" cy="50" r="38" fill="none" stroke={s.c} strokeWidth="12"
                  strokeDasharray={`${s.pct*2.39} ${100*2.39}`} strokeDashoffset={`${-s.off*2.39}`}
                  transform="rotate(-90 50 50)" style={{transition:"all .8s"}}/>
              ))}
              <text x="50" y="48" textAnchor="middle" style={{fontSize:16,fontWeight:800,fill:C.t1}}>{total}</text>
              <text x="50" y="60" textAnchor="middle" style={{fontSize:6,fill:C.t3}}>total</text>
            </svg>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:12}}>
              {[{l:"Resolved",v:`${resolvedPct}%`,c:C.g},{l:"Pending",v:`${pendingPct}%`,c:C.y},{l:"Open",v:`${openPct}%`,c:C.r}].map(x=>(
                <div key={x.l} style={{textAlign:"center"}}>
                  <div style={{width:8,height:8,borderRadius:2,background:x.c,margin:"0 auto 3px"}}/>
                  <div style={{fontSize:10,fontWeight:700,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:9,color:C.t3}}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Top Labels</div>
            {labelStats.length>0?labelStats.map((ls:any)=>(
              <div key={ls.label.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                <Tag text={ls.label.title} color={ls.label.color}/>
                <div style={{flex:1,height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:`${Math.min((ls.count/Math.max(...labelStats.map((s:any)=>s.count),1))*100,100)}%`,height:"100%",background:ls.label.color+"80",borderRadius:3}}/></div>
                <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:22,textAlign:"right"}}>{ls.count}</span>
              </div>
            )):<div style={{color:C.t3,fontSize:12,textAlign:"center",padding:20}}>No label data</div>}
          </div>
        </div>
      </>}

      {/* ═══════════ CONVERSATIONS TAB ═══════════ */}
      {rtab==="conversations"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
          {[{l:"Opened",v:total,c:C.a},{l:"Resolved",v:resolved,c:C.g},{l:"Pending",v:pending,c:C.y},{l:"Open",v:open,c:C.r},{l:"Avg Reply",v:ov.avgFirstReply?`${ov.avgFirstReply}m`:"N/A",c:C.cy}].map(k=>(
            <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:6,letterSpacing:"0.3px"}}>{k.l}</div>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Volume Trend</div>
            {trendData.length>0?<Bar data={trendData} maxVal={maxTrend}/>:<div style={{textAlign:"center",padding:30,color:C.t3,fontSize:12}}>No data for this period</div>}
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
              {heatmapApi.map((row:number[],d:number)=>(
                <div key={d} style={{display:"flex",gap:2,marginBottom:2}}>
                  {row.map((v:number,h:number)=><div key={h} style={{flex:1,height:16,borderRadius:2,background:C.a,opacity:Math.max(v,0.04),transition:"opacity .3s"}} title={`${dayLabels[d]} ${h}:00 — ${Math.round(v*100)}%`}/>)}
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
          <div style={{display:"grid",gridTemplateColumns:"50px 1.8fr 1fr 1fr 1fr 1fr 1fr 80px",padding:"8px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["#","Agent","Resolved","Avg Reply","CSAT","Load","Convs","Score"].map(h=>(
              <span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.4px"}}>{h}</span>
            ))}
          </div>
          {agentData.length>0?agentData.map((a:any,i:number)=>(
            <div key={a.id} style={{display:"grid",gridTemplateColumns:"50px 1.8fr 1fr 1fr 1fr 1fr 1fr 80px",padding:"12px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center",background:i===0?C.ad:"transparent"}}>
              <span style={{fontSize:14,fontWeight:800,fontFamily:FD,color:i===0?C.g:i===1?C.y:i===2?"#cd7f32":C.t3}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Av i={a.av} c={a.color} s={30} dot={a.status==="online"}/>
                <div><div style={{fontSize:12,fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:C.t3}}>{a.role}</div></div>
              </div>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FM,color:C.g}}>{a.resolved}</span>
              <span style={{fontSize:12,fontFamily:FM,color:C.t2}}>{a.avgReply}</span>
              <span style={{fontSize:12,fontWeight:700,color:a.csat!=='N/A'&&parseFloat(a.csat)>=4.5?C.g:C.y}}>{a.csat}{a.csat!=='N/A'?'★':''}</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,fontFamily:FM,color:C.t3}}>{a.load} open</span>
              </div>
              <span style={{fontSize:12,fontFamily:FM,color:C.t2}}>{a.conversations}</span>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:36,height:36,borderRadius:8,background:a.score>=90?C.g+"18":a.score>=75?C.y+"18":C.r+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,fontFamily:FM,color:a.score>=90?C.g:a.score>=75?C.y:C.r}}>{a.score}</div>
              </div>
            </div>
          )):<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No agent data</div>}
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
          {chData.length>0?chData.map((ch:any)=>(
            <div key={ch.name} style={{display:"grid",gridTemplateColumns:"40px 1.6fr 1fr 1fr 1fr 1fr",padding:"12px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center"}}>
              <div style={{width:28,height:28,borderRadius:7,background:ch.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{chI(ch.type)}</div>
              <div><div style={{fontSize:12,fontWeight:600}}>{ch.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{ch.type}</div></div>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FM,color:C.a}}>{ch.convs}</span>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FM,color:C.g}}>{ch.resolved}</span>
              <span style={{fontSize:12,fontFamily:FM,color:C.t2}}>{ch.avgReply}</span>
              <span style={{fontSize:12,fontWeight:700,color:ch.csat!=='N/A'&&parseFloat(ch.csat)>=4.5?C.g:C.y}}>{ch.csat}{ch.csat!=='N/A'?'★':''}</span>
            </div>
          )):<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No channel data</div>}
        </div>
        {chData.length>0&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Volume Comparison</div>
          {[...chData].sort((a:any,b:any)=>b.convs-a.convs).map((ch:any)=>(
            <div key={ch.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:11.5,color:C.t2,width:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</span>
              <div style={{flex:1,height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:`${(ch.convs/Math.max(...chData.map((c:any)=>c.convs),1))*100}%`,height:"100%",background:`linear-gradient(90deg,${ch.color}aa,${ch.color})`,borderRadius:4}}/></div>
              <span style={{fontSize:11,color:C.t2,fontFamily:FM,width:32,textAlign:"right"}}>{ch.convs}</span>
            </div>
          ))}
        </div>}
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
          {sla.slaTrend?.length>0?<div style={{display:"flex",alignItems:"flex-end",gap:6,height:140}}>
            {sla.slaTrend.map((d:any,i:number)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%"}}>
                <div style={{flex:1,display:"flex",alignItems:"flex-end",width:"100%"}}>
                  <div style={{width:"100%",background:d.pct>=90?C.g+"70":d.pct>=75?C.y+"70":C.r+"70",borderRadius:"3px 3px 0 0",height:`${d.pct}%`,transition:"height .6s"}}/>
                </div>
                <span style={{fontSize:10,fontWeight:700,color:d.pct>=90?C.g:d.pct>=75?C.y:C.r,fontFamily:FM}}>{d.pct}%</span>
                <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{new Date(d.date+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).slice(0,6)}</span>
              </div>
            ))}
          </div>:<div style={{textAlign:"center",padding:30,color:C.t3,fontSize:12}}>No SLA data for this period</div>}
        </div>
      </>}

      {/* ═══════════ CSAT TAB ═══════════ */}
      {rtab==="csat"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:8}}>OVERALL CSAT</div>
            <div style={{fontSize:42,fontWeight:800,fontFamily:FD,color:csatData.avgCsat>=4?C.g:csatData.avgCsat>=3?C.y:csatData.avgCsat>0?C.r:C.t3}}>{csatData.avgCsat||"—"}</div>
            <div style={{fontSize:12,color:C.t3}}>out of 5.0</div>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:8}}>TOTAL RATINGS</div>
            <div style={{fontSize:42,fontWeight:800,fontFamily:FD,color:C.a}}>{csatData.totalRated}</div>
            <div style={{fontSize:12,color:C.t3}}>{csatData.responseRate}% response rate</div>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:8}}>NPS SCORE</div>
            <div style={{fontSize:42,fontWeight:800,fontFamily:FD,color:csatData.nps>=50?C.g:csatData.nps>=0?C.y:C.r}}>{csatData.nps>0?"+":""}{csatData.nps}</div>
            <div style={{fontSize:12,color:C.t3}}>{csatData.nps>=50?"Excellent":csatData.nps>=0?"Good":"Needs Work"}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Rating Distribution</div>
            {csatDist.length>0?csatDist.map((d:any)=>(
              <div key={d.r} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:12,color:C.t2,fontFamily:FM,width:20}}>{d.r}★</span>
                <div style={{flex:1,height:10,background:C.bg,borderRadius:5,overflow:"hidden"}}><div style={{width:`${d.pct}%`,height:"100%",background:d.c,borderRadius:5,transition:"width .8s"}}/></div>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:30,textAlign:"right"}}>{d.pct}%</span>
              </div>
            )):<div style={{color:C.t3,fontSize:12,textAlign:"center",padding:20}}>No ratings yet</div>}
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>CSAT by Agent</div>
            {csatData.byAgent?.length>0?csatData.byAgent.map((a:any)=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <Av i={a.avatar||a.name?.slice(0,2)} c={a.color} s={28}/>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div></div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:50,height:6,background:C.bg,borderRadius:3}}><div style={{width:`${(a.csat/5)*100}%`,height:"100%",background:a.csat>=4.5?C.g:C.y,borderRadius:3}}/></div>
                  <span style={{fontSize:12,fontWeight:700,color:a.csat>=4.5?C.g:C.y,fontFamily:FM}}>{a.csat}★</span>
                </div>
              </div>
            )):<div style={{color:C.t3,fontSize:12,textAlign:"center",padding:20}}>No agent ratings</div>}
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
