import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── MONITOR SCREEN ───────────────────────────────────────────────────────
const COUNTRIES=[
  {name:"India",flag:"🇮🇳",lat:20.5937,lng:78.9629},
  {name:"United States",flag:"🇺🇸",lat:37.0902,lng:-95.7129},
  {name:"United Kingdom",flag:"🇬🇧",lat:51.5074,lng:-0.1278},
  {name:"Germany",flag:"🇩🇪",lat:51.1657,lng:10.4515},
  {name:"Japan",flag:"🇯🇵",lat:36.2048,lng:138.2529},
  {name:"Brazil",flag:"🇧🇷",lat:-14.235,lng:-51.9253},
  {name:"Australia",flag:"🇦🇺",lat:-25.2744,lng:133.7751},
  {name:"France",flag:"🇫🇷",lat:46.2276,lng:2.2137},
  {name:"Canada",flag:"🇨🇦",lat:56.1304,lng:-106.3468},
  {name:"Singapore",flag:"🇸🇬",lat:1.3521,lng:103.8198},
  {name:"UAE",flag:"🇦🇪",lat:23.4241,lng:53.8478},
  {name:"Netherlands",flag:"🇳🇱",lat:52.1326,lng:5.2913},
];
const PAGES=["/","/pricing","/docs","/blog","/features","/contact","/login","/dashboard","/support","/api"];
const BROWSERS=["Chrome 122","Firefox 123","Safari 17","Edge 122","Opera 108"];
const OSS=["Windows 11","macOS 14","Ubuntu 22.04","iOS 17","Android 14"];
const DEVICES=["Desktop","Desktop","Desktop","Mobile","Tablet"];
const SOURCES=["Direct","Google","Twitter","LinkedIn","Facebook","Instagram","Email campaign","Product Hunt"];
const CHAT_STATUSES=["browsing","browsing","browsing","browsing","chatting","invited"];

function randItem(arr){return arr[Math.floor(Math.random()*arr.length)];}
function makeVisitor(id){
  const c=randItem(COUNTRIES);
  return {id:"v"+id,name:Math.random()>.4?null:randItem(["Arjun M.","Sarah C.","Marcus W.","Priya S.","Dev K.","Nadia P.","Takeshi Y.","Emma R.","Luca B.","Anna K."]),
    country:c.name,flag:c.flag,lat:c.lat+(Math.random()-.5)*8,lng:c.lng+(Math.random()-.5)*8,
    page:randItem(PAGES),prevPages:Math.floor(Math.random()*6)+1,
    timeOnSite:Math.floor(Math.random()*900)+10,
    browser:randItem(BROWSERS),os:randItem(OSS),device:randItem(DEVICES),
    source:randItem(SOURCES),chatStatus:randItem(CHAT_STATUSES),
    ip:"192.168."+Math.floor(Math.random()*255)+"."+Math.floor(Math.random()*255),
    color:["#4c82fb","#1fd07a","#9b6dff","#f5a623","#22d4e8","#e91e63","#ff6b35"][id%7],
    joined:Date.now()-Math.floor(Math.random()*900000),typing:false,scroll:Math.floor(Math.random()*60)};
}
function fmtTime(s){if(s<60)return s+"s";if(s<3600)return Math.floor(s/60)+"m "+((s%60))+"s";return Math.floor(s/3600)+"h "+Math.floor((s%3600)/60)+"m";}

export default function MonitorScr({contacts,inboxes,setConvs,setMsgs,setScr,setAid}){
  const [visitors,setVisitors]=useState(()=>Array.from({length:18},(_,i)=>makeVisitor(i+1)));
  const [sel,setSel]=useState(null);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [showInvite,setShowInvite]=useState(null);
  const [invMsg,setInvMsg]=useState("Hi there! I noticed you\'ve been on our pricing page. Can I help you with anything?");
  const [tab,setTab]=useState("list");
  const [tick,setTick]=useState(0);
  const [mapSel,setMapSel]=useState(null);
  // AI Visitor Intent
  const [monAi,setMonAi]=useState(null);const [monAiLoad,setMonAiLoad]=useState(false);
  const genMonAi=async()=>{setMonAiLoad(true);try{const vis=visitors.slice(0,5).map(v=>v.name+" on "+v.page+" ("+v.duration+")").join(", ");const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,system:"You are a visitor intent AI. Predict visitor intent: likely buyer, support seeker, competitor, browsing. 4-5 insights with names. No markdown.",messages:[{role:"user",content:visitors.length+" visitors. "+vis}]})});const d=await r.json();setMonAi(d.content?.[0]?.text);}catch{setMonAi("🔥 Visitor on /pricing for 6min — likely buyer, trigger proactive chat\n🎯 Enterprise page + security docs — high-value prospect, show compliance\n🔍 Competitor IP on /features — competitive research, don't engage\n💬 Developer on /docs/api 12min — evaluating, suggest sandbox demo\n📊 3 visitors from India on pricing → WhatsApp campaign converts 15% here");}setMonAiLoad(false);};

  // Simulate live updates
  useEffect(()=>{
    const t=setInterval(()=>{
      setTick(p=>p+1);
      setVisitors(prev=>{
        let v=[...prev];
        // Update times
        v=v.map(vis=>({...vis,timeOnSite:vis.timeOnSite+3}));
        // Random: visitor leaves
        if(v.length>8&&Math.random()>.7)v=v.filter((_,i)=>i!==Math.floor(Math.random()*v.length));
        // Random: new visitor joins
        if(v.length<28&&Math.random()>.6)v=[...v,makeVisitor(Date.now())];
        // Random: page changes
        if(Math.random()>.8){
          const idx=Math.floor(Math.random()*v.length);
          v[idx]={...v[idx],page:randItem(PAGES),prevPages:v[idx].prevPages+1};
        }
        // Random: status change
        if(Math.random()>.9){
          const idx=Math.floor(Math.random()*v.length);
          v[idx]={...v[idx],chatStatus:randItem(["browsing","chatting"])};
        }
        // Random: typing indicator
        if(Math.random()>.85){
          const idx=Math.floor(Math.random()*v.length);
          if(v[idx].chatStatus==="chatting")v[idx]={...v[idx],typing:true};
        }
        // Clear typing after a tick
        v=v.map(vis=>vis.typing&&Math.random()>.5?{...vis,typing:false}:vis);
        // Random: scroll depth
        v=v.map(vis=>({...vis,scroll:Math.min(100,vis.scroll+(Math.random()>.6?Math.round(Math.random()*15):0))}));
        return v;
      });
    },3000);
    return()=>clearInterval(t);
  },[]);

  const filtered=visitors.filter(vis=>{
    if(filter==="chatting")return vis.chatStatus==="chatting";
    if(filter==="invited")return vis.chatStatus==="invited";
    if(search)return (vis.name||"").toLowerCase().includes(search.toLowerCase())||vis.country.toLowerCase().includes(search.toLowerCase())||vis.page.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const startChat=vis=>{
    const id="cv"+uid();
    setConvs(p=>[{id,cid:"ct1",iid:"ib1",ch:"live",status:"open",priority:"normal",subject:"Live chat from "+vis.country,agent:"a1",team:null,labels:[],unread:0,time:"now",color:vis.color},...p]);
    setMsgs(p=>({...p,[id]:[{id:uid(),role:"contact",text:"Hi, I need help with "+vis.page,t:now()},{id:uid(),role:"sys",text:"Visitor from "+vis.flag+" "+vis.country+" · "+vis.browser+" · "+vis.device}]}));
    setVisitors(p=>p.map(v=>v.id===vis.id?{...v,chatStatus:"chatting"}:v));
    setShowInvite(null);setScr("inbox");setAid(id);
    showT("Chat started with visitor from "+vis.country,"success");
  };

  const sendInvite=vis=>{
    setVisitors(p=>p.map(v=>v.id===vis.id?{...v,chatStatus:"invited"}:v));
    setShowInvite(null);showT("Invitation sent to visitor from "+vis.country,"success");
  };

  // Country breakdown
  const ctrMap={};visitors.forEach(v=>{ctrMap[v.country]=(ctrMap[v.country]||0)+1;});
  const topCountries=Object.entries(ctrMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const pageMap={};visitors.forEach(v=>{pageMap[v.page]=(pageMap[v.page]||0)+1;});
  const topPages=Object.entries(pageMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const chatting=visitors.filter(v=>v.chatStatus==="chatting").length;
  const invited=visitors.filter(v=>v.chatStatus==="invited").length;

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:C.bg}}>
    {/* Header */}
    <div style={{padding:"14px 24px",borderBottom:"1px solid "+C.b1,background:C.s1,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:2}}>
          <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Live Visitor Monitoring</h2>
          <span style={{display:"flex",alignItems:"center",gap:5,background:C.gd,border:"1px solid "+C.g+"44",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,fontFamily:FM,color:C.g}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.g,animation:"pulse 1.5s infinite"}}/>LIVE
          </span>
        </div>
        <div style={{fontSize:11.5,color:C.t3}}>Real-time visitors on your website right now</div>
      </div>
      <div style={{display:"flex",gap:10,marginLeft:"auto",flexWrap:"wrap"}}>
        {[{l:"Online Now",v:visitors.length,c:C.g},{l:"Chatting",v:chatting,c:C.a},{l:"Invited",v:invited,c:C.y},{l:"Avg Time",v:fmtTime(Math.round(visitors.reduce((s,v)=>s+v.timeOnSite,0)/Math.max(visitors.length,1))),c:C.p}].map(stat=>(
          <div key={stat.l} style={{background:C.s2,border:"1px solid "+C.b1,borderRadius:10,padding:"8px 14px",textAlign:"center",minWidth:80}}>
            <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:stat.c}}>{stat.v}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:1}}>{stat.l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:0,padding:"0 24px",borderBottom:"1px solid "+C.b1,background:C.s1}}>
      {[["list","Visitor List"],["map","World Map"],["analytics","Analytics"]].map(([id,lbl])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:"11px 18px",fontSize:11.5,fontWeight:700,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase",color:tab===id?C.a:C.t3,borderBottom:"2px solid "+(tab===id?C.a:"transparent"),background:"transparent",border:"none",cursor:"pointer"}}>{lbl}</button>
      ))}
      <div style={{flex:1}}/>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:"1px solid "+C.b1,borderRadius:7,padding:"5px 10px"}}>
          <span style={{color:C.t3,fontSize:12}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search visitors..." style={{background:"none",border:"none",fontSize:12,color:C.t1,fontFamily:FB,outline:"none",width:150}}/>
        </div>
        {["all","chatting","invited"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 10px",borderRadius:6,fontSize:10.5,fontWeight:700,fontFamily:FM,cursor:"pointer",background:filter===f?C.ad:"transparent",color:filter===f?C.a:C.t3,border:"1px solid "+(filter===f?C.a+"44":C.b1),textTransform:"capitalize"}}>{f}</button>
        ))}
      </div>
    </div>

    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {/* AI Visitor Intelligence */}
      <div style={{padding:"8px 20px 0"}}><AiInsight title="VISITOR INTENT PREDICTION" loading={monAiLoad} onRefresh={genMonAi} compact items={monAi?monAi.split("\n").filter(l=>l.trim()).map(l=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh to predict visitor intent: likely buyers, support seekers, and proactive chat triggers."}]}/></div>
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>

      {/* VISITOR LIST TAB */}
      {tab==="list"&&<div style={{flex:1,display:"flex",minWidth:0}}>
        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1.8fr 1.4fr 1fr 1fr 0.9fr 100px",padding:"8px 20px",borderBottom:"1px solid "+C.b1,position:"sticky",top:0,background:C.s1,zIndex:5}}>
            {["Visitor","Current Page","Location","Device","Time on Site","Status","Actions"].map((h,i)=>(
              <span key={i} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>{h}</span>
            ))}
          </div>
          {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:C.t3,fontSize:13}}>No visitors match your filter</div>}
          {filtered.map(vis=>(
            <div key={vis.id} className="hov" onClick={()=>setSel(sel?.id===vis.id?null:vis)}
              style={{display:"grid",gridTemplateColumns:"2fr 1.8fr 1.4fr 1fr 1fr 0.9fr 100px",padding:"10px 20px",borderBottom:"1px solid "+C.b1,cursor:"pointer",background:sel?.id===vis.id?C.ad:"transparent",transition:"background .12s",borderLeft:"2.5px solid "+(sel?.id===vis.id?C.a:"transparent"),animation:"fadeUp .2s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:vis.color+"22",border:"2px solid "+vis.color+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontFamily:FM,color:vis.color,fontWeight:700,flexShrink:0}}>
                  {vis.name?vis.name.split(" ").map(n=>n[0]).join(""):vis.id.slice(-2).toUpperCase()}
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.name||<span style={{color:C.t3,fontStyle:"italic"}}>Anonymous</span>}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:1}}>{vis.source}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
                <div style={{fontSize:12,color:C.a,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.page}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:1}}>{vis.prevPages} page{vis.prevPages!==1?"s":""} visited</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:16}}>{vis.flag}</span>
                <div>
                  <div style={{fontSize:12,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{vis.country}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{vis.ip}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontSize:12,color:C.t2}}>{vis.device}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.browser}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:FM}}>{fmtTime(vis.timeOnSite)}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:1}}>{vis.os}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                {vis.chatStatus==="chatting"?<Tag text={vis.typing?"Typing…":"Chatting"} color={vis.typing?C.p:C.g}/>:vis.chatStatus==="invited"?<Tag text="Invited" color={C.y}/>:<Tag text="Browsing" color={C.t3}/>}
                {vis.typing&&<span style={{display:"flex",gap:2}}>{[0,1,2].map(d=><span key={d} style={{width:4,height:4,borderRadius:"50%",background:C.p,animation:`pulse 1s ${d*0.2}s infinite`}}/>)}</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}} onClick={e=>e.stopPropagation()}>
                {vis.chatStatus!=="chatting"&&<button onClick={()=>setShowInvite(vis)} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:C.ad,color:C.a,border:"1px solid "+C.a+"44",cursor:"pointer",whiteSpace:"nowrap"}}>Invite</button>}
                {vis.chatStatus==="chatting"&&<button onClick={()=>startChat(vis)} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:C.gd,color:C.g,border:"1px solid "+C.g+"44",cursor:"pointer"}}>Join</button>}
                <button onClick={()=>startChat(vis)} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:C.s3,color:C.t2,border:"1px solid "+C.b1,cursor:"pointer"}}>Chat</button>
              </div>
            </div>
          ))}
        </div>

        {/* Visitor Detail Panel */}
        {sel&&<aside style={{width:300,background:C.s1,borderLeft:"1px solid "+C.b1,overflowY:"auto",animation:"fadeUp .2s ease",flexShrink:0}}>
          <div style={{padding:"16px 18px",borderBottom:"1px solid "+C.b1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Visitor Details</span>
              <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18}}>×</button>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14,padding:"12px",background:C.s2,borderRadius:10,border:"1px solid "+sel.color+"33"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:sel.color+"22",border:"2px solid "+sel.color+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontFamily:FM,color:sel.color,fontWeight:700,flexShrink:0}}>
                {sel.name?sel.name.split(" ").map(n=>n[0]).join(""):sel.id.slice(-2).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{sel.name||"Anonymous Visitor"}</div>
                <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>ID: {sel.id}</div>
                <div style={{marginTop:5}}><Tag text={sel.chatStatus} color={sel.chatStatus==="chatting"?C.g:sel.chatStatus==="invited"?C.y:C.t3}/></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>setShowInvite(sel)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:FM,background:C.pd,color:C.p,border:"1px solid "+C.p+"44",cursor:"pointer"}}>✉ Invite</button>
              <button onClick={()=>startChat(sel)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:FM,background:C.gd,color:C.g,border:"1px solid "+C.g+"44",cursor:"pointer"}}>💬 Start Chat</button>
            </div>
          </div>
          <div style={{padding:"14px 18px"}}>
            {[["Session",null],["Current Page",sel.page],["Pages Visited",String(sel.prevPages)],["Time on Site",fmtTime(sel.timeOnSite)],["Referral Source",sel.source],["",""],["Location",null],["Country",sel.flag+" "+sel.country],["IP Address",sel.ip],["",""],["Device",null],["Browser",sel.browser],["OS",sel.os],["Device Type",sel.device]].map(([l,v],i)=>{
              if(!l&&!v)return <div key={i} style={{height:8}}/>;
              if(!v)return <div key={i} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:6,marginTop:6,paddingBottom:5,borderBottom:"1px solid "+C.b1+"55"}}>{l}</div>;
              return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.b1+"22"}}>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{l}</span>
                <span style={{fontSize:12,color:C.t1}}>{v}</span>
              </div>;
            })}
            <div style={{marginTop:14}}>
              <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:8}}>Page Journey</div>
              {Array.from({length:Math.min(sel.prevPages,5)},(_,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:i===0?C.g:C.t3,flexShrink:0}}/>
                  <span style={{fontSize:11.5,color:i===0?C.a:C.t3,fontFamily:FM}}>{i===0?sel.page:randItem(PAGES)}</span>
                  {i===0&&<Tag text="NOW" color={C.g}/>}
                </div>
              ))}
            </div>
          </div>
        </aside>}
      </div>}

      {/* WORLD MAP TAB */}
      {tab==="map"&&<div style={{flex:1,position:"relative",overflow:"hidden",background:"#07090f"}}>
        <div style={{position:"absolute",top:16,left:16,zIndex:10,display:"flex",gap:8}}>
          <div style={{background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:10,color:"#6b7fa0",fontFamily:FM,letterSpacing:"0.5px",marginBottom:6}}>VISITORS BY COUNTRY</div>
            {topCountries.map(([country,count])=>{
              const vis=visitors.find(v=>v.country===country);
              const pct=Math.round((count/visitors.length)*100);
              return <div key={country} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <span style={{fontSize:14}}>{vis?.flag||"🌍"}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#e8eeff"}}>{country}</span><span style={{fontSize:10,color:"#4c82fb",fontFamily:FM,fontWeight:700}}>{count}</span></div>
                  <div style={{height:4,background:"#151b2e",borderRadius:2,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#4c82fb,#9b6dff)",borderRadius:2}}/></div>
                </div>
              </div>;
            })}
          </div>
          <div style={{background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:10,padding:"10px 14px",height:"fit-content"}}>
            <div style={{fontSize:10,color:"#6b7fa0",fontFamily:FM,letterSpacing:"0.5px",marginBottom:8}}>LIVE</div>
            <div style={{fontSize:36,fontWeight:800,fontFamily:FD,color:"#27c93f",lineHeight:1}}>{visitors.length}</div>
            <div style={{fontSize:10,color:"#6b7fa0",marginTop:4}}>{Object.keys(ctrMap).length} countries</div>
          </div>
        </div>
        {/* Proper SVG World Map — Equirectangular projection */}
        <svg viewBox="0 0 1200 600" style={{width:"100%",height:"100%",display:"block"}} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="mapBg" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#0d1220"/><stop offset="100%" stopColor="#060810"/></radialGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect width="1200" height="600" fill="url(#mapBg)"/>
          {/* Graticule grid */}
          {[-60,-30,0,30,60].map(lat=>{const y2=((90-lat)/180)*600;return <line key={"lat"+lat} x1="0" y1={y2} x2="1200" y2={y2} stroke="#141e35" strokeWidth="0.6"/>;})}
          {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(lng=>{const x2=((lng+180)/360)*1200;return <line key={"lng"+lng} x1={x2} y1="0" x2={x2} y2="600" stroke="#141e35" strokeWidth="0.6"/>;})}
          {/* Equator */}
          <line x1="0" y1="300" x2="1200" y2="300" stroke="#1a2540" strokeWidth="0.8" strokeDasharray="6,6"/>
          {/* ══ PROPER WORLD MAP — Equirectangular projection, simplified Natural Earth ══ */}
          {/* North America */}
          <path d="M40,83L53,117L70,107L90,100L110,100L133,103L150,110L170,120L183,133L187,147L190,160L193,173L200,183L207,190L213,200L220,210L230,223L243,233L257,240L270,247L280,250L290,247L297,237L303,230L310,227L313,237L310,243L317,253L323,260L327,250L320,240L310,233L307,223L310,213L317,210L323,213L327,217L333,220L337,213L333,203L330,197L333,190L340,183L347,177L353,170L360,163L367,157L373,150L383,143L393,140L403,137L413,133L420,137L413,127L407,117L400,107L390,97L380,90L367,83L357,80L350,90L340,97L330,103L323,110L313,107L303,100L293,93L287,83L280,73L267,67L247,63L227,60L207,60L187,60L167,63L147,63L127,63L107,63L87,67L67,73L50,80Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.8"/>
          {/* Greenland */}
          <path d="M340,37L357,33L373,33L387,37L397,43L400,53L397,63L390,70L380,73L370,73L360,70L350,63L343,53L340,43Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.7"/>
          {/* South America */}
          <path d="M323,273L330,270L340,270L353,273L363,270L373,273L383,280L393,287L400,297L407,310L413,323L420,337L430,350L437,363L443,377L443,390L440,403L433,417L427,427L420,437L413,443L403,450L393,453L383,453L373,447L367,440L360,430L353,420L347,407L340,393L337,380L333,367L330,350L327,337L323,323L320,310L317,297L317,287L320,280Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.8"/>
          {/* Europe */}
          <path d="M530,60L540,57L550,60L557,67L563,73L570,77L580,80L590,83L597,87L603,93L607,100L610,107L613,117L617,127L617,137L613,147L607,153L600,160L593,163L587,167L580,170L573,167L567,163L560,160L553,157L547,153L543,147L540,143L537,137L533,130L530,123L527,117L520,110L517,103L513,97L510,90L510,83L513,77L517,73L523,67Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.8"/>
          {/* Iberian Peninsula */}
          <path d="M510,147L517,143L523,143L530,147L537,150L540,157L540,163L537,170L530,173L523,173L517,170L510,167L507,160L507,153Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.6"/>
          {/* Italy */}
          <path d="M547,147L550,153L553,160L557,167L560,173L557,177L553,177L550,173L547,167L543,160L543,153Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.5"/>
          {/* UK + Ireland */}
          <path d="M487,97L493,90L500,90L503,93L503,100L500,107L497,113L493,117L487,117L483,113L480,107L480,100Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.6"/>
          {/* Scandinavia */}
          <path d="M547,47L553,43L560,40L567,40L573,43L577,47L580,53L580,60L577,67L573,73L567,77L560,80L553,77L547,73L543,67L540,60L540,53Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.6"/>
          {/* Africa */}
          <path d="M530,190L540,187L550,183L560,183L570,183L580,187L590,190L600,193L607,200L613,207L620,213L627,223L633,233L637,243L640,257L643,270L643,283L643,297L640,310L637,323L633,337L627,350L620,360L613,370L607,380L597,387L587,393L577,397L567,400L557,397L547,393L540,387L533,377L527,367L523,357L520,343L517,330L517,317L517,303L520,290L523,277L527,263L530,250L530,237L527,223L527,210L527,200Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.8"/>
          {/* Madagascar */}
          <path d="M650,377L653,370L657,367L660,370L663,377L663,387L660,397L657,400L653,397L650,390Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.5"/>
          {/* Middle East */}
          <path d="M620,167L630,163L643,160L657,160L667,163L677,170L683,180L687,190L690,200L690,210L687,220L680,227L673,230L663,233L653,230L643,223L637,217L630,210L623,200L620,190L617,180Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.7"/>
          {/* Russia / Northern Asia */}
          <path d="M620,53L640,47L660,43L683,40L707,37L730,37L753,37L777,40L800,40L823,43L847,43L867,47L887,50L903,53L917,57L927,63L933,70L937,80L933,87L927,93L917,97L903,100L887,100L867,97L847,97L830,93L813,90L797,90L780,87L763,87L747,87L730,87L713,90L697,90L683,93L670,93L657,93L643,93L633,87L627,80L623,73L620,63Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.7"/>
          {/* India */}
          <path d="M727,193L737,190L747,190L757,193L767,200L773,210L777,223L780,237L780,253L777,267L773,277L767,287L757,293L747,297L737,293L730,287L723,277L720,267L717,253L717,240L720,227L723,213L723,203Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.7"/>
          {/* China + East Asia */}
          <path d="M767,90L783,87L800,83L820,83L840,87L857,90L873,97L887,107L897,117L903,130L907,143L907,157L903,170L897,180L887,187L873,193L857,197L843,197L827,193L813,190L800,183L790,177L780,167L773,157L767,143L763,130L760,117L760,103Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.8"/>
          {/* Korean Peninsula */}
          <path d="M920,130L923,137L927,143L930,150L930,160L927,167L923,170L917,167L913,160L913,150L913,143L917,137Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.5"/>
          {/* Japan */}
          <path d="M940,120L947,117L953,117L957,120L960,127L960,137L957,147L953,157L950,163L943,167L937,163L933,157L933,147L933,137L937,127Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.6"/>
          {/* Southeast Asia */}
          <path d="M817,220L830,217L843,217L857,220L867,227L877,237L883,247L887,260L887,273L883,283L877,290L867,293L853,293L840,290L830,283L823,277L817,267L813,253L813,240L813,230Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.7"/>
          {/* Malay Peninsula */}
          <path d="M867,260L870,267L873,277L877,287L880,297L880,307L877,313L873,310L870,303L867,293L867,280Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.5"/>
          {/* Indonesia — Sumatra+Java+Borneo */}
          <path d="M887,307L897,303L907,303L917,307L927,303L937,303L947,307L957,310L960,317L957,323L947,327L937,327L927,323L917,323L907,327L897,327L887,323L883,317Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.6"/>
          {/* Philippines */}
          <path d="M920,237L927,233L933,237L933,247L930,257L927,263L920,260L917,250L917,243Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.4"/>
          {/* Papua New Guinea */}
          <path d="M977,310L987,307L997,307L1007,310L1013,317L1013,323L1007,327L997,327L987,323L980,317Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.5"/>
          {/* Australia */}
          <path d="M947,360L963,353L980,350L1000,350L1017,353L1033,360L1043,370L1050,380L1053,393L1053,407L1050,417L1043,427L1033,433L1020,437L1007,440L993,440L980,437L967,430L957,420L950,410L947,397L943,383L943,370Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.8"/>
          {/* Tasmania */}
          <path d="M1040,443L1047,440L1053,443L1053,450L1050,457L1043,457L1040,450Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.4"/>
          {/* New Zealand */}
          <path d="M1100,410L1103,403L1107,400L1110,403L1113,410L1113,420L1110,430L1107,437L1103,440L1100,433L1097,423Z" fill="#141e35" stroke="#1e2d50" strokeWidth="0.5"/>
          {/* Connection lines between active chatters */}
          {visitors.filter(v=>v.chatStatus==="chatting").map((vis,i,arr)=>{
            if(i===0)return null;const prev=arr[i-1];
            const x1=((prev.lng+180)/360)*1200,y1=((90-prev.lat)/180)*600;
            const x2=((vis.lng+180)/360)*1200,y2=((90-vis.lat)/180)*600;
            return <line key={"conn"+i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4c82fb" strokeWidth="0.5" opacity="0.15" strokeDasharray="4,6"/>;
          })}
          {/* Visitor dots with glow */}
          {visitors.map(vis=>{
            const x=((vis.lng+180)/360)*1200;
            const y=((90-vis.lat)/180)*600;
            const isChatting=vis.chatStatus==="chatting";
            return <g key={vis.id} style={{cursor:"pointer"}} onClick={()=>setMapSel(mapSel?.id===vis.id?null:vis)}>
              {/* Outer glow */}
              <circle cx={x} cy={y} r={isChatting?14:8} fill={vis.color} opacity="0.08"/>
              <circle cx={x} cy={y} r={isChatting?10:6} fill={vis.color} opacity="0.15" style={{animation:"pulse 2.5s infinite"}}/>
              {/* Core dot */}
              <circle cx={x} cy={y} r={isChatting?5:3.5} fill={vis.color} opacity="0.95"/>
              {/* Ring for chatting */}
              {isChatting&&<circle cx={x} cy={y} r={8} fill="none" stroke={vis.color} strokeWidth="1.2" opacity="0.5" style={{animation:"pulse 1.5s infinite"}}/>}
              {/* Tiny label */}
              {isChatting&&<text x={x} y={y-12} textAnchor="middle" fill={vis.color} fontSize="8" fontWeight="700" fontFamily="monospace" opacity="0.8">{vis.name?.split(" ")[0]||"Chat"}</text>}
            </g>;
          })}
          {/* Selected visitor tooltip */}
          {mapSel&&(()=>{
            const x=Math.min(Math.max(((mapSel.lng+180)/360)*1200,130),1070);
            const y=Math.min(Math.max(((90-mapSel.lat)/180)*600,90),510);
            const w=220,h=82;
            return <g style={{animation:"fadeUp .15s ease"}}>
              {/* Shadow */}
              <rect x={x-w/2+2} y={y-h-6} width={w} height={h} rx="10" fill="#000" opacity="0.4"/>
              {/* Card */}
              <rect x={x-w/2} y={y-h-8} width={w} height={h} rx="10" fill="#111827" stroke={mapSel.color} strokeWidth="1.5"/>
              {/* Color bar */}
              <rect x={x-w/2} y={y-h-8} width={w} height="4" rx="10" fill={mapSel.color}/>
              {/* Content */}
              <text x={x} y={y-h+16} textAnchor="middle" fill="#f1f5f9" fontSize="13" fontWeight="700">{mapSel.flag} {mapSel.name||"Anonymous"}</text>
              <text x={x} y={y-h+32} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">{mapSel.page}</text>
              <text x={x} y={y-h+48} textAnchor="middle" fill="#64748b" fontSize="10">{mapSel.country} · {mapSel.device} · {fmtTime(mapSel.timeOnSite)}</text>
              <text x={x} y={y-h+64} textAnchor="middle" fill={mapSel.chatStatus==="chatting"?"#4c82fb":"#22c55e"} fontSize="10" fontWeight="700">{mapSel.chatStatus==="chatting"?"💬 In Conversation":"👁 Browsing"}</text>
            </g>;
          })()}
        </svg>
        {/* Legend */}
        <div style={{position:"absolute",bottom:16,right:16,display:"flex",gap:8}}>
          {[{c:"#22c55e",l:"Browsing",n:visitors.filter(v=>v.chatStatus!=="chatting").length},{c:"#4c82fb",l:"Active",n:visitors.filter(v=>v.chatStatus==="active").length},{c:"#9b6dff",l:"Chatting",n:chatting}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:8,padding:"5px 12px"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:x.c,boxShadow:`0 0 6px ${x.c}88`}}/>
              <span style={{fontSize:10,color:"#94a3b8",fontFamily:FM}}>{x.l}</span>
              <span style={{fontSize:10,color:x.c,fontWeight:700,fontFamily:FM}}>{x.n}</span>
            </div>
          ))}
        </div>
        {/* Time indicator */}
        <div style={{position:"absolute",bottom:16,left:16,background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:8,padding:"5px 12px",display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#f04f5a",animation:"pulse 1s infinite"}}/>
          <span style={{fontSize:10,color:"#94a3b8",fontFamily:FM}}>LIVE</span>
          <span style={{fontSize:10,color:"#64748b",fontFamily:FM}}>Updated {tick}s ago</span>
        </div>
      </div>}

      {/* ANALYTICS TAB */}
      {tab==="analytics"&&<div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[{l:"Online Now",v:visitors.length,c:C.g,delta:"+3 last min"},{l:"Chatting",v:chatting,c:C.a,delta:chatting+" active chats"},{l:"Avg Session",v:fmtTime(Math.round(visitors.reduce((s,v)=>s+v.timeOnSite,0)/Math.max(visitors.length,1))),c:C.p,delta:"on site"},{l:"Bounce Risk",v:visitors.filter(v=>v.timeOnSite<30).length,c:C.r,delta:"< 30s on site"}].map(s=>(
            <div key={s.l} style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"16px"}}>
              <div style={{fontSize:11,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase",marginBottom:8}}>{s.l}</div>
              <div style={{fontSize:26,fontWeight:800,fontFamily:FD,color:s.c,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:C.t3}}>{s.delta}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Top Pages Right Now</div>
            {topPages.map(([page,cnt])=>(
              <div key={page} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:11.5,color:C.a,fontFamily:FM,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{page}</span>
                <div style={{width:100,height:7,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:(cnt/visitors.length*100)+"%",height:"100%",background:C.a,borderRadius:3}}/></div>
                <span style={{fontSize:11,color:C.t2,fontFamily:FM,width:24,textAlign:"right"}}>{cnt}</span>
              </div>
            ))}
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Traffic Sources</div>
            {Object.entries(visitors.reduce((m,v)=>{m[v.source]=(m[v.source]||0)+1;return m;},{})).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([src,cnt])=>(
              <div key={src} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <span style={{fontSize:12,color:C.t2,flex:1}}>{src}</span>
                <div style={{width:80,height:7,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:(cnt/visitors.length*100)+"%",height:"100%",background:C.p,borderRadius:3}}/></div>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:20,textAlign:"right"}}>{cnt}</span>
              </div>
            ))}
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Devices</div>
            {["Desktop","Mobile","Tablet"].map(d=>{const cnt=visitors.filter(v=>v.device===d).length;return(
              <div key={d} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:16}}>{d==="Desktop"?"🖥️":d==="Mobile"?"📱":"📟"}</span>
                <span style={{fontSize:12,color:C.t2,flex:1}}>{d}</span>
                <div style={{width:80,height:7,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:(cnt/Math.max(visitors.length,1)*100)+"%",height:"100%",background:C.cy,borderRadius:3}}/></div>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:24,textAlign:"right"}}>{cnt}</span>
              </div>
            );})}
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Session Duration</div>
            {[["< 30s","Bouncing",C.r],["30s–2m","New",C.y],["2–10m","Engaged",C.a],["> 10m","Loyal",C.g]].map(([range,label,c])=>{
              const cnt=visitors.filter(v=>range==="< 30s"?v.timeOnSite<30:range==="30s–2m"?v.timeOnSite>=30&&v.timeOnSite<120:range==="2–10m"?v.timeOnSite>=120&&v.timeOnSite<600:v.timeOnSite>=600).length;
              return <div key={range} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <div style={{minWidth:16,height:16,borderRadius:4,background:c+"33",border:"1px solid "+c+"55"}}/>
                <span style={{fontSize:12,color:C.t2,flex:1}}>{range} <span style={{color:C.t3}}>({label})</span></span>
                <span style={{fontSize:13,fontWeight:700,color:c,fontFamily:FM}}>{cnt}</span>
              </div>;
            })}
          </div>
        </div>
      </div>}
    </div>

    {/* Invite Modal */}
    {showInvite&&<div onClick={()=>setShowInvite(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.s2,border:"1px solid "+C.b1,borderRadius:16,width:460,padding:"22px",animation:"fadeUp .2s ease",boxShadow:"0 20px 60px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Invite to Chat</span>
          <button onClick={()=>setShowInvite(null)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:22}}>×</button>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",padding:"11px 14px",background:C.s1,borderRadius:10,border:"1px solid "+showInvite.color+"33",marginBottom:16}}>
          <span style={{fontSize:20}}>{showInvite.flag}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{showInvite.name||"Anonymous Visitor"}</div>
            <div style={{fontSize:11,color:C.t3,fontFamily:FM}}>On {showInvite.page} · {fmtTime(showInvite.timeOnSite)} on site · {showInvite.country}</div>
          </div>
        </div>
        <Fld label="Invitation Message">
          <textarea value={invMsg} onChange={e=>setInvMsg(e.target.value)} rows={3} style={{width:"100%",background:C.bg,border:"1px solid "+C.b1,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none",lineHeight:1.6}}/>
        </Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
          {["Hi! I noticed you\'re on our pricing page. Can I help?","Need help getting started? I\'m here!","Looking for a specific feature? Let me help you find it.","Hi! Any questions about our plans?"].map(tmpl=>(
            <button key={tmpl} onClick={()=>setInvMsg(tmpl)} style={{padding:"7px 10px",borderRadius:7,fontSize:11,color:C.t2,background:C.s1,border:"1px solid "+C.b1,cursor:"pointer",textAlign:"left",lineHeight:1.4,fontFamily:FB}}>{tmpl.slice(0,55)}...</button>
          ))}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={()=>setShowInvite(null)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,color:C.t2,background:"transparent",border:"1px solid "+C.b1,cursor:"pointer",fontFamily:FB}}>Cancel</button>
          <button onClick={()=>sendInvite(showInvite)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,color:"#fff",background:C.a,border:"none",cursor:"pointer",fontFamily:FB}}>Send Invitation</button>
          <button onClick={()=>startChat(showInvite)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,color:C.g,background:C.gd,border:"1px solid "+C.g+"44",cursor:"pointer",fontFamily:FB}}>Start Chat Now</button>
        </div>
      </div>
    </div>}
    </div>
  </div>;
}



