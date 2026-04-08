import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── AI INSIGHTS DASHBOARD ────────────────────────────────────────────────
export default function InsightsScr(){
  const [iTab,setITab]=useState("overview");
  const insights=[
    {id:"i1",type:"trend",icon:"📈",title:"Ticket volume up 23%",desc:"WhatsApp conversations spiked this week. Consider adding more agents to the WA queue.",color:C.y,action:"View WA Queue"},
    {id:"i2",type:"churn",icon:"⚠️",title:"3 customers at churn risk",desc:"Arjun Mehta, Sarah Chen, and Marcus Williams have unresolved tickets older than 48h.",color:C.r,action:"View Tickets"},
    {id:"i3",type:"recurring",icon:"🔄",title:"Recurring issue: API 401 errors",desc:"12 customers reported API authentication failures this month. A KB article could reduce 40% of these tickets.",color:C.p,action:"Create KB Article"},
    {id:"i4",type:"suggestion",icon:"💡",title:"Write article: CSV Export Guide",desc:"AI detected 18 conversations asking how to export data. A help article would deflect ~60% of these.",color:C.a,action:"Generate Article"},
    {id:"i5",type:"staffing",icon:"👥",title:"Understaffed: Mon 9-11 AM",desc:"Average response time is 8.2 min during Monday morning. Adding 1 agent would bring it under 3 min.",color:C.cy,action:"View Schedule"},
    {id:"i6",type:"sentiment",icon:"😊",title:"CSAT improving: 4.2 → 4.6",desc:"Customer satisfaction rose after AI Auto-Reply was enabled on WhatsApp. Continue monitoring.",color:C.g,action:"View CSAT"},
  ];
  const burnout=[{name:"Priya Sharma",score:32,risk:"Low"},{name:"Dev Kumar",score:67,risk:"Medium"},{name:"Meena Rao",score:45,risk:"Low"},{name:"Aryan Shah",score:78,risk:"High"}];
  return <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>✦ AI Insights</h2>
      <Tag text="Powered by Claude" color={C.p}/>
    </div>
    <div style={{display:"flex",gap:3,marginBottom:16,borderBottom:`1px solid ${C.b1}`}}>
      {["overview","predictions","recommendations","staffing"].map(t=><button key={t} onClick={()=>setITab(t)} style={{padding:"8px 14px",fontSize:10.5,fontWeight:700,fontFamily:FM,color:iTab===t?C.a:C.t3,borderBottom:`2px solid ${iTab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}
    </div>
    {iTab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {insights.map(i=><div key={i.id} style={{padding:"16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,borderLeft:`4px solid ${i.color}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:20}}>{i.icon}</span><span style={{fontSize:13,fontWeight:700,color:C.t1}}>{i.title}</span></div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.5,marginBottom:10}}>{i.desc}</div>
        <Btn ch={i.action} v="ghost" sm onClick={()=>showT(i.action,"info")}/>
      </div>)}
    </div>}
    {iTab==="predictions"&&<div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Volume Predictions (Next 7 Days)</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:120}}>
          {[42,55,48,67,73,45,38].map((v,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:v*1.5,background:`linear-gradient(to top,${C.a},${C.p})`,borderRadius:"4px 4px 0 0",opacity:0.8}}/><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span></div>)}
        </div>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Churn Risk Customers</div>
        {[{name:"Arjun Mehta",risk:85,reason:"3-day unresolved payment issue"},{name:"Sarah Chen",risk:72,reason:"Repeated API failures"},{name:"NovaTech Ltd",risk:61,reason:"Engagement dropped 45% last 14d"}].map(c=><div key={c.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.b1}22`}}>
          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{c.name}</div><div style={{fontSize:10.5,color:C.t3}}>{c.reason}</div></div>
          <div style={{width:50,height:6,background:C.s3,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:c.risk+"%",background:c.risk>70?C.r:C.y,borderRadius:3}}/></div>
          <span style={{fontSize:10,fontWeight:700,color:c.risk>70?C.r:C.y,fontFamily:FM}}>{c.risk}%</span>
        </div>)}
      </div>
    </div>}
    {iTab==="recommendations"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {[{t:"Create KB article: CSV Export",d:"Would deflect ~18 tickets/week",p:C.a},{t:"Enable AI for WhatsApp FAQ",d:"Can resolve 40% of WA tickets automatically",p:C.g},{t:"Set up proactive SLA alerts",d:"2 breaches could have been prevented with 15-min warnings",p:C.y},{t:"Add canned response: Payment Status",d:"Most common billing question — save 5 min/ticket",p:C.cy}].map((r,i)=><div key={i} style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:10,fontWeight:700,color:"#fff",background:r.p,borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</span>
        <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600}}>{r.t}</div><div style={{fontSize:11,color:C.t3}}>{r.d}</div></div>
        <Btn ch="Apply" v="primary" sm onClick={()=>showT("Applied!","success")}/>
      </div>)}
    </div>}
    {iTab==="staffing"&&<div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Agent Burnout Risk</div>
        {burnout.map(a=><div key={a.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.b1}22`}}>
          <span style={{fontSize:12,fontWeight:600,width:110}}>{a.name}</span>
          <div style={{flex:1,height:8,background:C.s3,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:a.score+"%",background:a.score>70?C.r:a.score>50?C.y:C.g,borderRadius:4,transition:"width .5s"}}/></div>
          <Tag text={a.risk} color={a.risk==="High"?C.r:a.risk==="Medium"?C.y:C.g}/>
        </div>)}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Optimal Staffing</div>
        {[{t:"Mon 9-11 AM",current:2,optimal:3,gap:"+1"},{t:"Wed 2-5 PM",current:3,optimal:3,gap:"OK"},{t:"Fri 4-6 PM",current:1,optimal:2,gap:"+1"},{t:"Sat all day",current:1,optimal:2,gap:"+1"}].map(s=><div key={s.t} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.b1}22`}}>
          <span style={{fontSize:11,width:100}}>{s.t}</span>
          <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>Current: {s.current}</span>
          <span style={{fontSize:11,color:C.a,fontFamily:FM}}>Optimal: {s.optimal}</span>
          <Tag text={s.gap} color={s.gap==="OK"?C.g:C.y}/>
        </div>)}
      </div>
    </div>}
  </div>;
}


