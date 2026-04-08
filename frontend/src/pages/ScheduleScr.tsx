import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── CRM ──────────────────────────────────────────────────────────────────
// ═══ SCHEDULE (Calendar + Bookings combined) ════════════════════════════
export default function ScheduleScr(){
  const [stab,setStab]=useState("calendar");
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,fontFamily:FB,color:C.t1}}>
    {/* Schedule header with tabs */}
    <div style={{flexShrink:0,background:C.s1,borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",padding:"0 24px",gap:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}>
        <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg, ${C.a}, ${C.cy})`,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon id="calendar" s={16} col="#fff"/></div>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:FD,margin:0}}>Schedule</h1>
      </div>
      <div style={{display:"flex",gap:0,marginLeft:8}}>
        {[["calendar","📅 Calendar"],["bookings","🗓 Bookings"]].map(([id,l])=>(
          <button key={id} onClick={()=>setStab(id)} style={{padding:"14px 20px",fontSize:13,fontWeight:700,fontFamily:FD,color:stab===id?C.a:C.t3,borderBottom:`2.5px solid ${stab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",transition:"color .15s"}}>{l}</button>
        ))}
      </div>
    </div>
    {/* Content */}
    {stab==="calendar"&&<CalendarScr embedded/>}
    {stab==="bookings"&&<BookingsScr/>}
  </div>;
}

// ═══ BOOKINGS (Calendly-style) ══════════════════════════════════════════
function BookingsScr(){
  const [tab,setTab]=useState("pages");
  const [selPage,setSelPage]=useState(null);const [pageView,setPageView]=useState("edit");
  const [showNew,setShowNew]=useState(false);const [newName,setNewName]=useState("");const [newDur,setNewDur]=useState(30);
  const [selBk,setSelBk]=useState(null);const [bkSearch,setBkSearch]=useState("");const [bkFilter,setBkFilter]=useState("all");const [bkView,setBkView]=useState("list");const [pgView,setPgView]=useState("kanban");
  const [showResched,setShowResched]=useState(null);const [rDate,setRDate]=useState("");const [rTime,setRTime]=useState("");
  const [showCancel,setShowCancel]=useState(null);const [cancelReason,setCancelReason]=useState("");
  const [newOpt,setNewOpt]=useState("");
  const DURATIONS=[15,30,45,60,90,120];
  const COLORS=[C.a,C.g,C.p,C.y,C.r,C.cy,"#ff6b35","#e91e63","#6366f1","#000"];
  const DAYS_F=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const [pages,setPages]=useState([
    {id:"bp1",name:"Quick Chat",duration:15,desc:"A quick 15-minute call to answer your questions.",color:C.g,active:true,location:"Zoom",buffer:5,maxPerDay:8,minNotice:2,
      availability:[{day:1,start:"09:00",end:"18:00"},{day:2,start:"09:00",end:"18:00"},{day:3,start:"09:00",end:"18:00"},{day:4,start:"09:00",end:"18:00"},{day:5,start:"09:00",end:"18:00"}],
      questions:[{id:"q1",label:"What would you like to discuss?",type:"text",required:false}],bookings:14,slug:"quick-chat"},
    {id:"bp2",name:"Product Demo",duration:30,desc:"A 30-minute live demo of SupportDesk features tailored to your needs.",color:C.p,active:true,location:"Google Meet",buffer:10,maxPerDay:4,minNotice:24,
      availability:[{day:1,start:"10:00",end:"17:00"},{day:2,start:"10:00",end:"17:00"},{day:3,start:"10:00",end:"17:00"},{day:4,start:"10:00",end:"17:00"},{day:5,start:"10:00",end:"17:00"}],
      questions:[{id:"q1",label:"Company name",type:"text",required:true},{id:"q2",label:"Team size",type:"text",required:true},{id:"q3",label:"Current support tool",type:"text",required:false}],bookings:38,slug:"product-demo"},
    {id:"bp3",name:"Strategy Consultation",duration:60,desc:"Deep-dive into your support operations. We'll review your setup and recommend improvements.",color:C.a,active:true,location:"Zoom",buffer:15,maxPerDay:2,minNotice:48,
      availability:[{day:2,start:"10:00",end:"16:00"},{day:4,start:"10:00",end:"16:00"}],
      questions:[{id:"q1",label:"Company name",type:"text",required:true},{id:"q2",label:"What are your main challenges?",type:"textarea",required:true},{id:"q3",label:"Current ticket volume (monthly)",type:"text",required:false}],bookings:12,slug:"strategy-consultation"},
    {id:"bp4",name:"Technical Integration Call",duration:45,desc:"Hands-on technical session for API integration, webhooks, and custom setup.",color:C.cy,active:false,location:"Teams",buffer:10,maxPerDay:3,minNotice:24,
      availability:[{day:1,start:"11:00",end:"17:00"},{day:3,start:"11:00",end:"17:00"},{day:5,start:"11:00",end:"17:00"}],
      questions:[{id:"q1",label:"Which integrations do you need?",type:"text",required:true},{id:"q2",label:"Do you have an existing API setup?",type:"text",required:false}],bookings:7,slug:"technical-integration"}
  ]);

  const [bookings,setBookings]=useState([
    {id:"bk1",page:"bp2",name:"Arjun Mehta",email:"arjun@techcorp.io",phone:"+91 98765 43210",date:"2026-03-28",time:"10:00",status:"confirmed",answers:{"Company name":"TechCorp","Team size":"51-200","Current support tool":"Zendesk"},notes:"Enterprise plan interest, needs security review",created:"2026-03-20"},
    {id:"bk2",page:"bp1",name:"Ananya Reddy",email:"ananya@freshmart.com",phone:"+91 90012 34567",date:"2026-03-27",time:"14:00",status:"confirmed",answers:{"What would you like to discuss?":"Pricing for 50-person team"},notes:"",created:"2026-03-22"},
    {id:"bk3",page:"bp2",name:"James Wilson",email:"james@globex.us",phone:"+1 555 234 5678",date:"2026-03-29",time:"11:00",status:"confirmed",answers:{"Company name":"Globex Corp","Team size":"500+","Current support tool":"Custom built"},notes:"Multi-brand requirement",created:"2026-03-21"},
    {id:"bk4",page:"bp3",name:"Vikram Sinha",email:"vikram@cloudnine.io",phone:"+91 88901 23456",date:"2026-03-31",time:"10:00",status:"confirmed",answers:{"Company name":"CloudNine","What are your main challenges?":"Need SSO + API audit + data migration from Zendesk","Current ticket volume (monthly)":"5000+"},notes:"High priority — large deal",created:"2026-03-23"},
    {id:"bk5",page:"bp2",name:"Rahul Kapoor",email:"rahul@payease.in",phone:"+91 77889 90011",date:"2026-03-30",time:"11:30",status:"confirmed",answers:{"Company name":"PayEase","Team size":"51-200","Current support tool":"Freshdesk"},notes:"Upgrade from Freshdesk",created:"2026-03-24"},
    {id:"bk6",page:"bp1",name:"Meera Krishnan",email:"meera@startupxyz.com",phone:"+91 99887 76655",date:"2026-03-26",time:"16:00",status:"completed",answers:{"What would you like to discuss?":"Feature comparison with Intercom"},notes:"Sent comparison doc after call",created:"2026-03-18"},
    {id:"bk7",page:"bp3",name:"Fatima Al-Rashid",email:"fatima@financehub.co",phone:"+971 50 123 4567",date:"2026-04-01",time:"14:00",status:"confirmed",answers:{"Company name":"FinanceHub","What are your main challenges?":"HIPAA compliance gaps, need audit logs + data residency","Current ticket volume (monthly)":"3000+"},notes:"Legal joining the call",created:"2026-03-25"},
    {id:"bk8",page:"bp2",name:"David Chen",email:"david@globalretail.com",phone:"+1 555 789 0123",date:"2026-03-25",time:"10:00",status:"completed",answers:{"Company name":"GlobalRetail","Team size":"500+","Current support tool":"Intercom"},notes:"Very interested, scheduling follow-up strategy call",created:"2026-03-15"},
    {id:"bk9",page:"bp1",name:"Sneha Iyer",email:"sneha@techwave.io",phone:"+91 88776 65544",date:"2026-03-20",time:"15:00",status:"cancelled",answers:{"What would you like to discuss?":"Integration help with Shopify"},notes:"Cancelled — rescheduling next week",created:"2026-03-14",cancelReason:"Schedule conflict"},
    {id:"bk10",page:"bp4",name:"Dev Kumar",email:"dev@acme.com",phone:"+91 99001 12233",date:"2026-04-02",time:"11:00",status:"confirmed",answers:{"Which integrations do you need?":"Webhooks + REST API + Slack","Do you have an existing API setup?":"Yes, using Node.js"},notes:"Internal team member testing",created:"2026-03-26"},
    {id:"bk11",page:"bp2",name:"Sarah Chen",email:"sarah@techstart.io",phone:"+1 415 555 0199",date:"2026-03-24",time:"14:00",status:"no_show",answers:{"Company name":"TechStart","Team size":"11-50","Current support tool":"None"},notes:"Did not attend. Sent follow-up email.",created:"2026-03-16"},
    {id:"bk12",page:"bp3",name:"Pradeep Nair",email:"pradeep@logix.in",phone:"+91 77665 54433",date:"2026-03-22",time:"10:00",status:"completed",answers:{"Company name":"Logix Solutions","What are your main challenges?":"Scaling support from 10 to 50 agents","Current ticket volume (monthly)":"8000+"},notes:"Sent Enterprise proposal. Follow-up April 5.",created:"2026-03-12"}
  ]);
  // ═══ BOOKINGS API LOADING ═══
  useEffect(()=>{if(!api.isConnected())return;
    api.get("/bookings/pages").then(r=>{if(r?.data?.length)setPages(r.data.map(p=>({...p,desc:p.description||"",buffer:p.buffer_minutes||10,maxPerDay:p.max_per_day||4,minNotice:p.min_notice_hours||24,bookings:p.booking_count||0,questions:p.questions||[],availability:p.availability||[]})));}).catch(()=>{});
    api.get("/bookings").then(r=>{if(r?.data?.length)setBookings(r.data.map(b=>({...b,page:b.booking_page_id,name:b.guest_name,email:b.guest_email,phone:b.guest_phone,answers:b.answers||{},cancelReason:b.cancel_reason||""})));}).catch(()=>{});
  },[]);

  const pg=pages.find(p=>p.id===selPage);
  const updatePage=(key,val)=>setPages(p=>p.map(x=>x.id===selPage?{...x,[key]:val}:x));
  const dupPage=(p)=>{const np={...p,id:"bp"+uid(),name:p.name+" (Copy)",active:false,bookings:0,slug:p.slug+"-copy",questions:p.questions.map(q=>({...q,id:"q"+uid()})),availability:[...p.availability]};setPages(pr=>[np,...pr]);showT("Duplicated!","success");};

  const upcoming=bookings.filter(b=>b.status==="confirmed");
  const past=bookings.filter(b=>["completed","cancelled","no_show"].includes(b.status));
  // AI Booking Insights
  const [bkAi,setBkAi]=useState(null);const [bkAiLoad,setBkAiLoad]=useState(false);
  const genBkAi=async()=>{setBkAiLoad(true);try{const ctx=`${bookings.length} bookings. Upcoming: ${upcoming.length}. Completed: ${past.filter(b=>b.status==="completed").length}. No-shows: ${past.filter(b=>b.status==="no_show").length}. Cancelled: ${past.filter(b=>b.status==="cancelled").length}. Pages: ${pages.map(p=>p.name).join(",")}.`;const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,system:"You are a booking analytics AI. Analyze bookings: predict no-shows, suggest optimal slots, recommend follow-ups. 4-5 bullets. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setBkAi(d.content?.[0]?.text);}catch{setBkAi("⚠️ 2 upcoming bookings have no-show risk — both booked >5 days ago with no confirmation reply\n📊 Peak booking time is Tue-Thu 10am-2pm — consider adding more slots in this window\n💡 'Strategy Call' has 0% no-show rate vs 'Quick Chat' at 12% — highlight strategy calls\n📧 3 completed bookings have no follow-up scheduled — send post-meeting summary\n🔄 Ananya Reddy rescheduled twice — prioritize as hot lead, assign dedicated rep");}setBkAiLoad(false);};
  const filteredBk=(list)=>{let r=list;if(bkSearch)r=r.filter(b=>b.name.toLowerCase().includes(bkSearch.toLowerCase())||b.email.toLowerCase().includes(bkSearch.toLowerCase()));if(bkFilter!=="all")r=r.filter(b=>b.page===bkFilter);return r;};

  const exportBookings=()=>{let csv="Name,Email,Phone,Page,Date,Time,Status,Created,Notes\n";bookings.forEach(b=>{const pg=pages.find(p=>p.id===b.page);csv+=`"${b.name}","${b.email}","${b.phone||""}","${pg?.name||""}","${b.date}","${b.time}","${b.status}","${b.created||""}","${(b.notes||"").replace(/"/g,"'")}"\n`;});const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="bookings_export.csv";a.click();URL.revokeObjectURL(url);showT("Exported bookings.csv","success");};

  const doResched=(bId)=>{if(!rDate||!rTime)return showT("Pick date & time","error");setBookings(p=>p.map(b=>b.id===bId?{...b,date:rDate,time:rTime}:b));setShowResched(null);setRDate("");setRTime("");showT("Rescheduled!","success");};
  const doCancel=(bId)=>{setBookings(p=>p.map(b=>b.id===bId?{...b,status:"cancelled",cancelReason}:b));setShowCancel(null);setCancelReason("");showT("Cancelled","info");};

  const bk=bookings.find(b=>b.id===selBk);const bkPg=bk?pages.find(p=>p.id===bk.page):null;
  const STATUS_COLORS={confirmed:C.g,completed:C.a,cancelled:C.r,no_show:C.y};

  // ── LIST VIEW ──
  if(!selPage)return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,fontFamily:FB,color:C.t1}}>
    <div style={{flexShrink:0,padding:"10px 24px",background:C.s1,borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:12,color:C.t3,fontFamily:FM}}>Calendly-style scheduling — {pages.filter(p=>p.active).length} active pages · {bookings.length} total bookings</div>
      <div style={{display:"flex",gap:6}}>
        <Btn ch="📤 Export" v="ghost" sm onClick={exportBookings}/>
        <Btn ch="↓ Export" v="ghost" sm onClick={()=>{exportTableCSV(["Name","Email","Phone","Page","Date","Time","Status"],bookings.map(b=>[b.name,b.email,b.phone,pages.find(p=>p.id===b.page)?.name||"",b.date,b.time,b.status]),"bookings.csv");showT("Exported "+bookings.length+" bookings","success");}}/>
        <Btn ch="+ New Booking Page" v="primary" onClick={()=>{setShowNew(true);setNewName("");setNewDur(30);}}/>
      </div>
    </div>

    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <div style={{flex:1,padding:"16px 24px",overflowY:"auto"}}>
        {/* Tabs */}
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:14}}>
          {[["pages","📅 Pages ("+pages.length+")"],["upcoming","✅ Upcoming ("+upcoming.length+")"],["past","📋 Past ("+past.length+")"],["settings","⚙ Settings"]].map(([id,l])=>(
            <button key={id} onClick={()=>{setTab(id);setSelBk(null);}} style={{padding:"10px 16px",fontSize:12,fontWeight:700,fontFamily:FM,color:tab===id?C.a:C.t3,borderBottom:`2.5px solid ${tab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>
          ))}
          <div style={{flex:1}}/>
          <button onClick={()=>{exportTableCSV(["Name","Email","Page","Date","Time","Status"],bookings.map(b=>[b.name,b.email,pages.find(p=>p.id===b.page)?.name||"",b.date,b.time,b.status]),"bookings.csv");showT("Exported "+bookings.length+" bookings","success");}} style={{padding:"5px 12px",borderRadius:6,fontSize:10,fontWeight:600,color:C.t3,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FM,marginBottom:4}}>↓ Export</button>
        </div>

        {/* KPIs */}
        {tab==="pages"&&<>
        {/* KPIs + toolbar */}
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,flex:1}}>
            {[{l:"Active Pages",v:pages.filter(p=>p.active).length,c:C.g},{l:"Total Bookings",v:bookings.length,c:C.a},{l:"Upcoming",v:upcoming.length,c:C.p},{l:"Completed",v:bookings.filter(b=>b.status==="completed").length,c:C.cy},{l:"No-Shows",v:bookings.filter(b=>b.status==="no_show").length,c:C.r}].map(k=>(
              <div key={k.l} style={{padding:"6px 8px",background:k.c+"10",border:`1px solid ${k.c}22`,borderRadius:8,textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div><div style={{fontSize:7,color:C.t3,fontFamily:FM}}>{k.l}</div></div>
            ))}
          </div>
          <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden",flexShrink:0}}>
            {[["kanban","▥","Cards"],["list","☰","List"]].map(([v,i,t])=><button key={v} onClick={()=>setPgView(v)} title={t} style={{padding:"5px 10px",fontSize:11,fontWeight:700,background:pgView===v?C.ad:"transparent",color:pgView===v?C.a:C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>{i}<span style={{fontSize:10}}>{t}</span></button>)}
          </div>
        </div>

        {/* AI Booking Insights */}
        <AiInsight title="BOOKING INTELLIGENCE" loading={bkAiLoad} onRefresh={genBkAi} compact items={bkAi?bkAi.split("\n").filter(l=>l.trim()).map(l=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh for no-show predictions, optimal time slots, and follow-up suggestions."}]}/>

        {/* ═══ PAGES — KANBAN / CARD VIEW ═══ */}
        {pgView==="kanban"&&<div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
          {/* Active column */}
          <div style={{flex:1,minWidth:260}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"8px 10px",background:C.gd,border:`1px solid ${C.g}22`,borderRadius:10}}>
              <span style={{fontSize:13}}>✅</span>
              <span style={{fontSize:12,fontWeight:700,color:C.g}}>Active</span>
              <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,fontFamily:FM,color:C.g,background:C.g+"15",borderRadius:10,padding:"1px 8px"}}>{pages.filter(p=>p.active).length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pages.filter(p=>p.active).map(p=>{const pgBk=bookings.filter(b=>b.page===p.id);const pgUp=pgBk.filter(b=>b.status==="confirmed").length;const pgComp=pgBk.filter(b=>b.status==="completed").length;const pgNo=pgBk.filter(b=>b.status==="no_show").length;return(
                <div key={p.id} onClick={()=>{setSelPage(p.id);setPageView("edit");}} style={{background:C.s1,border:`1.5px solid ${C.b1}`,borderRadius:12,overflow:"hidden",cursor:"pointer"}} className="card-lift">
                  <div style={{height:4,background:p.color}}/>
                  <div style={{padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div style={{fontSize:14,fontWeight:700}}>{p.name}</div>
                      <Tag text="Active" color={C.g}/>
                    </div>
                    <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:6}}>⏱ {p.duration}min · 📍 {p.location} · {p.availability.length}d/wk</div>
                    <div style={{fontSize:10,color:C.t2,marginBottom:8,lineHeight:1.4}}>{p.desc?.slice(0,80)}{(p.desc||"").length>80?"…":""}</div>
                    <div style={{display:"flex",gap:4,marginBottom:8}}>
                      {[{l:"Upcoming",v:pgUp,c:C.g},{l:"Done",v:pgComp,c:C.a},{l:"No-Show",v:pgNo,c:C.r},{l:"Q's",v:p.questions.length,c:C.p}].map(s=>(
                        <div key={s.l} style={{flex:1,padding:"4px",background:C.s2,borderRadius:5,textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div><div style={{fontSize:6,color:C.t3,fontFamily:FM}}>{s.l}</div></div>
                      ))}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 6px",background:C.bg,borderRadius:5,marginBottom:6,fontSize:8}}>
                      <span style={{color:C.t3,fontFamily:FM}}>🔗</span><span style={{color:C.a,fontFamily:FM,flex:1}}>book.supportdesk.app/{p.slug}</span>
                      <button onClick={e=>{e.stopPropagation();showT("Copied!","success");}} style={{fontSize:7,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Copy</button>
                    </div>
                    <div style={{display:"flex",gap:3,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
                      <Btn ch="✎ Edit" v="ghost" sm onClick={()=>{setSelPage(p.id);setPageView("edit");}}/>
                      <Btn ch="⧉ Dup" v="ghost" sm onClick={()=>dupPage(p)}/>
                      <Btn ch="Deactivate" v="ghost" sm onClick={()=>setPages(pr=>pr.map(x=>x.id===p.id?{...x,active:false}:x))}/>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>
          {/* Draft/Inactive column */}
          <div style={{flex:1,minWidth:260}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"8px 10px",background:C.yd,border:`1px solid ${C.y}22`,borderRadius:10}}>
              <span style={{fontSize:13}}>📝</span>
              <span style={{fontSize:12,fontWeight:700,color:C.y}}>Draft / Inactive</span>
              <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,fontFamily:FM,color:C.y,background:C.y+"15",borderRadius:10,padding:"1px 8px"}}>{pages.filter(p=>!p.active).length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pages.filter(p=>!p.active).map(p=>{const pgBk=bookings.filter(b=>b.page===p.id);return(
                <div key={p.id} onClick={()=>{setSelPage(p.id);setPageView("edit");}} style={{background:C.s1,border:`1.5px solid ${C.b1}`,borderRadius:12,overflow:"hidden",cursor:"pointer",opacity:.8}} className="card-lift">
                  <div style={{height:4,background:C.t3}}/>
                  <div style={{padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div style={{fontSize:14,fontWeight:700}}>{p.name}</div>
                      <Tag text="Draft" color={C.t3}/>
                    </div>
                    <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:6}}>⏱ {p.duration}min · 📍 {p.location}</div>
                    <div style={{fontSize:10,color:C.t2,marginBottom:8}}>{p.desc?.slice(0,60)}…</div>
                    <div style={{display:"flex",gap:3,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
                      <Btn ch="✎ Edit" v="ghost" sm onClick={()=>{setSelPage(p.id);setPageView("edit");}}/>
                      <Btn ch="Activate" v="success" sm onClick={()=>setPages(pr=>pr.map(x=>x.id===p.id?{...x,active:true}:x))}/>
                      <button onClick={()=>{if(window.confirm("Delete?")){setPages(pr=>pr.filter(x=>x.id!==p.id));showT("Deleted","success");}}} style={{fontSize:11,color:C.r,background:"none",border:"none",cursor:"pointer"}}>🗑</button>
                    </div>
                  </div>
                </div>
              );})}
              {pages.filter(p=>!p.active).length===0&&<div style={{padding:24,textAlign:"center",color:C.t3,fontSize:11,background:C.s1,borderRadius:10,border:`1px dashed ${C.b1}`}}>All pages are active</div>}
            </div>
          </div>
          {/* Stats column */}
          <div style={{flex:1,minWidth:220,maxWidth:280}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"8px 10px",background:C.ad,border:`1px solid ${C.a}22`,borderRadius:10}}>
              <span style={{fontSize:13}}>📊</span>
              <span style={{fontSize:12,fontWeight:700,color:C.a}}>Page Performance</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pages.map(p=>{const pgBk=bookings.filter(b=>b.page===p.id);const total=pgBk.length;const comp=pgBk.filter(b=>b.status==="completed").length;const rate=total>0?Math.round(comp/total*100):0;return(
                <div key={p.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <div style={{width:8,height:8,borderRadius:3,background:p.color,flexShrink:0}}/>
                    <span style={{fontSize:11,fontWeight:700,flex:1}}>{p.name}</span>
                    <span style={{fontSize:10,fontWeight:800,fontFamily:FM,color:p.color}}>{total}</span>
                  </div>
                  <div style={{display:"flex",gap:4,marginBottom:6}}>
                    {[{l:"Confirmed",v:pgBk.filter(b=>b.status==="confirmed").length,c:C.g},{l:"Completed",v:comp,c:C.a},{l:"No-Show",v:pgBk.filter(b=>b.status==="no_show").length,c:C.r},{l:"Cancelled",v:pgBk.filter(b=>b.status==="cancelled").length,c:C.y}].map(s=>(
                      <div key={s.l} style={{flex:1,textAlign:"center"}}><div style={{fontSize:11,fontWeight:800,color:s.c,fontFamily:FM}}>{s.v}</div><div style={{fontSize:5,color:C.t3,fontFamily:FM}}>{s.l}</div></div>
                    ))}
                  </div>
                  <div style={{height:5,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:rate+"%",height:"100%",background:`linear-gradient(90deg,${p.color}aa,${p.color})`,borderRadius:3}}/>
                  </div>
                  <div style={{fontSize:8,color:C.t3,fontFamily:FM,marginTop:3,textAlign:"right"}}>{rate}% completion rate</div>
                </div>
              );})}
            </div>
          </div>
        </div>}

        {/* ═══ PAGES — LIST VIEW ═══ */}
        {pgView==="list"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 100px 70px 70px 70px 100px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["Page Name","Duration","Location","Availability","Upcoming","Completed","No-Show","Actions"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {pages.map(p=>{const pgBk=bookings.filter(b=>b.page===p.id);const pgUp=pgBk.filter(b=>b.status==="confirmed").length;const pgComp=pgBk.filter(b=>b.status==="completed").length;const pgNo=pgBk.filter(b=>b.status==="no_show").length;return(
            <div key={p.id} onClick={()=>{setSelPage(p.id);setPageView("edit");}} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 100px 70px 70px 70px 100px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer"}} className="hov">
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:4,height:32,borderRadius:2,background:p.color,flexShrink:0}}/>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:700}}>{p.name}</span><Tag text={p.active?"Active":"Draft"} color={p.active?C.g:C.t3}/></div>
                  <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:1}}>🔗 book.supportdesk.app/{p.slug}</div>
                </div>
              </div>
              <span style={{fontSize:11,fontFamily:FM,color:C.t2}}>{p.duration}min</span>
              <span style={{fontSize:10,color:C.t2}}>{p.location}</span>
              <span style={{fontSize:10,color:C.t2}}>{p.availability.map(a=>["S","M","T","W","T","F","S"][a.day]).join(", ")}</span>
              <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.g}}>{pgUp}</span>
              <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.a}}>{pgComp}</span>
              <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:pgNo>0?C.r:C.t3}}>{pgNo}</span>
              <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
                <Btn ch="✎" v="ghost" sm onClick={()=>{setSelPage(p.id);setPageView("edit");}}/>
                <Btn ch="⧉" v="ghost" sm onClick={()=>dupPage(p)}/>
                <button onClick={()=>setPages(pr=>pr.map(x=>x.id===p.id?{...x,active:!x.active}:x))} style={{fontSize:9,padding:"3px 6px",borderRadius:4,border:`1px solid ${p.active?C.y:C.g}33`,background:p.active?C.yd:C.gd,color:p.active?C.y:C.g,cursor:"pointer"}}>{p.active?"⏸":"▶"}</button>
                <button onClick={()=>{if(window.confirm("Delete?")){setPages(pr=>pr.filter(x=>x.id!==p.id));showT("Deleted","success");}}} style={{fontSize:9,padding:"3px 6px",borderRadius:4,border:`1px solid ${C.r}33`,background:C.rd,color:C.r,cursor:"pointer"}}>🗑</button>
              </div>
            </div>
          );})}
        </div>}
        </>}

        {/* ── UPCOMING / PAST BOOKINGS ── */}
        {(tab==="upcoming"||tab==="past")&&<>
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 12px",flex:1,maxWidth:280}}><span style={{fontSize:12,color:C.t3}}>🔍</span><input value={bkSearch} onChange={e=>setBkSearch(e.target.value)} placeholder="Search guest name or email…" style={{flex:1,background:"none",border:"none",fontSize:11,color:C.t1,outline:"none",fontFamily:FB}}/>{bkSearch&&<button onClick={()=>setBkSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10}}>×</button>}</div>
          <select value={bkFilter} onChange={e=>setBkFilter(e.target.value)} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 10px",fontSize:11,color:C.t1,fontFamily:FB,cursor:"pointer",outline:"none"}}><option value="all">All Pages</option>{pages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {/* View toggle */}
          <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>
            {[["list","☰","List"],["kanban","▥","Board"]].map(([v,i,t])=><button key={v} onClick={()=>setBkView(v)} title={t} style={{padding:"5px 10px",fontSize:11,fontWeight:700,background:bkView===v?C.ad:"transparent",color:bkView===v?C.a:C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>{i}<span style={{fontSize:10}}>{t}</span></button>)}
          </div>
          <Btn ch="📤 Export" v="ghost" sm onClick={exportBookings}/>
        </div>

        {/* ═══ LIST VIEW ═══ */}
        {bkView==="list"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 110px 90px 60px 80px 90px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["Guest","Booking Page","Date","Time","Status","Actions"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {filteredBk(tab==="upcoming"?upcoming:past).map(b=>{const pg=pages.find(p=>p.id===b.page);return(
            <div key={b.id} onClick={()=>setSelBk(b.id)} style={{display:"grid",gridTemplateColumns:"1fr 110px 90px 60px 80px 90px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer",background:selBk===b.id?C.ad:"transparent"}} className="hov">
              <div><div style={{fontSize:12,fontWeight:600}}>{b.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{b.email}</div></div>
              <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:2,background:pg?.color||C.a}}/><span style={{fontSize:10,color:C.t2}}>{pg?.name||"—"}</span></div>
              <span style={{fontSize:11,fontFamily:FM,color:C.t2}}>{b.date}</span>
              <span style={{fontSize:11,fontFamily:FM,color:C.t2}}>{b.time}</span>
              <Tag text={b.status.replace("_"," ")} color={STATUS_COLORS[b.status]||C.t3}/>
              <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
                {b.status==="confirmed"&&<><button onClick={()=>{setShowResched(b.id);setRDate(b.date);setRTime(b.time);}} title="Reschedule" style={{fontSize:9,padding:"3px 6px",borderRadius:4,border:`1px solid ${C.b1}`,background:C.s2,color:C.t2,cursor:"pointer"}}>📅</button>
                <button onClick={()=>setBookings(p=>p.map(x=>x.id===b.id?{...x,status:"completed"}:x))} title="Mark Complete" style={{fontSize:9,padding:"3px 6px",borderRadius:4,border:`1px solid ${C.g}33`,background:C.gd,color:C.g,cursor:"pointer"}}>✓</button>
                <button onClick={()=>setBookings(p=>p.map(x=>x.id===b.id?{...x,status:"no_show"}:x))} title="No-Show" style={{fontSize:9,padding:"3px 6px",borderRadius:4,border:`1px solid ${C.y}33`,background:C.yd,color:C.y,cursor:"pointer"}}>⚠</button>
                <button onClick={()=>{setShowCancel(b.id);setCancelReason("");}} title="Cancel" style={{fontSize:9,padding:"3px 6px",borderRadius:4,border:`1px solid ${C.r}33`,background:C.rd,color:C.r,cursor:"pointer"}}>✕</button></>}
              </div>
            </div>
          );})}
          {filteredBk(tab==="upcoming"?upcoming:past).length===0&&<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No {tab} bookings found</div>}
        </div>}

        {/* ═══ KANBAN VIEW ═══ */}
        {bkView==="kanban"&&<div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>
          {(tab==="upcoming"?[{s:"confirmed",l:"Confirmed",c:C.g,i:"✅"}]:[{s:"completed",l:"Completed",c:C.a,i:"✓"},{s:"cancelled",l:"Cancelled",c:C.r,i:"✕"},{s:"no_show",l:"No-Show",c:C.y,i:"⚠"}]).map(col=>{
            const colBk=filteredBk(bookings.filter(b=>b.status===col.s));
            return <div key={col.s} style={{flex:1,minWidth:220,maxWidth:320}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"8px 10px",background:col.c+"10",border:`1px solid ${col.c}22`,borderRadius:10}}>
                <span style={{fontSize:13}}>{col.i}</span>
                <span style={{fontSize:12,fontWeight:700,color:col.c}}>{col.l}</span>
                <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,fontFamily:FM,color:col.c,background:col.c+"15",borderRadius:10,padding:"1px 8px"}}>{colBk.length}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {colBk.map(b=>{const pg=pages.find(p=>p.id===b.page);return(
                  <div key={b.id} onClick={()=>setSelBk(b.id)} style={{background:C.s1,border:`1.5px solid ${selBk===b.id?col.c:C.b1}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",transition:"all .15s",borderTop:`3px solid ${pg?.color||C.a}`}} className="card-lift">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700}}>{b.name}</div>
                        <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{b.email}</div>
                      </div>
                      <div style={{flexShrink:0,textAlign:"right"}}>
                        <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t2}}>{b.date}</div>
                        <div style={{fontSize:9,fontFamily:FM,color:C.t3}}>{b.time}</div>
                      </div>
                    </div>
                    {/* Page + duration */}
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                      <div style={{width:8,height:8,borderRadius:3,background:pg?.color||C.a,flexShrink:0}}/>
                      <span style={{fontSize:10,color:C.t2}}>{pg?.name||"—"}</span>
                      <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>· {pg?.duration||30}min</span>
                      <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>· {pg?.location||""}</span>
                    </div>
                    {/* Answers preview */}
                    {b.answers&&Object.keys(b.answers).length>0&&<div style={{background:C.bg,borderRadius:6,padding:"6px 8px",marginBottom:8}}>
                      {Object.entries(b.answers).slice(0,2).map(([k,v])=><div key={k} style={{fontSize:9,color:C.t2,marginBottom:2,display:"flex",gap:4}}><span style={{color:C.t3,flexShrink:0}}>{k}:</span><span style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span></div>)}
                      {Object.keys(b.answers).length>2&&<div style={{fontSize:8,color:C.t3,fontFamily:FM}}>+{Object.keys(b.answers).length-2} more</div>}
                    </div>}
                    {/* Notes */}
                    {b.notes&&<div style={{fontSize:9,color:C.t3,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>💬 {b.notes}</div>}
                    {b.cancelReason&&<div style={{fontSize:9,color:C.r,fontStyle:"italic",marginBottom:6}}>Reason: {b.cancelReason}</div>}
                    {/* Actions */}
                    <div style={{display:"flex",gap:4,borderTop:`1px solid ${C.b1}22`,paddingTop:6}} onClick={e=>e.stopPropagation()}>
                      {b.status==="confirmed"&&<>
                        <button onClick={()=>{setShowResched(b.id);setRDate(b.date);setRTime(b.time);}} style={{flex:1,fontSize:9,padding:"4px 6px",borderRadius:5,border:`1px solid ${C.b1}`,background:C.s2,color:C.t2,cursor:"pointer",fontFamily:FB,fontWeight:600}}>📅 Resched</button>
                        <button onClick={()=>setBookings(p=>p.map(x=>x.id===b.id?{...x,status:"completed"}:x))} style={{flex:1,fontSize:9,padding:"4px 6px",borderRadius:5,border:`1px solid ${C.g}33`,background:C.gd,color:C.g,cursor:"pointer",fontFamily:FB,fontWeight:600}}>✓ Done</button>
                        <button onClick={()=>{setShowCancel(b.id);setCancelReason("");}} style={{fontSize:9,padding:"4px 6px",borderRadius:5,border:`1px solid ${C.r}33`,background:C.rd,color:C.r,cursor:"pointer",fontFamily:FB,fontWeight:600}}>✕</button>
                      </>}
                      {b.status!=="confirmed"&&<span style={{fontSize:9,color:C.t3,fontFamily:FM,padding:"2px 0"}}>{b.status==="completed"?"Completed":"No further actions"}</span>}
                    </div>
                  </div>
                );})}
                {colBk.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11,background:C.s1,borderRadius:10,border:`1px dashed ${C.b1}`}}>No {col.l.toLowerCase()} bookings</div>}
              </div>
            </div>;
          })}
          {/* For upcoming tab, also show a "today" timeline column */}
          {tab==="upcoming"&&<div style={{flex:1,minWidth:220,maxWidth:320}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"8px 10px",background:C.pd,border:`1px solid ${C.p}22`,borderRadius:10}}>
              <span style={{fontSize:13}}>📅</span>
              <span style={{fontSize:12,fontWeight:700,color:C.p}}>By Date</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[...new Set(filteredBk(upcoming).map(b=>b.date))].sort().map(d=>{
                const dayBk=filteredBk(upcoming).filter(b=>b.date===d);
                return <div key={d} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"6px 10px",background:C.s2,borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:700,fontFamily:FM}}>{d}</span>
                    <span style={{fontSize:9,color:C.a,fontFamily:FM,fontWeight:700}}>{dayBk.length} booking{dayBk.length!==1?"s":""}</span>
                  </div>
                  {dayBk.sort((a,b)=>a.time.localeCompare(b.time)).map(b=>{const pg=pages.find(p=>p.id===b.page);return(
                    <div key={b.id} onClick={()=>setSelBk(b.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderBottom:`1px solid ${C.b1}22`,cursor:"pointer",background:selBk===b.id?C.ad:"transparent"}} className="hov">
                      <div style={{width:3,height:28,borderRadius:2,background:pg?.color||C.a,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.name}</div>
                        <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{pg?.name} · {pg?.duration}min</div>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.a,flexShrink:0}}>{b.time}</span>
                    </div>
                  );})}
                </div>;
              })}
            </div>
          </div>}
        </div>}
        </>}

        {/* ── SETTINGS ── */}
        {tab==="settings"&&<div style={{maxWidth:600}}>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>General</div>
            <Fld label="Booking URL Prefix"><div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.b1}`}}><span style={{fontSize:11,color:C.t3,fontFamily:FM}}>book.supportdesk.app/</span><span style={{fontSize:11,color:C.a,fontFamily:FM,fontWeight:700}}>your-company</span></div></Fld>
            <Fld label="Timezone"><Sel val="IST" set={()=>{}} opts={[{v:"IST",l:"Asia/Kolkata (IST)"},{v:"EST",l:"America/New_York (EST)"},{v:"PST",l:"America/Los_Angeles (PST)"},{v:"UTC",l:"UTC"},{v:"CET",l:"Europe/Berlin (CET)"}]}/></Fld>
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Notifications</div>
            {[{l:"Email confirmation to guest",v:true},{l:"Email reminder 1hr before",v:true},{l:"Slack notification on booking",v:false},{l:"SMS reminder to guest",v:false},{l:"Email on cancellation",v:true},{l:"Email on reschedule",v:true}].map(n=>(<div key={n.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.b1}22`}}><span style={{fontSize:12}}>{n.l}</span><Toggle val={n.v} set={()=>showT("Updated","info")}/></div>))}
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px"}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Branding</div>
            <Fld label="Logo URL"><Inp val="" set={()=>{}} ph="https://yourcompany.com/logo.png"/></Fld>
            <Fld label="Custom Confirmation Message"><Inp val="Thanks for scheduling! We look forward to chatting." set={()=>{}} ph="Confirmation message"/></Fld>
          </div>
        </div>}
      </div>

      {/* ── BOOKING DETAIL SIDEBAR ── */}
      {selBk&&bk&&(tab==="upcoming"||tab==="past")&&<aside style={{width:360,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Booking Detail</span><button onClick={()=>setSelBk(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
          <Tag text={bk.status.replace("_"," ")} color={STATUS_COLORS[bk.status]||C.t3}/>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 18px"}}>
          {/* Guest info */}
          <div style={{background:C.s2,borderRadius:10,padding:"12px",marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>GUEST</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Av i={bk.name.split(" ").map(n=>n[0]).join("").slice(0,2)} c={bkPg?.color||C.a} s={36}/>
              <div><div style={{fontSize:14,fontWeight:700}}>{bk.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{bk.email}</div>{bk.phone&&<div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{bk.phone}</div>}</div>
            </div>
          </div>
          {/* Meeting info */}
          <div style={{background:C.s2,borderRadius:10,padding:"12px",marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>MEETING</div>
            {[{i:"📅",l:"Page",v:bkPg?.name||"—"},{i:"📅",l:"Date",v:bk.date},{i:"🕐",l:"Time",v:bk.time+(bkPg?" ("+bkPg.duration+"min)":"")},{i:"📍",l:"Location",v:bkPg?.location||"—"},{i:"📝",l:"Created",v:bk.created||"—"}].map(r=>(
              <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
                <span style={{fontSize:10}}>{r.i}</span><span style={{fontSize:10,color:C.t3,width:55,fontFamily:FM}}>{r.l}</span><span style={{fontSize:11,fontWeight:600,color:C.t1}}>{r.v}</span>
              </div>
            ))}
          </div>
          {/* Answers */}
          {bk.answers&&Object.keys(bk.answers).length>0&&<div style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>ANSWERS</div>
            {Object.entries(bk.answers).map(([q,a])=>(
              <div key={q} style={{background:C.s2,borderRadius:8,padding:"8px 12px",marginBottom:4}}>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:2}}>{q}</div>
                <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{a}</div>
              </div>
            ))}
          </div>}
          {/* Notes */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>NOTES</div>
            <textarea value={bk.notes||""} onChange={e=>setBookings(p=>p.map(b=>b.id===bk.id?{...b,notes:e.target.value}:b))} rows={3} placeholder="Add notes…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
          </div>
          {/* Cancel reason */}
          {bk.status==="cancelled"&&bk.cancelReason&&<div style={{padding:"8px 12px",background:C.rd,borderRadius:8,border:`1px solid ${C.r}33`,marginBottom:12}}>
            <div style={{fontSize:9,fontWeight:700,color:C.r,fontFamily:FM}}>CANCEL REASON</div>
            <div style={{fontSize:11,color:C.t1,marginTop:2}}>{bk.cancelReason}</div>
          </div>}
        </div>
        {/* Actions */}
        {bk.status==="confirmed"&&<div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0,display:"flex",gap:4}}>
          <Btn ch="📅 Reschedule" v="ghost" sm full onClick={()=>{setShowResched(bk.id);setRDate(bk.date);setRTime(bk.time);}}/>
          <Btn ch="✓ Complete" v="success" sm full onClick={()=>{setBookings(p=>p.map(b=>b.id===bk.id?{...b,status:"completed"}:b));showT("Completed!","success");}}/>
          <Btn ch="✕ Cancel" v="danger" sm full onClick={()=>{setShowCancel(bk.id);setCancelReason("");}}/>
        </div>}
      </aside>}
    </div>

    {/* Reschedule modal */}
    {showResched&&<Mdl title="Reschedule Booking" onClose={()=>setShowResched(null)} w={380}>
      <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Pick a new date and time for {bookings.find(b=>b.id===showResched)?.name}:</div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="New Date"><Inp val={rDate} set={setRDate} type="date"/></Fld></div><div style={{flex:1}}><Fld label="New Time"><Inp val={rTime} set={setRTime} type="time"/></Fld></div></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowResched(null)}/><Btn ch="Reschedule" v="primary" onClick={()=>doResched(showResched)}/></div>
    </Mdl>}
    {/* Cancel modal */}
    {showCancel&&<Mdl title="Cancel Booking" onClose={()=>setShowCancel(null)} w={380}>
      <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Cancel booking for {bookings.find(b=>b.id===showCancel)?.name}?</div>
      <Fld label="Reason (optional)"><textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} rows={2} placeholder="Why is this being cancelled?" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><Btn ch="Keep Booking" v="ghost" onClick={()=>setShowCancel(null)}/><Btn ch="Cancel Booking" v="danger" onClick={()=>doCancel(showCancel)}/></div>
    </Mdl>}
    {/* New page modal */}
    {showNew&&<Mdl title="Create Booking Page" onClose={()=>setShowNew(false)} w={440}>
      <Fld label="Page Name"><Inp val={newName} set={setNewName} ph="e.g. Product Demo, Quick Chat, Strategy Call…"/></Fld>
      <Fld label="Duration"><div style={{display:"flex",gap:6}}>{DURATIONS.map(d=>(<button key={d} onClick={()=>setNewDur(d)} style={{flex:1,padding:"10px",borderRadius:8,fontSize:12,fontWeight:700,background:newDur===d?C.a+"18":"transparent",color:newDur===d?C.a:C.t3,border:`1.5px solid ${newDur===d?C.a+"55":C.b1}`,cursor:"pointer"}}>{d}m</button>))}</div></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNew(false)}/><Btn ch="Create Page" v="primary" onClick={()=>{if(!newName.trim())return showT("Name required","error");const slug=newName.toLowerCase().replace(/[^a-z0-9]+/g,"-");const nid="bp"+uid();setPages(p=>[{id:nid,name:newName,duration:newDur,desc:"",color:COLORS[p.length%COLORS.length],active:false,location:"Zoom",buffer:5,maxPerDay:4,minNotice:24,availability:[{day:1,start:"09:00",end:"18:00"},{day:2,start:"09:00",end:"18:00"},{day:3,start:"09:00",end:"18:00"},{day:4,start:"09:00",end:"18:00"},{day:5,start:"09:00",end:"18:00"}],questions:[],bookings:0,slug},...p]);setShowNew(false);setSelPage(nid);showT("Created!","success");}}/></div>
    </Mdl>}
  </div>;

  // ── PAGE EDITOR ──
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,fontFamily:FB,color:C.t1}}>
    <div style={{flexShrink:0,padding:"12px 24px",background:C.s1,borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:12}}>
      <button onClick={()=>setSelPage(null)} style={{padding:"6px 10px",borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:12,color:C.t2}}>← Back</button>
      <div style={{flex:1}}><h2 style={{fontSize:17,fontWeight:800,fontFamily:FD,margin:0}}>{pg.name}</h2><p style={{fontSize:10,color:C.t3,fontFamily:FM}}>⏱ {pg.duration}min · 📍 {pg.location} · {bookings.filter(b=>b.page===pg.id).length} bookings</p></div>
      <Toggle val={pg.active} set={v=>updatePage("active",v)}/><Tag text={pg.active?"Active":"Draft"} color={pg.active?C.g:C.t3}/>
      <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>{[["edit","✎ Edit"],["preview","👁 Preview"],["share","🔗 Share"]].map(([v,l])=>(<button key={v} onClick={()=>setPageView(v)} style={{padding:"6px 14px",fontSize:11,fontWeight:700,fontFamily:FM,background:pageView===v?C.ad:"transparent",color:pageView===v?C.a:C.t3,border:"none",cursor:"pointer"}}>{l}</button>))}</div>
    </div>
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* Edit */}
      {pageView==="edit"&&<div style={{flex:1,padding:"20px 24px",overflowY:"auto",maxWidth:650}}>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Basic Info</div>
          <Fld label="Name"><Inp val={pg.name} set={v=>updatePage("name",v)} ph="Product Demo"/></Fld>
          <Fld label="Description"><textarea value={pg.desc||""} onChange={e=>updatePage("desc",e.target.value)} rows={2} placeholder="Describe this meeting…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
          <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Duration"><div style={{display:"flex",gap:4}}>{DURATIONS.map(d=>(<button key={d} onClick={()=>updatePage("duration",d)} style={{flex:1,padding:"6px",borderRadius:6,fontSize:11,fontWeight:700,background:pg.duration===d?C.a+"18":"transparent",color:pg.duration===d?C.a:C.t3,border:`1.5px solid ${pg.duration===d?C.a+"55":C.b1}`,cursor:"pointer"}}>{d}</button>))}</div></Fld></div><div style={{flex:1}}><Fld label="Location"><Sel val={pg.location} set={v=>updatePage("location",v)} opts={["Zoom","Google Meet","Teams","Phone","In-Person","Custom URL"].map(l=>({v:l,l}))}/></Fld></div></div>
          <Fld label="Color"><div style={{display:"flex",gap:6}}>{COLORS.map(c=>(<button key={c} onClick={()=>updatePage("color",c)} style={{width:24,height:24,borderRadius:"50%",background:c,border:`3px solid ${pg.color===c?"#fff":"transparent"}`,cursor:"pointer",boxShadow:pg.color===c?`0 0 0 2px ${c}`:"none"}}/>))}</div></Fld>
          <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Buffer (min)"><Inp val={String(pg.buffer)} set={v=>updatePage("buffer",Number(v)||0)} type="number"/></Fld></div><div style={{flex:1}}><Fld label="Max/Day"><Inp val={String(pg.maxPerDay)} set={v=>updatePage("maxPerDay",Number(v)||1)} type="number"/></Fld></div><div style={{flex:1}}><Fld label="Min Notice (hrs)"><Inp val={String(pg.minNotice)} set={v=>updatePage("minNotice",Number(v)||1)} type="number"/></Fld></div></div>
        </div>
        {/* Availability */}
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Availability</div>
          {DAYS_F.map((day,di)=>{const slot=pg.availability.find(a=>a.day===di);return(
            <div key={di} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.b1}22`}}>
              <div style={{width:100}}><button onClick={()=>{if(slot)updatePage("availability",pg.availability.filter(a=>a.day!==di));else updatePage("availability",[...pg.availability,{day:di,start:"09:00",end:"18:00"}]);}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:slot?600:400,color:slot?C.t1:C.t3}}><div style={{width:14,height:14,borderRadius:4,border:`2px solid ${slot?C.g:C.b1}`,background:slot?C.g:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff"}}>{slot?"✓":""}</div>{day.slice(0,3)}</button></div>
              {slot?<div style={{display:"flex",gap:6,alignItems:"center",flex:1}}><input type="time" value={slot.start} onChange={e=>updatePage("availability",pg.availability.map(a=>a.day===di?{...a,start:e.target.value}:a))} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t1,fontFamily:FM,outline:"none"}}/><span style={{fontSize:10,color:C.t3}}>to</span><input type="time" value={slot.end} onChange={e=>updatePage("availability",pg.availability.map(a=>a.day===di?{...a,end:e.target.value}:a))} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t1,fontFamily:FM,outline:"none"}}/></div>:<span style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>Unavailable</span>}
            </div>
          );})}
        </div>
        {/* Questions */}
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Booking Questions ({pg.questions.length})</div>
          {pg.questions.map((q,i)=>(
            <div key={q.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"8px 10px",background:C.s2,borderRadius:8}}>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{i+1}</span>
              <input value={q.label||""} onChange={e=>updatePage("questions",pg.questions.map((x,j)=>j===i?{...x,label:e.target.value}:x))} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}} placeholder="Question…"/>
              <select value={q.type||"text"} onChange={e=>updatePage("questions",pg.questions.map((x,j)=>j===i?{...x,type:e.target.value}:x))} style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:10,color:C.t1,fontFamily:FB,outline:"none"}}><option value="text">Text</option><option value="textarea">Long Text</option><option value="email">Email</option><option value="phone">Phone</option><option value="select">Dropdown</option></select>
              <button onClick={()=>updatePage("questions",pg.questions.map((x,j)=>j===i?{...x,required:!x.required}:x))} style={{fontSize:9,padding:"3px 8px",borderRadius:5,fontWeight:700,fontFamily:FM,background:q.required?C.r+"15":"transparent",color:q.required?C.r:C.t3,border:`1px solid ${q.required?C.r+"33":C.b1}`,cursor:"pointer"}}>{q.required?"Req":"Opt"}</button>
              <button onClick={()=>updatePage("questions",pg.questions.filter((_,j)=>j!==i))} style={{fontSize:12,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
            </div>
          ))}
          <button onClick={()=>updatePage("questions",[...pg.questions,{id:"q"+uid(),label:"",type:"text",required:false}])} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,border:`2px dashed ${C.a}44`,background:"transparent",color:C.a,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:FM,width:"100%",justifyContent:"center"}} className="hov">+ Add Question</button>
        </div>
      </div>}
      {/* Preview */}
      {pageView==="preview"&&<div style={{flex:1,display:"flex",justifyContent:"center",alignItems:"flex-start",padding:30,overflowY:"auto",background:C.bg}}>
        <div style={{width:420,background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.1)"}}>
          <div style={{height:6,background:pg.color}}/><div style={{padding:"28px 30px"}}>
            <div style={{fontSize:22,fontWeight:800,color:"#111",marginBottom:4}}>{pg.name}</div>
            <div style={{display:"flex",gap:12,fontSize:12,color:"#666",marginBottom:14}}><span>⏱ {pg.duration}min</span><span>📍 {pg.location}</span></div>
            <div style={{fontSize:13,color:"#555",lineHeight:1.6,marginBottom:20}}>{pg.desc||"No description."}</div>
            <div style={{background:"#f8f9fa",borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:10}}>Select a Date & Time</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:12}}>
                {["S","M","T","W","T","F","S"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"#999",fontWeight:700}}>{d}</div>)}
                {[...Array(31)].map((_,i)=><div key={i} style={{textAlign:"center",fontSize:11,padding:6,borderRadius:6,background:i===28?"#111":pg.availability.some(a=>a.day===(i%7))?"#fff":"#f8f8f8",color:i===28?"#fff":pg.availability.some(a=>a.day===(i%7))?"#111":"#ccc",fontWeight:i===28?700:400,cursor:"pointer"}}>{i+1}</div>)}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["9:00","9:30","10:00","10:30","11:00","14:00","14:30","15:00"].map(t=><button key={t} style={{padding:"6px 12px",borderRadius:6,border:"1px solid #ddd",background:t==="10:00"?pg.color:"#fff",color:t==="10:00"?"#fff":"#333",fontSize:11,cursor:"pointer",fontWeight:t==="10:00"?700:400}}>{t}</button>)}</div>
            </div>
            {pg.questions.length>0&&<div style={{marginBottom:16}}>{pg.questions.map(q=>(<div key={q.id} style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:"#333",marginBottom:3}}>{q.label||"Question"}{q.required&&<span style={{color:"#e11"}}>*</span>}</div>{q.type==="textarea"?<textarea disabled rows={2} placeholder="Type here…" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #ddd",background:"#f9f9f9",fontSize:11,color:"#999",resize:"none",boxSizing:"border-box"}}/>:<input disabled placeholder="Type here…" style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #ddd",background:"#f9f9f9",fontSize:11,color:"#999",boxSizing:"border-box"}}/>}</div>))}</div>}
            <button disabled style={{width:"100%",padding:12,borderRadius:10,background:pg.color,color:"#fff",fontSize:14,fontWeight:700,border:"none",opacity:.9}}>Confirm Booking</button>
          </div>
        </div>
      </div>}
      {/* Share */}
      {pageView==="share"&&<div style={{flex:1,padding:"20px 24px",overflowY:"auto",maxWidth:600}}>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Booking Link</div>
          <div style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.b1}`}}><span style={{fontSize:12,color:C.a,fontFamily:FM,flex:1}}>https://book.supportdesk.app/{pg.slug}</span><Btn ch="📋 Copy" v="primary" sm onClick={()=>showT("Copied!","success")}/></div>
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Embed Code</div>
          <div style={{background:C.bg,borderRadius:8,padding:14,fontFamily:FM,fontSize:10,color:C.a,lineHeight:1.8,border:`1px solid ${C.b1}`,wordBreak:"break-all"}}>{`<script src="https://cdn.supportdesk.app/bookings.js"></script>`}<br/>{`<div data-sd-booking="${pg.slug}"></div>`}</div>
          <Btn ch="📋 Copy" v="ghost" sm onClick={()=>showT("Copied!","success")}/>
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Inline Button</div>
          <div style={{background:C.bg,borderRadius:8,padding:14,fontFamily:FM,fontSize:10,color:C.p,lineHeight:1.8,border:`1px solid ${C.b1}`}}>{`<a href="https://book.supportdesk.app/${pg.slug}" style="padding:12px 24px;background:${pg.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Book a ${pg.name}</a>`}</div>
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Email Signature</div>
          <div style={{padding:14,background:C.bg,borderRadius:8,border:`1px solid ${C.b1}`,textAlign:"center"}}><a style={{display:"inline-block",padding:"8px 20px",background:pg.color,color:"#fff",borderRadius:6,fontSize:12,fontWeight:700,textDecoration:"none"}}>📅 Book a {pg.duration}-min {pg.name}</a></div>
        </div>
      </div>}
    </div>
  </div>;
}
// ═══ CALENDAR ═══════════════════════════════════════════════════════════
function CalendarScr({embedded}){
  const [view,setView]=useState("month");// month|week|day
  const [curDate,setCurDate]=useState(new Date(2026,2,29));// March 29 2026
  const [selEvent,setSelEvent]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [evTitle,setEvTitle]=useState("");const [evDate,setEvDate]=useState("");const [evTime,setEvTime]=useState("");const [evEnd,setEvEnd]=useState("");const [evType,setEvType]=useState("meeting");const [evDesc,setEvDesc]=useState("");const [evColor,setEvColor]=useState(C.a);const [editEv,setEditEv]=useState(null);

  const EVENT_TYPES=[{v:"meeting",l:"Meeting",i:"🤝",c:C.a},{v:"task",l:"Task Due",i:"✅",c:C.y},{v:"call",l:"Call",i:"📞",c:C.g},{v:"demo",l:"Demo",i:"🖥",c:C.p},{v:"deadline",l:"Deadline",i:"🔴",c:C.r},{v:"follow_up",l:"Follow-up",i:"📋",c:C.cy},{v:"internal",l:"Internal",i:"👥",c:C.t3},{v:"personal",l:"Personal",i:"🏠",c:"#ff6b35"}];

  const [events,setEvents]=useState([
    // March 2026 events - integrated with CRM data
    {id:"ev1",title:"TechCorp Enterprise Demo",date:"2026-03-28",time:"10:00",end:"10:45",type:"demo",desc:"Product demo with IT team. Cover: multi-brand, security, SSO.",color:C.p,attendees:"Priya, Dev, Arjun Mehta",link:"crm"},
    {id:"ev2",title:"FreshMart Discovery Call",date:"2026-03-27",time:"14:00",end:"14:30",type:"call",desc:"Team size, requirements, current tools. Referral from EduConnect.",color:C.g,attendees:"Dev, Ananya Reddy",link:"crm"},
    {id:"ev3",title:"Globex API Deep-Dive",date:"2026-03-29",time:"11:00",end:"12:00",type:"meeting",desc:"API walkthrough, webhook setup, OAuth2 flow.",color:C.a,attendees:"Meena, Dev, James Wilson",link:"crm"},
    {id:"ev4",title:"Send Proposal to TechCorp",date:"2026-03-28",time:"",end:"",type:"task",desc:"Enterprise plan proposal with security addendum.",color:C.y,attendees:"Priya",link:"crm"},
    {id:"ev5",title:"Follow up FreshMart",date:"2026-03-27",time:"",end:"",type:"task",desc:"Call Ananya about requirements.",color:C.y,attendees:"Dev",link:"crm"},
    {id:"ev6",title:"Weekly Sales Standup",date:"2026-03-27",time:"09:00",end:"09:15",type:"internal",desc:"Pipeline review, blockers, Q2 targets.",color:C.t3,attendees:"Priya, Dev, Meena",link:""},
    {id:"ev7",title:"PayEase Enterprise Walkthrough",date:"2026-03-30",time:"11:30",end:"12:15",type:"demo",desc:"SSO, audit logs, custom roles demo. Upgrade path.",color:C.p,attendees:"Dev, Priya, Rahul Kapoor",link:"crm"},
    {id:"ev8",title:"FinanceHub Contract Review",date:"2026-04-01",time:"15:00",end:"15:30",type:"meeting",desc:"HIPAA terms, SLA guarantees. Legal joining.",color:C.a,attendees:"Priya, Fatima Al-Rashid",link:"crm"},
    {id:"ev9",title:"CloudNine Technical Assessment",date:"2026-04-02",time:"14:30",end:"15:30",type:"demo",desc:"SSO, API webhooks, data migration from Zendesk.",color:C.p,attendees:"Priya, Meena, Vikram Sinha",link:"crm"},
    {id:"ev10",title:"Q2 Planning & Strategy",date:"2026-03-31",time:"10:00",end:"11:30",type:"internal",desc:"Q1 review, Q2 targets, territory assignments, hiring.",color:C.t3,attendees:"Priya, Dev, Meena, Aryan",link:""},
    {id:"ev11",title:"Contract Review — Legal",date:"2026-04-01",time:"",end:"",type:"deadline",desc:"FinanceHub HIPAA compliance terms due.",color:C.r,attendees:"Priya",link:"crm"},
    {id:"ev12",title:"Prepare Demo Sandbox",date:"2026-03-30",time:"",end:"",type:"task",desc:"Set up sandbox with sample data for GlobalRetail.",color:C.y,attendees:"Meena",link:"crm"},
    {id:"ev13",title:"ROI Calculator for PayEase",date:"2026-03-29",time:"",end:"",type:"task",desc:"Build spreadsheet showing cost savings vs Freshdesk.",color:C.y,attendees:"Dev",link:"crm"},
    {id:"ev14",title:"Competitive Analysis Update",date:"2026-03-31",time:"",end:"",type:"task",desc:"Update Zendesk vs SupportDesk battle card.",color:C.y,attendees:"Meena",link:"crm"},
    {id:"ev15",title:"Team Lunch",date:"2026-03-28",time:"12:30",end:"13:30",type:"personal",desc:"Team outing — Koramangala restaurant.",color:"#ff6b35",attendees:"Everyone",link:""},
    {id:"ev16",title:"Priya — Dentist",date:"2026-04-03",time:"09:00",end:"10:00",type:"personal",desc:"Annual checkup.",color:"#ff6b35",attendees:"Priya",link:""},
    {id:"ev17",title:"StartupXYZ Follow-up",date:"2026-03-26",time:"16:00",end:"16:30",type:"follow_up",desc:"Feature comparison vs Freshdesk and Intercom.",color:C.cy,attendees:"Dev, Meera Krishnan",link:"crm"},
    {id:"ev18",title:"Q2 Pipeline Review Deck",date:"2026-03-31",time:"",end:"",type:"deadline",desc:"Slide deck ready for Monday standup.",color:C.r,attendees:"Priya",link:"crm"}
  ]);
  // ═══ CALENDAR API LOADING ═══
  useEffect(()=>{if(!api.isConnected())return;api.get("/calendar/events").then(r=>{if(r?.data?.length)setEvents(r.data.map(e=>({...e,time:e.time_start||"",end:e.time_end||"",desc:e.description||""})));}).catch(()=>{});},[]);
  // AI Smart Scheduling
  const [calAi,setCalAi]=useState(null);const [calAiLoad,setCalAiLoad]=useState(false);
  const genCalAi=async()=>{setCalAiLoad(true);try{const ctx=`${events.length} events this month. Types: ${events.map(e=>e.type).join(",")}. Busiest days: ${events.reduce((m,e)=>{m[e.date]=(m[e.date]||0)+1;return m;},{})}.`;const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,system:"You are a scheduling AI. Analyze calendar: suggest optimal meeting slots, flag conflicts, recommend prep actions. 4-5 bullets. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setCalAi(d.content?.[0]?.text);}catch{setCalAi("📅 Best slots for demos this week: Tue 10-11am, Thu 2-3pm (no conflicts)\n⚠️ March 31 is overloaded — 4 events including Q2 Planning, consider rescheduling\n🔔 TechCorp demo tomorrow at 11am — prep security compliance docs beforehand\n💡 No follow-ups scheduled for won deals — add check-in for EduConnect\n🕐 Priya has 3 back-to-back meetings Tue — add 15min buffers");}setCalAiLoad(false);};

  const y=curDate.getFullYear(),mo=curDate.getMonth(),d=curDate.getDate();
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const daysInMonth=new Date(y,mo+1,0).getDate();
  const firstDay=new Date(y,mo,1).getDay();
  const today=new Date();const isToday=(dy)=>dy===today.getDate()&&mo===today.getMonth()&&y===today.getFullYear();
  const dateStr=(dy)=>`${y}-${String(mo+1).padStart(2,"0")}-${String(dy).padStart(2,"0")}`;
  const getEventsForDate=(ds)=>events.filter(e=>e.date===ds);
  const getEventsForWeek=()=>{const start=new Date(y,mo,d-curDate.getDay());return[...Array(7)].map((_,i)=>{const dd=new Date(start);dd.setDate(start.getDate()+i);const ds=`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;return{date:dd,dateStr:ds,events:getEventsForDate(ds)};});};
  const nav=(dir)=>{if(view==="month")setCurDate(new Date(y,mo+dir,1));else if(view==="week")setCurDate(new Date(y,mo,d+dir*7));else setCurDate(new Date(y,mo,d+dir));};
  const goToday=()=>setCurDate(new Date());
  const openNewEvent=(dateStr)=>{setEvTitle("");setEvDate(dateStr||"");setEvTime("");setEvEnd("");setEvType("meeting");setEvDesc("");setEvColor(C.a);setEditEv(null);setShowForm(true);};
  const openEditEvent=(ev)=>{setEvTitle(ev.title);setEvDate(ev.date);setEvTime(ev.time||"");setEvEnd(ev.end||"");setEvType(ev.type);setEvDesc(ev.desc||"");setEvColor(ev.color);setEditEv(ev);setShowForm(true);};
  const saveEvent=()=>{if(!evTitle.trim())return showT("Title required","error");const p={title:evTitle,date:evDate,time:evTime,end:evEnd,type:evType,desc:evDesc,color:evColor||EVENT_TYPES.find(t=>t.v===evType)?.c||C.a,attendees:"",link:""};if(editEv)setEvents(pr=>pr.map(e=>e.id===editEv.id?{...e,...p}:e));else setEvents(pr=>[{id:"ev"+uid(),...p},...pr]);showT(editEv?"Updated":"Event created!","success");setShowForm(false);setEditEv(null);setSelEvent(null);};

  const evTypeInfo=(t)=>EVENT_TYPES.find(x=>x.v===t)||EVENT_TYPES[0];
  const totalEvents=events.filter(e=>e.date.startsWith(`${y}-${String(mo+1).padStart(2,"0")}`)).length;

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,fontFamily:FB,color:C.t1}}>
    {/* Header */}
    <div style={{flexShrink:0,padding:embedded?"10px 24px":"14px 24px",background:C.s1,borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      {!embedded&&<div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg, ${C.a}, ${C.cy})`,display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon id="calendar" s={18} col="#fff"/></div>
        <div><h1 style={{fontSize:20,fontWeight:800,fontFamily:FD,margin:0}}>Calendar</h1><p style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:1}}>{totalEvents} events in {MONTHS[mo]} {y}</p></div>
      </div>}
      {embedded&&<div style={{fontSize:12,color:C.t3,fontFamily:FM}}>{totalEvents} events in {MONTHS[mo]}</div>}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <Btn ch="Today" v="ghost" sm onClick={goToday}/>
        <button onClick={()=>nav(-1)} style={{width:28,height:28,borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:14,color:C.t2,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
        <span style={{fontSize:15,fontWeight:700,fontFamily:FD,minWidth:180,textAlign:"center"}}>{view==="day"?`${DAYS[curDate.getDay()]}, ${MONTHS[mo]} ${d}`:`${MONTHS[mo]} ${y}`}</span>
        <button onClick={()=>nav(1)} style={{width:28,height:28,borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:14,color:C.t2,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden",marginLeft:8}}>
          {[["month","Month"],["week","Week"],["day","Day"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"6px 14px",fontSize:11,fontWeight:700,fontFamily:FM,background:view===v?C.ad:"transparent",color:view===v?C.a:C.t3,border:"none",cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        <Btn ch="+ New Event" v="primary" onClick={()=>openNewEvent(dateStr(d))}/>
      </div>
    </div>

    <div style={{flex:1,display:"flex",overflow:"hidden",flexDirection:"column"}}>
      {/* AI Smart Scheduling */}
      <div style={{padding:"8px 16px 0"}}><AiInsight title="SMART SCHEDULING" loading={calAiLoad} onRefresh={genCalAi} compact items={calAi?calAi.split("\n").filter(l=>l.trim()).map(l=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh for optimal meeting slots, conflict detection, and prep reminders."}]}/></div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* ═══ MONTH VIEW ═══ */}
      {view==="month"&&<div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px",overflowY:"auto"}}>
        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
          {DAYS.map(d=><div key={d} style={{padding:"8px",textAlign:"center",fontSize:11,fontWeight:700,color:C.t3,fontFamily:FM}}>{d}</div>)}
        </div>
        {/* Calendar grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,flex:1}}>
          {/* Empty cells before month starts */}
          {[...Array(firstDay)].map((_,i)=><div key={"e"+i} style={{background:C.bg,borderRadius:6,padding:4,minHeight:80,opacity:.3}}/>)}
          {/* Day cells */}
          {[...Array(daysInMonth)].map((_,i)=>{const dy=i+1;const ds=dateStr(dy);const dayEvs=getEventsForDate(ds);const isTd=isToday(dy);const isSel=d===dy&&view==="month";return(
            <div key={dy} onClick={()=>{setCurDate(new Date(y,mo,dy));}} style={{background:isTd?C.ad:C.s1,border:`1.5px solid ${isTd?C.a+"44":isSel?C.a+"22":C.b1}`,borderRadius:8,padding:"4px 6px",minHeight:80,cursor:"pointer",transition:"all .1s",overflow:"hidden"}} className="hov">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:isTd?800:600,fontFamily:FD,width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isTd?C.a:"transparent",color:isTd?"#fff":isTd?C.a:curDate.getDay()===0||curDate.getDay()===6?C.t3:C.t1}}>{dy}</span>
                {dayEvs.length>0&&<span style={{fontSize:8,fontFamily:FM,color:C.t3,background:C.s2,padding:"1px 4px",borderRadius:4}}>{dayEvs.length}</span>}
              </div>
              {dayEvs.slice(0,3).map(ev=>{const ti=evTypeInfo(ev.type);return(
                <div key={ev.id} onClick={e=>{e.stopPropagation();setSelEvent(selEvent===ev.id?null:ev.id);}} style={{fontSize:9,padding:"2px 5px",marginBottom:2,borderRadius:4,background:ev.color+"18",color:ev.color,fontWeight:600,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderLeft:`2px solid ${ev.color}`,cursor:"pointer"}}>
                  {ev.time&&<span style={{opacity:.7}}>{ev.time} </span>}{ev.title}
                </div>
              );})}
              {dayEvs.length>3&&<div style={{fontSize:8,color:C.t3,fontFamily:FM,padding:"1px 5px"}}>+{dayEvs.length-3} more</div>}
            </div>
          );})}
        </div>
      </div>}

      {/* ═══ WEEK VIEW ═══ */}
      {view==="week"&&<div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px",overflowY:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",gap:1}}>
          <div/>
          {getEventsForWeek().map(wd=>(
            <div key={wd.dateStr} style={{padding:"8px",textAlign:"center",background:wd.date.toDateString()===today.toDateString()?C.ad:C.s1,borderRadius:"8px 8px 0 0",border:`1px solid ${wd.date.toDateString()===today.toDateString()?C.a+"44":C.b1}`}}>
              <div style={{fontSize:10,fontWeight:600,color:C.t3,fontFamily:FM}}>{DAYS[wd.date.getDay()]}</div>
              <div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:wd.date.toDateString()===today.toDateString()?C.a:C.t1}}>{wd.date.getDate()}</div>
            </div>
          ))}
        </div>
        {/* Time slots */}
        {[8,9,10,11,12,13,14,15,16,17,18].map(hr=>(
          <div key={hr} style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",gap:1,minHeight:50}}>
            <div style={{padding:"4px 8px",fontSize:9,color:C.t3,fontFamily:FM,textAlign:"right"}}>{hr>12?hr-12+"pm":hr+"am"}</div>
            {getEventsForWeek().map(wd=>{const hrEvs=wd.events.filter(e=>e.time&&parseInt(e.time)===hr);return(
              <div key={wd.dateStr+hr} onClick={()=>{setEvDate(wd.dateStr);setEvTime(String(hr).padStart(2,"0")+":00");openNewEvent(wd.dateStr);}} style={{borderBottom:`1px solid ${C.b1}22`,borderRight:`1px solid ${C.b1}22`,padding:2,cursor:"pointer",minHeight:50}} className="hov">
                {hrEvs.map(ev=>(
                  <div key={ev.id} onClick={e=>{e.stopPropagation();setSelEvent(selEvent===ev.id?null:ev.id);}} style={{fontSize:9,padding:"3px 6px",borderRadius:4,background:ev.color+"22",borderLeft:`3px solid ${ev.color}`,color:ev.color,fontWeight:600,fontFamily:FM,marginBottom:2,cursor:"pointer"}}>
                    {ev.title}
                  </div>
                ))}
              </div>
            );})}
          </div>
        ))}
        {/* All-day events */}
        <div style={{display:"grid",gridTemplateColumns:"60px repeat(7,1fr)",gap:1,marginTop:8}}>
          <div style={{padding:"4px 8px",fontSize:9,color:C.t3,fontFamily:FM,textAlign:"right"}}>All day</div>
          {getEventsForWeek().map(wd=>{const allDay=wd.events.filter(e=>!e.time);return(
            <div key={wd.dateStr+"ad"} style={{padding:2}}>
              {allDay.map(ev=>(
                <div key={ev.id} onClick={()=>setSelEvent(selEvent===ev.id?null:ev.id)} style={{fontSize:8,padding:"2px 5px",borderRadius:4,background:ev.color+"18",color:ev.color,fontWeight:600,fontFamily:FM,marginBottom:2,cursor:"pointer",borderLeft:`2px solid ${ev.color}`}}>
                  {evTypeInfo(ev.type).i} {ev.title}
                </div>
              ))}
            </div>
          );})}
        </div>
      </div>}

      {/* ═══ DAY VIEW ═══ */}
      {view==="day"&&<div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 24px",overflowY:"auto"}}>
        {/* All-day events */}
        {(()=>{const ds=dateStr(d);const allDay=getEventsForDate(ds).filter(e=>!e.time);return allDay.length>0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>ALL DAY</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {allDay.map(ev=>(
              <div key={ev.id} onClick={()=>setSelEvent(selEvent===ev.id?null:ev.id)} style={{padding:"8px 14px",borderRadius:8,background:ev.color+"18",border:`1px solid ${ev.color}33`,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14}}>{evTypeInfo(ev.type).i}</span>
                <span style={{fontSize:12,fontWeight:600,color:ev.color}}>{ev.title}</span>
              </div>
            ))}
          </div>
        </div>;})()}
        {/* Hourly timeline */}
        {[7,8,9,10,11,12,13,14,15,16,17,18,19].map(hr=>{const ds=dateStr(d);const hrEvs=getEventsForDate(ds).filter(e=>e.time&&parseInt(e.time)===hr);return(
          <div key={hr} style={{display:"flex",gap:14,minHeight:60,borderBottom:`1px solid ${C.b1}22`}}>
            <div style={{width:50,padding:"8px 0",fontSize:11,color:C.t3,fontFamily:FM,textAlign:"right",flexShrink:0}}>{hr>12?hr-12+":00pm":hr+":00am"}</div>
            <div style={{flex:1,padding:"4px 0",cursor:"pointer"}} onClick={()=>{setEvDate(ds);setEvTime(String(hr).padStart(2,"0")+":00");openNewEvent(ds);}} className="hov">
              {hrEvs.map(ev=>(
                <div key={ev.id} onClick={e=>{e.stopPropagation();setSelEvent(selEvent===ev.id?null:ev.id);}} style={{padding:"10px 14px",borderRadius:8,background:ev.color+"15",borderLeft:`4px solid ${ev.color}`,marginBottom:4,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:14}}>{evTypeInfo(ev.type).i}</span>
                      <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{ev.title}</span>
                    </div>
                    <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{ev.time}{ev.end?" – "+ev.end:""}</span>
                  </div>
                  {ev.desc&&<div style={{fontSize:11,color:C.t3,marginTop:4}}>{ev.desc.slice(0,80)}{ev.desc.length>80?"…":""}</div>}
                  {ev.attendees&&<div style={{fontSize:10,color:C.a,fontFamily:FM,marginTop:3}}>👤 {ev.attendees}</div>}
                </div>
              ))}
            </div>
          </div>
        );})}
      </div>}

      {/* ═══ EVENT DETAIL SIDEBAR ═══ */}
      {selEvent&&(()=>{const ev=events.find(e=>e.id===selEvent);if(!ev)return null;const ti=evTypeInfo(ev.type);return <aside style={{width:340,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Event Details</span><button onClick={()=>setSelEvent(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:40,height:40,borderRadius:10,background:ev.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{ti.i}</div>
            <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{ev.title}</div><div style={{display:"flex",gap:4,marginTop:3}}><Tag text={ti.l} color={ev.color}/>{ev.link==="crm"&&<Tag text="CRM" color={C.p}/>}</div></div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 18px"}}>
          <div style={{background:C.s2,borderRadius:10,padding:"8px 12px",marginBottom:14}}>
            {[{icon:"📅",l:"Date",v:ev.date},{icon:"🕐",l:"Time",v:ev.time?(ev.time+(ev.end?" – "+ev.end:"")):"All day"},{icon:"🏷",l:"Type",v:ti.l},{icon:"👤",l:"Attendees",v:ev.attendees||"—"}].map(r=>(
              <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.b1}11`}}>
                <span style={{fontSize:11}}>{r.icon}</span><span style={{fontSize:10,color:C.t3,width:65,fontFamily:FM}}>{r.l}</span><span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1}}>{r.v}</span>
              </div>
            ))}
          </div>
          {ev.desc&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4,letterSpacing:".5px"}}>DESCRIPTION</div><div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.5,marginBottom:14}}>{ev.desc}</div></>}
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            <Btn ch="✎ Edit" v="ghost" full sm onClick={()=>openEditEvent(ev)}/>
            <Btn ch="🗑 Delete" v="danger" full sm onClick={()=>{setEvents(p=>p.filter(x=>x.id!==ev.id));setSelEvent(null);showT("Deleted","success");}}/>
          </div>
        </div>
      </aside>;})()}
    </div>

    {/* Event form modal */}
    {showForm&&<Mdl title={editEv?"Edit Event":"New Event"} onClose={()=>{setShowForm(false);setEditEv(null);}} w={500}>
      <Fld label="Event Title"><Inp val={evTitle} set={setEvTitle} ph="e.g. TechCorp Demo, Team Standup…"/></Fld>
      <Fld label="Type"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{EVENT_TYPES.map(t=>(
        <button key={t.v} onClick={()=>{setEvType(t.v);setEvColor(t.c);}} style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:600,background:evType===t.v?t.c+"18":"transparent",color:evType===t.v?t.c:C.t3,border:`1.5px solid ${evType===t.v?t.c+"55":C.b1}`,cursor:"pointer"}}>{t.i} {t.l}</button>
      ))}</div></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Date"><Inp val={evDate} set={setEvDate} ph="YYYY-MM-DD" type="date"/></Fld></div><div style={{flex:1}}><Fld label="Start Time"><Inp val={evTime} set={setEvTime} ph="10:00" type="time"/></Fld></div><div style={{flex:1}}><Fld label="End Time"><Inp val={evEnd} set={setEvEnd} ph="11:00" type="time"/></Fld></div></div>
      <Fld label="Description"><textarea value={evDesc} onChange={e=>setEvDesc(e.target.value)} rows={3} placeholder="Event details, agenda, notes…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEditEv(null);}}/>{editEv&&<Btn ch="Delete" v="danger" onClick={()=>{setEvents(p=>p.filter(e=>e.id!==editEv.id));setShowForm(false);setSelEvent(null);showT("Deleted","success");}}/>}<Btn ch={editEv?"Save":"Create Event"} v="primary" onClick={saveEvent}/></div>
    </Mdl>}
    </div>
  </div>;
}


