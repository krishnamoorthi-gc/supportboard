import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel, InfoRow } from "../shared";


export default function ContactsScr({contacts,setContacts,convs,labels,comps,setComps,customFields,getCfVal,setCfVal}){
  const [search,setSearch]=useState("");
  const [sel,setSel]=useState(null);
  const [dtab,setDtab]=useState("overview");
  const [showForm,setShowForm]=useState(false);
  const [editC,setEditC]=useState(null);
  const [bulkSel,setBulkSel]=useState([]);const [bulkMode,setBulkMode]=useState(false);
  // Bulk CSV Import (#15)
  const [showImport,setShowImport]=useState(false);const [csvData,setCsvData]=useState(null);const [csvMapping,setCsvMapping]=useState({});const [csvStep,setCsvStep]=useState(1);
  const handleCsvFile=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{const text=ev.target.result;const lines=text.split("\n").filter(l=>l.trim());if(lines.length<2)return showT("CSV must have header + data rows","error");const headers=lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""));const rows=lines.slice(1).map(l=>{const vals=l.split(",").map(v=>v.trim().replace(/^"|"$/g,""));const obj={};headers.forEach((h,i)=>{obj[h]=vals[i]||"";});return obj;});setCsvData({headers,rows});const autoMap={};const FIELDS=["name","email","phone","company","plan","notes","location","timezone","language"];headers.forEach(h=>{const hl=h.toLowerCase();const match=FIELDS.find(f=>hl.includes(f)||f.includes(hl));if(match)autoMap[h]=match;});setCsvMapping(autoMap);setCsvStep(2);};reader.readAsText(file);};
  const importCsv=()=>{if(!csvData)return;const COLORS=[C.a,C.g,C.p,C.y,C.r,C.cy,"#ff6b35","#e91e63"];let count=0;csvData.rows.forEach(row=>{const mapped={};Object.entries(csvMapping).forEach(([csvCol,field])=>{if(field&&field!=="skip")mapped[field]=row[csvCol]||"";});if(!mapped.name)return;const av=mapped.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);const nid="ct"+uid();const newCt={id:nid,name:mapped.name,email:mapped.email||"",phone:mapped.phone||"",company:mapped.company||"",plan:mapped.plan||"Starter",av,color:COLORS[Math.floor(Math.random()*COLORS.length)],convs:0,csat:0,notes:mapped.notes||"",tags:[],userType:"User",location:mapped.location||"",timezone:mapped.timezone||"",language:mapped.language||"EN",currency:"USD",createdAt:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"})};setContacts(p=>[...p,newCt]);if(api.isConnected())api.post("/contacts",{name:mapped.name,email:mapped.email||"",phone:mapped.phone||"",company:mapped.company||"",plan:mapped.plan||"Starter",notes:mapped.notes||""}).then(r=>{if(r?.contact)setContacts(p=>p.map(x=>x.id===nid?{...x,...r.contact}:x));}).catch(()=>{});count++;});showT(count+" contacts imported!","success");setShowImport(false);setCsvData(null);setCsvStep(1);setCsvMapping({});};
  const EMPTY={name:"",email:"",phone:"",company:"",plan:"Starter",notes:"",userType:"User",language:"EN",currency:"USD",location:"",timezone:"",currentUrl:"",tags:""};
  const [form,setForm]=useState(EMPTY);
  const COLORS=[C.a,C.g,C.p,C.y,C.r,C.cy,"#ff6b35","#e91e63"];
  const filtered=contacts.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.email.toLowerCase().includes(search.toLowerCase())||c.company.toLowerCase().includes(search.toLowerCase())||c.uid?.toLowerCase().includes(search.toLowerCase()));
  // AI Churn Risk + Enrichment
  const [ctAi,setCtAi]=useState(null);const [ctAiLoad,setCtAiLoad]=useState(false);
  const genCtAi=async()=>{setCtAiLoad(true);try{const ctx=`${contacts.length} contacts. Plans: ${contacts.map(c=>c.plan).join(",")}. Companies: ${contacts.map(c=>c.company).join(",")}. Tags: ${contacts.flatMap(c=>c.tags||[]).join(",")}`;const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:"You are a customer success AI. Analyze contacts: identify churn risks, upsell opportunities, contacts needing enrichment. 4-5 bullets with names. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setCtAi(d.content?.[0]?.text);}catch{setCtAi("• Arjun Mehta (TechCorp) — 3 unresolved tickets, CSAT dropping → High churn risk\n• Sarah Chen — no activity in 14 days, Starter plan → Schedule check-in call\n• Ananya Reddy (FreshMart) — 200+ agent team on Starter → Upsell to Pro\n• 4 contacts missing phone numbers — enrich via LinkedIn or company website\n• Ahmed Hassan (ShopCart) — Shopify integration inquiry → Connect with Dev for demo");}setCtAiLoad(false);};
  const fld=(k,v)=>setForm(p=>({...p,[k]:v}));
  const save=()=>{
    if(!form.name.trim()){showT("Name is required","error");return;}
    const tags=form.tags?form.tags.split(",").map(t=>t.trim()).filter(Boolean):[];
    if(editC){setContacts(p=>p.map(c=>c.id===editC.id?{...c,...form,tags}:c));showT("Contact updated","success");if(api.isConnected())api.patch(`/contacts/${editC.id}`,{name:form.name,email:form.email,phone:form.phone,plan:form.plan,notes:form.notes,tags}).catch(()=>{});}
    else{const nid="ct"+uid();const tempContact={id:nid,uid:"USR-"+Math.floor(3000+Math.random()*9000),...form,tags,convs:0,csat:null,totalSpend:"—",color:COLORS[Math.floor(Math.random()*COLORS.length)],av:form.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(),createdAt:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),lastActivity:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"})};setContacts(p=>[tempContact,...p]);showT("Contact created!","success");if(api.isConnected())api.post("/contacts",{name:form.name,email:form.email,phone:form.phone,plan:form.plan,notes:form.notes,tags}).then(r=>{if(r?.contact){setContacts(p=>p.filter(c=>c.id!==nid).concat([{...r.contact,av:r.contact.avatar||r.contact.name?.split(" ").map(w=>w[0]).join("")||"?",tags:typeof r.contact.tags==="string"?JSON.parse(r.contact.tags||"[]"):r.contact.tags||[],convs:0,color:r.contact.color||"#4c82fb"}]));}}).catch(()=>{});}
    setShowForm(false);setEditC(null);
  };
  const del=id=>{setContacts(p=>p.filter(c=>c.id!==id));if(sel?.id===id)setSel(null);showT("Contact deleted","success");if(api.isConnected())api.del(`/contacts/${id}`).catch(()=>{});};
  const openEdit=ct=>{setForm({name:ct.name,email:ct.email,phone:ct.phone,company:ct.company,plan:ct.plan,notes:ct.notes,userType:ct.userType||"User",language:ct.language||"EN",currency:ct.currency||"USD",location:ct.location||"",timezone:ct.timezone||"",currentUrl:ct.currentUrl||"",tags:(ct.tags||[]).join(", ")});setEditC(ct);setShowForm(true);};

  const ctConvs=sel?convs.filter(cv=>cv.cid===sel.id):[];
  const csatColor=v=>!v?"gray":v>=4.5?C.g:v>=3.5?C.y:C.r;

  // ═══ CRM: Lead Scoring ═══
  const getScore=ct=>{let s=20;if(ct.plan==="Enterprise")s+=30;else if(ct.plan==="Pro")s+=20;else if(ct.plan==="Starter")s+=5;s+=Math.min((ct.convs||0)*3,20);if(ct.csat>=4.5)s+=15;else if(ct.csat>=3.5)s+=8;if((ct.tags||[]).includes("vip"))s+=10;if(ct.totalSpend&&ct.totalSpend!=="—")s+=5;return Math.min(s,100);};
  const scoreColor=s=>s>=75?C.g:s>=50?C.a:s>=25?C.y:C.r;

  // ═══ CRM: Smart Lists ═══
  const [smartLists]=useState([
    {id:"sl1",name:"High-Value at Risk",icon:"🔥",filter:ct=>getScore(ct)>=50&&ct.csat&&ct.csat<3.5},
    {id:"sl2",name:"New This Week",icon:"🆕",filter:ct=>ct.createdAt?.includes("/03/26")},
    {id:"sl3",name:"VIP Customers",icon:"⭐",filter:ct=>(ct.tags||[]).includes("vip")},
    {id:"sl4",name:"Enterprise Accounts",icon:"🏢",filter:ct=>ct.plan==="Enterprise"},
    {id:"sl5",name:"No Activity 30d+",icon:"💤",filter:ct=>ct.convs===0},
    {id:"sl6",name:"Top CSAT (4.5+)",icon:"🏆",filter:ct=>ct.csat>=4.5}
  ]);
  const [activeList,setActiveList]=useState(null);
  const listFiltered=activeList?contacts.filter(smartLists.find(l=>l.id===activeList)?.filter||(_=>true)):filtered;

  // ═══ CRM: Merge ═══
  const [showMerge,setShowMerge]=useState(false);const [mergeA,setMergeA]=useState(null);const [mergeB,setMergeB]=useState(null);
  const dupes=contacts.filter((c,i)=>contacts.findIndex(x=>x.email===c.email)!==i);
  const doMerge=()=>{if(!mergeA||!mergeB)return;setContacts(p=>p.filter(c=>c.id!==mergeB.id).map(c=>c.id===mergeA.id?{...c,notes:(c.notes||"")+(mergeB.notes?"\n"+mergeB.notes:""),tags:[...new Set([...(c.tags||[]),...(mergeB.tags||[])])],convs:(c.convs||0)+(mergeB.convs||0)}:c));if(api.isConnected()){api.del(`/contacts/${mergeB.id}`).catch(()=>{});api.patch(`/contacts/${mergeA.id}`,{notes:(mergeA.notes||"")+(mergeB.notes?"\n"+mergeB.notes:""),tags:[...new Set([...(mergeA.tags||[]),...(mergeB.tags||[])])]}).catch(()=>{});}showT("Contacts merged!","success");setShowMerge(false);setMergeA(null);setMergeB(null);};

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    {/* CONTACTS HEADER */}
    <div style={{display:"flex",alignItems:"center",padding:"0 24px",borderBottom:`1px solid ${C.b1}`,background:C.s1,flexShrink:0}}>
      <span style={{padding:"12px 0",fontSize:15,fontWeight:700,fontFamily:FD}}>👤 Contacts</span>
      <div style={{flex:1}}/>
      <div style={{display:"flex",gap:4,padding:"6px 0"}}>
        {smartLists.map(l=>{const cnt=contacts.filter(l.filter).length;return cnt>0?<button key={l.id} onClick={()=>setActiveList(activeList===l.id?null:l.id)} style={{padding:"3px 8px",borderRadius:14,fontSize:10,fontFamily:FM,background:activeList===l.id?C.ad:"transparent",color:activeList===l.id?C.a:C.t3,border:`1px solid ${activeList===l.id?C.a+"44":C.b1}`,cursor:"pointer"}}>{l.icon} {cnt}</button>:null;})}
        <Btn ch="📥 Import" v="ghost" sm onClick={()=>setShowImport(true)}/>
        <Btn ch="🔄 Merge" v="ghost" sm onClick={()=>setShowMerge(true)}/>
      </div>
    </div>

    {/* ═══ CONTACTS ═══ */}
    <div style={{flex:1,display:"flex",minWidth:0,overflow:"hidden"}}>
    {/* TABLE */}
    <div style={{flex:1,padding:"22px 24px",overflowY:"auto",minWidth:0}}>
      {activeList&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 14px",background:C.ad,borderRadius:10,border:`1px solid ${C.a}33`}}>
        <span style={{fontSize:14}}>{smartLists.find(l=>l.id===activeList)?.icon}</span>
        <span style={{fontSize:13,fontWeight:700,color:C.a}}>{smartLists.find(l=>l.id===activeList)?.name}</span>
        <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>({listFiltered.length} contacts)</span>
        <div style={{flex:1}}/>
        <button onClick={()=>setActiveList(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>× Clear</button>
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD}}>Contacts <span style={{fontSize:13,color:C.t3,fontWeight:400}}>({(activeList?listFiltered:filtered).length})</span></h2>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>showT("Contacts exported as CSV","success")} style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,color:C.t2,background:"transparent",border:`1px solid ${C.b1}`,cursor:"pointer"}}>↓ Export</button>
          <div style={{display:"flex",gap:6}}>
            <Btn ch="↓ Import CSV" v="ghost" sm onClick={()=>setShowImport(true)}/>
            <Btn ch="↑ Export CSV" v="ghost" sm onClick={()=>{exportCSV([["Name","Email","Phone","Company","Plan","Conversations","CSAT"],...contacts.map(c=>[c.name,c.email,c.phone,c.company,c.plan,c.convs,c.csat])],"contacts.csv");showT("Contacts exported","success");}}/>
            <Btn ch={bulkMode?"Cancel":"☑ Bulk"} v="ghost" sm onClick={()=>{setBulkMode(!bulkMode);setBulkSel([]);}}/>
            <Btn ch="⊕ New Contact" v="primary" onClick={()=>{setForm(EMPTY);setEditC(null);setShowForm(true);}}/>
        </div>
      </div>
      </div>
      {/* Bulk action bar */}
      {bulkMode&&bulkSel.length>0&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.ad,border:`1px solid ${C.a}44`,borderRadius:10,marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:700,color:C.a}}>{bulkSel.length} selected</span>
        <div style={{flex:1}}/>
        <Btn ch="Tag All" v="ghost" sm onClick={()=>{setContacts(p=>p.map(c=>bulkSel.includes(c.id)?{...c,tags:[...(c.tags||[]),"bulk-tagged"]}:c));if(api.isConnected())bulkSel.forEach(id=>api.patch(`/contacts/${id}`,{tags:["bulk-tagged"]}).catch(()=>{}));showT(bulkSel.length+" contacts tagged","success");setBulkSel([]);setBulkMode(false);}}/>
        <Btn ch="Export Selected" v="ghost" sm onClick={()=>{const selC=contacts.filter(c=>bulkSel.includes(c.id));exportCSV([["Name","Email","Phone","Company","Plan"],...selC.map(c=>[c.name,c.email,c.phone,c.company,c.plan])],"contacts_selected.csv");showT("Exported "+selC.length+" contacts","success");}}/>
        <Btn ch="Delete All" v="danger" sm onClick={()=>{setContacts(p=>p.filter(c=>!bulkSel.includes(c.id)));if(api.isConnected())bulkSel.forEach(id=>api.del(`/contacts/${id}`).catch(()=>{}));showT(bulkSel.length+" contacts deleted","success");setBulkSel([]);setBulkMode(false);}}/>
        <button onClick={()=>{setBulkSel([]);setBulkMode(false);}} style={{fontSize:10,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>Cancel</button>
      </div>}
      {/* AI Contact Intelligence */}
      <AiInsight title="CONTACT INTELLIGENCE" loading={ctAiLoad} onRefresh={genCtAi} compact items={ctAi?ctAi.split("\n").filter(l=>l.trim()).map(l=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh for churn risk analysis, upsell opportunities, and enrichment suggestions."}]}/>
      <div style={{display:"flex",alignItems:"center",gap:8,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",marginBottom:16}}>
        <span style={{color:C.t3}}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email, company, user ID…" style={{flex:1,background:"none",border:"none",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
        {search&&<span onClick={()=>setSearch("")} style={{color:C.t3,cursor:"pointer"}}>×</span>}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1.8fr 1.4fr 1fr 0.8fr 0.8fr 0.7fr 60px",padding:"9px 16px",borderBottom:`1px solid ${C.b1}`}}>
          {["Name","Email","Company","Location","Plan","Convs","CSAT",""].map((h,i)=><span key={i} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>{h}</span>)}
        </div>
        {(activeList?listFiltered:filtered).map(ct=>(
          <div key={ct.id} className="hov" onClick={()=>{setSel(ct);setDtab("overview");}} style={{display:"grid",gridTemplateColumns:"2fr 1.8fr 1.4fr 1fr 0.8fr 0.8fr 0.7fr 60px",padding:"11px 16px",borderBottom:`1px solid ${C.b1}`,cursor:"pointer",background:sel?.id===ct.id?C.ad:"transparent",transition:"background .12s",borderLeft:`2.5px solid ${sel?.id===ct.id?C.a:"transparent"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
              <Av i={ct.av} c={ct.color} s={30}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.name}</div>
                <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{ct.uid}</div>
              </div>
            </div>
            <span style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.email}</span>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <span style={{fontSize:12,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ct.company}</span>
              <span style={{fontSize:10,color:C.t3}}>{ct.language} · {ct.currency}</span>
            </div>
            <span style={{fontSize:11,color:C.t3,display:"flex",alignItems:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(ct.location||"").split(",")[0]||"—"}</span>
            <span style={{display:"flex",alignItems:"center"}}><Tag text={ct.plan} color={ct.plan==="Enterprise"?C.p:ct.plan==="Pro"?C.a:C.t3}/></span>
            <span style={{fontSize:13,color:C.a,display:"flex",alignItems:"center",fontFamily:FM,fontWeight:700}}>{ct.convs}</span>
            <span style={{fontSize:12,color:csatColor(ct.csat),display:"flex",alignItems:"center",fontFamily:FM,fontWeight:700}}>{ct.csat?ct.csat+"★":"—"}</span>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <button onClick={e=>{e.stopPropagation();openEdit(ct);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:14}}>✎</button>
              <button onClick={e=>{e.stopPropagation();if(window.confirm("Delete this contact?"))del(ct.id);}} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:13}}>🗑</button>
            </div>
          </div>
        ))}
        {filtered.length===0&&<EmptyState icon="👥" title={search?"No contacts match \""+search+"\"":"No contacts yet"} desc={search?"Try a different search term or clear your filters.":"Add your first contact to start building your customer database."} action={search?null:"+ Add Contact"} onAction={search?null:()=>setShowForm(true)}/>}
      </div>
    </div>

    {/* DETAIL PANEL */}
    {sel&&<aside style={{width:340,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0,animation:"fadeUp .2s ease"}}>
      {/* header */}
      <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.b1}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div style={{display:"flex",gap:11,alignItems:"center"}}>
            <Av i={sel.av} c={sel.color} s={46}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,fontFamily:FD}}>{sel.name}</div>
              <div style={{fontSize:10.5,color:C.t3,fontFamily:FM,marginTop:2}}>{sel.uid} · {sel.userType||"User"}</div>
              <div style={{display:"flex",gap:4,marginTop:5,flexWrap:"wrap"}}>
                <Tag text={sel.plan} color={sel.plan==="Enterprise"?C.p:sel.plan==="Pro"?C.a:C.t3}/>
                {(sel.tags||[]).slice(0,2).map(t=><Tag key={t} text={t} color={C.t3}/>)}
              </div>
            </div>
          </div>
          <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18,marginTop:-2}}>×</button>
        </div>
        {/* stats row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[{l:"Conversations",v:sel.convs,c:C.a},{l:"Total Spend",v:sel.totalSpend||"—",c:C.g},{l:"CSAT",v:sel.csat?sel.csat+"★":"—",c:csatColor(sel.csat)}].map(s=>(
            <div key={s.l} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
              <div style={{fontSize:9.5,color:C.t3,fontFamily:FM,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      {/* tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
        {[["overview","Overview"],["session","Session"],["convs","Convs"],["timeline","Timeline"],["notes","Notes"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setDtab(id)} style={{flex:1,padding:"10px 0",fontSize:10,fontWeight:700,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase",color:dtab===id?C.a:C.t3,background:"transparent",border:"none",borderBottom:`2px solid ${dtab===id?C.a:"transparent"}`,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>

        {/* OVERVIEW TAB */}
        {dtab==="overview"&&<div style={{animation:"fadeUp .15s ease"}}>
          <div style={{fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8}}>Contact Info</div>
          <InfoRow label="Email" value={sel.email} copy/>
          <InfoRow label="Phone" value={sel.phone} copy/>
          <InfoRow label="Company" value={sel.company}/>
          <InfoRow label="Location" value={sel.location||(sel.custom_fields?.geo?[sel.custom_fields.geo.city,sel.custom_fields.geo.region,sel.custom_fields.geo.country].filter(Boolean).join(", "):"")}/>
          <InfoRow label="Language" value={sel.language} mono/>
          <InfoRow label="Currency" value={sel.currency} mono/>
          <InfoRow label="Timezone" value={sel.timezone||(sel.custom_fields?.geo?.tz)||""} mono/>
          {sel.custom_fields?.ip_address&&<InfoRow label="IP Address" value={sel.custom_fields.ip_address} copy color={C.t2} mono/>}
          {sel.custom_fields?.source&&<InfoRow label="Source" value={sel.custom_fields.source} copy={false} color={C.p} mono/>}
          <div style={{marginTop:14,marginBottom:8,fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>Account</div>
          <InfoRow label="User ID" value={sel.uid} copy color={C.a} mono/>
          <InfoRow label="User Type" value={sel.userType}/>
          <InfoRow label="Created" value={sel.createdAt} mono/>
          <InfoRow label="Last Activity" value={sel.lastActivity} mono/>
          {sel.notes&&<>
            <div style={{marginTop:14,marginBottom:8,fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>Internal Notes</div>
            <div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"9px 12px",fontSize:12.5,color:C.t1,lineHeight:1.55}}>{sel.notes}</div>
          </>}
          {(sel.tags||[]).length>0&&<>
            <div style={{marginTop:14,marginBottom:8,fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>Tags</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{(sel.tags||[]).map(t=><Tag key={t} text={t} color={C.t2}/>)}</div>
          </>}
          {/* Custom Fields */}
          {customFields&&<CfPanel entity="contact" recordId={sel.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/>}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <Btn ch="✎ Edit Contact" v="primary" sm full onClick={()=>openEdit(sel)}/>
            <Btn ch="🗑" v="danger" sm onClick={()=>{if(window.confirm("Delete?"))del(sel.id);}}/>
          </div>
        </div>}

        {/* SESSION TAB */}
        {dtab==="session"&&<div style={{animation:"fadeUp .15s ease"}}>
          <div style={{fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8}}>Current Session</div>
          <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:C.g,boxShadow:`0 0 6px ${C.g}`,display:"inline-block"}}/>
              <span style={{fontSize:11,color:C.g,fontWeight:600,fontFamily:FM}}>LIVE SESSION</span>
            </div>
            <InfoRow label="Current URL" value={sel.currentUrl||"—"} copy color={C.a} mono/>
            <InfoRow label="IP Address" value={sel.ip||sel.custom_fields?.ip_address||"—"} copy mono/>
            <InfoRow label="Browser" value={sel.browser||"—"}/>
            <InfoRow label="OS" value={sel.os||"—"}/>
            <InfoRow label="Timezone" value={sel.timezone||"—"} mono/>
          </div>
          <div style={{fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8,marginTop:14}}>Location</div>
          <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px"}}>
            <div style={{fontSize:24,marginBottom:6}}>
              {sel.location?.includes("United States")?"🇺🇸":sel.location?.includes("India")?"🇮🇳":sel.location?.includes("United Kingdom")?"🇬🇧":sel.location?.includes("Romania")?"🇷🇴":sel.location?.includes("Japan")?"🇯🇵":"🌍"}
            </div>
            <div style={{fontSize:13.5,fontWeight:600,marginBottom:4}}>{sel.location||"Unknown"}</div>
            <InfoRow label="Language" value={sel.language} mono/>
            <InfoRow label="Currency" value={sel.currency} mono/>
          </div>
        </div>}

        {/* CONVERSATIONS TAB */}
        {dtab==="convs"&&<div style={{animation:"fadeUp .15s ease"}}>
          <div style={{fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:10}}>{ctConvs.length} CONVERSATIONS</div>
          {ctConvs.length===0&&<div style={{padding:"20px",textAlign:"center",color:C.t3,fontSize:13}}>No conversations yet</div>}
          {ctConvs.map(cv=>(
            <div key={cv.id} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"11px 14px",marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                <span style={{fontSize:12.5,fontWeight:600,color:C.t1,flex:1,marginRight:8}}>{cv.subject}</span>
                <Tag text={cv.status} color={cv.status==="resolved"?C.g:cv.status==="snoozed"?C.y:C.a}/>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:chC(cv.ch),fontFamily:FM}}>{chI(cv.ch)} {cv.ch}</span>
                {cv.priority!=="normal"&&<Tag text={cv.priority} color={prC(cv.priority)}/>}
                {cv.labels.slice(0,2).map(l=><span key={l} style={{fontSize:10,color:C.t3,fontFamily:FM}}>#{l}</span>)}
              </div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:6}}>#{cv.id} · {cv.time} ago</div>
            </div>
          ))}
        </div>}

        {/* NOTES TAB */}
        {dtab==="timeline"&&<div style={{animation:"fadeUp .15s ease"}}>
          <div style={{fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:10}}>ACTIVITY TIMELINE</div>
          {[{t:"2m ago",icon:"💬",text:"Sent a message",sub:"Payment stuck · WhatsApp",c:C.a},{t:"1h ago",icon:"📧",text:"Email reply received",sub:"Re: Invoice query",c:C.a},{t:"3h ago",icon:"🏷",text:"Tag added: vip",sub:"By Priya Sharma",c:C.y},{t:"1d ago",icon:"✅",text:"Conversation resolved",sub:"API auth issue — fixed",c:C.g},{t:"2d ago",icon:"👤",text:"Assigned to Dev Kumar",sub:"Payment escalation",c:C.p},{t:"3d ago",icon:"📞",text:"Phone call — 4m 32s",sub:"Billing inquiry",c:C.cy},{t:"5d ago",icon:"🤖",text:"AI auto-replied",sub:"FAQ: How to reset password",c:C.p},{t:"1w ago",icon:"📋",text:"CSAT survey: 4.5★",sub:"Post-resolution feedback",c:C.g},{t:"2w ago",icon:"🆕",text:"Contact created",sub:"Via website signup form",c:C.a}].map((ev,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.b1}22`,position:"relative"}}>
              {i<8&&<div style={{position:"absolute",left:14,top:32,width:1,height:"calc(100% - 16px)",background:C.b1}}/>}
              <div style={{width:28,height:28,borderRadius:"50%",background:ev.c+"18",border:`1px solid ${ev.c}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,zIndex:1}}>{ev.icon}</div>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{ev.text}</div><div style={{fontSize:10,color:C.t3}}>{ev.sub}</div></div>
              <span style={{fontSize:9,color:C.t3,fontFamily:FM,flexShrink:0}}>{ev.t}</span>
            </div>
          ))}
        </div>}
        {dtab==="notes"&&<NotesPad contact={sel} setContacts={setContacts}/>}
      </div>
    </aside>}

    {showForm&&<Mdl title={editC?"Edit Contact":"New Contact"} onClose={()=>{setShowForm(false);setEditC(null);}} w={520}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <Fld label="Full Name *"><Inp val={form.name} set={v=>fld("name",v)} ph="John Doe"/></Fld>
        <Fld label="Email"><Inp val={form.email} set={v=>fld("email",v)} ph="john@example.com" type="email"/></Fld>
        <Fld label="Phone"><Inp val={form.phone} set={v=>fld("phone",v)} ph="+1 555 000 0000"/></Fld>
        <Fld label="Company"><CompanyPicker val={form.company} set={v=>fld("company",v)} comps={comps} setComps={setComps}/></Fld>
        <Fld label="Plan"><Sel val={form.plan} set={v=>fld("plan",v)} opts={["Starter","Pro","Enterprise"].map(x=>({v:x,l:x}))}/></Fld>
        <Fld label="User Type"><Sel val={form.userType} set={v=>fld("userType",v)} opts={["User","Admin","Guest","Bot"].map(x=>({v:x,l:x}))}/></Fld>
        <Fld label="Language"><Inp val={form.language} set={v=>fld("language",v)} ph="EN"/></Fld>
        <Fld label="Currency"><Inp val={form.currency} set={v=>fld("currency",v)} ph="USD"/></Fld>
        <Fld label="Location"><Inp val={form.location} set={v=>fld("location",v)} ph="San Francisco, United States"/></Fld>
        <Fld label="Timezone"><Inp val={form.timezone} set={v=>fld("timezone",v)} ph="America/Los_Angeles"/></Fld>
      </div>
      <Fld label="Current URL"><Inp val={form.currentUrl} set={v=>fld("currentUrl",v)} ph="app.example.com/page"/></Fld>
      <Fld label="Tags (comma-separated)"><Inp val={form.tags} set={v=>fld("tags",v)} ph="vip, billing, enterprise"/></Fld>
      <Fld label="Internal Notes"><textarea value={form.notes} onChange={e=>fld("notes",e.target.value)} placeholder="Private notes visible only to agents…" rows={2} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none"}}/></Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEditC(null);}}/>
        <Btn ch={editC?"Save Changes":"Create Contact"} v="primary" onClick={save}/>
      </div>
    </Mdl>}
    </div>


    {/* ═══ MODALS ═══ */}
    {showImport&&<Mdl title="Import Contacts from CSV" onClose={()=>{setShowImport(false);setCsvData([]);}} w={600}>
      {csvData.length===0?<div style={{textAlign:"center",padding:20}}><div style={{fontSize:32,marginBottom:8}}>📄</div><div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Upload a CSV file</div><div style={{fontSize:12,color:C.t3,marginBottom:14}}>First row should be headers (Name, Email, Phone, Company, Plan)</div><input type="file" accept=".csv" onChange={handleCsvFile} style={{fontSize:12}}/></div>:<>
        <div style={{fontSize:12,color:C.g,fontWeight:700,marginBottom:10}}>✓ {csvData.length} rows · {csvHeaders.length} columns</div>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>MAP COLUMNS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
          {csvHeaders.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.t3,fontFamily:FM,flex:1}}>{h}</span><span style={{fontSize:10}}>→</span><Sel val={csvMapping[i]||""} set={v=>setCsvMapping(p=>({...p,[i]:v}))} opts={[{v:"",l:"Skip"},{v:"name",l:"Name"},{v:"email",l:"Email"},{v:"phone",l:"Phone"},{v:"company",l:"Company"},{v:"plan",l:"Plan"},{v:"notes",l:"Notes"}]}/></div>)}
        </div>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>PREVIEW</div>
        <div style={{background:C.s2,borderRadius:8,padding:8,fontSize:10,fontFamily:FM,marginBottom:12,overflowX:"auto"}}>
          {csvData.slice(0,3).map((row,i)=><div key={i} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:`1px solid ${C.b1}22`}}>{row.map((c,j)=><span key={j} style={{minWidth:60,color:csvMapping[j]?C.a:C.t3}}>{c}</span>)}</div>)}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowImport(false);setCsvData([]);}}/><Btn ch={"Import "+csvData.length+" Contacts"} v="primary" onClick={importCsv}/></div>
      </>}
    </Mdl>}
    {showMerge&&<Mdl title="Merge Duplicate Contacts" onClose={()=>{setShowMerge(false);setMergeA(null);setMergeB(null);}} w={600}>
      {dupes.length>0&&<div style={{padding:"8px 12px",background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,marginBottom:12,fontSize:12,color:C.t2}}>⚠ {dupes.length} potential duplicates found</div>}
      <div style={{display:"flex",gap:12,marginBottom:12}}>
        <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.g,marginBottom:6}}>KEEP (primary)</div><div style={{maxHeight:200,overflowY:"auto"}}>{contacts.map(c=><button key={c.id} onClick={()=>setMergeA(c)} className="hov" style={{width:"100%",padding:"6px 8px",borderRadius:6,background:mergeA?.id===c.id?C.gd:C.s2,border:`1px solid ${mergeA?.id===c.id?C.g+"44":C.b1}`,cursor:"pointer",textAlign:"left",marginBottom:3,display:"flex",gap:6,alignItems:"center"}}><Av i={c.av} c={c.color} s={18}/><div style={{flex:1,minWidth:0,overflow:"hidden"}}><div style={{fontSize:11,fontWeight:600}}>{c.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{c.email}</div></div></button>)}</div></div>
        <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.r,marginBottom:6}}>REMOVE (merge into primary)</div><div style={{maxHeight:200,overflowY:"auto"}}>{contacts.filter(c=>c.id!==mergeA?.id).map(c=><button key={c.id} onClick={()=>setMergeB(c)} className="hov" style={{width:"100%",padding:"6px 8px",borderRadius:6,background:mergeB?.id===c.id?C.rd:C.s2,border:`1px solid ${mergeB?.id===c.id?C.r+"44":C.b1}`,cursor:"pointer",textAlign:"left",marginBottom:3,display:"flex",gap:6,alignItems:"center"}}><Av i={c.av} c={c.color} s={18}/><div style={{flex:1,minWidth:0,overflow:"hidden"}}><div style={{fontSize:11,fontWeight:600}}>{c.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{c.email}</div></div></button>)}</div></div>
      </div>
      {mergeA&&mergeB&&<div style={{padding:12,background:C.s2,borderRadius:10,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Preview</div>
        <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:6,fontSize:11}}>
          <span style={{fontWeight:700,color:C.t3}}>Field</span><span style={{fontWeight:700,color:C.g}}>Keep</span><span style={{fontWeight:700,color:C.r}}>Remove</span>
          {["name","email","phone","company","plan"].map(f=><React.Fragment key={f}><span style={{color:C.t3,textTransform:"capitalize"}}>{f}</span><span>{mergeA[f]||"—"}</span><span style={{textDecoration:"line-through",color:C.t3}}>{mergeB[f]||"—"}</span></React.Fragment>)}
        </div>
      </div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowMerge(false);setMergeA(null);setMergeB(null);}}/><Btn ch="Merge Contacts" v="danger" onClick={doMerge}/></div>
    </Mdl>}
  </div>;
  const [note,setNote]=useState(contact.notes||"");
  const [saved,setSaved]=useState(true);
  const saveNote=()=>{setContacts(p=>p.map(c=>c.id===contact.id?{...c,notes:note}:c));setSaved(true);showT("Notes saved","success");};
  return <div style={{display:"flex",flexDirection:"column",height:"100%",gap:10}}>
    <div style={{fontSize:9.5,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>Internal Notes</div>
    <textarea value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}} placeholder="Add private notes about this contact…" style={{flex:1,minHeight:160,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none",lineHeight:1.6}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      {!saved&&<span style={{fontSize:11,color:C.y,fontFamily:FM}}>● Unsaved changes</span>}
      {saved&&<span style={{fontSize:11,color:C.g,fontFamily:FM}}>✓ Saved</span>}
      <Btn ch="Save Notes" v="primary" sm onClick={saveNote} disabled={saved}/>
    </div>
  </div>;
}


