import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── AGENT GAMIFICATION ───────────────────────────────────────────────────
export default function GamificationScr({agents}){
  const [gTab,setGTab]=useState("leaderboard");
  const agData=agents.map((a,i)=>({...a,xp:Math.round(2400-i*580),level:Math.round(12-i*2.5),resolved:Math.round(142-i*32),streak:Math.round(14-i*3),badges:[..."🏆⚡🎯🔥💎".slice(0,5-i)]}));
  const badges=[{id:"b1",icon:"🏆",name:"First 100",desc:"Resolve 100 tickets",earned:true},{id:"b2",icon:"⚡",name:"Speed Demon",desc:"Under 2 min avg reply",earned:true},{id:"b3",icon:"🎯",name:"Bullseye",desc:"10 perfect CSAT scores",earned:true},{id:"b4",icon:"🔥",name:"On Fire",desc:"7-day resolve streak",earned:true},{id:"b5",icon:"💎",name:"Diamond Agent",desc:"Top performer 3 months",earned:false},{id:"b6",icon:"🌟",name:"Customer Hero",desc:"50 five-star ratings",earned:false},{id:"b7",icon:"🤖",name:"AI Master",desc:"Use AI 100 times",earned:false},{id:"b8",icon:"📚",name:"Knowledge Guru",desc:"Write 10 KB articles",earned:false}];
  const challenges=[{id:"c1",title:"Resolution Marathon",desc:"Resolve 20 tickets today",progress:14,goal:20,reward:"500 XP",color:C.a},{id:"c2",title:"CSAT Champion",desc:"Get 10 five-star ratings this week",progress:7,goal:10,reward:"300 XP",color:C.g},{id:"c3",title:"Speed Run",desc:"Avg reply under 3 min for 24h",progress:18,goal:24,reward:"200 XP",color:C.y}];
  return <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Agent Performance</h2>
      <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:12,color:C.p,fontWeight:700}}>Level {agData[0]?.level}</span><span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{agData[0]?.xp} XP</span></div>
    </div>
    <div style={{display:"flex",gap:3,marginBottom:16,borderBottom:`1px solid ${C.b1}`}}>
      {["leaderboard","badges","challenges"].map(t=><button key={t} onClick={()=>setGTab(t)} style={{padding:"8px 14px",fontSize:10.5,fontWeight:700,fontFamily:FM,color:gTab===t?C.a:C.t3,borderBottom:`2px solid ${gTab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}
    </div>
    {gTab==="leaderboard"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
      {agData.map((a,i)=><div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.b1}22`,background:i===0?C.yd+"44":"transparent"}}>
        <span style={{fontSize:18,fontWeight:800,width:28,textAlign:"center",color:i===0?C.y:i===1?"#aaa":i===2?"#cd7f32":C.t3}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
        <Av i={a.av} c={a.color} s={36} dot={a.status==="online"}/>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{a.name}</div><div style={{fontSize:10.5,color:C.t3,fontFamily:FM}}>Level {a.level} · {a.xp} XP · {a.resolved} resolved</div></div>
        <div style={{display:"flex",gap:1}}>{a.badges.split("").map((b,j)=><span key={j} title="Badge" style={{fontSize:14}}>{b}</span>)}</div>
        <span style={{fontSize:10,color:C.g,fontFamily:FM,fontWeight:700}}>{a.streak}d streak</span>
      </div>)}
    </div>}
    {gTab==="badges"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
      {badges.map(b=><div key={b.id} style={{padding:"16px",background:C.s1,border:`1px solid ${b.earned?C.g+"44":C.b1}`,borderRadius:12,textAlign:"center",opacity:b.earned?1:0.5}}>
        <div style={{fontSize:32,marginBottom:6}}>{b.icon}</div>
        <div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{b.name}</div>
        <div style={{fontSize:10,color:C.t3}}>{b.desc}</div>
        {b.earned&&<Tag text="Earned" color={C.g}/>}
      </div>)}
    </div>}
    {gTab==="challenges"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {challenges.map(c=><div key={c.id} style={{padding:"16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:700}}>{c.title}</span><Tag text={c.reward} color={c.color}/></div>
        <div style={{fontSize:11.5,color:C.t3,marginBottom:8}}>{c.desc}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,height:8,background:C.s3,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:Math.round(c.progress/c.goal*100)+"%",background:c.color,borderRadius:4,transition:"width .5s"}}/></div>
          <span style={{fontSize:10,fontFamily:FM,color:c.color,fontWeight:700}}>{c.progress}/{c.goal}</span>
        </div>
      </div>)}
    </div>}
  </div>;
}


