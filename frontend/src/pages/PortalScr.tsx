import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

export default function PortalScr(){
  const [pView,setPView]=useState("customer");const [pTab,setPTab]=useState("tickets");const [selTicket,setSelTicket]=useState(null);
  const [showNew,setShowNew]=useState(false);const [nSubj,setNSubj]=useState("");const [nCat,setNCat]=useState("technical");const [nDesc,setNDesc]=useState("");const [nFile,setNFile]=useState(null);
  const [kbSearch,setKbSearch]=useState("");const [selCat,setSelCat]=useState(null);const [selArt,setSelArt]=useState(null);
  const [tickets,setTickets]=useState([
    {id:"T-001",subject:"Payment gateway not processing",status:"open",priority:"high",created:"2d ago",updated:"1h ago",replies:3,category:"Billing",messages:[{from:"customer",text:"Our payment gateway stopped working since morning. Error PG-5012.",time:"2d ago"},{from:"agent",name:"Priya",text:"Hi! I can see the error. Let me check the Stripe integration status.",time:"1d ago"},{from:"customer",text:"Any update? Customers can't checkout.",time:"12h ago"},{from:"agent",name:"Priya",text:"Fixed! The webhook endpoint was returning 502. Service restarted.",time:"1h ago"}]},
    {id:"T-002",subject:"Can't export CSV from reports",status:"in_progress",priority:"normal",created:"5d ago",updated:"3d ago",replies:2,category:"Technical",messages:[{from:"customer",text:"CSV export button doesn't work on the Reports page.",time:"5d ago"},{from:"agent",name:"Dev",text:"We've identified the issue. Fix deploying tomorrow.",time:"3d ago"}]},
    {id:"T-003",subject:"Feature request: Dark mode API",status:"resolved",priority:"low",created:"1w ago",updated:"4d ago",replies:4,category:"Feature Request",messages:[{from:"customer",text:"Would love dark mode support in the API dashboard.",time:"1w ago"},{from:"agent",name:"Dev",text:"Great suggestion! Added to roadmap for Q2.",time:"5d ago"}]},
    {id:"T-004",subject:"WhatsApp template approval help",status:"waiting",priority:"normal",created:"3d ago",updated:"2d ago",replies:1,category:"Onboarding",messages:[{from:"customer",text:"Need help getting our WA templates approved by Meta.",time:"3d ago"},{from:"agent",name:"Meena",text:"I've submitted the templates. Usually takes 24-48h for Meta review. I'll follow up.",time:"2d ago"}]}
  ]);
  const KB_CATS=[{id:"kc1",name:"Getting Started",icon:"🚀",count:6},{id:"kc2",name:"Channels",icon:"📡",count:4},{id:"kc3",name:"AI & Automation",icon:"🤖",count:3},{id:"kc4",name:"Billing",icon:"💳",count:2},{id:"kc5",name:"API & Developers",icon:"⚡",count:5},{id:"kc6",name:"Troubleshooting",icon:"🔧",count:4}];
  const KB_ARTS=[{id:"a1",cat:"kc1",title:"Quick Start Guide",views:2840,helpful:94},{id:"a2",cat:"kc1",title:"Setting Up Live Chat",views:1890,helpful:88},{id:"a3",cat:"kc2",title:"Connecting WhatsApp Business",views:3120,helpful:95},{id:"a4",cat:"kc3",title:"Configuring AI Auto-Reply",views:1560,helpful:82},{id:"a5",cat:"kc5",title:"REST API Quick Start",views:4230,helpful:90},{id:"a6",cat:"kc6",title:"Troubleshooting Login Issues",views:980,helpful:76}];
  const stColor=s=>s==="open"?C.a:s==="in_progress"?C.p:s==="waiting"?C.y:s==="resolved"?C.g:C.t3;
  const submitTicket=()=>{if(!nSubj.trim())return showT("Subject required","error");setTickets(p=>[{id:"T-"+String(p.length+1).padStart(3,"0"),subject:nSubj,status:"open",priority:"normal",created:"Just now",updated:"Just now",replies:0,category:nCat,messages:[{from:"customer",text:nDesc||nSubj,time:"Just now"}]},...p]);setShowNew(false);setNSubj("");setNDesc("");showT("Ticket submitted!","success");};
  return <div style={{flex:1,overflowY:"auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 24px",borderBottom:`1px solid ${C.b1}`}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Customer Portal</h2>
      <div style={{display:"flex",gap:4,background:C.s2,borderRadius:6,padding:2,border:`1px solid ${C.b1}`}}>
        {["customer","admin"].map(v=><button key={v} onClick={()=>setPView(v)} style={{padding:"4px 12px",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:FM,background:pView===v?C.ad:"transparent",color:pView===v?C.a:C.t3,border:"none",cursor:"pointer"}}>{v==="customer"?"Customer View":"Admin Config"}</button>)}
      </div>
    </div>
    {pView==="customer"?<div style={{maxWidth:740,margin:"20px auto",padding:"0 20px"}}>
      {/* Hero search */}
      <div style={{background:`linear-gradient(135deg,${C.a},#6366f1)`,borderRadius:16,padding:"28px 24px",marginBottom:20,color:"#fff"}}>
        <div style={{fontSize:22,fontWeight:800,fontFamily:FD,marginBottom:4}}>How can we help?</div>
        <div style={{fontSize:13,opacity:.8,marginBottom:14}}>Search our help center or submit a ticket</div>
        <div style={{display:"flex",gap:8,background:"rgba(255,255,255,.15)",borderRadius:10,padding:"10px 14px"}}><span>🔍</span><input value={kbSearch} onChange={e=>setKbSearch(e.target.value)} placeholder="Search help articles, FAQs, guides…" style={{flex:1,background:"none",border:"none",color:"#fff",fontSize:14,outline:"none"}}/>
        {kbSearch&&<span onClick={()=>setKbSearch("")} style={{cursor:"pointer",opacity:.7}}>×</span>}</div>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",gap:3,marginBottom:16,borderBottom:`1px solid ${C.b1}`}}>
        {[["tickets","🎫 My Tickets ("+tickets.length+")"],["kb","📚 Help Center"],["chat","💬 Live Chat"],["status","📊 Status"]].map(([t,l])=><button key={t} onClick={()=>{setPTab(t);setSelTicket(null);setSelCat(null);setSelArt(null);}} style={{padding:"10px 16px",fontSize:12,fontWeight:700,fontFamily:FM,color:pTab===t?C.a:C.t3,borderBottom:`2px solid ${pTab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>)}
      </div>
      {/* TICKETS TAB */}
      {pTab==="tickets"&&!selTicket&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{display:"flex",gap:6}}>
            {["all","open","in_progress","waiting","resolved"].map(s=><button key={s} onClick={()=>{}} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:600,fontFamily:FM,background:s==="all"?C.ad:C.s2,color:s==="all"?C.a:C.t3,border:`1px solid ${s==="all"?C.a+"44":C.b1}`,cursor:"pointer",textTransform:"capitalize"}}>{s==="all"?"All":s.replace("_"," ")}</button>)}
          </div>
          <Btn ch="+ New Ticket" v="primary" sm onClick={()=>setShowNew(true)}/>
        </div>
        {tickets.map(t=><div key={t.id} onClick={()=>setSelTicket(t)} className="hov" style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,marginBottom:8,cursor:"pointer",transition:"all .15s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontWeight:700,color:C.t3,fontFamily:FM}}>{t.id}</span><span style={{fontSize:14,fontWeight:600}}>{t.subject}</span></div>
            <Tag text={t.status.replace("_"," ")} color={stColor(t.status)}/>
          </div>
          <div style={{display:"flex",gap:12,fontSize:11,color:C.t3,fontFamily:FM}}>
            <span>📁 {t.category}</span><span>💬 {t.replies} replies</span><span>🕐 Updated {t.updated}</span>
          </div>
          {/* Progress tracker */}
          <div style={{display:"flex",gap:2,marginTop:8}}>
            {["open","in_progress","waiting","resolved"].map((s,i)=>{const active=["open","in_progress","waiting","resolved"].indexOf(t.status)>=i;return <div key={s} style={{flex:1,height:3,borderRadius:2,background:active?stColor(t.status):C.bg}}/>;})}
          </div>
        </div>)}
      </div>}
      {/* TICKET DETAIL */}
      {pTab==="tickets"&&selTicket&&<div>
        <button onClick={()=>setSelTicket(null)} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.a,background:"none",border:"none",cursor:"pointer",marginBottom:12,fontFamily:FM}}>← Back to tickets</button>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:16,fontWeight:700,fontFamily:FD}}>{selTicket.subject}</div><div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:3}}>{selTicket.id} · {selTicket.category} · Created {selTicket.created}</div></div>
            <Tag text={selTicket.status.replace("_"," ")} color={stColor(selTicket.status)}/>
          </div>
          <div style={{padding:"14px 18px",maxHeight:350,overflowY:"auto"}}>
            {selTicket.messages.map((m,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:14}}>
              <div style={{width:32,height:32,borderRadius:10,background:m.from==="customer"?C.ad:C.gd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{m.from==="customer"?"👤":"🛡"}</div>
              <div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}><span style={{fontSize:12,fontWeight:600}}>{m.from==="customer"?"You":m.name}</span><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{m.time}</span></div>
                <div style={{padding:"10px 14px",borderRadius:m.from==="customer"?"4px 14px 14px 14px":"14px 4px 14px 14px",background:m.from==="customer"?C.s2:`${C.a}08`,border:`1px solid ${m.from==="customer"?C.b1:C.a+"22"}`,fontSize:13,lineHeight:1.6,color:C.t1}}>{m.text}</div>
              </div>
            </div>)}
          </div>
          {selTicket.status!=="resolved"&&<div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:8}}>
            <input placeholder="Write a reply…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
            <Btn ch="Send" v="primary" sm onClick={()=>showT("Reply sent!","success")}/>
          </div>}
        </div>
      </div>}
      {/* KB TAB */}
      {pTab==="kb"&&!selCat&&!selArt&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {KB_CATS.filter(c=>!kbSearch||c.name.toLowerCase().includes(kbSearch.toLowerCase())).map(c=><div key={c.id} onClick={()=>setSelCat(c)} className="hov" style={{padding:"18px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,cursor:"pointer",transition:"all .15s"}}>
          <div style={{fontSize:28,marginBottom:8}}>{c.icon}</div>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD}}>{c.name}</div>
          <div style={{fontSize:11,color:C.t3,marginTop:3}}>{c.count} articles</div>
        </div>)}
      </div>}
      {pTab==="kb"&&selCat&&!selArt&&<div>
        <button onClick={()=>setSelCat(null)} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.a,background:"none",border:"none",cursor:"pointer",marginBottom:12,fontFamily:FM}}>← All categories</button>
        <div style={{fontSize:16,fontWeight:700,fontFamily:FD,marginBottom:14}}>{selCat.icon} {selCat.name}</div>
        {KB_ARTS.filter(a=>a.cat===selCat.id).map(a=><div key={a.id} onClick={()=>setSelArt(a)} className="hov" style={{padding:"12px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:8,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:13,fontWeight:600}}>{a.title}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>{a.views} views · {a.helpful}% helpful</div></div>
          <span style={{color:C.t3}}>→</span>
        </div>)}
      </div>}
      {pTab==="kb"&&selArt&&<div>
        <button onClick={()=>setSelArt(null)} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.a,background:"none",border:"none",cursor:"pointer",marginBottom:12,fontFamily:FM}}>← Back</button>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"20px 24px"}}>
          <h3 style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:12}}>{selArt.title}</h3>
          <div style={{fontSize:13,color:C.t2,lineHeight:1.8,marginBottom:16}}>This article covers everything you need to know about {selArt.title.toLowerCase()}. Follow the step-by-step guide below to get started quickly.</div>
          <div style={{padding:"14px",background:C.bg,borderRadius:10,border:`1px solid ${C.b1}`,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>Was this helpful?</div>
            <div style={{display:"flex",gap:8}}><Btn ch="👍 Yes" v="ghost" sm onClick={()=>showT("Thanks!","success")}/><Btn ch="👎 No" v="ghost" sm onClick={()=>showT("We'll improve this","info")}/></div>
          </div>
        </div>
      </div>}
      {/* CHAT TAB */}
      {pTab==="chat"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"24px",textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:10}}>💬</div>
        <div style={{fontSize:16,fontWeight:700,fontFamily:FD,marginBottom:4}}>Live Chat</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:4}}>Our team is online</div>
        <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:16}}>{[1,2,3].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.g,animation:`pulse ${1+i*0.3}s infinite`}}/>)}</div>
        <div style={{fontSize:11,color:C.t3,marginBottom:14}}>Average response time: <strong style={{color:C.g}}>2 min</strong></div>
        <Btn ch="Start Conversation" v="primary" onClick={()=>showT("Chat started!","success")}/>
      </div>}
      {/* STATUS TAB */}
      {pTab==="status"&&<div>
        <div style={{background:C.gd,border:`1px solid ${C.g}33`,borderRadius:14,padding:"20px 24px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:12,height:12,borderRadius:"50%",background:C.g,boxShadow:`0 0 8px ${C.g}`}}/>
          <div><div style={{fontSize:15,fontWeight:700,color:C.g}}>All Systems Operational</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>Last checked 2 minutes ago</div></div>
        </div>
        {[{name:"Web App",status:"operational",uptime:"99.98%"},{name:"API",status:"operational",uptime:"99.95%"},{name:"WebSocket",status:"operational",uptime:"99.99%"},{name:"WhatsApp Gateway",status:"operational",uptime:"99.90%"},{name:"Email Processing",status:"degraded",uptime:"98.50%"},{name:"AI Services",status:"operational",uptime:"99.92%"}].map(s=><div key={s.name} style={{display:"flex",alignItems:"center",padding:"12px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:6}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:s.status==="operational"?C.g:C.y,marginRight:12}}/>
          <span style={{flex:1,fontSize:13,fontWeight:600}}>{s.name}</span>
          <span style={{fontSize:11,color:C.t3,fontFamily:FM,marginRight:12}}>{s.uptime} uptime</span>
          <Tag text={s.status} color={s.status==="operational"?C.g:C.y}/>
        </div>)}
      </div>}
      {/* NEW TICKET MODAL */}
      {showNew&&<Mdl title="Submit a Support Ticket" onClose={()=>setShowNew(false)} w={480}>
        <Fld label="Subject"><Inp val={nSubj} set={setNSubj} ph="Briefly describe your issue"/></Fld>
        <Fld label="Category"><Sel val={nCat} set={setNCat} opts={[{v:"technical",l:"🔧 Technical"},{v:"billing",l:"💳 Billing"},{v:"feature",l:"💡 Feature Request"},{v:"onboarding",l:"🚀 Onboarding"},{v:"other",l:"📋 Other"}]}/></Fld>
        <Fld label="Description"><textarea value={nDesc} onChange={e=>setNDesc(e.target.value)} rows={4} placeholder="Provide details, steps to reproduce, screenshots…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
        <Fld label="Attachment (optional)"><div onClick={()=>setNFile("screenshot.png")} style={{padding:"16px",borderRadius:8,border:`1.5px dashed ${C.b2}`,background:C.bg,textAlign:"center",cursor:"pointer",fontSize:12,color:C.t3}}>{nFile?"📎 "+nFile:"Click to attach a file (max 10MB)"}</div></Fld>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNew(false)}/><Btn ch="Submit Ticket" v="primary" onClick={submitTicket}/></div>
      </Mdl>}
    </div>:<div style={{padding:20}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[{l:"Portal Enabled",v:true},{l:"KB Visible",v:true},{l:"Chat Enabled",v:true},{l:"Ticket Submission",v:true},{l:"Status Page",v:true},{l:"File Uploads",v:true}].map(s=><div key={s.l} style={{padding:"14px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:C.t2}}>{s.l}</span><Toggle val={s.v} set={()=>showT("Toggled","success")}/></div>)}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Portal Branding</div>
        {[{l:"Logo URL",ph:"https://…"},{l:"Primary Color",ph:"#4C82FB"},{l:"Welcome Title",ph:"How can we help?"},{l:"Footer Text",ph:"Powered by SupportDesk"}].map(f=><Fld key={f.l} label={f.l}><Inp val="" set={()=>{}} ph={f.ph}/></Fld>)}
        <Btn ch="Save Branding" v="primary"/>
      </div>
    </div>}
  </div>;
}


