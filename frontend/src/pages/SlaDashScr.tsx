import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── SLA DASHBOARD ────────────────────────────────────────────────────────
export default function SlaDashScr({convs,agents}){
  const [slaTab,setSlaTab]=useState("realtime");
  const metrics=[{name:"First Response",target:"5 min",met:87,trend:"+4%",c:C.a},{name:"Resolution",target:"4 hours",met:74,trend:"-2%",c:C.g},{name:"CSAT Target",target:"> 4.5★",met:92,trend:"+0.3",c:C.p},{name:"Escalation Rate",target:"< 10%",met:95,trend:"-1.8%",c:C.cy}];
  const breaches=[{id:"br1",conv:"#cv1",customer:"Arjun Mehta",metric:"Resolution",elapsed:"72h",severity:"critical"},{id:"br2",conv:"#cv4",customer:"Nadia Popescu",metric:"First Response",elapsed:"45m",severity:"high"},{id:"br3",conv:"#cv7",customer:"NovaTech",metric:"Resolution",elapsed:"8h",severity:"medium"}];
  const heatData=Array.from({length:7}).map(()=>Array.from({length:24}).map(()=>({val:Math.random(),breach:Math.random()>0.85})));
  return <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>SLA Dashboard</h2>
      <Btn ch="Configure SLAs" v="ghost" sm onClick={()=>showT("Settings > Inboxes > SLA","info")}/>
    </div>
    <div style={{display:"flex",gap:3,marginBottom:14,borderBottom:`1px solid ${C.b1}`}}>
      {["realtime","breaches","heatmap","agents"].map(t=><button key={t} onClick={()=>setSlaTab(t)} style={{padding:"7px 12px",fontSize:10,fontWeight:700,fontFamily:FM,color:slaTab===t?C.a:C.t3,borderBottom:`2px solid ${slaTab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}
    </div>
    {slaTab==="realtime"&&<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {metrics.map(m=><div key={m.name} style={{padding:14,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:C.s3}}><div style={{height:"100%",width:m.met+"%",background:m.c}}/></div>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>{m.name}</div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:m.c}}>{m.met}%</div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:9.5,color:C.t3}}>Target: {m.target}</span><span style={{fontSize:9.5,color:m.trend.startsWith("+")?C.g:C.r,fontWeight:700}}>{m.trend}</span></div>
        </div>)}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Gauges</div>
        <div style={{display:"flex",gap:16,justifyContent:"center"}}>{metrics.map(m=><div key={m.name} style={{textAlign:"center"}}>
          <svg width="70" height="45" viewBox="0 0 80 50"><path d="M10 45 A30 30 0 0 1 70 45" fill="none" stroke={C.s3} strokeWidth="5" strokeLinecap="round"/><path d={`M10 45 A30 30 0 0 1 ${10+60*(m.met/100)} ${45-Math.sin(Math.PI*m.met/100)*30}`} fill="none" stroke={m.c} strokeWidth="5" strokeLinecap="round"/><text x="40" y="40" textAnchor="middle" fontSize="11" fontWeight="800" fill={m.c}>{m.met}%</text></svg>
          <div style={{fontSize:8.5,color:C.t3,fontFamily:FM}}>{m.name}</div>
        </div>)}</div>
      </div>
    </>}
    {slaTab==="breaches"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}>
      {breaches.map(b=><div key={b.id} style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`,borderLeft:`3px solid ${b.severity==="critical"?C.r:b.severity==="high"?C.y:C.t3}`,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:11,color:C.a,fontFamily:FM,width:50}}>{b.conv}</span>
        <span style={{fontSize:12,fontWeight:600,flex:1}}>{b.customer}</span>
        <span style={{fontSize:11,color:C.t2}}>{b.metric}</span>
        <span style={{fontSize:11,fontWeight:700,color:C.r}}>{b.elapsed}</span>
        <Tag text={b.severity} color={b.severity==="critical"?C.r:b.severity==="high"?C.y:C.t3}/>
      </div>)}
    </div>}
    {slaTab==="heatmap"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:14}}>
      <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Breach Heatmap</div>
      <div style={{display:"flex",gap:1}}>
        <div style={{display:"flex",flexDirection:"column",gap:1,marginRight:3}}>{["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{height:12,fontSize:7.5,color:C.t3,fontFamily:FM,display:"flex",alignItems:"center"}}>{d}</div>)}</div>
        {Array.from({length:24}).map((_,h)=><div key={h} style={{display:"flex",flexDirection:"column",gap:1}}>{heatData.map((row,d)=>{const c=row[h];return <div key={d} style={{width:12,height:12,borderRadius:2,background:c.breach?C.r+"AA":c.val>0.6?C.g+"44":C.s3}}/>;})}</div>)}
      </div>
    </div>}
    {slaTab==="agents"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}>
      {agents.map((a,i)=><div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`}}>
        <Av i={a.av} c={a.color} s={24} dot={a.status==="online"}/>
        <span style={{fontSize:12,fontWeight:600,flex:1}}>{a.name}</span>
        <span style={{fontSize:10.5,color:C.t2}}>{(1.8+i*1.2).toFixed(1)}m reply</span>
        <span style={{fontSize:10.5,color:(4.9-i*.15)>=4.5?C.g:C.y,fontWeight:700}}>{(4.9-i*.15).toFixed(1)}★</span>
        <span style={{fontSize:10.5,fontWeight:700,color:(96-i*8)>=85?C.g:C.y}}>{96-i*8}%</span>
      </div>)}
    </div>}
  </div>;
}


