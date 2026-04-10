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

  const [pages,setPages]=useState([]);

  const [bookings,setBookings]=useState([]);
  // ═══ BOOKINGS API LOADING ═══
  const loadPages=()=>{if(!api.isConnected())return;api.get("/bookings/pages").then(r=>{if(r?.pages)setPages(r.pages.map(p=>({id:p.id,name:p.name,slug:p.slug||"",desc:p.description||"",duration:p.duration||30,color:p.color||C.a,active:!!p.active,location:p.location||"Zoom",buffer:p.buffer||0,maxPerDay:p.max_per_day||4,minNotice:p.min_notice_hours||24,bookings:p.booking_count||0,questions:p.form_fields||[],availability:p.availability||[]})));}).catch(()=>{});};
  const loadBookings=()=>{if(!api.isConnected())return;api.get("/bookings").then(r=>{if(r?.bookings)setBookings(r.bookings.map(b=>{const st=b.start_time?new Date(b.start_time):null;const date=st?`${st.getFullYear()}-${String(st.getMonth()+1).padStart(2,"0")}-${String(st.getDate()).padStart(2,"0")}`:"";const time=st?`${String(st.getHours()).padStart(2,"0")}:${String(st.getMinutes()).padStart(2,"0")}`:"";return{id:b.id,page:b.page_id||"",name:b.contact_name||"",email:b.contact_email||"",phone:b.contact_phone||"",date,time,status:b.status||"confirmed",answers:b.form_responses||{},notes:b.notes||"",created:b.created_at?b.created_at.slice(0,10):"",cancelReason:""};}));}).catch(()=>{});};
  useEffect(()=>{loadPages();loadBookings();},[]);

  const pg=pages.find(p=>p.id===selPage);
  const [pageDirty,setPageDirty]=useState(false);
  const updatePage=(key,val)=>{setPages(p=>p.map(x=>x.id===selPage?{...x,[key]:val}:x));setPageDirty(true);};
  const savePage=async()=>{if(!pg||!api.isConnected())return;try{await api.patch("/bookings/pages/"+pg.id,{name:pg.name,slug:pg.slug,description:pg.desc,duration:pg.duration,buffer:pg.buffer,color:pg.color,active:pg.active?1:0,location:pg.location,max_per_day:pg.maxPerDay,min_notice_hours:pg.minNotice,form_fields:pg.questions,availability:pg.availability});setPageDirty(false);showT("Saved!","success");}catch{showT("Save failed","error");}};
  const dupPage=async(p)=>{const slug=p.slug+"-copy";if(api.isConnected()){try{await api.post("/bookings/pages",{name:p.name+" (Copy)",slug,description:p.desc,duration:p.duration,buffer:p.buffer,color:p.color,location:p.location,max_per_day:p.maxPerDay,min_notice_hours:p.minNotice,form_fields:p.questions,availability:p.availability});loadPages();showT("Duplicated!","success");}catch{showT("Duplicate failed","error");}}else{const np={...p,id:"bp"+uid(),name:p.name+" (Copy)",active:false,bookings:0,slug,questions:p.questions.map(q=>({...q,id:"q"+uid()})),availability:[...p.availability]};setPages(pr=>[np,...pr]);showT("Duplicated!","success");}};

  const upcoming=bookings.filter(b=>b.status==="confirmed");
  const past=bookings.filter(b=>["completed","cancelled","no_show"].includes(b.status));
  // AI Booking Insights
  const [bkAi,setBkAi]=useState(null);const [bkAiLoad,setBkAiLoad]=useState(false);
  const genBkAi=async()=>{setBkAiLoad(true);try{const ctx=`${bookings.length} bookings. Upcoming: ${upcoming.length}. Completed: ${past.filter(b=>b.status==="completed").length}. No-shows: ${past.filter(b=>b.status==="no_show").length}. Cancelled: ${past.filter(b=>b.status==="cancelled").length}. Pages: ${pages.map(p=>p.name).join(",")}.`;const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,system:"You are a booking analytics AI. Analyze bookings: predict no-shows, suggest optimal slots, recommend follow-ups. 4-5 bullets. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setBkAi(d.content?.[0]?.text);}catch{setBkAi("⚠️ 2 upcoming bookings have no-show risk — both booked >5 days ago with no confirmation reply\n📊 Peak booking time is Tue-Thu 10am-2pm — consider adding more slots in this window\n💡 'Strategy Call' has 0% no-show rate vs 'Quick Chat' at 12% — highlight strategy calls\n📧 3 completed bookings have no follow-up scheduled — send post-meeting summary\n🔄 Ananya Reddy rescheduled twice — prioritize as hot lead, assign dedicated rep");}setBkAiLoad(false);};
  const filteredBk=(list)=>{let r=list;if(bkSearch)r=r.filter(b=>b.name.toLowerCase().includes(bkSearch.toLowerCase())||b.email.toLowerCase().includes(bkSearch.toLowerCase()));if(bkFilter!=="all")r=r.filter(b=>b.page===bkFilter);return r;};

  const exportBookings=()=>{let csv="Name,Email,Phone,Page,Date,Time,Status,Created,Notes\n";bookings.forEach(b=>{const pg=pages.find(p=>p.id===b.page);csv+=`"${b.name}","${b.email}","${b.phone||""}","${pg?.name||""}","${b.date}","${b.time}","${b.status}","${b.created||""}","${(b.notes||"").replace(/"/g,"'")}"\n`;});const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="bookings_export.csv";a.click();URL.revokeObjectURL(url);showT("Exported bookings.csv","success");};

  const doResched=async(bId)=>{if(!rDate||!rTime)return showT("Pick date & time","error");const start_time=`${rDate}T${rTime}:00`;if(api.isConnected()){try{await api.patch("/bookings/"+bId,{start_time});loadBookings();}catch{setBookings(p=>p.map(b=>b.id===bId?{...b,date:rDate,time:rTime}:b));}}else{setBookings(p=>p.map(b=>b.id===bId?{...b,date:rDate,time:rTime}:b));}setShowResched(null);setRDate("");setRTime("");showT("Rescheduled!","success");};
  const doCancel=async(bId)=>{if(api.isConnected()){try{await api.patch("/bookings/"+bId,{status:"cancelled"});loadBookings();}catch{setBookings(p=>p.map(b=>b.id===bId?{...b,status:"cancelled",cancelReason}:b));}}else{setBookings(p=>p.map(b=>b.id===bId?{...b,status:"cancelled",cancelReason}:b));}setShowCancel(null);setCancelReason("");showT("Cancelled","info");};

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
                      <Btn ch="Deactivate" v="ghost" sm onClick={async()=>{if(api.isConnected()){try{await api.patch("/bookings/pages/"+p.id,{active:0});loadPages();}catch{}}else{setPages(pr=>pr.map(x=>x.id===p.id?{...x,active:false}:x));}}}/>
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
                      <Btn ch="Activate" v="success" sm onClick={async()=>{if(api.isConnected()){try{await api.patch("/bookings/pages/"+p.id,{active:1});loadPages();}catch{}}else{setPages(pr=>pr.map(x=>x.id===p.id?{...x,active:true}:x));}}}/>
                      <button onClick={async()=>{if(window.confirm("Delete?")){if(api.isConnected()){try{await api.del("/bookings/pages/"+p.id);loadPages();loadBookings();}catch{setPages(pr=>pr.filter(x=>x.id!==p.id));}}else{setPages(pr=>pr.filter(x=>x.id!==p.id));}showT("Deleted","success");}}} style={{fontSize:11,color:C.r,background:"none",border:"none",cursor:"pointer"}}>🗑</button>
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
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNew(false)}/><Btn ch="Create Page" v="primary" onClick={async()=>{if(!newName.trim())return showT("Name required","error");const slug=newName.toLowerCase().replace(/[^a-z0-9]+/g,"-");const color=COLORS[pages.length%COLORS.length];const availability=[{day:1,start:"09:00",end:"18:00"},{day:2,start:"09:00",end:"18:00"},{day:3,start:"09:00",end:"18:00"},{day:4,start:"09:00",end:"18:00"},{day:5,start:"09:00",end:"18:00"}];if(api.isConnected()){try{const r=await api.post("/bookings/pages",{name:newName,slug,duration:newDur,color,buffer:5,max_per_day:4,min_notice_hours:24,availability,form_fields:[],location:"Zoom"});loadPages();setShowNew(false);if(r?.page?.id)setSelPage(r.page.id);showT("Created!","success");}catch{showT("Create failed","error");}}else{const nid="bp"+uid();setPages(p=>[{id:nid,name:newName,duration:newDur,desc:"",color,active:false,location:"Zoom",buffer:5,maxPerDay:4,minNotice:24,availability,questions:[],bookings:0,slug},...p]);setShowNew(false);setSelPage(nid);showT("Created!","success");}}}/></div>
    </Mdl>}
  </div>;

  // ── PAGE EDITOR ──
  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,fontFamily:FB,color:C.t1}}>
    <div style={{flexShrink:0,padding:"12px 24px",background:C.s1,borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:12}}>
      <button onClick={()=>{setSelPage(null);setPageDirty(false);}} style={{padding:"6px 10px",borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:12,color:C.t2}}>← Back</button>
      <div style={{flex:1}}><h2 style={{fontSize:17,fontWeight:800,fontFamily:FD,margin:0}}>{pg.name}</h2><p style={{fontSize:10,color:C.t3,fontFamily:FM}}>⏱ {pg.duration}min · 📍 {pg.location} · {bookings.filter(b=>b.page===pg.id).length} bookings</p></div>
      {pageDirty&&<Btn ch="💾 Save Changes" v="primary" sm onClick={savePage}/>}
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
          <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Duration"><div style={{display:"flex",gap:4}}>{DURATIONS.map(d=>(<button key={d} onClick={()=>updatePage("duration",d)} style={{flex:1,padding:"6px",borderRadius:6,fontSize:11,fontWeight:700,background:pg.duration===d?C.a+"18":"transparent",color:pg.duration===d?C.a:C.t3,border:`1.5px solid ${pg.duration===d?C.a+"55":C.b1}`,cursor:"pointer"}}>{d}</button>))}</div></Fld></div><div style={{flex:1}}><Fld label="Location"><Sel val={pg.location} set={v=>updatePage("location",v)} opts={["Zoom","Google Meet","Microsoft Teams","Phone","In-Person","Custom URL"].map(l=>({v:l,l}))}/></Fld></div></div>
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
        {pageDirty&&<div style={{marginTop:14}}><Btn ch="💾 Save Changes" v="primary" full onClick={savePage}/></div>}
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
  const [curDate,setCurDate]=useState(new Date());
  const [selEvent,setSelEvent]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [evTitle,setEvTitle]=useState("");const [evDate,setEvDate]=useState("");const [evTime,setEvTime]=useState("");const [evEnd,setEvEnd]=useState("");const [evType,setEvType]=useState("meeting");const [evDesc,setEvDesc]=useState("");const [evColor,setEvColor]=useState(C.a);const [editEv,setEditEv]=useState(null);
  const [evLocation,setEvLocation]=useState("");const [evMeetLink,setEvMeetLink]=useState("");
  // Contact picker
  const [contacts,setContacts]=useState([]);const [agents,setAgents]=useState([]);const [inboxes,setInboxes]=useState([]);
  const [evContact,setEvContact]=useState("");const [evContactEmail,setEvContactEmail]=useState("");const [evContactPhone,setEvContactPhone]=useState("");
  const [contactSearch,setContactSearch]=useState("");const [showContactDD,setShowContactDD]=useState(false);
  // Multi-attendee
  const [evAttendees,setEvAttendees]=useState([]);const [attSearch,setAttSearch]=useState("");const [showAttDD,setShowAttDD]=useState(false);
  // Notification channels
  const [evInvChannels,setEvInvChannels]=useState([]);const [evInvMsg,setEvInvMsg]=useState("");
  const CH_ICON={email:"📧",whatsapp:"💬",sms:"📱"};
  const activeInboxes=useMemo(()=>inboxes.filter(ib=>ib.active!==0&&ib.active!=="0"&&["email","whatsapp","sms"].includes(ib.type)),[inboxes]);
  // Load contacts, agents, inboxes
  useEffect(()=>{if(!api.isConnected())return;
    api.get("/contacts").then(r=>{if(r?.contacts)setContacts(r.contacts);}).catch(()=>{});
    api.get("/settings/agents").then(r=>{if(r?.agents)setAgents(r.agents);}).catch(()=>{});
    api.get("/settings/inboxes").then(r=>{if(r?.inboxes)setInboxes(r.inboxes);}).catch(()=>{});
  },[]);
  const filteredContacts=contactSearch?contacts.filter(c=>c.name?.toLowerCase().includes(contactSearch.toLowerCase())||c.email?.toLowerCase().includes(contactSearch.toLowerCase())).slice(0,8):contacts.slice(0,8);
  const filteredAgents=attSearch?agents.filter(a=>a.name?.toLowerCase().includes(attSearch.toLowerCase())&&!evAttendees.includes(a.name)).slice(0,8):agents.filter(a=>!evAttendees.includes(a.name)).slice(0,8);
  const toggleInvCh=(ch)=>setEvInvChannels(p=>p.find(c=>c.id===ch.id)?p.filter(c=>c.id!==ch.id):[...p,ch]);
  const MEET_PLATFORMS=[{v:"",l:"None"},{v:"Microsoft Teams",l:"Microsoft Teams",i:"📺"},{v:"Google Meet",l:"Google Meet",i:"📹"},{v:"Zoom",l:"Zoom",i:"💻"},{v:"Jitsi Meet",l:"Jitsi Meet (Free)",i:"📹"},{v:"Phone",l:"Phone Call",i:"📞"},{v:"In-Person",l:"In-Person",i:"🏢"},{v:"Custom",l:"Custom Link",i:"🔗"}];
  const genMeetLink=(platform)=>{const room="sd-"+uid();if(platform==="Jitsi Meet")return"https://meet.jit.si/"+room;return"";};

  const EVENT_TYPES=[{v:"meeting",l:"Meeting",i:"🤝",c:C.a},{v:"task",l:"Task Due",i:"✅",c:C.y},{v:"call",l:"Call",i:"📞",c:C.g},{v:"demo",l:"Demo",i:"🖥",c:C.p},{v:"deadline",l:"Deadline",i:"🔴",c:C.r},{v:"follow_up",l:"Follow-up",i:"📋",c:C.cy},{v:"internal",l:"Internal",i:"👥",c:C.t3},{v:"personal",l:"Personal",i:"🏠",c:"#ff6b35"}];

  const [events,setEvents]=useState([]);
  // ═══ CALENDAR API LOADING ═══
  const loadEvents=()=>{if(!api.isConnected())return;api.get("/calendar/events").then(r=>{if(r?.events)setEvents(r.events.map(e=>{const st=e.start_time?new Date(e.start_time):null;const et=e.end_time?new Date(e.end_time):null;const date=st?`${st.getFullYear()}-${String(st.getMonth()+1).padStart(2,"0")}-${String(st.getDate()).padStart(2,"0")}`:"";const time=st&&!e.all_day?`${String(st.getHours()).padStart(2,"0")}:${String(st.getMinutes()).padStart(2,"0")}`:"";const end=et&&!e.all_day?`${String(et.getHours()).padStart(2,"0")}:${String(et.getMinutes()).padStart(2,"0")}`:"";let attendees="";try{attendees=Array.isArray(e.attendees)?e.attendees.join(", "):e.attendees||"";}catch{attendees="";}const attendeeList=Array.isArray(e.attendees)?e.attendees:[];return{id:e.id,title:e.title,date,time,end,type:e.type||"meeting",desc:e.description||"",color:e.color||(EVENT_TYPES.find(t=>t.v===(e.type||"meeting"))?.c)||C.a,attendees,attendeeList,link:"",location:e.location||"",meetLink:e.meeting_link||"",contactName:"",contactEmail:"",contactPhone:""};}));}).catch(()=>{});};
  useEffect(()=>{loadEvents();},[]);
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
  const openNewEvent=(dateStr)=>{setEvTitle("");setEvDate(dateStr||"");setEvTime("");setEvEnd("");setEvType("meeting");setEvDesc("");setEvColor(C.a);setEvLocation("");setEvMeetLink("");setEvContact("");setEvContactEmail("");setEvContactPhone("");setEvAttendees([]);setEvInvChannels([]);setEvInvMsg("");setContactSearch("");setAttSearch("");setEditEv(null);setShowForm(true);};
  const openEditEvent=(ev)=>{setEvTitle(ev.title);setEvDate(ev.date);setEvTime(ev.time||"");setEvEnd(ev.end||"");setEvType(ev.type);setEvDesc(ev.desc||"");setEvColor(ev.color);setEvLocation(ev.location||"");setEvMeetLink(ev.meetLink||"");setEvContact(ev.contactName||"");setEvContactEmail(ev.contactEmail||"");setEvContactPhone(ev.contactPhone||"");setEvAttendees(ev.attendeeList||[]);setEvInvChannels([]);setEvInvMsg("");setEditEv(ev);setShowForm(true);};
  const saveEvent=async()=>{if(!evTitle.trim())return showT("Title required","error");const color=evColor||EVENT_TYPES.find(t=>t.v===evType)?.c||C.a;const start_time=evDate&&evTime?`${evDate}T${evTime}:00`:evDate?`${evDate}T00:00:00`:null;const end_time=evDate&&evEnd?`${evDate}T${evEnd}:00`:null;const payload={title:evTitle,description:evDesc,start_time,end_time,all_day:evTime?0:1,type:evType,color,location:evLocation,meeting_link:evMeetLink,attendees:evAttendees};if(api.isConnected()){try{let evId=editEv?.id;if(editEv){await api.patch("/calendar/events/"+editEv.id,payload);}else{const r=await api.post("/calendar/events",payload);evId=r?.event?.id;}// Send invitations if channels selected
    if(evId&&evInvChannels.length&&(evContactEmail||evContactPhone)){try{const ir=await api.post("/calendar/events/"+evId+"/invite",{channels:evInvChannels.map(c=>({id:c.id,type:c.type,name:c.name})),recipient_name:evContact,recipient_email:evContactEmail,recipient_phone:evContactPhone,custom_message:evInvMsg});const sent=(ir?.results||[]).filter(x=>x.status==="sent").length;if(sent)showT(`Invite sent via ${sent} channel${sent>1?"s":""}`,"success");}catch{}}loadEvents();showT(editEv?"Updated":"Event created!","success");}catch{showT("Save failed","error");}}else{const p={title:evTitle,date:evDate,time:evTime,end:evEnd,type:evType,desc:evDesc,color,attendees:evAttendees.join(", "),link:"",location:evLocation,meetLink:evMeetLink};if(editEv)setEvents(pr=>pr.map(e=>e.id===editEv.id?{...e,...p}:e));else setEvents(pr=>[{id:"ev"+uid(),...p},...pr]);showT(editEv?"Updated":"Event created!","success");}setShowForm(false);setEditEv(null);setSelEvent(null);};

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
            {[{icon:"📅",l:"Date",v:ev.date},{icon:"🕐",l:"Time",v:ev.time?(ev.time+(ev.end?" – "+ev.end:"")):"All day"},{icon:"🏷",l:"Type",v:ti.l},{icon:"👤",l:"Attendees",v:ev.attendees||"—"},{icon:"📍",l:"Platform",v:ev.location||"—"}].map(r=>(
              <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.b1}11`}}>
                <span style={{fontSize:11}}>{r.icon}</span><span style={{fontSize:10,color:C.t3,width:65,fontFamily:FM}}>{r.l}</span><span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1}}>{r.v}</span>
              </div>
            ))}
          </div>
          {ev.meetLink&&<div style={{marginBottom:14}}><a href={ev.meetLink} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:C.a+"12",border:`1px solid ${C.a}33`,borderRadius:8,color:C.a,fontSize:12,fontWeight:700,textDecoration:"none",fontFamily:FM}}>{ev.location==="Microsoft Teams"?"📺 Join Teams Meeting":ev.location==="Google Meet"?"📹 Join Google Meet":ev.location==="Zoom"?"💻 Join Zoom Meeting":"🔗 Join Meeting"}</a></div>}
          {ev.desc&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4,letterSpacing:".5px"}}>DESCRIPTION</div><div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.5,marginBottom:14}}>{ev.desc}</div></>}
        </div>
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            <Btn ch="✎ Edit" v="ghost" full sm onClick={()=>openEditEvent(ev)}/>
            <Btn ch="🗑 Delete" v="danger" full sm onClick={async()=>{if(api.isConnected()){try{await api.del("/calendar/events/"+ev.id);loadEvents();}catch{setEvents(p=>p.filter(x=>x.id!==ev.id));}}else{setEvents(p=>p.filter(x=>x.id!==ev.id));}setSelEvent(null);showT("Deleted","success");}}/>
          </div>
        </div>
      </aside>;})()}
    </div>

    {/* Event form modal */}
    {showForm&&<Mdl title={editEv?"Edit Event":"New Event"} onClose={()=>{setShowForm(false);setEditEv(null);}} w={600}>
      <Fld label="Event Title"><Inp val={evTitle} set={setEvTitle} ph="e.g. TechCorp Demo, Team Standup…"/></Fld>
      <Fld label="Type"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{EVENT_TYPES.map(t=>(
        <button key={t.v} onClick={()=>{setEvType(t.v);setEvColor(t.c);}} style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:600,background:evType===t.v?t.c+"18":"transparent",color:evType===t.v?t.c:C.t3,border:`1.5px solid ${evType===t.v?t.c+"55":C.b1}`,cursor:"pointer"}}>{t.i} {t.l}</button>
      ))}</div></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Date"><Inp val={evDate} set={setEvDate} ph="YYYY-MM-DD" type="date"/></Fld></div><div style={{flex:1}}><Fld label="Start Time"><Inp val={evTime} set={setEvTime} ph="10:00" type="time"/></Fld></div><div style={{flex:1}}><Fld label="End Time"><Inp val={evEnd} set={setEvEnd} ph="11:00" type="time"/></Fld></div></div>

      {/* ── Contact Picker ── */}
      <Fld label="Contact"><div style={{position:"relative"}}>
        <input value={evContact||contactSearch} onChange={e=>{setContactSearch(e.target.value);setEvContact("");setShowContactDD(true);}} onFocus={()=>setShowContactDD(true)} onBlur={()=>setTimeout(()=>setShowContactDD(false),200)} placeholder="Search contacts by name or email…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none",boxSizing:"border-box"}}/>
        {showContactDD&&filteredContacts.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:8,maxHeight:200,overflowY:"auto",zIndex:100,boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>
          {filteredContacts.map(c=>(
            <div key={c.id} onClick={()=>{setEvContact(c.name);setEvContactEmail(c.email||"");setEvContactPhone(c.phone||"");setContactSearch("");setShowContactDD(false);}} style={{padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${C.b1}22`,fontSize:12}} className="hov">
              <Av i={c.name?.slice(0,2).toUpperCase()} c={c.color||C.a} s={24}/>
              <div style={{flex:1}}><div style={{fontWeight:600}}>{c.name}</div>{c.email&&<div style={{fontSize:10,color:C.t3}}>{c.email}</div>}</div>
              {c.phone&&<span style={{fontSize:9,color:C.t3}}>{c.phone}</span>}
            </div>
          ))}
        </div>}
      </div></Fld>
      {evContact&&<div style={{display:"flex",gap:8,marginBottom:8}}>
        <div style={{flex:1}}><Fld label="Email"><Inp val={evContactEmail} set={setEvContactEmail} ph="contact@email.com"/></Fld></div>
        <div style={{flex:1}}><Fld label="Phone"><Inp val={evContactPhone} set={setEvContactPhone} ph="+91 98765 43210"/></Fld></div>
      </div>}

      {/* ── Multi-Attendee Picker ── */}
      <Fld label="Attendees (Team Members)"><div>
        {evAttendees.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
          {evAttendees.map(name=>{const ag=agents.find(a=>a.name===name);return(
            <div key={name} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",background:C.a+"15",borderRadius:6,fontSize:11,fontWeight:600,color:C.a}}>
              <Av i={name.slice(0,2).toUpperCase()} c={ag?.color||C.a} s={18}/>{name}
              <button onClick={()=>setEvAttendees(p=>p.filter(n=>n!==name))} style={{background:"none",border:"none",cursor:"pointer",color:C.r,fontSize:12,marginLeft:2}}>×</button>
            </div>
          );})}
        </div>}
        <div style={{position:"relative"}}>
          <input value={attSearch} onChange={e=>{setAttSearch(e.target.value);setShowAttDD(true);}} onFocus={()=>setShowAttDD(true)} onBlur={()=>setTimeout(()=>setShowAttDD(false),200)} placeholder="Add team members…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none",boxSizing:"border-box"}}/>
          {showAttDD&&filteredAgents.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:8,maxHeight:180,overflowY:"auto",zIndex:100,boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>
            {filteredAgents.map(a=>(
              <div key={a.id} onClick={()=>{setEvAttendees(p=>[...p,a.name]);setAttSearch("");setShowAttDD(false);}} style={{padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,borderBottom:`1px solid ${C.b1}22`,fontSize:12}} className="hov">
                <Av i={a.name?.slice(0,2).toUpperCase()} c={a.color||C.a} s={24}/>
                <div><div style={{fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:C.t3}}>{a.role||"agent"}</div></div>
              </div>
            ))}
          </div>}
        </div>
      </div></Fld>

      {/* ── Meeting Platform ── */}
      <Fld label="Meeting Platform"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MEET_PLATFORMS.map(mp=>(
        <button key={mp.v} onClick={()=>{setEvLocation(mp.v);if(mp.v==="Jitsi Meet"){setEvMeetLink(genMeetLink("Jitsi Meet"));}else if(!evMeetLink||evMeetLink.includes("meet.jit.si")){setEvMeetLink("");}}} style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:600,background:evLocation===mp.v?C.a+"18":"transparent",color:evLocation===mp.v?C.a:C.t3,border:`1.5px solid ${evLocation===mp.v?C.a+"55":C.b1}`,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>{mp.i?<span>{mp.i}</span>:null}{mp.l}</button>
      ))}</div></Fld>
      {evLocation&&evLocation!=="Phone"&&evLocation!=="In-Person"&&evLocation!==""&&<Fld label="Meeting Link">
        <div style={{display:"flex",gap:6}}>
          <div style={{flex:1}}><Inp val={evMeetLink} set={setEvMeetLink} ph={evLocation==="Microsoft Teams"?"https://teams.microsoft.com/l/meetup-join/...":evLocation==="Google Meet"?"https://meet.google.com/...":evLocation==="Zoom"?"https://zoom.us/j/...":evLocation==="Jitsi Meet"?"Auto-generated":"https://..."}/></div>
          {evLocation==="Jitsi Meet"&&<button onClick={()=>setEvMeetLink(genMeetLink("Jitsi Meet"))} style={{padding:"6px 12px",borderRadius:8,background:C.g+"18",color:C.g,border:`1px solid ${C.g}44`,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:FM,whiteSpace:"nowrap"}}>🔄 New Link</button>}
        </div>
        {evLocation!=="Jitsi Meet"&&evLocation!=="Custom"&&<div style={{fontSize:10,color:C.t3,marginTop:4,fontFamily:FM}}>
          {evLocation==="Microsoft Teams"&&"Paste your Teams meeting link, or create one in Microsoft Teams"}
          {evLocation==="Google Meet"&&"Paste your Google Meet link, or create one in Google Calendar"}
          {evLocation==="Zoom"&&"Paste your Zoom meeting link, or create one in Zoom"}
        </div>}
      </Fld>}

      <Fld label="Description"><textarea value={evDesc} onChange={e=>setEvDesc(e.target.value)} rows={3} placeholder="Event details, agenda, notes…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>

      {/* ── Send Notification ── */}
      {evContact&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t2,marginBottom:8}}>SEND INVITATION VIA</div>
        {activeInboxes.length>0?<>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
            {activeInboxes.map(ib=>{const sel=evInvChannels.find(c=>c.id===ib.id);return(
              <button key={ib.id} onClick={()=>toggleInvCh(ib)} style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",gap:4,background:sel?C.a+"18":"transparent",color:sel?C.a:C.t3,border:`1.5px solid ${sel?C.a+"55":C.b1}`,cursor:"pointer"}}>
                <span>{CH_ICON[ib.type]||"📨"}</span>{ib.name||ib.type}
              </button>
            );})}
          </div>
          {evInvChannels.length>0&&<>
            {evInvChannels.some(c=>c.type==="email")&&!evContactEmail&&<div style={{fontSize:10,color:C.r,marginBottom:4}}>Email address required for email invitation</div>}
            {evInvChannels.some(c=>c.type==="whatsapp"||c.type==="sms")&&!evContactPhone&&<div style={{fontSize:10,color:C.r,marginBottom:4}}>Phone number required for WhatsApp/SMS</div>}
            <Fld label="Custom Message (optional)"><textarea value={evInvMsg} onChange={e=>setEvInvMsg(e.target.value)} rows={2} placeholder="Add a personal message to the invitation…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:11,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
          </>}
        </>:<div style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>No active email/WhatsApp inboxes configured. Set up inboxes in Settings to send invitations.</div>}
      </div>}

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEditEv(null);}}/>{editEv&&<Btn ch="Delete" v="danger" onClick={async()=>{if(api.isConnected()){try{await api.del("/calendar/events/"+editEv.id);loadEvents();}catch{setEvents(p=>p.filter(e=>e.id!==editEv.id));}}else{setEvents(p=>p.filter(e=>e.id!==editEv.id));}setShowForm(false);setSelEvent(null);showT("Deleted","success");}}/>}<Btn ch={evInvChannels.length>0?(editEv?"Save & Send":"Create & Send Invite"):(editEv?"Save":"Create Event")} v="primary" onClick={saveEvent}/></div>
    </Mdl>}
    </div>
  </div>;
}


