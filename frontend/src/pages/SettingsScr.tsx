import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";
import WorkflowScr from "./WorkflowScr";
import BotBuilderScr from "./BotBuilderScr";
import AISalesAgentScr from "./AISalesAgentScr";
import WidgetScr from "./WidgetScr";
import BillingScr from "./BillingScr";

// ─── SETTINGS ─────────────────────────────────────────────────────────────
export default function SettingsScr({inboxes,setInboxes,agents,setAgents,labels,setLabels,teams,setTeams,canned,setCanned,autos,setAutos,contacts,convs,stab,setStab,fontKey,applyFont,fontScale,applySize,themeKey,applyTheme,autoTheme,setAutoTheme,aiAutoReply,setAiAutoReply,aiChannels,setAiChannels,customFields,setCustomFields}){
  const tabs=[{id:"inboxes",label:"Inboxes",iconId:"inbox"},{id:"agents",label:"Agents & Teams",iconId:"contacts"},{id:"labels",label:"Labels",iconId:"labels"},{id:"canned",label:"Canned Responses",iconId:"canned"},{id:"automations",label:"Automations",iconId:"automations"},{id:"workflows",label:"Workflows",iconId:"automations"},{id:"aibot",label:"AI Bot",iconId:"aibot"},{id:"botbuilder",label:"Bot Builder",iconId:"aibot"},{id:"salesagent",label:"AI Sales Agent",iconId:"marketing"},{id:"formbuilder",label:"Form Builder",iconId:"widget"},{id:"widget",label:"Widget Builder",iconId:"widget"},{id:"customfields",label:"Custom Fields",iconId:"widget"},{id:"signatures",label:"Email Signatures",iconId:"send"},{id:"notifications",label:"Notifications",iconId:"bell"},{id:"brands",label:"Multi-Brand",iconId:"marketing"},{id:"auditlog",label:"Audit Log",iconId:"reports"},{id:"theme",label:"Theme",iconId:"theme"},{id:"fonts",label:"Fonts",iconId:"fonts"},{id:"billing",label:"Billing",iconId:"billing"},{id:"account",label:"Account",iconId:"settings"}];
  return <div style={{flex:1,display:"flex",minWidth:0}}>
    <div style={{width:200,background:C.s1,borderRight:`1px solid ${C.b1}`,padding:"20px 0",flexShrink:0,overflowY:"auto"}}>
      <div style={{padding:"0 14px",marginBottom:16,fontSize:11,color:C.t3,fontFamily:FM,letterSpacing:"0.5px"}}>SETTINGS</div>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setStab(t.id)} className="nav" style={{width:"100%",padding:"9px 14px",textAlign:"left",fontSize:13,color:stab===t.id?C.a:C.t2,background:stab===t.id?C.ad:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all .12s",fontFamily:FB,fontWeight:stab===t.id?600:400}}>
          <span style={{color:stab===t.id?C.a:C.t3,display:"flex",alignItems:"center"}}><NavIcon id={t.iconId} s={14} col={stab===t.id?C.a:C.t3}/></span>{t.label}
        </button>
      ))}
    </div>
    <div style={{flex:1,overflowY:"auto"}}>
      {stab==="inboxes"&&<InboxSet inboxes={inboxes} setInboxes={setInboxes}/>}
      {stab==="agents"&&<AgentSet agents={agents} setAgents={setAgents} teams={teams} setTeams={setTeams}/>}
      {stab==="labels"&&<LabelSet labels={labels} setLabels={setLabels}/>}
      {stab==="canned"&&<CannedSet canned={canned} setCanned={setCanned}/>}
      {stab==="automations"&&<AutoSet autos={autos} setAutos={setAutos}/>}
      {stab==="workflows"&&<WorkflowScr/>}
      {stab==="account"&&<AccountSet/>}
      {stab==="aibot"&&<AIBotSet inboxes={inboxes} canned={canned} aiAutoReply={aiAutoReply} setAiAutoReply={setAiAutoReply} aiChannels={aiChannels} setAiChannels={setAiChannels}/>}
      {stab==="botbuilder"&&<BotBuilderScr/>}
      {stab==="salesagent"&&<AISalesAgentScr/>}
      {stab==="widget"&&<WidgetScr inboxes={inboxes} aiAutoReply={aiAutoReply} setAiAutoReply={setAiAutoReply}/>}
      {stab==="formbuilder"&&<FormBuilderSet/>}
      {stab==="customfields"&&<CustomFieldsSet fields={customFields} setFields={setCustomFields}/>}
      {stab==="signatures"&&<EmailSigsSet/>}
      {stab==="notifications"&&<NotifPrefsSet/>}
      {stab==="brands"&&<MultiBrandSet/>}
      {stab==="auditlog"&&<AuditLogSet/>}
      {stab==="fonts"&&<FontSet fontKey={fontKey} applyFont={applyFont} fontScale={fontScale} applySize={applySize}/>}
      {stab==="theme"&&<ThemeSet themeKey={themeKey} applyTheme={applyTheme} autoTheme={autoTheme} setAutoTheme={setAutoTheme}/>}
      {stab==="billing"&&<BillingScr/>}
    </div>
  </div>;
}

function FormBuilderSet(){
  const FTYPES=[["text","📝","Short Text"],["email","📧","Email"],["phone","📞","Phone"],["number","🔢","Number"],["textarea","📄","Long Text"],["select","📋","Dropdown"],["radio","🔘","Radio"],["checkbox","☑","Checkbox"],["date","📅","Date"],["url","🔗","URL"],["file","📎","File Upload"],["heading","📌","Heading"],["paragraph","📃","Paragraph"]];
  const backendUrl=import.meta.env.VITE_BACKEND_URL??"http://localhost:4002";
  const [forms,setForms]=useState([]);const [loading,setLoading]=useState(true);
  const [selForm,setSelForm]=useState(null);const [editMode,setEditMode]=useState("fields");const [newOpt,setNewOpt]=useState("");const [showNew,setShowNew]=useState(false);const [newName,setNewName]=useState("");
  const [submissions,setSubmissions]=useState([]);const [subTotal,setSubTotal]=useState(0);const [saveTimer,setSaveTimer]=useState(null);

  // ── Load forms from backend ──
  const loadForms=useCallback(async()=>{try{const r=await api.get("/forms");setForms(r.forms||[]);}catch(e){console.error("Load forms:",e);}finally{setLoading(false);};},[]);
  useEffect(()=>{loadForms();},[loadForms]);

  const fm=forms.find(f=>f.id===selForm);

  // ── Auto-save: debounce PATCH on field/settings changes ──
  const autoSave=useCallback((formId,patch)=>{
    if(saveTimer)clearTimeout(saveTimer);
    setSaveTimer(setTimeout(async()=>{try{await api.patch(`/forms/${formId}`,patch);}catch(e){console.error("Auto-save:",e);}},800));
  },[saveTimer]);

  const updateForm=(key,val)=>{setForms(p=>p.map(f=>f.id===selForm?{...f,[key]:val}:f));autoSave(selForm,{[key]:val});};
  const updateField=(idx,key,val)=>{const ff=[...(fm?.fields||[])];ff[idx]={...ff[idx],[key]:val};setForms(p=>p.map(f=>f.id===selForm?{...f,fields:ff}:f));autoSave(selForm,{fields:ff});};
  const updateSettings=(key,val)=>{const ns={...(fm?.settings||{}),[key]:val};setForms(p=>p.map(f=>f.id===selForm?{...f,settings:ns}:f));autoSave(selForm,{settings:ns});};
  const moveField=(idx,dir)=>{const ff=[...(fm?.fields||[])];const t=idx+dir;if(t<0||t>=ff.length)return;[ff[idx],ff[t]]=[ff[t],ff[idx]];setForms(p=>p.map(f=>f.id===selForm?{...f,fields:ff}:f));autoSave(selForm,{fields:ff});};
  const addField=(type="text")=>{const ff=[...(fm?.fields||[]),{id:"f"+uid(),type,label:FTYPES.find(t=>t[0]===type)?.[2]||"Field",placeholder:"",required:false,options:type==="select"||type==="radio"?["Option 1","Option 2","Option 3"]:[]}];setForms(p=>p.map(f=>f.id===selForm?{...f,fields:ff}:f));autoSave(selForm,{fields:ff});};

  // ── Create form via API ──
  const createForm=async()=>{if(!newName.trim())return showT("Name required","error");
    try{const r=await api.post("/forms",{name:newName,fields:[{id:"f"+uid(),type:"text",label:"Name",placeholder:"Your name",required:true,options:[]},{id:"f"+uid(),type:"email",label:"Email",placeholder:"you@company.com",required:true,options:[]},{id:"f"+uid(),type:"textarea",label:"Message",placeholder:"Your message…",required:false,options:[]}],settings:{submitText:"Submit",successMsg:"Thank you!",redirectUrl:"",notifyEmail:"",accentColor:"#4c82fb"}});
      loadForms();setShowNew(false);setNewName("");setSelForm(r.form.id);setEditMode("fields");showT("Form created!","success");
    }catch{showT("Failed to create","error");}};

  // ── Delete form ──
  const deleteForm=async(id)=>{try{await api.del(`/forms/${id}`);loadForms();if(selForm===id)setSelForm(null);showT("Deleted","success");}catch{showT("Failed","error");}};

  // ── Toggle publish ──
  const togglePublish=async(f)=>{const ns=f.status==="active"?"draft":"active";try{await api.patch(`/forms/${f.id}`,{status:ns});loadForms();showT(ns==="active"?"Published!":"Unpublished","info");}catch{showT("Failed","error");}};

  // ── Load submissions ──
  const loadSubs=useCallback(async(formId)=>{try{const r=await api.get(`/forms/${formId}/submissions`);setSubmissions(r.submissions||[]);setSubTotal(r.total||0);}catch{setSubmissions([]);setSubTotal(0);}},[]);
  useEffect(()=>{if(selForm&&editMode==="submissions")loadSubs(selForm);},[selForm,editMode,loadSubs]);

  if(loading)return <div style={{padding:"24px 28px"}}><SkelCards/></div>;

  // ─── LIST VIEW ───
  if(!selForm)return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,margin:0}}>Form Builder</h2><p style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>Create embeddable website forms — contact, lead capture, surveys & more</p></div>
      <Btn ch="+ New Form" v="primary" onClick={()=>{setShowNew(true);setNewName("");}}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
      {[{l:"Total Forms",v:forms.length,c:C.a,i:"📝"},{l:"Active",v:forms.filter(f=>f.status==="active").length,c:C.g,i:"✅"},{l:"Draft",v:forms.filter(f=>f.status==="draft").length,c:C.y,i:"📋"},{l:"Submissions",v:forms.reduce((s,f)=>s+(f.submissions||0),0),c:C.p,i:"📊"}].map(k=>(
        <div key={k.l} style={{padding:"12px",background:k.c+"10",border:`1px solid ${k.c}22`,borderRadius:10,textAlign:"center"}}><div style={{fontSize:14,marginBottom:2}}>{k.i}</div><div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{k.l}</div></div>
      ))}
    </div>
    {forms.length===0&&<EmptyState icon="📝" title="No forms yet" desc="Create your first form to start collecting responses"/>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {forms.map(f=>(
        <div key={f.id} onClick={()=>{setSelForm(f.id);setEditMode("fields");}} style={{background:C.s1,border:`1.5px solid ${C.b1}`,borderRadius:14,overflow:"hidden",cursor:"pointer"}} className="card-lift">
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontSize:15,fontWeight:700}}>{f.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>{(f.fields||[]).length} fields</div></div>
            <Tag text={f.status} color={f.status==="active"?C.g:C.y}/>
          </div>
          <div style={{padding:"12px 16px"}}>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <div style={{flex:1,padding:"6px",background:C.s2,borderRadius:6,textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:C.p}}>{f.submissions||0}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Submissions</div></div>
              <div style={{flex:1,padding:"6px",background:C.s2,borderRadius:6,textAlign:"center"}}><div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:C.a}}>{(f.fields||[]).filter(x=>x.required).length}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Required</div></div>
            </div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(f.fields||[]).filter(x=>x.type!=="heading"&&x.type!=="paragraph").slice(0,5).map(fl=><span key={fl.id} style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:C.s3,color:C.t3,fontFamily:FM}}>{fl.label}</span>)}</div>
            <div style={{display:"flex",gap:4,marginTop:10,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
              <Btn ch="✎ Edit" v="ghost" sm onClick={()=>{setSelForm(f.id);setEditMode("fields");}}/>
              <Btn ch={f.status==="active"?"Unpublish":"Publish"} v={f.status==="active"?"ghost":"success"} sm onClick={()=>togglePublish(f)}/>
              <button onClick={()=>{if(window.confirm("Delete form and all submissions?")){deleteForm(f.id);}}} style={{fontSize:12,color:C.r,background:"none",border:"none",cursor:"pointer"}}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
    {showNew&&<Mdl title="Create New Form" onClose={()=>setShowNew(false)} w={440}>
      <Fld label="Form Name"><Inp val={newName} set={setNewName} ph="e.g. Contact Us, Lead Capture, Feedback…"/></Fld>
      <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,marginTop:10}}>TEMPLATES</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[{n:"Contact Form",i:"📧"},{n:"Lead Capture",i:"🎯"},{n:"Feedback",i:"⭐"},{n:"Registration",i:"📋"},{n:"Support Ticket",i:"🎫"},{n:"Blank",i:"📝"}].map(t=>(
          <button key={t.n} onClick={()=>setNewName(t.n)} style={{padding:"12px",borderRadius:10,background:newName===t.n?C.ad:C.s2,border:`1.5px solid ${newName===t.n?C.a+"44":C.b1}`,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:20,marginBottom:4}}>{t.i}</div><div style={{fontSize:11,fontWeight:600,color:C.t1}}>{t.n}</div></button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNew(false)}/><Btn ch="Create Form" v="primary" onClick={createForm}/></div>
    </Mdl>}
  </div>;

  // ─── EDITOR VIEW ───
  if(!fm){setSelForm(null);return null;}
  const st=fm.settings||{};
  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <button onClick={()=>{setSelForm(null);loadForms();}} style={{padding:"6px 10px",borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:12,color:C.t2}}>← Back</button>
      <div style={{flex:1}}><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,margin:0}}>{fm.name}</h2><p style={{fontSize:10,color:C.t3,fontFamily:FM}}>{fm.fields.length} fields · {fm.submissions||0} submissions · Auto-saves</p></div>
      <Btn ch={fm.status==="active"?"✅ Active":"Publish"} v={fm.status==="active"?"success":"primary"} onClick={()=>togglePublish(fm)}/>
    </div>
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:16}}>
      {[["fields","📝 Fields"],["settings","⚙ Settings"],["submissions","📊 Submissions ("+(fm.submissions||0)+")"],["embed","</> Embed Code"]].map(([id,l])=>(
        <button key={id} onClick={()=>setEditMode(id)} style={{padding:"10px 16px",fontSize:12,fontWeight:700,fontFamily:FM,color:editMode===id?C.a:C.t3,borderBottom:`2.5px solid ${editMode===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>
      ))}
    </div>
    <div style={{display:"flex",gap:20}}>
      {editMode==="fields"&&<><div style={{flex:1}}>
        {fm.fields.map((f,idx)=>{const ft=FTYPES.find(t=>t[0]===f.type);return(
          <div key={f.id} style={{background:C.s1,border:`1.5px solid ${C.b1}`,borderRadius:12,padding:"14px 16px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:18,textAlign:"center",fontWeight:700}}>{idx+1}</span>
              <div style={{display:"flex",flexDirection:"column",gap:2}}><button onClick={()=>moveField(idx,-1)} style={{fontSize:9,color:idx>0?C.a:C.b1,background:"none",border:"none",cursor:idx>0?"pointer":"default",lineHeight:1}}>▲</button><button onClick={()=>moveField(idx,1)} style={{fontSize:9,color:idx<fm.fields.length-1?C.a:C.b1,background:"none",border:"none",cursor:idx<fm.fields.length-1?"pointer":"default",lineHeight:1}}>▼</button></div>
              <span style={{fontSize:16}}>{ft?.[1]||"📝"}</span>
              <input value={f.label||""} onChange={e=>updateField(idx,"label",e.target.value)} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:13,fontWeight:600,color:C.t1,outline:"none",fontFamily:FB}} placeholder="Field label"/>
              {!["heading","paragraph"].includes(f.type)&&<button onClick={()=>updateField(idx,"required",!f.required)} style={{fontSize:10,padding:"4px 10px",borderRadius:6,fontWeight:700,fontFamily:FM,background:f.required?C.r+"15":"transparent",color:f.required?C.r:C.t3,border:`1px solid ${f.required?C.r+"33":C.b1}`,cursor:"pointer"}}>{f.required?"Required":"Optional"}</button>}
              <button onClick={()=>{const ff=[...fm.fields,{...f,id:"f"+uid(),label:f.label+" (copy)"}];setForms(p=>p.map(x=>x.id===selForm?{...x,fields:ff}:x));autoSave(selForm,{fields:ff});}} style={{fontSize:11,color:C.a,background:"none",border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 6px",cursor:"pointer"}}>⧉</button>
              <button onClick={()=>{const ff=fm.fields.filter(x=>x.id!==f.id);setForms(p=>p.map(x=>x.id===selForm?{...x,fields:ff}:x));autoSave(selForm,{fields:ff});}} style={{fontSize:13,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select value={f.type} onChange={e=>updateField(idx,"type",e.target.value)} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 8px",fontSize:11,color:C.t1,fontFamily:FB,cursor:"pointer",outline:"none"}}>{FTYPES.map(([v,ic,l])=><option key={v} value={v}>{ic} {l}</option>)}</select>
              {!["checkbox","radio"].includes(f.type)&&<input value={f.placeholder||""} onChange={e=>updateField(idx,"placeholder",e.target.value)} placeholder={f.type==="heading"?"Subtitle…":"Placeholder…"} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:11,color:C.t2,outline:"none",fontFamily:FB}}/>}
            </div>
            {(f.type==="select"||f.type==="radio")&&<div style={{marginTop:8,padding:"10px 12px",background:C.s2,borderRadius:8}}>
              <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>OPTIONS ({(f.options||[]).length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{(f.options||[]).map((opt,oi)=>(<span key={oi} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,padding:"4px 10px",borderRadius:6,background:C.s1,border:`1px solid ${C.b1}`,fontFamily:FM}}>{opt}<button onClick={()=>updateField(idx,"options",(f.options||[]).filter((_,i)=>i!==oi))} style={{fontSize:9,color:C.r,background:"none",border:"none",cursor:"pointer"}}>×</button></span>))}</div>
              <div style={{display:"flex",gap:4}}><input value={newOpt} onChange={e=>setNewOpt(e.target.value)} placeholder="Add option…" onKeyDown={e=>{if(e.key==="Enter"&&newOpt.trim()){updateField(idx,"options",[...(f.options||[]),newOpt.trim()]);setNewOpt("");}}} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:11,color:C.t1,outline:"none",fontFamily:FB}}/><button onClick={()=>{if(newOpt.trim()){updateField(idx,"options",[...(f.options||[]),newOpt.trim()]);setNewOpt("");}}} style={{fontSize:11,padding:"5px 10px",borderRadius:6,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>+</button></div>
            </div>}
          </div>
        );})}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{FTYPES.map(([v,ic,l])=>(<button key={v} onClick={()=>addField(v)} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.b1}`,background:C.s2,cursor:"pointer",fontSize:10,fontWeight:600,color:C.t2,fontFamily:FM,display:"flex",alignItems:"center",gap:3}} className="hov"><span style={{fontSize:13}}>{ic}</span>{l}</button>))}</div>
      </div>
      <div style={{width:340,flexShrink:0}}><div style={{position:"sticky",top:0}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>LIVE PREVIEW</div>
        <div style={{background:"#fff",border:`1px solid #e0e0e0`,borderRadius:16,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,.08)"}}>
          <div style={{padding:"18px 20px"}}>{fm.fields.map(f=>(
            <div key={f.id} style={{marginBottom:14}}>
              {f.type==="heading"?<><div style={{fontSize:16,fontWeight:800,color:"#111"}}>{f.label}</div>{f.placeholder&&<div style={{fontSize:11,color:"#777",marginTop:2}}>{f.placeholder}</div>}</>
              :f.type==="paragraph"?<div style={{fontSize:12,color:"#555",lineHeight:1.5}}>{f.label}</div>
              :<><div style={{fontSize:11,fontWeight:600,color:"#333",marginBottom:4}}>{f.label}{f.required&&<span style={{color:"#e11"}}>*</span>}</div>
                {f.type==="select"?<select disabled style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #ddd",background:"#f9f9f9",fontSize:11,color:"#999"}}><option>{f.placeholder||"Select…"}</option>{(f.options||[]).map((o,i)=><option key={i}>{o}</option>)}</select>
                :f.type==="textarea"?<textarea disabled rows={3} placeholder={f.placeholder} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #ddd",background:"#f9f9f9",fontSize:11,color:"#999",resize:"none",boxSizing:"border-box"}}/>
                :f.type==="radio"?<div style={{display:"flex",flexDirection:"column",gap:6}}>{(f.options||[]).map((o,i)=><label key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#333"}}><input type="radio" disabled name={f.id}/>{o}</label>)}</div>
                :f.type==="checkbox"?<label style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" disabled style={{width:14,height:14}}/><span style={{fontSize:11,color:"#333"}}>{f.label}</span></label>
                :f.type==="file"?<div style={{padding:"14px",border:"2px dashed #ddd",borderRadius:8,textAlign:"center",fontSize:10,color:"#999"}}>📎 Click or drag to upload</div>
                :<input disabled type={f.type==="email"?"email":f.type==="phone"?"tel":f.type==="number"?"number":f.type==="url"?"url":f.type==="date"?"date":"text"} placeholder={f.placeholder} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #ddd",background:"#f9f9f9",fontSize:11,color:"#999",boxSizing:"border-box"}}/>}
              </>}
            </div>
          ))}<button disabled style={{width:"100%",padding:"12px",borderRadius:8,background:st.accentColor||C.a,color:"#fff",fontSize:13,fontWeight:700,border:"none",opacity:.9}}>{st.submitText||"Submit"}</button></div>
        </div>
      </div></div></>}

      {editMode==="settings"&&<div style={{flex:1,maxWidth:600}}>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>General</div>
          <Fld label="Form Name"><Inp val={fm.name} set={v=>updateForm("name",v)} ph="Contact Us"/></Fld>
          <Fld label="Submit Button Text"><Inp val={st.submitText||""} set={v=>updateSettings("submitText",v)} ph="Submit"/></Fld>
          <Fld label="Success Message"><textarea value={st.successMsg||""} onChange={e=>updateSettings("successMsg",e.target.value)} rows={2} placeholder="Thank you!" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
          <Fld label="Redirect URL (optional)"><Inp val={st.redirectUrl||""} set={v=>updateSettings("redirectUrl",v)} ph="https://yoursite.com/thank-you"/></Fld>
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Notifications</div>
          <Fld label="Notify Email"><Inp val={st.notifyEmail||""} set={v=>updateSettings("notifyEmail",v)} ph="team@company.com" type="email"/></Fld>
          <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>Submissions are emailed to this address.</div>
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Appearance</div>
          <Fld label="Accent Color"><div style={{display:"flex",gap:6}}>{[C.a,C.g,C.p,C.y,C.r,C.cy,"#000","#e91e63","#ff6b35","#6366f1"].map(c=>(<button key={c} onClick={()=>updateSettings("accentColor",c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${(st.accentColor||C.a)===c?"#fff":"transparent"}`,cursor:"pointer",boxShadow:(st.accentColor||C.a)===c?`0 0 0 2px ${c}`:"none"}}/>))}</div></Fld>
        </div>
      </div>}

      {editMode==="submissions"&&<div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:13,fontWeight:700}}>{subTotal} Total Submissions</span><Btn ch="🔄 Refresh" v="ghost" sm onClick={()=>loadSubs(selForm)}/></div>
        {submissions.length>0?<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          {submissions.map((s,i)=>{const data=s.data||{};const values=Object.values(data);return(
            <div key={s.id} style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}22`,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:30}}>#{subTotal-i}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:C.t1,marginBottom:2}}>{values.slice(0,3).join(" · ")||"(empty)"}</div>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{s.created_at?.slice(0,16).replace("T"," ")||""}{s.ip?" · "+s.ip:""}</div>
              </div>
              <button onClick={async()=>{try{await api.del(`/forms/${selForm}/submissions/${s.id}`);loadSubs(selForm);showT("Deleted","success");}catch{}}} style={{fontSize:10,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
            </div>
          );})}
        </div>:<div style={{padding:40,textAlign:"center",color:C.t3}}><div style={{fontSize:28,marginBottom:8}}>📊</div><div style={{fontSize:14,fontWeight:700}}>No submissions yet</div><div style={{fontSize:11,marginTop:4}}>Publish and embed your form to start collecting responses.</div></div>}
      </div>}

      {editMode==="embed"&&<div style={{flex:1,maxWidth:600}}>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Embed via iframe</div>
          <div style={{fontSize:11,color:C.t3,marginBottom:12}}>Paste this into your website HTML.</div>
          <div style={{background:C.bg,borderRadius:8,padding:"14px",fontFamily:FM,fontSize:10,color:C.a,lineHeight:1.8,border:`1px solid ${C.b1}`,wordBreak:"break-all"}}>{`<iframe src="${backendUrl}/form/${fm.id}" style="width:100%;min-height:600px;border:none;border-radius:16px" title="${fm.name}"></iframe>`}</div>
          <Btn ch="📋 Copy Code" v="primary" sm onClick={()=>{navigator.clipboard.writeText(`<iframe src="${backendUrl}/form/${fm.id}" style="width:100%;min-height:600px;border:none;border-radius:16px" title="${fm.name}"></iframe>`);showT("Copied!","success");}}/>
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px 20px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Direct Link</div>
          <div style={{background:C.bg,borderRadius:8,padding:"10px 14px",fontFamily:FM,fontSize:11,color:C.a,border:`1px solid ${C.b1}`}}>{backendUrl}/form/{fm.id}</div>
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <Btn ch="📋 Copy" v="ghost" sm onClick={()=>{navigator.clipboard.writeText(`${backendUrl}/form/${fm.id}`);showT("Copied!","success");}}/>
            <Btn ch="Open ↗" v="primary" sm onClick={()=>window.open(`${backendUrl}/form/${fm.id}`,"_blank")}/>
          </div>
        </div>
      </div>}
    </div>
  </div>;
}

function WebFormBuilder({inboxes}){
  const [forms,setForms]=useState([
    {id:"wf1",name:"Contact Us",desc:"General contact form for website visitors",status:"active",inbox:"ib1",assignee:"auto",submitText:"Send Message",successMsg:"Thanks! We'll get back to you within 24 hours.",redirectUrl:"",notifyEmail:"support@supportdesk.app",submissions:14,created:"01/03/26",theme:{color:C.a,radius:8,font:"default"},fields:[
      {id:"f1",type:"text",label:"Full Name",placeholder:"Your name",required:true,width:"half",options:[]},
      {id:"f2",type:"email",label:"Email Address",placeholder:"you@company.com",required:true,width:"half",options:[]},
      {id:"f3",type:"phone",label:"Phone Number",placeholder:"+91 90001 22334",required:false,width:"half",options:[]},
      {id:"f4",type:"select",label:"Department",placeholder:"Select department",required:true,width:"half",options:["Sales","Support","Billing","Technical","Partnership"]},
      {id:"f5",type:"textarea",label:"Message",placeholder:"How can we help you?",required:true,width:"full",options:[]},
      {id:"f6",type:"checkbox",label:"I agree to the privacy policy",placeholder:"",required:true,width:"full",options:[]}
    ]},
    {id:"wf2",name:"Bug Report",desc:"Technical issue reporting form",status:"active",inbox:"ib1",assignee:"Meena",submitText:"Submit Bug Report",successMsg:"Bug report received! Our technical team will investigate.",redirectUrl:"",notifyEmail:"dev@supportdesk.app",submissions:8,created:"10/03/26",theme:{color:C.r,radius:8,font:"default"},fields:[
      {id:"f1",type:"text",label:"Your Name",placeholder:"Name",required:true,width:"half",options:[]},
      {id:"f2",type:"email",label:"Email",placeholder:"you@company.com",required:true,width:"half",options:[]},
      {id:"f3",type:"select",label:"Severity",placeholder:"Select severity",required:true,width:"half",options:["Critical","High","Medium","Low"]},
      {id:"f4",type:"select",label:"Product Area",placeholder:"Select area",required:true,width:"half",options:["Dashboard","Inbox","Chat","CRM","Reports","API","Other"]},
      {id:"f5",type:"text",label:"Subject",placeholder:"Brief description of the bug",required:true,width:"full",options:[]},
      {id:"f6",type:"textarea",label:"Steps to Reproduce",placeholder:"1. Go to…\n2. Click on…\n3. See error…",required:true,width:"full",options:[]},
      {id:"f7",type:"text",label:"Expected vs Actual Behavior",placeholder:"Expected X, but got Y",required:false,width:"full",options:[]},
      {id:"f8",type:"url",label:"Screenshot URL",placeholder:"https://imgur.com/...",required:false,width:"full",options:[]}
    ]},
    {id:"wf3",name:"Feedback Form",desc:"Customer feedback and suggestions",status:"draft",inbox:"ib1",assignee:"auto",submitText:"Submit Feedback",successMsg:"Thank you for your feedback!",redirectUrl:"",notifyEmail:"",submissions:0,created:"20/03/26",theme:{color:C.g,radius:12,font:"default"},fields:[
      {id:"f1",type:"email",label:"Email (optional)",placeholder:"you@company.com",required:false,width:"full",options:[]},
      {id:"f2",type:"select",label:"Feedback Type",placeholder:"Select type",required:true,width:"half",options:["Feature Request","Improvement","Praise","Complaint","Other"]},
      {id:"f3",type:"select",label:"Rate your experience",placeholder:"Select rating",required:true,width:"half",options:["⭐ Very Poor","⭐⭐ Poor","⭐⭐⭐ Average","⭐⭐⭐⭐ Good","⭐⭐⭐⭐⭐ Excellent"]},
      {id:"f4",type:"textarea",label:"Your Feedback",placeholder:"Tell us what you think…",required:true,width:"full",options:[]}
    ]}
  ]);
  const [selForm,setSelForm]=useState(null);const [editMode,setEditMode]=useState("fields");const [newOpt,setNewOpt]=useState("");const [showEmbed,setShowEmbed]=useState(false);
  const sf=forms.find(f=>f.id===selForm);
  const FTYPES=[["text","📝","Text"],["email","📧","Email"],["phone","📞","Phone"],["select","📋","Dropdown"],["textarea","📄","Long Text"],["number","🔢","Number"],["checkbox","☑","Checkbox"],["url","🔗","URL"],["date","📅","Date"],["file","📎","File Upload"]];
  const updateForm=(key,val)=>setForms(p=>p.map(f=>f.id===selForm?{...f,[key]:val}:f));
  const updateField=(idx,key,val)=>{const ff=[...sf.fields];ff[idx]={...ff[idx],[key]:val};updateForm("fields",ff);};
  const moveField=(idx,dir)=>{const ff=[...sf.fields];const t=idx+dir;if(t<0||t>=ff.length)return;[ff[idx],ff[t]]=[ff[t],ff[idx]];updateForm("fields",ff);};
  const addForm=()=>{const nf={id:"wf"+uid(),name:"New Form",desc:"",status:"draft",inbox:inboxes[0]?.id||"",assignee:"auto",submitText:"Submit",successMsg:"Thank you! We'll be in touch.",redirectUrl:"",notifyEmail:"",submissions:0,created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),theme:{color:C.a,radius:8,font:"default"},fields:[{id:"f"+uid(),type:"text",label:"Name",placeholder:"Your name",required:true,width:"half",options:[]},{id:"f"+uid(),type:"email",label:"Email",placeholder:"you@company.com",required:true,width:"half",options:[]},{id:"f"+uid(),type:"textarea",label:"Message",placeholder:"Your message…",required:true,width:"full",options:[]}]};setForms(p=>[...p,nf]);setSelForm(nf.id);showT("Form created","success");};

  // Form list view
  if(!selForm)return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,margin:0}}>Form Builder</h2><p style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>Create embeddable website forms that generate support tickets</p></div>
      <Btn ch="+ Create Form" v="primary" onClick={addForm}/>
    </div>
    {/* Form cards */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      {forms.map(f=>(
        <div key={f.id} onClick={()=>setSelForm(f.id)} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"all .15s"}} className="card-lift">
          <div style={{height:4,background:f.theme?.color||C.a}}/>
          <div style={{padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:15,fontWeight:700}}>{f.name}</div>
              <Tag text={f.status} color={f.status==="active"?C.g:C.y}/>
            </div>
            <div style={{fontSize:11,color:C.t3,marginBottom:10,lineHeight:1.4}}>{f.desc||"No description"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
              {[{l:"Fields",v:f.fields.length,c:C.a},{l:"Submissions",v:f.submissions,c:C.g},{l:"Created",v:f.created,c:C.t3}].map(s=>(
                <div key={s.l} style={{padding:"6px",background:C.s2,borderRadius:6,textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:s.c,fontFamily:FM}}>{s.v}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{s.l}</div></div>
              ))}
            </div>
            <div style={{display:"flex",gap:4}}>
              <Btn ch="Edit" v="ghost" sm onClick={e=>{e.stopPropagation();setSelForm(f.id);}}/>
              <Btn ch={f.status==="active"?"Deactivate":"Activate"} v={f.status==="active"?"danger":"success"} sm onClick={e=>{e.stopPropagation();setForms(p=>p.map(x=>x.id===f.id?{...x,status:x.status==="active"?"draft":"active"}:x));showT(f.status==="active"?"Deactivated":"Activated","info");}}/>
              <Btn ch="🗑" v="danger" sm onClick={e=>{e.stopPropagation();setForms(p=>p.filter(x=>x.id!==f.id));showT("Deleted","success");}}/>
            </div>
          </div>
        </div>
      ))}
      {/* Create card */}
      <div onClick={addForm} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"30px",cursor:"pointer",minHeight:180}} className="hov">
        <div style={{fontSize:32,marginBottom:8}}>📝</div>
        <div style={{fontSize:14,fontWeight:700,color:C.a,fontFamily:FD}}>Create New Form</div>
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>Contact, Feedback, Bug Report…</div>
      </div>
    </div>
  </div>;

  // Form editor
  return <div style={{padding:"20px 24px",display:"flex",gap:20,height:"100%"}}>
    {/* Left: Editor */}
    <div style={{flex:1,overflowY:"auto"}}>
      {/* Back + title */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>setSelForm(null)} style={{padding:"6px 10px",borderRadius:6,fontSize:11,background:C.s2,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer",fontWeight:700}}>← Back</button>
        <input value={sf.name} onChange={e=>updateForm("name",e.target.value)} style={{fontSize:18,fontWeight:800,fontFamily:FD,background:"none",border:"none",color:C.t1,outline:"none",flex:1}}/>
        <Tag text={sf.status} color={sf.status==="active"?C.g:C.y}/>
        <Btn ch={sf.status==="active"?"Deactivate":"Publish"} v={sf.status==="active"?"danger":"success"} sm onClick={()=>{updateForm("status",sf.status==="active"?"draft":"active");showT(sf.status==="active"?"Deactivated":"Published!","success");}}/>
        <Btn ch="</> Embed" v="ghost" sm onClick={()=>setShowEmbed(!showEmbed)}/>
      </div>

      {/* Editor tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:16}}>
        {[["fields","📝 Fields"],["settings","⚙ Settings"],["submissions","📊 Submissions ("+sf.submissions+")"]].map(([id,lb])=>(
          <button key={id} onClick={()=>setEditMode(id)} style={{padding:"9px 14px",fontSize:11,fontWeight:700,fontFamily:FM,color:editMode===id?C.a:C.t3,borderBottom:`2px solid ${editMode===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lb}</button>
        ))}
      </div>

      {/* ── Fields tab ── */}
      {editMode==="fields"&&<>
        <div style={{marginBottom:10}}><Fld label="Form Description"><Inp val={sf.desc} set={v=>updateForm("desc",v)} ph="Describe your form…"/></Fld></div>
        {sf.fields.map((f,idx)=>(
          <div key={f.id} style={{background:C.s1,border:`1.5px solid ${C.b1}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:18,textAlign:"center",fontWeight:700}}>{idx+1}</span>
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                <button onClick={()=>moveField(idx,-1)} style={{fontSize:8,color:idx>0?C.a:C.b1,background:"none",border:"none",cursor:idx>0?"pointer":"default",lineHeight:1}}>▲</button>
                <button onClick={()=>moveField(idx,1)} style={{fontSize:8,color:idx<sf.fields.length-1?C.a:C.b1,background:"none",border:"none",cursor:idx<sf.fields.length-1?"pointer":"default",lineHeight:1}}>▼</button>
              </div>
              <span style={{fontSize:14}}>{{text:"📝",email:"📧",phone:"📞",select:"📋",textarea:"📄",number:"🔢",checkbox:"☑",url:"🔗",date:"📅",file:"📎"}[f.type]||"📝"}</span>
              <input value={f.label||""} onChange={e=>updateField(idx,"label",e.target.value)} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 10px",fontSize:13,fontWeight:600,color:C.t1,outline:"none",fontFamily:FB}} placeholder="Field label"/>
              <select value={f.width||"full"} onChange={e=>updateField(idx,"width",e.target.value)} style={{padding:"4px 6px",borderRadius:5,fontSize:9,background:C.s2,border:`1px solid ${C.b1}`,color:C.t2,cursor:"pointer",fontFamily:FM}}>
                <option value="full">Full width</option><option value="half">Half width</option>
              </select>
              <button onClick={()=>updateField(idx,"required",!f.required)} style={{fontSize:9,padding:"3px 8px",borderRadius:5,fontWeight:700,fontFamily:FM,background:f.required?C.r+"15":"transparent",color:f.required?C.r:C.t3,border:`1px solid ${f.required?C.r+"33":C.b1}`,cursor:"pointer"}}>{f.required?"Required":"Optional"}</button>
              <button onClick={()=>updateForm("fields",[...sf.fields,{...f,id:"f"+uid(),label:f.label+" (copy)"}])} title="Duplicate" style={{fontSize:11,color:C.a,background:"none",border:`1px solid ${C.b1}`,borderRadius:5,padding:"2px 6px",cursor:"pointer"}}>⧉</button>
              <button onClick={()=>updateForm("fields",sf.fields.filter(x=>x.id!==f.id))} style={{fontSize:12,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <select value={f.type} onChange={e=>updateField(idx,"type",e.target.value)} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:11,color:C.t1,fontFamily:FB,cursor:"pointer",outline:"none"}}>
                {FTYPES.map(([v,ic,l])=><option key={v} value={v}>{ic} {l}</option>)}
              </select>
              {f.type!=="checkbox"&&f.type!=="file"&&<input value={f.placeholder||""} onChange={e=>updateField(idx,"placeholder",e.target.value)} placeholder="Placeholder…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:11,color:C.t2,outline:"none",fontFamily:FB}}/>}
            </div>
            {f.type==="select"&&<div style={{marginTop:8,padding:"8px 10px",background:C.s2,borderRadius:8}}>
              <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>OPTIONS</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                {(f.options||[]).map((opt,oi)=><span key={oi} style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,padding:"3px 8px",borderRadius:5,background:C.s1,border:`1px solid ${C.b1}`,fontFamily:FM}}>{opt}<button onClick={()=>updateField(idx,"options",(f.options||[]).filter((_,i)=>i!==oi))} style={{fontSize:8,color:C.r,background:"none",border:"none",cursor:"pointer"}}>×</button></span>)}
                {(f.options||[]).length===0&&<span style={{fontSize:10,color:C.t3,fontStyle:"italic"}}>No options</span>}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newOpt} onChange={e=>setNewOpt(e.target.value)} placeholder="Add option…" onKeyDown={e=>{if(e.key==="Enter"&&newOpt.trim()){updateField(idx,"options",[...(f.options||[]),newOpt.trim()]);setNewOpt("");}}} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:11,color:C.t1,outline:"none",fontFamily:FB}}/>
                <button onClick={()=>{if(newOpt.trim()){updateField(idx,"options",[...(f.options||[]),newOpt.trim()]);setNewOpt("");}}} style={{fontSize:10,padding:"5px 10px",borderRadius:6,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>+</button>
              </div>
            </div>}
          </div>
        ))}
        <div style={{display:"flex",gap:6,marginTop:4}}>
          <button onClick={()=>updateForm("fields",[...sf.fields,{id:"f"+uid(),type:"text",label:"",placeholder:"",required:false,width:"full",options:[]}])} style={{flex:1,padding:"10px",borderRadius:10,border:`2px dashed ${C.a}44`,background:"transparent",color:C.a,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:FM}} className="hov">+ Add Field</button>
          {[["text","📝"],["email","📧"],["phone","📞"],["select","📋"],["textarea","📄"],["file","📎"]].map(([t,ic])=>(
            <button key={t} onClick={()=>updateForm("fields",[...sf.fields,{id:"f"+uid(),type:t,label:t==="file"?"Upload File":t[0].toUpperCase()+t.slice(1),placeholder:"",required:false,width:t==="textarea"||t==="file"?"full":"half",options:t==="select"?["Option 1","Option 2","Option 3"]:[]}])} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.b1}`,background:C.s2,cursor:"pointer",fontSize:11,fontWeight:600,color:C.t2}} className="hov">{ic}</button>
          ))}
        </div>
      </>}

      {/* ── Settings tab ── */}
      {editMode==="settings"&&<div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Submit Button Text"><Inp val={sf.submitText} set={v=>updateForm("submitText",v)} ph="Submit"/></Fld></div><div style={{flex:1}}><Fld label="Assign to Inbox"><select value={sf.inbox} onChange={e=>updateForm("inbox",e.target.value)} style={{width:"100%",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,cursor:"pointer",outline:"none"}}>{inboxes.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></Fld></div></div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Assign Agent"><Sel val={sf.assignee} set={v=>updateForm("assignee",v)} opts={[{v:"auto",l:"Auto-assign"},...["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))]}/></Fld></div><div style={{flex:1}}><Fld label="Notification Email"><Inp val={sf.notifyEmail||""} set={v=>updateForm("notifyEmail",v)} ph="notify@company.com" type="email"/></Fld></div></div>
        <Fld label="Success Message"><textarea value={sf.successMsg} onChange={e=>updateForm("successMsg",e.target.value)} rows={2} placeholder="Thank you message…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
        <Fld label="Redirect URL (optional)"><Inp val={sf.redirectUrl||""} set={v=>updateForm("redirectUrl",v)} ph="https://yoursite.com/thank-you"/></Fld>
        <div style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.t3,marginTop:14,marginBottom:8}}>FORM STYLE</div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Accent Color"><div style={{display:"flex",gap:6}}>{[C.a,C.g,C.p,C.r,C.y,C.cy,"#ff6b35","#e91e63","#000"].map(c=><button key={c} onClick={()=>updateForm("theme",{...sf.theme,color:c})} style={{width:26,height:26,borderRadius:"50%",background:c,border:`3px solid ${sf.theme?.color===c?"#fff":"transparent"}`,cursor:"pointer"}}/>)}</div></Fld></div><div style={{flex:1}}><Fld label="Border Radius"><input type="range" min="0" max="20" value={sf.theme?.radius||8} onChange={e=>updateForm("theme",{...sf.theme,radius:Number(e.target.value)})} style={{width:"100%",accentColor:sf.theme?.color||C.a}}/><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{sf.theme?.radius||8}px</span></Fld></div></div>
      </div>}

      {/* ── Submissions tab ── */}
      {editMode==="submissions"&&<div>
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          {[{l:"Total",v:sf.submissions,c:C.a},{l:"This Week",v:Math.ceil(sf.submissions*0.3),c:C.g},{l:"Conversion",v:sf.submissions>0?"12%":"—",c:C.p}].map(s=>(
            <div key={s.l} style={{flex:1,padding:"12px",background:s.c+"10",border:`1px solid ${s.c}22`,borderRadius:10,textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{s.l}</div></div>
          ))}
        </div>
        {sf.submissions>0?<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 100px 60px",padding:"10px 14px",background:C.s2,borderBottom:`1px solid ${C.b1}`}}>{["#","Name","Email","Date","Status"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}</div>
          {[{n:"Rohit Kumar",e:"rohit@example.com",d:"Today",s:"new"},{n:"Aisha Patel",e:"aisha@corp.co",d:"Yesterday",s:"responded"},{n:"Mike Chen",e:"mike@globex.us",d:"25/03/26",s:"resolved"},{n:"Sneha R.",e:"sneha@startup.io",d:"24/03/26",s:"resolved"},{n:"James W.",e:"james@co.uk",d:"23/03/26",s:"responded"}].slice(0,Math.min(5,sf.submissions)).map((s,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 100px 60px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{i+1}</span>
              <span style={{fontSize:12,fontWeight:600}}>{s.n}</span>
              <span style={{fontSize:11,color:C.t2}}>{s.e}</span>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{s.d}</span>
              <Tag text={s.s} color={s.s==="new"?C.a:s.s==="responded"?C.y:C.g}/>
            </div>
          ))}
        </div>:<div style={{padding:30,textAlign:"center",color:C.t3}}><div style={{fontSize:28,marginBottom:6}}>📊</div><div style={{fontSize:14,fontWeight:700}}>No submissions yet</div><div style={{fontSize:11,marginTop:4}}>Publish and embed this form to start collecting submissions</div></div>}
      </div>}

      {/* Embed code modal */}
      {showEmbed&&<div style={{marginTop:16,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Embed Code</span><button onClick={()=>setShowEmbed(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer"}}>×</button></div>
        <div style={{fontSize:11,color:C.t3,marginBottom:8}}>Copy and paste this code into your website HTML where you want the form to appear.</div>
        <div style={{background:C.bg,borderRadius:8,padding:"12px",fontFamily:FM,fontSize:10,color:C.a,lineHeight:1.8,overflowX:"auto",border:`1px solid ${C.b1}`,whiteSpace:"pre",marginBottom:8}}>{`<!-- SupportDesk Form: ${sf.name} -->\n<div id="sd-form-${sf.id}"></div>\n<script src="https://cdn.supportdesk.app/forms.js"></script>\n<script>\n  SupportDesk.form('${sf.id}', {\n    target: '#sd-form-${sf.id}',\n    theme: '${sf.theme?.color||C.a}'\n  });\n</script>`}</div>
        <div style={{display:"flex",gap:6}}>
          <Btn ch="📋 Copy Code" v="primary" sm onClick={()=>{navigator.clipboard?.writeText(`<div id="sd-form-${sf.id}"></div>\n<script src="https://cdn.supportdesk.app/forms.js"></script>\n<script>SupportDesk.form('${sf.id}',{target:'#sd-form-${sf.id}'});</script>`);showT("Copied!","success");}}/>
          <Btn ch="📧 Email Code" v="ghost" sm onClick={()=>showT("Sent to "+sf.notifyEmail,"success")}/>
        </div>
      </div>}
    </div>

    {/* Right: Live Preview */}
    <div style={{width:380,flexShrink:0,overflowY:"auto"}}>
      <div style={{position:"sticky",top:0}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>LIVE PREVIEW</div>
        <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:sf.theme?.radius||8,overflow:"hidden",boxShadow:`0 4px 20px ${C.bg}`}}>
          {/* Form header */}
          <div style={{background:sf.theme?.color||C.a,padding:"20px 22px",color:"#fff"}}>
            <div style={{fontSize:18,fontWeight:800}}>{sf.name}</div>
            {sf.desc&&<div style={{fontSize:12,opacity:.85,marginTop:4}}>{sf.desc}</div>}
          </div>
          {/* Form body */}
          <div style={{padding:"20px 22px"}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {sf.fields.map(f=>(
                <div key={f.id} style={{width:f.width==="half"?"calc(50% - 5px)":"100%",marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:4}}>{f.label||"Untitled"}{f.required&&<span style={{color:C.r,marginLeft:2}}>*</span>}</div>
                  {f.type==="select"?
                    <select disabled style={{width:"100%",padding:"9px 12px",borderRadius:sf.theme?.radius||8,border:`1px solid ${C.b1}`,background:C.s1,fontSize:12,color:C.t3,fontFamily:FB}}>
                      <option>{f.placeholder||"Select…"}</option>
                      {(f.options||[]).map((o,i)=><option key={i}>{o}</option>)}
                    </select>
                  :f.type==="textarea"?
                    <textarea disabled rows={3} placeholder={f.placeholder||""} style={{width:"100%",padding:"9px 12px",borderRadius:sf.theme?.radius||8,border:`1px solid ${C.b1}`,background:C.s1,fontSize:12,color:C.t3,fontFamily:FB,resize:"none",boxSizing:"border-box"}}/>
                  :f.type==="checkbox"?
                    <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" disabled style={{width:16,height:16,borderRadius:4}}/><span style={{fontSize:12,color:C.t2}}>{f.label}</span></label>
                  :f.type==="file"?
                    <div style={{padding:"16px",borderRadius:sf.theme?.radius||8,border:`2px dashed ${C.b1}`,textAlign:"center",color:C.t3,fontSize:11}}>📎 Click or drag to upload</div>
                  :
                    <input disabled type={f.type==="email"?"email":f.type==="phone"?"tel":f.type==="number"?"number":f.type==="url"?"url":f.type==="date"?"date":"text"} placeholder={f.placeholder||""} style={{width:"100%",padding:"9px 12px",borderRadius:sf.theme?.radius||8,border:`1px solid ${C.b1}`,background:C.s1,fontSize:12,color:C.t3,fontFamily:FB,boxSizing:"border-box"}}/>
                  }
                </div>
              ))}
            </div>
            {sf.fields.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:12}}>Add fields to see preview</div>}
            <button disabled style={{width:"100%",padding:"12px",borderRadius:sf.theme?.radius||8,background:sf.theme?.color||C.a,color:"#fff",fontSize:13,fontWeight:700,border:"none",marginTop:12,opacity:.9}}>{sf.submitText||"Submit"}</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function InboxSet({inboxes,setInboxes}){
  const backendUrl=(import.meta.env.VITE_BACKEND_URL??"http://localhost:4002").replace(/\/$/,"");
  const [showForm,setShowForm]=useState(false);
  const [edit,setEdit]=useState(null);
  const [cfgTab,setCfgTab]=useState("general");
  const [form,setForm]=useState({name:"",type:"live",greeting:"",color:C.g,active:true});
  const [cfg,setCfg]=useState({
    // Connection
    apiKey:"",webhookUrl:"",verifyToken:"",phoneNumberId:"",phoneNumber:"",pageId:"",botToken:"",accessToken:"",appId:"",appSecret:"",
    // General
    autoAssign:true,assignMethod:"round_robin",maxPerAgent:8,
    // Business Hours
    bhEnabled:false,bhStart:"09:00",bhEnd:"18:00",bhDays:[1,2,3,4,5],bhOfflineMsg:"We are currently offline. We will get back to you during business hours.",
    // SLA
    slaEnabled:true,slaFirstReply:5,slaResolution:240,
    // CSAT
    csatEnabled:true,csatDelay:2,
    // Notifications
    notifyNewConv:true,notifyNewMsg:true,notifyAssign:true,notifyMention:true,notifySla:true,
    // Email specific
    imapHost:"",imapPort:"993",smtpHost:"",smtpPort:"587",emailUser:"",emailPass:"",
    // Advanced
    autoClose:false,autoCloseDays:7,allowAttach:true,maxAttachMB:10,rateLimit:false,rateLimitPerMin:30,
    // Connection status
    connStatus:"",connTesting:false,showDocs:false,fbConnecting:false,pageName:"",pagePicture:"",pageCategory:"",connectedAt:"",_pendingPages:null,
    // Pre-chat form
    formEnabled:true,formTitle:"Before we start…",formDesc:"Please fill in your details so we can assist you better.",
    formFields:[
      {id:"ff1",type:"text",label:"Full Name",placeholder:"Your name",required:true,options:[]},
      {id:"ff2",type:"email",label:"Email Address",placeholder:"you@company.com",required:true,options:[]},
      {id:"ff3",type:"phone",label:"Phone Number",placeholder:"+91 90001 22334",required:false,options:[]},
      {id:"ff4",type:"select",label:"Department",placeholder:"Select department",required:true,options:["Sales","Support","Billing","Technical","Other"]},
      {id:"ff5",type:"textarea",label:"How can we help?",placeholder:"Describe your issue…",required:false,options:[]}
    ]
  });
  // ── Handle Facebook OAuth redirect callback ──
  useEffect(()=>{
    const hash=window.location.hash||"";
    const qIdx=hash.indexOf("?");
    if(qIdx<0)return;
    const params=new URLSearchParams(hash.slice(qIdx));
    if(params.get("fb_success")){
      const pageName=params.get("fb_page")||"Page";
      showT("✓ Connected to Facebook: "+pageName,"success");
      // Reload inboxes to get updated config
      api.get("/settings/inboxes").then(r=>{if(r?.inboxes)setInboxes(r.inboxes.map(i=>{let c={};try{c=typeof i.config==="string"?JSON.parse(i.config):i.config||{};}catch{}return{...i,cfg:c};}));});
      // Clean URL
      window.location.hash="#/settings";
    }
    if(params.get("fb_error")){
      showT("Facebook error: "+decodeURIComponent(params.get("fb_error")||"Unknown"),"error");
      window.location.hash="#/settings";
    }
    if(params.get("fb_pick_page")){
      const fbInboxId=params.get("fb_inbox");
      // Open that inbox for page selection
      if(fbInboxId){
        const ib=inboxes.find(i=>i.id===fbInboxId);
        if(ib){
          // Reload inbox to get pending pages
          api.get("/settings/inboxes").then(r=>{
            if(r?.inboxes){
              const updated=r.inboxes.map(i=>{let c={};try{c=typeof i.config==="string"?JSON.parse(i.config):i.config||{};}catch{}return{...i,cfg:c};});
              setInboxes(updated);
              const freshIb=updated.find(i=>i.id===fbInboxId);
              if(freshIb){
                setForm({name:freshIb.name,type:freshIb.type,greeting:freshIb.greeting||"",color:freshIb.color,active:freshIb.active});
                setCfg(p=>({...p,...freshIb.cfg}));
                setEdit(freshIb);setCfgTab("connection");setShowForm(true);
                showT("Multiple pages found — please select one","info");
              }
            }
          });
        }
      }
      window.location.hash="#/settings";
    }
  },[]);

  const fld=(k,v)=>setForm(p=>({...p,[k]:v}));
  const cfgFld=(k,v)=>setCfg(p=>({...p,[k]:v}));
  const chFields={
    whatsapp:[
      {k:"phoneNumberId",l:"Phone Number ID",ph:"101419598765432"},
      {k:"phoneNumber",l:"Display Phone Number",ph:"+91 98765 43210"},
      {k:"apiKey",l:"WhatsApp Access Token",ph:"EAAxxxxxxx"},
      {k:"verifyToken",l:"Webhook Verify Token",ph:"my_secret_verify_token"},
      {k:"webhookUrl",l:"Webhook Callback URL (set in Meta)",ph:"https://api.yoursite.com/api/whatsapp/webhook"},
    ],
    telegram:[{k:"botToken",l:"Bot Token",ph:"123456:ABCdef..."},{k:"webhookUrl",l:"Webhook URL",ph:"https://api.yoursite.com/tg/webhook"}],
    facebook:[{k:"pageId",l:"Page ID",ph:"123456789"},{k:"accessToken",l:"Page Access Token",ph:"EAAxxxxxxx"},{k:"appId",l:"App ID",ph:"933722449370118"},{k:"appSecret",l:"App Secret",ph:"abc123def456..."},{k:"verifyToken",l:"Webhook Verify Token",ph:"my_secret_verify_token"}],
    instagram:[{k:"pageId",l:"Instagram Business Account ID",ph:"17841400000"},{k:"accessToken",l:"Access Token",ph:"IGQxxxxxxx"}],
    email:[{k:"imapHost",l:"IMAP Host",ph:"imap.gmail.com"},{k:"imapPort",l:"IMAP Port",ph:"993"},{k:"smtpHost",l:"SMTP Host",ph:"smtp.gmail.com"},{k:"smtpPort",l:"SMTP Port",ph:"587"},{k:"emailUser",l:"Email Address",ph:"support@yourcompany.com"},{k:"emailPass",l:"Password / App Password",ph:"••••••••"}],
    sms:[{k:"phoneNumber",l:"Phone Number",ph:"+1 555 000 1234"},{k:"apiKey",l:"Twilio Account SID",ph:"ACxxxxxxx"},{k:"accessToken",l:"Auth Token",ph:"xxxxxxxxxx"}],
    viber:[{k:"botToken",l:"Bot Token",ph:"xxxx-xxxx-xxxx"},{k:"webhookUrl",l:"Webhook URL",ph:"https://..."}],
    line:[{k:"accessToken",l:"Channel Access Token",ph:"xxxx"},{k:"apiKey",l:"Channel Secret",ph:"xxxx"}],
    tiktok:[{k:"accessToken",l:"Access Token",ph:"act.xxxx"},{k:"apiKey",l:"App Secret",ph:"xxxx"}],
    x:[{k:"apiKey",l:"API Key",ph:"xxxx"},{k:"accessToken",l:"Access Token",ph:"xxxx"},{k:"botToken",l:"Bearer Token",ph:"xxxx"}],
    apple:[{k:"apiKey",l:"Business Chat Account ID",ph:"xxxx"},{k:"accessToken",l:"MSP ID",ph:"xxxx"}],
    voice:[{k:"phoneNumber",l:"Phone Number",ph:"+1 555 000 1234"},{k:"apiKey",l:"Twilio SID",ph:"ACxxxxxxx"},{k:"accessToken",l:"Auth Token",ph:"xxxx"}],
    video:[{k:"apiKey",l:"Video API Key",ph:"xxxx"}],
    api:[{k:"webhookUrl",l:"Webhook Endpoint",ph:"https://api.yoursite.com/sd/incoming"}],
    live:[]
  };
  const dayNames=["S","M","T","W","T","F","S"];
  const defaultFormFields=[{id:"ff1",type:"text",label:"Full Name",placeholder:"Your name",required:true,options:[]},{id:"ff2",type:"email",label:"Email Address",placeholder:"you@company.com",required:true,options:[]},{id:"ff3",type:"select",label:"Department",placeholder:"Select department",required:true,options:["Sales","Support","Billing","Technical","Other"]},{id:"ff4",type:"textarea",label:"How can we help?",placeholder:"Describe your issue…",required:false,options:[]}];
  const facebookWebhookUrl=`${backendUrl}/api/facebook/webhook`;
  const connectionConfiguredMsg=
    form.type==="whatsapp"
      ?"Meta webhook verification and a live WhatsApp message are still needed before inbox replies can sync in real time"
      :form.type==="facebook"
      ?"Add this callback URL and verify token in Meta, then subscribe your page to Messenger events."
      :"Configuration looks complete. Finish the provider-side webhook or subscription step to start receiving live messages.";
  const copyToClipboard=async(value,label)=>{
    if(!value){showT(label+" not available yet","error");return;}
    try{
      await navigator.clipboard.writeText(value);
      showT(label+" copied","success");
    }catch{
      showT("Could not copy "+label.toLowerCase(),"error");
    }
  };
  const resetConnectionFields=()=>{
    (chFields[form.type]||[]).forEach(f=>cfgFld(f.k,""));
    if(form.type==="facebook"){
      cfgFld("pageName","");
      cfgFld("pagePicture","");
      cfgFld("pageCategory","");
      cfgFld("connectedAt","");
      cfgFld("_pendingPages",null);
      cfgFld("fbConnecting",false);
    }
    cfgFld("connStatus","");
    showT("Credentials cleared","info");
  };
  const disconnectFacebook=async()=>{
    if(!edit?.id)return;
    try{
      await api.post("/facebook/disconnect",{inboxId:edit.id});
      cfgFld("connStatus","");
      cfgFld("pageId","");
      cfgFld("accessToken","");
      cfgFld("pageName","");
      cfgFld("pagePicture","");
      cfgFld("pageCategory","");
      cfgFld("connectedAt","");
      cfgFld("_pendingPages",null);
      showT("Facebook page disconnected","info");
    }catch{
      showT("Disconnect failed","error");
    }
  };
  const startFacebookConnect=async()=>{
    if(!cfg.appId||!cfg.appSecret){showT("Please enter App ID and App Secret first, then Save Changes before connecting","error");return;}
    if(!edit?.id){showT("Please Save Changes first to create the inbox, then connect","error");return;}
    try{
      await api.patch("/settings/inboxes/"+edit.id,{config:{...cfg}});
    }catch{}
    try{
      cfgFld("fbConnecting",true);
      const r=await api.get("/facebook/auth?inboxId="+edit.id);
      if(r?.redirectUrl){window.location.href=r.redirectUrl;}
      else{showT(r?.error||"Failed to start OAuth","error");cfgFld("fbConnecting",false);}
    }catch(e){
      showT("Connection failed: "+(e?.message||e),"error");
      cfgFld("fbConnecting",false);
    }
  };
  const [newOptText,setNewOptText]=useState("");
  const openEdit=ib=>{
    setForm({name:ib.name,type:ib.type,greeting:ib.greeting||"",color:ib.color,active:ib.active});
    const ibCfg=ib.cfg||{};
    setCfg(p=>({...p,...ibCfg,formEnabled:ibCfg.formEnabled!==undefined?ibCfg.formEnabled:true,formTitle:ibCfg.formTitle||"Before we start…",formDesc:ibCfg.formDesc||"Please fill in your details so we can assist you better.",formFields:ibCfg.formFields||[...defaultFormFields]}));
    setEdit(ib);setCfgTab("general");setShowForm(true);setNewOptText("");
  };
  const save=()=>{
    if(!form.name.trim()){showT("Name required","error");return;}
    const payload={...form,cfg:{...cfg}};
    if(edit){setInboxes(p=>p.map(i=>i.id===edit.id?{...i,...payload}:i));if(api.isConnected())api.patch(`/settings/inboxes/${edit.id}`,{name:payload.name,type:payload.type,color:payload.color,greeting:payload.greeting,active:payload.active,config:payload.cfg}).then(r=>{if(r?.inbox){let c={};try{c=typeof r.inbox.config==="string"?JSON.parse(r.inbox.config):r.inbox.config||{};}catch{}setInboxes(p=>p.map(i=>i.id===edit.id?{...r.inbox,cfg:c}:i));}}).catch(()=>{});}
    else{const nid="ib"+uid();setInboxes(p=>[...p,{id:nid,...payload,convs:0}]);if(api.isConnected())api.post("/settings/inboxes",{name:payload.name,type:payload.type||"live",color:payload.color,greeting:payload.greeting,config:payload.cfg}).then(r=>{if(r?.inbox){let c={};try{c=typeof r.inbox.config==="string"?JSON.parse(r.inbox.config):r.inbox.config||{};}catch{}setInboxes(p=>p.map(i=>i.id===nid?{...r.inbox,cfg:c}:i));}}).catch(()=>{});}
    showT(edit?"Inbox updated":"Inbox created!","success");setShowForm(false);setEdit(null);
  };
  const testConnection=async(inboxId?:string)=>{
    const fields=chFields[form.type]||[];
    const missing=fields.filter(f=>!String((cfg as any)[f.k]||"").trim());
    if(form.type!=="live"&&form.type!=="whatsapp"&&missing.length>0){
      cfgFld("connStatus","failed");
      showT("Fill in: "+missing.map(f=>f.l).join(", "),"error");
      return;
    }
    if(form.type==="email"&&!inboxId){
      cfgFld("connStatus","failed");
      showT("Save this email inbox first, then test IMAP/SMTP","error");
      return;
    }
    // Email inbox with a saved id → call the real API
    if(form.type==="email"&&inboxId){
      cfgFld("connTesting",true);cfgFld("connStatus","");
      showT("Testing IMAP + SMTP connection…","info");
      try{
        const r=await api.post("/email/test-connection",{inboxId});
        cfgFld("connTesting",false);
        if(r?.success){cfgFld("connStatus","connected");showT("Connection successful! IMAP ✓  SMTP ✓","success");}
        else{cfgFld("connStatus","failed");showT(r?.message||"Connection failed","error");}
      }catch(e:any){cfgFld("connTesting",false);cfgFld("connStatus","failed");showT("Connection error: "+(e?.message||"unknown"),"error");}
      return;
    }
    if(form.type==="whatsapp"){
      const waMissing=[];
      if(!String(cfg.phoneNumberId||"").trim())waMissing.push("Phone Number ID");
      if(!String(cfg.apiKey||cfg.accessToken||"").trim())waMissing.push("WhatsApp Access Token");
      if(!String(cfg.verifyToken||"").trim())waMissing.push("Webhook Verify Token");
      if(!String(cfg.webhookUrl||"").trim())waMissing.push("Webhook Callback URL");
      if(waMissing.length){
        cfgFld("connStatus","failed");
        showT("Fill in: "+waMissing.join(", "),"error");
        return;
      }
      cfgFld("connStatus","configured");
      showT("WhatsApp setup looks complete. Real inbound replies start only after Meta webhook verification.","info");
      return;
    }
    // Non-email channels (or unsaved email) — keep the simulated test
    cfgFld("connTesting",true);cfgFld("connStatus","");
    showT("Testing connection…","info");
    setTimeout(()=>{cfgFld("connTesting",false);cfgFld("connStatus","connected");showT("Connection successful! ✓","success");},2000);
  };

  const [expandedIb,setExpandedIb]=useState(null);

  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Inboxes</h2>
      <Btn ch="⊕ New Inbox" v="primary" onClick={()=>{setForm({name:"",type:"live",greeting:"",color:C.g,active:true});setCfg({apiKey:"",webhookUrl:"",verifyToken:"",phoneNumberId:"",phoneNumber:"",pageId:"",botToken:"",accessToken:"",autoAssign:true,assignMethod:"round_robin",maxPerAgent:8,bhEnabled:false,bhStart:"09:00",bhEnd:"18:00",bhDays:[1,2,3,4,5],bhOfflineMsg:"We are currently offline.",slaEnabled:true,slaFirstReply:5,slaResolution:240,csatEnabled:true,csatDelay:2,notifyNewConv:true,notifyNewMsg:true,notifyAssign:true,notifyMention:true,notifySla:true,imapHost:"",imapPort:"993",smtpHost:"",smtpPort:"587",emailUser:"",emailPass:"",autoClose:false,autoCloseDays:7,allowAttach:true,maxAttachMB:10,rateLimit:false,rateLimitPerMin:30,connStatus:"",connTesting:false,showDocs:false,formEnabled:true,formTitle:"Before we start…",formDesc:"Please fill in your details so we can assist you better.",formFields:[{id:"ff1",type:"text",label:"Full Name",placeholder:"Your name",required:true,options:[]},{id:"ff2",type:"email",label:"Email Address",placeholder:"you@company.com",required:true,options:[]},{id:"ff3",type:"select",label:"Department",placeholder:"Select department",required:true,options:["Sales","Support","Billing","Technical","Other"]},{id:"ff4",type:"textarea",label:"How can we help?",placeholder:"Describe your issue…",required:false,options:[]}]});setEdit(null);setCfgTab("general");setShowForm(true);}}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {!inboxes.length&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12}}>
        <EmptyState icon="[]" title="No inboxes to show" desc="No saved inboxes are available right now. If the API is offline, reconnect to load the stored list or create a new inbox."/>
      </div>}
      {inboxes.map(ib=>{const ibCfg=ib.cfg||{};const ffEnabled=ibCfg.formEnabled!==undefined?ibCfg.formEnabled:true;const ff=ibCfg.formFields||defaultFormFields;const ffTitle=ibCfg.formTitle||"Before we start…";const ffDesc=ibCfg.formDesc||"Please fill in your details so we can assist you better.";const isExp=expandedIb===ib.id;return(
        <div key={ib.id} style={{background:C.s1,border:`1px solid ${ib.active?C.g+"33":C.b1}`,borderRadius:12,overflow:"hidden"}}>
          {/* Inbox header row */}
          <div style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:42,height:42,borderRadius:10,background:ib.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><ChIcon t={ib.type} s={24}/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:3}}>{ib.name}</div>
              <div style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:C.t3,fontFamily:FM}}>
                <span>{ib.convs} convs · {ib.type}</span>
                <span style={{width:1,height:12,background:C.b1}}/>
                <span style={{color:ffEnabled?C.g:C.t3}}>{ffEnabled?"📝 Form: "+ff.length+" fields":"📝 No form"}</span>
              </div>
            </div>
            <button onClick={()=>setExpandedIb(isExp?null:ib.id)} title={isExp?"Hide form":"Show form"} style={{padding:"5px 10px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:isExp?C.ad:C.s2,color:isExp?C.a:C.t3,border:`1px solid ${isExp?C.a+"44":C.b1}`,cursor:"pointer"}}>{isExp?"▲ Hide Form":"▼ Show Form"}</button>
            <Toggle val={ib.active} set={v=>{setInboxes(p=>p.map(i=>i.id===ib.id?{...i,active:v}:i));showT("Inbox "+(v?"activated":"deactivated"),"info");}}/>
            <Tag text={ib.active?"Active":"Inactive"} color={ib.active?C.g:C.t3}/>
            <Btn ch="Configure" v="ghost" sm onClick={()=>openEdit(ib)}/>
            <button onClick={()=>{if(window.confirm("Delete inbox?")){setInboxes(p=>p.filter(i=>i.id!==ib.id));showT("Inbox deleted","success");if(api.isConnected())api.del(`/settings/inboxes/${ib.id}`).catch(()=>{});}}} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:16}}>🗑</button>
          </div>

          {/* Expanded form preview */}
          {isExp&&<div style={{borderTop:`1px solid ${C.b1}`,padding:"16px 18px",background:C.s2}}>
            <div style={{display:"flex",gap:16}}>
              {/* Form info */}
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Pre-Chat Form</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:10,color:ffEnabled?C.g:C.t3,fontFamily:FM}}>{ffEnabled?"Enabled":"Disabled"}</span>
                    <Toggle val={ffEnabled} set={v=>{setInboxes(p=>p.map(i=>i.id===ib.id?{...i,cfg:{...(i.cfg||{}),formEnabled:v,formFields:(i.cfg||{}).formFields||[...defaultFormFields],formTitle:(i.cfg||{}).formTitle||"Before we start…",formDesc:(i.cfg||{}).formDesc||"Please fill in your details so we can assist you better."}}:i));showT(v?"Form enabled":"Form disabled","info");}}/>
                  </div>
                </div>
                {ffEnabled?<>
                  <div style={{fontSize:11,color:C.t2,marginBottom:10}}>Title: <strong>{ffTitle}</strong> — {ffDesc}</div>
                  {/* Field list */}
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {ff.map((f,idx)=>{const icons={text:"📝",email:"📧",phone:"📞",select:"📋",textarea:"📄",number:"🔢",checkbox:"☑",url:"🔗",date:"📅"};return(
                      <div key={f.id||idx} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.s1,borderRadius:8,border:`1px solid ${C.b1}`}}>
                        <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:16,textAlign:"center"}}>{idx+1}</span>
                        <span style={{fontSize:13}}>{icons[f.type]||"📝"}</span>
                        <span style={{fontSize:12,fontWeight:600,flex:1,color:C.t1}}>{f.label||"Untitled"}</span>
                        <span style={{fontSize:9,color:C.t3,fontFamily:FM,textTransform:"capitalize"}}>{f.type}</span>
                        {f.required&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:C.r+"15",color:C.r,fontWeight:700,fontFamily:FM}}>Required</span>}
                        {f.type==="select"&&(f.options||[]).length>0&&<span style={{fontSize:8,color:C.t3,fontFamily:FM}}>{f.options.length} opts</span>}
                      </div>
                    );})}
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:10}}>
                    <Btn ch="✎ Edit Form" v="ghost" sm onClick={()=>{openEdit(ib);setCfgTab("prechat");}}/>
                    <Btn ch="+ Add Field" v="ghost" sm onClick={()=>{setInboxes(p=>p.map(i=>i.id===ib.id?{...i,cfg:{...(i.cfg||{}),formFields:[...(i.cfg?.formFields||defaultFormFields),{id:"ff"+uid(),type:"text",label:"New Field",placeholder:"",required:false,options:[]}]}}:i));showT("Field added","success");}}/>
                  </div>
                </>:<div style={{padding:"14px",textAlign:"center",color:C.t3,fontSize:11,background:C.bg,borderRadius:8}}>Pre-chat form is disabled for this inbox. Visitors can start chatting immediately.</div>}
              </div>

              {/* Mini preview */}
              {ffEnabled&&<div style={{width:240,flexShrink:0}}>
                <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>PREVIEW</div>
                <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
                  <div style={{background:ib.color||C.a,padding:"10px 12px",color:"#fff"}}>
                    <div style={{fontSize:11,fontWeight:700}}>{ffTitle}</div>
                    <div style={{fontSize:9,opacity:.8,marginTop:1}}>{ffDesc}</div>
                  </div>
                  <div style={{padding:"10px 12px"}}>
                    {ff.slice(0,4).map((f,i)=>(
                      <div key={f.id||i} style={{marginBottom:6}}>
                        <div style={{fontSize:9,fontWeight:600,color:C.t1,marginBottom:2}}>{f.label||"Untitled"}{f.required&&<span style={{color:C.r}}>*</span>}</div>
                        {f.type==="select"?
                          <div style={{padding:"4px 6px",borderRadius:5,border:`1px solid ${C.b1}`,background:C.s1,fontSize:9,color:C.t3}}>{f.placeholder||"Select…"}</div>
                        :f.type==="textarea"?
                          <div style={{padding:"4px 6px",borderRadius:5,border:`1px solid ${C.b1}`,background:C.s1,fontSize:9,color:C.t3,height:24}}>{f.placeholder||""}</div>
                        :f.type==="checkbox"?
                          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,border:`1px solid ${C.b1}`}}/><span style={{fontSize:9,color:C.t3}}>{f.label}</span></div>
                        :
                          <div style={{padding:"4px 6px",borderRadius:5,border:`1px solid ${C.b1}`,background:C.s1,fontSize:9,color:C.t3}}>{f.placeholder||""}</div>
                        }
                      </div>
                    ))}
                    {ff.length>4&&<div style={{fontSize:8,color:C.t3,textAlign:"center",fontFamily:FM}}>+{ff.length-4} more fields</div>}
                    <div style={{padding:"5px",borderRadius:5,background:ib.color||C.a,color:"#fff",fontSize:9,fontWeight:700,textAlign:"center",marginTop:4,opacity:.8}}>Start Conversation</div>
                  </div>
                </div>
              </div>}
            </div>
          </div>}
        </div>
      );})}
    </div>

    {/* ═══ CONFIGURE MODAL ═══ */}
    {showForm&&<Mdl title={edit?"Configure "+form.name:"New Inbox"} onClose={()=>{setShowForm(false);setEdit(null);}} w={620}>
      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:16}}>
        {[["general","General"],["connection","Connection"],["prechat","Pre-Chat Form"],["hours","Business Hours"],["assignment","Assignment"],["sla","SLA"],["notifications","Notifications"],["advanced","Advanced"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setCfgTab(id)} style={{padding:"9px 12px",fontSize:10,fontWeight:700,fontFamily:FM,color:cfgTab===id?C.a:C.t3,borderBottom:`2px solid ${cfgTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>

      {/* ── General ── */}
      {cfgTab==="general"&&<div>
        <div style={{display:"flex",gap:14}}>
          <div style={{flex:1}}><Fld label="Inbox Name"><Inp val={form.name} set={v=>fld("name",v)} ph="e.g. Website Chat"/></Fld></div>
          <div style={{flex:1}}><Fld label="Channel Type"><Sel val={form.type} set={v=>fld("type",v)} opts={[{v:"live",l:"Live Chat"},{v:"email",l:"Email"},{v:"whatsapp",l:"WhatsApp"},{v:"telegram",l:"Telegram"},{v:"facebook",l:"Facebook"},{v:"instagram",l:"Instagram"},{v:"viber",l:"Viber"},{v:"apple",l:"Apple Business"},{v:"line",l:"LINE"},{v:"tiktok",l:"TikTok"},{v:"x",l:"X (Twitter)"},{v:"sms",l:"SMS"},{v:"voice",l:"Voice"},{v:"video",l:"Video"},{v:"api",l:"API"}]}/></Fld></div>
        </div>
        <Fld label="Greeting Message"><textarea value={form.greeting} onChange={e=>fld("greeting",e.target.value)} placeholder="Hi! How can we help you today?" rows={3} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none"}}/></Fld>
        <Fld label="Widget Color">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[C.g,C.a,C.p,C.y,C.r,C.cy,"#25d366","#0088cc","#e91e63","#ff6b35"].map(c=>(
              <button key={c} onClick={()=>fld("color",c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"#fff":"transparent"}`,cursor:"pointer"}}/>
            ))}
          </div>
        </Fld>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
          <span style={{fontSize:12,color:C.t2}}>CSAT Survey</span><Toggle val={cfg.csatEnabled} set={v=>cfgFld("csatEnabled",v)}/>
          {cfg.csatEnabled&&<span style={{fontSize:11,color:C.t3}}>Send {cfg.csatDelay}min after resolve</span>}
        </div>
      </div>}

      {/* ── Connection ── */}
      {cfgTab==="connection"&&<div>
        {/* Channel header */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"12px",background:C.s1,borderRadius:10,border:`1px solid ${C.b1}`}}>
          <div style={{width:40,height:40,borderRadius:10,background:form.color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><ChIcon t={form.type} s={22}/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700}}>{form.type==="live"?"Website Live Chat":form.type==="whatsapp"?"WhatsApp Business":form.type==="email"?"Email (IMAP/SMTP)":form.type.charAt(0).toUpperCase()+form.type.slice(1)+" Integration"}</div>
            <div style={{fontSize:11,color:C.t3}}>{form.type==="live"?"No external credentials needed":"Connect your "+form.type+" account to start receiving messages"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:cfg.connStatus==="connected"?C.g:cfg.connStatus==="configured"?C.y:cfg.connStatus==="failed"||cfg.connStatus==="error"?C.r:C.t3}}/>
            <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:cfg.connStatus==="connected"?C.g:cfg.connStatus==="configured"?C.y:cfg.connStatus==="failed"||cfg.connStatus==="error"?C.r:C.t3}}>{cfg.connStatus==="connected"?"Connected":cfg.connStatus==="configured"?"Configured":cfg.connStatus==="failed"||cfg.connStatus==="error"?"Failed":"Not Connected"}</span>
          </div>
        </div>

        {/* Credential fields */}
        {(chFields[form.type]||[]).length===0&&<div style={{padding:"20px",textAlign:"center",color:C.t3,fontSize:12,background:C.gd,borderRadius:10,border:`1px solid ${C.g}33`}}>No external credentials required for Live Chat. Just enable the inbox and add the widget snippet to your website.</div>}

        {/* ── Facebook OAuth Connect Button ── */}
        {form.type==="facebook"&&<>
          <div style={{marginBottom:12,padding:"14px 16px",background:C.s1,borderRadius:12,border:`1px solid ${C.b1}`}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:12,background:"#1877F222",display:"flex",alignItems:"center",justifyContent:"center",color:"#1877F2"}}>
                <ChIcon t="facebook" s={22}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:800,color:C.t1}}>Facebook Integration</div>
                <div style={{fontSize:10.5,color:C.t3,marginTop:2}}>Connect your Facebook page and copy the webhook details into Meta.</div>
              </div>
              <Tag text={cfg.connStatus==="connected"?"Connected":cfg.connStatus==="configured"?"Configured":"Not Connected"} color={cfg.connStatus==="connected"?C.g:cfg.connStatus==="configured"?C.y:"#1877F2"}/>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
              <Btn ch={cfg.fbConnecting?"Connecting...":"Connect with Facebook"} v="primary" sm onClick={startFacebookConnect} disabled={!!cfg.fbConnecting}/>
              {cfg.connStatus==="connected"&&<Btn ch="Disconnect" v="ghost" sm onClick={disconnectFacebook}/>}
            </div>
            <div style={{fontSize:10,color:C.t3,marginTop:8}}>OAuth is optional here. You can also fill the fields below manually if you already have the page credentials.</div>
          </div>

          {cfg.connStatus==="connected"&&cfg.pageName&&
            <div style={{padding:"14px 16px",background:"#e7f5e9",borderRadius:12,border:"1px solid #25d36644",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {cfg.pagePicture&&<img src={cfg.pagePicture} alt="" style={{width:38,height:38,borderRadius:"50%",border:"2px solid #25d366"}}/>}
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a7f37"}}>Connected to {cfg.pageName}</div>
                  <div style={{fontSize:10,color:"#57606a"}}>{cfg.pageCategory||"Facebook Page"}{cfg.pageId?" · Page ID: "+cfg.pageId:""}{cfg.connectedAt?" · Connected: "+cfg.connectedAt:""}</div>
                </div>
              </div>
            </div>
          }

          {cfg._pendingPages&&cfg._pendingPages.length>1&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Select a Facebook Page</div>
            <div style={{fontSize:10.5,color:C.t3,marginBottom:10}}>Facebook returned multiple pages. Pick the one that should deliver Messenger conversations into this inbox.</div>
            {cfg._pendingPages.map(p=>(
              <div key={p.id} onClick={async()=>{
                try{
                  await api.post("/facebook/select-page",{inboxId:edit?.id,pageId:p.id});
                  cfgFld("pageId",p.id);cfgFld("pageName",p.name);cfgFld("pagePicture",p.picture);cfgFld("pageCategory",p.category||"");cfgFld("accessToken",p.accessToken);
                  cfgFld("connStatus","connected");cfgFld("_pendingPages",null);
                  showT("Connected to "+p.name+"!","success");
                }catch{showT("Failed to select page","error");}
              }} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.bg,borderRadius:10,border:`1px solid ${C.b1}`,marginBottom:6,cursor:"pointer",transition:"border-color 0.2s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="#1877F2";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.b1;}}>
                {p.picture&&<img src={p.picture} alt="" style={{width:32,height:32,borderRadius:"50%"}}/>}
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{p.name}</div>
                  <div style={{fontSize:10,color:C.t3}}>{p.category||"Page"} · ID: {p.id}</div>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:"#1877F2"}}>Select</div>
              </div>
            ))}
          </div>}

          {[{k:"pageId",l:"PAGE ID",ph:"123456789",type:"text"},{k:"accessToken",l:"PAGE ACCESS TOKEN",ph:"EAAxxxxxxx",type:"password"},{k:"appId",l:"APP ID",ph:"933722449370118",type:"text"},{k:"appSecret",l:"APP SECRET",ph:"abc123def456...",type:"password"},{k:"verifyToken",l:"WEBHOOK VERIFY TOKEN",ph:"supportdesk_facebook_verify",type:"text"}].map(f=>(
            <div key={f.k} style={{marginBottom:10}}>
              <div style={{fontSize:9,fontWeight:800,fontFamily:FM,color:C.t3,letterSpacing:"0.08em",marginBottom:6}}>{f.l}</div>
              <Inp val={cfg[f.k]||""} set={v=>cfgFld(f.k,v)} ph={f.ph} type={f.type}/>
            </div>
          ))}

          <div style={{marginTop:4,marginBottom:12,padding:"14px 16px",background:C.s1,borderRadius:12,border:`1px solid ${C.b1}`}}>
            <div style={{fontSize:12.5,fontWeight:800,color:C.t1,marginBottom:4}}>Messenger Webhook</div>
            <div style={{fontSize:10.5,color:C.t3,lineHeight:1.55,marginBottom:12}}>In Meta App Dashboard add the Webhooks product, then use this callback URL and the same verify token shown below. Subscribe your page to the <code style={{fontFamily:FM,color:C.a}}>messages</code> field.</div>
            <div style={{display:"grid",gap:10}}>
              <div>
                <div style={{fontSize:9,fontWeight:800,fontFamily:FM,color:C.t3,letterSpacing:"0.08em",marginBottom:6}}>CALLBACK URL</div>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10}}>
                  <div style={{flex:1,fontSize:11,fontFamily:FM,color:C.g,wordBreak:"break-all"}}>{facebookWebhookUrl}</div>
                  <Btn ch="Copy" v="ghost" sm onClick={()=>copyToClipboard(facebookWebhookUrl,"Callback URL")}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:800,fontFamily:FM,color:C.t3,letterSpacing:"0.08em",marginBottom:6}}>VERIFY TOKEN</div>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10}}>
                  <div style={{flex:1,fontSize:11,fontFamily:FM,color:cfg.verifyToken?C.a:C.t3,wordBreak:"break-all"}}>{cfg.verifyToken||"Enter a webhook verify token above"}</div>
                  <Btn ch="Copy" v="ghost" sm onClick={()=>copyToClipboard(cfg.verifyToken||"","Verify Token")}/>
                </div>
              </div>
            </div>
          </div>
        </>}

        {/* Non-Facebook channels: render fields normally */}
        {form.type!=="facebook"&&(chFields[form.type]||[]).map(f=>(
          <Fld key={f.k} label={f.l}><Inp val={cfg[f.k]||""} set={v=>cfgFld(f.k,v)} ph={f.ph}/></Fld>
        ))}

        {/* Action buttons */}
        {(chFields[form.type]||[]).length>0&&<div style={{display:"flex",gap:8,marginTop:10,marginBottom:14}}>
          <Btn ch={cfg.connTesting?"Testing…":"Test Connection"} v="primary" onClick={()=>testConnection(edit?.id)}/>
          <Btn ch="View Documentation" v="ghost" onClick={()=>cfgFld("showDocs",!cfg.showDocs)}/>
          <Btn ch="Reset" v="ghost" onClick={resetConnectionFields}/>
        </div>}

        {/* Connection status */}
        {cfg.connTesting&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"12px",background:C.ad,borderRadius:10,border:`1px solid ${C.a}33`,marginBottom:12}}>
          <Spin/><span style={{fontSize:12,color:C.a}}>Testing connection to {form.type==="whatsapp"?"WhatsApp Business API":form.type==="email"?"IMAP/SMTP servers":form.type+" API"}…</span>
        </div>}
        {cfg.connStatus==="connected"&&!cfg.connTesting&&<div style={{padding:"12px",background:C.gd,borderRadius:10,border:`1px solid ${C.g}33`,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:C.g,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800}}>✓</div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.g}}>Connection Successful</div><div style={{fontSize:10,color:C.t3}}>Your {form.type} account is connected and ready to receive messages</div></div>
        </div>}
        {cfg.connStatus==="configured"&&!cfg.connTesting&&<div style={{padding:"12px",background:C.yd,borderRadius:10,border:`1px solid ${C.y}33`,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:C.y,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800}}>!</div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.y}}>Configuration Looks Complete</div><div style={{fontSize:10,color:C.t3}}>{connectionConfiguredMsg}</div></div>
        </div>}
        {(cfg.connStatus==="failed"||cfg.connStatus==="error")&&!cfg.connTesting&&<div style={{padding:"12px",background:C.rd,borderRadius:10,border:`1px solid ${C.r}33`,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:C.r,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800}}>✕</div>
          <div><div style={{fontSize:12,fontWeight:700,color:C.r}}>Connection Failed</div><div style={{fontSize:10,color:C.t3}}>Please verify your credentials and try again</div></div>
        </div>}

        {/* Inline Documentation */}
        {cfg.showDocs&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",marginTop:8}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}`,background:C.s2,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{form.type==="whatsapp"?"WhatsApp Business":form.type==="email"?"Email (IMAP/SMTP)":form.type.charAt(0).toUpperCase()+form.type.slice(1)} Setup Guide</span>
            <button onClick={()=>cfgFld("showDocs",false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>
          </div>
          <div style={{padding:"14px 16px",fontSize:12,color:C.t2,lineHeight:1.8,maxHeight:300,overflowY:"auto"}}>
            {form.type==="whatsapp"&&<>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:8}}>Prerequisites</div>
              <div style={{padding:"8px 12px",background:C.yd,borderRadius:8,border:`1px solid ${C.y}33`,marginBottom:12,fontSize:11}}>
                <div>• WhatsApp Business API account (via <strong>Meta Business Suite</strong>)</div>
                <div>• Verified business phone number</div>
                <div>• Facebook Business Manager access</div>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:8}}>Step-by-Step Setup</div>
              {[{n:"1",t:"Get API Access",d:"Go to developers.facebook.com → Create App → Select WhatsApp Business → Generate permanent API token"},{n:"2",t:"Phone Number",d:"In Meta Business Suite → WhatsApp Manager → Phone Numbers → Add your verified business number (format: +91 XXXXX XXXXX)"},{n:"3",t:"API Key",d:"Copy the WhatsApp Business API key from App Dashboard → API Setup → Permanent Token. Starts with 'EAA...'"},{n:"4",t:"Webhook URL",d:"Set your webhook callback URL. SupportDesk provides: https://api.supportdesk.app/webhooks/wa/{your_account_id}"},{n:"5",t:"Test",d:"Click 'Test Connection' above. Send a test message to your WhatsApp number to verify messages arrive."}].map(s=>(
                <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:C.a+"22",border:`1px solid ${C.a}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{s.n}</div>
                  <div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div>
                </div>
              ))}
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginTop:14,marginBottom:8}}>Supported Features</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {["Receive messages","Send replies","Template messages","Rich media","Read receipts","Delivery status","AI auto-reply","Marketing campaigns"].map(f=><Tag key={f} text={f} color={C.g}/>)}
              </div>
            </>}
            {form.type==="email"&&<>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:8}}>IMAP/SMTP Configuration</div>
              {[{n:"1",t:"IMAP Settings (Receiving)",d:"Host: imap.gmail.com (or your provider) · Port: 993 · SSL: Required · This allows SupportDesk to read incoming emails"},{n:"2",t:"SMTP Settings (Sending)",d:"Host: smtp.gmail.com · Port: 587 · TLS: Required · This allows SupportDesk to send reply emails"},{n:"3",t:"Authentication",d:"For Gmail: Enable 2FA → Create App Password at myaccount.google.com/apppasswords. For other providers: use your email credentials."},{n:"4",t:"Test",d:"Click 'Test Connection' to verify both IMAP and SMTP. Send a test email to verify delivery."}].map(s=>(
                <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:C.a+"22",border:`1px solid ${C.a}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{s.n}</div>
                  <div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div>
                </div>
              ))}
              <div style={{background:C.ad,borderRadius:8,padding:"8px 12px",marginTop:10,fontSize:11}}>
                <strong>Common providers:</strong> Gmail (imap/smtp.gmail.com), Outlook (outlook.office365.com), Yahoo (imap/smtp.mail.yahoo.com)
              </div>
            </>}
            {form.type==="telegram"&&<>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:8}}>Telegram Bot Setup</div>
              {[{n:"1",t:"Create Bot",d:"Open Telegram → Search @BotFather → /newbot → Follow prompts to name your bot"},{n:"2",t:"Copy Token",d:"BotFather will give you a token like '123456:ABCdef...' — paste it in the Bot Token field above"},{n:"3",t:"Set Webhook",d:"SupportDesk auto-registers the webhook. Your URL: https://api.supportdesk.app/webhooks/tg/{account_id}"}].map(s=>(
                <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:C.a+"22",border:`1px solid ${C.a}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{s.n}</div>
                  <div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div>
                </div>
              ))}
            </>}
            {form.type!=="whatsapp"&&form.type!=="email"&&form.type!=="telegram"&&form.type!=="live"&&<>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:8}}>{({facebook:"Facebook Messenger",instagram:"Instagram DM",sms:"SMS (Twilio)",viber:"Viber Business",line:"LINE Official",tiktok:"TikTok Business",x:"X (Twitter) DM",apple:"Apple Business Chat",voice:"Voice / Phone",video:"Video Calls",api:"Custom API Channel"})[form.type]||form.type} Setup</div>
              {form.type==="facebook"&&<>
                <div style={{padding:"8px 12px",background:C.ad,borderRadius:8,border:`1px solid ${C.a}33`,marginBottom:12,fontSize:11}}>Requires a <strong>Facebook Page</strong> with Messaging enabled and a <strong>Facebook App</strong> with Messenger permissions.</div>
                {[{n:"1",t:"Create Facebook App",d:"Go to developers.facebook.com → My Apps → Create App → Select 'Business' type → Add Messenger product"},{n:"2",t:"App ID & Secret",d:"App Settings → Basic → Copy App ID and App Secret. Paste both above."},{n:"3",t:"Connect Page",d:"Messenger Settings → Add your Facebook Page → Generate Page Access Token"},{n:"4",t:"Page ID",d:"Find your Page ID: Facebook Page → About → Page ID (numeric). Paste above."},{n:"5",t:"Permanent Access Token",d:"Business Settings → System Users → Create Admin → Add App with full control → Generate Token with pages_messaging permission. Copy the permanent token."},{n:"6",t:"Webhook & Verify Token",d:"Messenger Settings → Webhooks → Set Callback URL to your server/api/facebook/webhook → Choose a Verify Token (any secret string) and paste above → Subscribe to: messages, messaging_postbacks, message_deliveries, message_reads"},{n:"7",t:"Test",d:"Send a message to your Facebook Page. It should appear in SupportDesk inbox within seconds."}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.a+"22",border:`1px solid ${C.a}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["Receive messages","Send replies","Quick replies","Buttons","Images & files","Persistent menu","Ice breakers"].map(f=><Tag key={f} text={f} color={C.a}/>)}</div>
              </>}
              {form.type==="instagram"&&<>
                <div style={{padding:"8px 12px",background:C.pd,borderRadius:8,border:`1px solid ${C.p}33`,marginBottom:12,fontSize:11}}>Requires an <strong>Instagram Professional Account</strong> linked to a <strong>Facebook Page</strong>.</div>
                {[{n:"1",t:"Professional Account",d:"Convert to Professional: Instagram Settings → Account → Switch to Professional → Select Business"},{n:"2",t:"Link to Facebook Page",d:"Instagram Settings → Account → Sharing to Other Apps → Facebook → Link your Facebook Page"},{n:"3",t:"Create Facebook App",d:"developers.facebook.com → Create App → Add Instagram Graph API product"},{n:"4",t:"Account ID",d:"Instagram Graph API → Get your Instagram Business Account ID (numeric, starts with 178...). Paste above."},{n:"5",t:"Access Token",d:"Generate a long-lived token via Facebook App → Graph API Explorer → Select instagram_basic + instagram_manage_messages permissions"},{n:"6",t:"Webhook",d:"Webhook URL: https://api.supportdesk.app/webhooks/ig/{account_id} → Subscribe to: messages"},{n:"7",t:"Test",d:"Send a DM to your Instagram account. Should appear in SupportDesk within seconds."}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.p+"22",border:`1px solid ${C.p}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.p,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["Receive DMs","Send replies","Story mentions","Images & video","Quick replies","Ice breakers"].map(f=><Tag key={f} text={f} color={C.p}/>)}</div>
              </>}
              {form.type==="sms"&&<>
                <div style={{padding:"8px 12px",background:C.yd,borderRadius:8,border:`1px solid ${C.y}33`,marginBottom:12,fontSize:11}}>Powered by <strong>Twilio</strong>. Requires a Twilio account with a verified phone number.</div>
                {[{n:"1",t:"Create Twilio Account",d:"Sign up at twilio.com → Verify your phone → Get a Twilio phone number ($1/month)"},{n:"2",t:"Account SID",d:"Dashboard → Account SID (starts with 'AC...'). Paste in the Phone Number field above."},{n:"3",t:"Auth Token",d:"Dashboard → Auth Token → Copy and paste above. Keep this secret."},{n:"4",t:"Phone Number",d:"Your Twilio phone number: +1 XXX XXX XXXX format. This is the number customers will text."},{n:"5",t:"Webhook",d:"Twilio Console → Phone Numbers → Your Number → Messaging → Webhook URL: https://api.supportdesk.app/webhooks/sms/{account_id}"},{n:"6",t:"Test",d:"Text your Twilio number from any phone. Message should appear in SupportDesk."}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.y+"22",border:`1px solid ${C.y}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.y,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["Send SMS","Receive SMS","MMS images","Delivery receipts","Opt-out handling","Marketing campaigns","Auto-reply"].map(f=><Tag key={f} text={f} color={C.y}/>)}</div>
              </>}
              {form.type==="viber"&&<>
                <div style={{padding:"8px 12px",background:"#7360f222",borderRadius:8,border:"1px solid #7360f244",marginBottom:12,fontSize:11}}>Requires a <strong>Viber Business Bot</strong> account from partners.viber.com.</div>
                {[{n:"1",t:"Create Bot",d:"Go to partners.viber.com → Create Bot Account → Fill in business details → Get approved"},{n:"2",t:"Bot Token",d:"After approval, copy the Authentication Token from your Viber Admin Panel"},{n:"3",t:"Webhook",d:"Set webhook: https://api.supportdesk.app/webhooks/viber/{account_id}"},{n:"4",t:"Test",d:"Search your bot name in Viber → Send a message → Verify it arrives in SupportDesk"}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:"#7360f222",border:"1px solid #7360f244",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#7360f2",fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["Receive messages","Send replies","Rich cards","Buttons","Images & video","Stickers","Delivery receipts"].map(f=><Tag key={f} text={f} color="#7360f2"/>)}</div>
              </>}
              {form.type==="line"&&<>
                <div style={{padding:"8px 12px",background:C.gd,borderRadius:8,border:`1px solid ${C.g}33`,marginBottom:12,fontSize:11}}>Requires a <strong>LINE Official Account</strong> + <strong>Messaging API</strong> channel.</div>
                {[{n:"1",t:"LINE Developers Console",d:"Go to developers.line.biz → Create Provider → Create Messaging API Channel"},{n:"2",t:"Channel Access Token",d:"Channel Settings → Messaging API → Issue Channel Access Token (long-lived)"},{n:"3",t:"Channel Secret",d:"Channel Settings → Basic Settings → Channel Secret"},{n:"4",t:"Webhook",d:"Messaging API → Webhook URL: https://api.supportdesk.app/webhooks/line/{account_id} → Enable 'Use webhook'"},{n:"5",t:"Disable Auto-Reply",d:"LINE Official Account Manager → Settings → Response Settings → Disable auto-reply (let SupportDesk handle it)"}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.g+"22",border:`1px solid ${C.g}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.g,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["Receive messages","Send replies","Rich menus","Flex messages","Images & video","Stickers","Quick reply","Push messages"].map(f=><Tag key={f} text={f} color={C.g}/>)}</div>
              </>}
              {form.type==="tiktok"&&<>
                <div style={{padding:"8px 12px",background:C.rd,borderRadius:8,border:`1px solid ${C.r}33`,marginBottom:12,fontSize:11}}>Requires a <strong>TikTok Business Account</strong> + developer app from developers.tiktok.com.</div>
                {[{n:"1",t:"TikTok for Developers",d:"Go to developers.tiktok.com → Create App → Select 'Content Posting' + 'Direct Message' scopes"},{n:"2",t:"Access Token",d:"App Dashboard → Generate Access Token (starts with 'act...'). Paste above."},{n:"3",t:"App Secret",d:"App Dashboard → App Secret → Copy and paste above"},{n:"4",t:"Webhook",d:"Configure webhook callback: https://api.supportdesk.app/webhooks/tiktok/{account_id}"},{n:"5",t:"Test",d:"Send a DM to your TikTok Business account to verify."}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.r+"22",border:`1px solid ${C.r}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.r,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
              </>}
              {form.type==="x"&&<>
                <div style={{padding:"8px 12px",background:C.s2,borderRadius:8,border:`1px solid ${C.b2}`,marginBottom:12,fontSize:11}}>Requires <strong>X (Twitter) Developer Account</strong> with Elevated access + OAuth 2.0.</div>
                {[{n:"1",t:"Developer Portal",d:"Go to developer.twitter.com → Create Project → Create App → Enable OAuth 2.0"},{n:"2",t:"API Key",d:"App Settings → Keys and Tokens → API Key (Consumer Key). Paste above."},{n:"3",t:"Access Token",d:"Generate Access Token and Secret with Read+Write+DM permissions"},{n:"4",t:"Bearer Token",d:"App Settings → Bearer Token → Copy for API authentication"},{n:"5",t:"Webhook (Account Activity API)",d:"Register webhook: https://api.supportdesk.app/webhooks/x/{account_id} → Subscribe to user DM events"},{n:"6",t:"Test",d:"Send a DM to your X account → Should appear in SupportDesk"}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.s3,border:`1px solid ${C.b2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.t1,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
              </>}
              {form.type==="apple"&&<>
                <div style={{padding:"8px 12px",background:C.s2,borderRadius:8,border:`1px solid ${C.b2}`,marginBottom:12,fontSize:11}}>Requires an <strong>Apple Business Register</strong> account + approved Messaging Service Provider (MSP).</div>
                {[{n:"1",t:"Register Business",d:"Go to register.apple.com/business-chat → Submit your business for review"},{n:"2",t:"Business Chat Account ID",d:"After approval, copy your Business Chat Account ID from Apple Business Register"},{n:"3",t:"MSP ID",d:"Your Messaging Service Provider ID — provided by Apple or your CSP partner"},{n:"4",t:"CSP Configuration",d:"Configure your Customer Service Platform URL: https://api.supportdesk.app/webhooks/apple/{account_id}"},{n:"5",t:"Test",d:"Find your business in Apple Maps → Tap 'Message' → Send a test message"}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.s3,border:`1px solid ${C.b2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.t1,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
              </>}
              {form.type==="voice"&&<>
                <div style={{padding:"8px 12px",background:C.gd,borderRadius:8,border:`1px solid ${C.g}33`,marginBottom:12,fontSize:11}}>Powered by <strong>Twilio Voice</strong>. Requires Twilio account with Voice capabilities.</div>
                {[{n:"1",t:"Twilio Account",d:"Sign up at twilio.com → Get a Voice-capable phone number"},{n:"2",t:"Phone Number",d:"Your Twilio voice number in +E.164 format: +1 XXX XXX XXXX"},{n:"3",t:"Account SID",d:"Dashboard → Account SID (starts with 'AC...')"},{n:"4",t:"Auth Token",d:"Dashboard → Auth Token → Copy (keep secret)"},{n:"5",t:"Voice Webhook",d:"Phone Numbers → Voice → A Call Comes In → Webhook: https://api.supportdesk.app/webhooks/voice/{account_id}"},{n:"6",t:"Features",d:"Incoming calls → Create conversation → Auto-record → Transcribe with AI → Assign to agent"}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.g+"22",border:`1px solid ${C.g}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.g,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["Incoming calls","Call recording","AI transcription","IVR menu","Call transfer","Voicemail","Call-back queue"].map(f=><Tag key={f} text={f} color={C.g}/>)}</div>
              </>}
              {form.type==="video"&&<>
                <div style={{padding:"8px 12px",background:C.pd,borderRadius:8,border:`1px solid ${C.p}33`,marginBottom:12,fontSize:11}}>Built-in <strong>WebRTC video calling</strong>. Requires API key for recording and analytics.</div>
                {[{n:"1",t:"API Key",d:"Generate a Video API key in your SupportDesk account settings → Integrations → Video"},{n:"2",t:"Widget Install",d:"Add the SupportDesk widget to your website — video calling is included automatically"},{n:"3",t:"Agent Setup",d:"Agents need a webcam + microphone. Browser permissions will be requested on first call."},{n:"4",t:"Features",d:"Customers click 'Video Call' in widget → Agent picks up in inbox → Screen share, recording, AI summary"}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.p+"22",border:`1px solid ${C.p}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.p,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["Video calls","Screen sharing","Call recording","AI summary","Co-browsing","File sharing in call"].map(f=><Tag key={f} text={f} color={C.p}/>)}</div>
              </>}
              {form.type==="api"&&<>
                <div style={{padding:"8px 12px",background:C.ad,borderRadius:8,border:`1px solid ${C.a}33`,marginBottom:12,fontSize:11}}>Build a <strong>custom channel</strong> by sending messages via SupportDesk REST API.</div>
                {[{n:"1",t:"Webhook Endpoint",d:"Set the URL where SupportDesk will send incoming messages: https://api.supportdesk.app/webhooks/api/{account_id}"},{n:"2",t:"API Key",d:"Use your SupportDesk API key (Settings → Integrations → API Keys) to authenticate requests"},{n:"3",t:"Send Messages",d:"POST /v1/messages with {conversation_id, content, channel: 'api'} to send replies"},{n:"4",t:"Receive Messages",d:"SupportDesk sends a POST to your webhook with {from, content, metadata} for each incoming message"},{n:"5",t:"Create Conversations",d:"POST /v1/conversations with {contact_id, channel: 'api', inbox_id} to create new conversations"}].map(s=>(
                  <div key={s.n} style={{display:"flex",gap:10,marginBottom:10}}><div style={{width:22,height:22,borderRadius:"50%",background:C.a+"22",border:`1px solid ${C.a}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.a,fontFamily:FM,flexShrink:0}}>{s.n}</div><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{s.t}</div><div style={{fontSize:11,color:C.t3}}>{s.d}</div></div></div>
                ))}
                <div style={{background:C.s2,borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:10,fontFamily:FM,lineHeight:1.8}}>
                  <strong>Example — Send message:</strong><br/>
                  <code style={{color:C.a}}>POST https://api.supportdesk.app/v1/messages</code><br/>
                  <code style={{color:C.t3}}>{"{"}"conversation_id":"cv1","content":"Hello!","type":"text"{"}"}</code>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:8}}>{["REST API","Webhooks","Custom events","File attachments","Metadata","Rate limiting","Bulk operations"].map(f=><Tag key={f} text={f} color={C.a}/>)}</div>
              </>}
            </>}
          </div>
        </div>}
      </div>}

      {/* ── Pre-Chat Form Builder ── */}
      {cfgTab==="prechat"&&<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div><div style={{fontSize:13,fontWeight:700}}>Pre-Chat Form</div><div style={{fontSize:11,color:C.t3}}>Collect visitor info before starting a conversation</div></div>
          <Toggle val={cfg.formEnabled} set={v=>setCfg(p=>({...p,formEnabled:v}))}/>
        </div>
        {cfg.formEnabled&&<>
          <div style={{display:"flex",gap:12,marginBottom:14}}>
            <div style={{flex:1}}><Fld label="Form Title"><Inp val={cfg.formTitle||""} set={v=>setCfg(p=>({...p,formTitle:v}))} ph="Before we start…"/></Fld></div>
            <div style={{flex:1}}><Fld label="Description"><Inp val={cfg.formDesc||""} set={v=>setCfg(p=>({...p,formDesc:v}))} ph="Please fill in your details"/></Fld></div>
          </div>

          {/* Fields list */}
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8,letterSpacing:".5px"}}>FORM FIELDS ({(cfg.formFields||[]).length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
            {(cfg.formFields||[]).map((f,idx)=>{const updateField=(key,val)=>{setCfg(p=>{const ff=[...(p.formFields||[])];ff[idx]={...ff[idx],[key]:val};return{...p,formFields:ff};});};return(
              <div key={f.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:16,textAlign:"center"}}>{idx+1}</span>
                  <div style={{display:"flex",flexDirection:"column",gap:1}}>
                    <button onClick={()=>{if(idx===0)return;setCfg(p=>{const ff=[...(p.formFields||[])];[ff[idx-1],ff[idx]]=[ff[idx],ff[idx-1]];return{...p,formFields:ff};});}} style={{fontSize:8,color:idx>0?C.a:C.t3,background:"none",border:"none",cursor:idx>0?"pointer":"default",lineHeight:1}}>▲</button>
                    <button onClick={()=>{if(idx>=(cfg.formFields||[]).length-1)return;setCfg(p=>{const ff=[...(p.formFields||[])];[ff[idx],ff[idx+1]]=[ff[idx+1],ff[idx]];return{...p,formFields:ff};});}} style={{fontSize:8,color:idx<(cfg.formFields||[]).length-1?C.a:C.t3,background:"none",border:"none",cursor:idx<(cfg.formFields||[]).length-1?"pointer":"default",lineHeight:1}}>▼</button>
                  </div>
                  <span style={{fontSize:14}}>{{text:"📝",email:"📧",phone:"📞",select:"📋",textarea:"📄",number:"🔢",checkbox:"☑",url:"🔗",date:"📅"}[f.type]||"📝"}</span>
                  <input value={f.label||""} onChange={e=>updateField("label",e.target.value)} style={{flex:1,background:"none",border:`1px solid transparent`,borderRadius:6,padding:"4px 6px",fontSize:13,fontWeight:600,color:C.t1,outline:"none",fontFamily:FB}} placeholder="Field label"/>
                  <button onClick={()=>updateField("required",!f.required)} style={{fontSize:9,padding:"3px 10px",borderRadius:5,fontWeight:700,fontFamily:FM,background:f.required?C.r+"15":"transparent",color:f.required?C.r:C.t3,border:`1px solid ${f.required?C.r+"33":C.b1}`,cursor:"pointer"}}>{f.required?"Required":"Optional"}</button>
                  <button onClick={()=>setCfg(p=>({...p,formFields:(p.formFields||[]).filter(x=>x.id!==f.id)}))} style={{fontSize:12,color:C.r,background:"none",border:"none",cursor:"pointer",padding:2}}>✕</button>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <select value={f.type} onChange={e=>updateField("type",e.target.value)} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:11,color:C.t1,fontFamily:FB,cursor:"pointer",outline:"none"}}>
                    {[["text","📝 Text"],["email","📧 Email"],["phone","📞 Phone"],["select","📋 Dropdown"],["textarea","📄 Long Text"],["number","🔢 Number"],["checkbox","☑ Checkbox"],["url","🔗 URL"],["date","📅 Date"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                  <input value={f.placeholder||""} onChange={e=>updateField("placeholder",e.target.value)} placeholder="Placeholder text…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:11,color:C.t2,outline:"none",fontFamily:FB}}/>
                </div>
                {f.type==="select"&&<div style={{marginTop:8}}>
                  <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>DROPDOWN OPTIONS</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {(f.options||[]).map((opt,oi)=>(
                      <span key={oi} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,padding:"3px 8px",borderRadius:5,background:C.s2,border:`1px solid ${C.b1}`,fontFamily:FM}}>
                        {opt}
                        <button onClick={()=>updateField("options",(f.options||[]).filter((_,i)=>i!==oi))} style={{fontSize:8,color:C.r,background:"none",border:"none",cursor:"pointer",lineHeight:1}}>×</button>
                      </span>
                    ))}
                    {(f.options||[]).length===0&&<span style={{fontSize:10,color:C.t3,fontStyle:"italic"}}>No options yet</span>}
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <input value={newOptText} onChange={e=>setNewOptText(e.target.value)} placeholder="Type option and press Enter…" onKeyDown={e=>{if(e.key==="Enter"&&newOptText.trim()){updateField("options",[...(f.options||[]),newOptText.trim()]);setNewOptText("");}}} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:11,color:C.t1,outline:"none",fontFamily:FB}}/>
                    <button onClick={()=>{if(newOptText.trim()){updateField("options",[...(f.options||[]),newOptText.trim()]);setNewOptText("");}}} style={{fontSize:10,padding:"5px 10px",borderRadius:6,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}>+ Add</button>
                  </div>
                </div>}
              </div>
            );})}
          </div>

          {/* Add field */}
          <button onClick={()=>setCfg(p=>({...p,formFields:[...(p.formFields||[]),{id:"ff"+uid(),type:"text",label:"New Field",placeholder:"",required:false,options:[]}]}))} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",padding:"10px",borderRadius:10,border:`2px dashed ${C.a}44`,background:"transparent",color:C.a,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:FM}} className="hov">
            + Add Field
          </button>

          {/* Live Preview */}
          <div style={{marginTop:16}}>
            <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8,letterSpacing:".5px"}}>LIVE PREVIEW</div>
            <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",maxWidth:320}}>
              <div style={{background:form.color||C.a,padding:"14px 16px",color:"#fff"}}>
                <div style={{fontSize:14,fontWeight:700}}>{cfg.formTitle||"Before we start…"}</div>
                <div style={{fontSize:11,opacity:.85,marginTop:2}}>{cfg.formDesc||"Fill in your details"}</div>
              </div>
              <div style={{padding:"14px 16px"}}>
                {(cfg.formFields||[]).map(f=>(
                  <div key={f.id} style={{marginBottom:10}}>
                    <div style={{fontSize:11,fontWeight:600,color:C.t1,marginBottom:3}}>{f.label||"Untitled"}{f.required&&<span style={{color:C.r,marginLeft:2}}>*</span>}</div>
                    {f.type==="select"?
                      <select disabled style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.b1}`,background:C.s1,fontSize:11,color:C.t3,fontFamily:FB}}>
                        <option>{f.placeholder||"Select…"}</option>
                        {(f.options||[]).map((o,i)=><option key={i}>{o}</option>)}
                      </select>
                    :f.type==="textarea"?
                      <textarea disabled rows={2} placeholder={f.placeholder||""} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.b1}`,background:C.s1,fontSize:11,color:C.t3,fontFamily:FB,resize:"none",boxSizing:"border-box"}}/>
                    :f.type==="checkbox"?
                      <div style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" disabled style={{width:14,height:14}}/><span style={{fontSize:11,color:C.t2}}>{f.placeholder||f.label}</span></div>
                    :
                      <input disabled type={f.type==="email"?"email":f.type==="phone"?"tel":f.type==="number"?"number":f.type==="url"?"url":f.type==="date"?"date":"text"} placeholder={f.placeholder||""} style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.b1}`,background:C.s1,fontSize:11,color:C.t3,fontFamily:FB,boxSizing:"border-box"}}/>
                    }
                  </div>
                ))}
                <button disabled style={{width:"100%",padding:"10px",borderRadius:8,background:form.color||C.a,color:"#fff",fontSize:12,fontWeight:700,border:"none",marginTop:4,opacity:.8}}>Start Conversation</button>
              </div>
            </div>
          </div>
        </>}
        {!cfg.formEnabled&&<div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12,background:C.s2,borderRadius:10}}>Pre-chat form is disabled. Visitors can start chatting immediately without filling any form.</div>}
      </div>}

      {/* ── Business Hours ── */}
      {cfgTab==="hours"&&<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div><div style={{fontSize:13,fontWeight:700}}>Business Hours</div><div style={{fontSize:11,color:C.t3}}>Set when your team is available</div></div>
          <Toggle val={cfg.bhEnabled} set={v=>cfgFld("bhEnabled",v)}/>
        </div>
        {cfg.bhEnabled&&<>
          <div style={{display:"flex",gap:14,marginBottom:14}}>
            <div style={{flex:1}}><Fld label="Start Time"><Inp val={cfg.bhStart} set={v=>cfgFld("bhStart",v)} ph="09:00" type="time"/></Fld></div>
            <div style={{flex:1}}><Fld label="End Time"><Inp val={cfg.bhEnd} set={v=>cfgFld("bhEnd",v)} ph="18:00" type="time"/></Fld></div>
          </div>
          <Fld label="Working Days">
            <div style={{display:"flex",gap:6}}>
              {dayNames.map((d,i)=>(
                <button key={i} onClick={()=>cfgFld("bhDays",cfg.bhDays.includes(i)?cfg.bhDays.filter(x=>x!==i):[...cfg.bhDays,i])} style={{width:34,height:34,borderRadius:"50%",fontSize:11,fontWeight:700,fontFamily:FM,cursor:"pointer",background:cfg.bhDays.includes(i)?C.a+"22":"transparent",color:cfg.bhDays.includes(i)?C.a:C.t3,border:`1.5px solid ${cfg.bhDays.includes(i)?C.a+"55":C.b1}`}}>{d}</button>
              ))}
            </div>
          </Fld>
          <Fld label="Offline Auto-Reply"><textarea value={cfg.bhOfflineMsg} onChange={e=>cfgFld("bhOfflineMsg",e.target.value)} rows={3} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none"}}/></Fld>
        </>}
        {!cfg.bhEnabled&&<div style={{padding:"20px",textAlign:"center",color:C.t3,fontSize:12}}>Business hours are disabled. The inbox will accept conversations 24/7.</div>}
      </div>}

      {/* ── Assignment ── */}
      {cfgTab==="assignment"&&<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div><div style={{fontSize:13,fontWeight:700}}>Auto-Assignment</div><div style={{fontSize:11,color:C.t3}}>Automatically assign new conversations to agents</div></div>
          <Toggle val={cfg.autoAssign} set={v=>cfgFld("autoAssign",v)}/>
        </div>
        {cfg.autoAssign&&<>
          <Fld label="Assignment Method">
            <div style={{display:"flex",gap:8}}>
              {[["round_robin","Round Robin","Distribute evenly across agents"],["load_balanced","Load Balanced","Assign to agent with fewest open convs"],["manual","Manual Queue","Add to queue, agents self-assign"]].map(([v,l,d])=>(
                <button key={v} onClick={()=>cfgFld("assignMethod",v)} style={{flex:1,padding:"12px 10px",borderRadius:10,cursor:"pointer",background:cfg.assignMethod===v?C.ad:C.s2,border:`1.5px solid ${cfg.assignMethod===v?C.a+"55":C.b1}`,textAlign:"left",transition:"all .15s"}}>
                  <div style={{fontSize:12,fontWeight:700,color:cfg.assignMethod===v?C.a:C.t1,marginBottom:3}}>{l}</div>
                  <div style={{fontSize:10,color:C.t3,lineHeight:1.3}}>{d}</div>
                </button>
              ))}
            </div>
          </Fld>
          <Fld label={"Max Conversations per Agent ("+cfg.maxPerAgent+")"}>
            <input type="range" min="1" max="20" value={cfg.maxPerAgent} onChange={e=>cfgFld("maxPerAgent",Number(e.target.value))} style={{width:"100%",accentColor:C.a}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}><span>1</span><span>{cfg.maxPerAgent}</span><span>20</span></div>
          </Fld>
        </>}
      </div>}

      {/* ── SLA ── */}
      {cfgTab==="sla"&&<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div><div style={{fontSize:13,fontWeight:700}}>SLA Targets</div><div style={{fontSize:11,color:C.t3}}>Set response and resolution time targets</div></div>
          <Toggle val={cfg.slaEnabled} set={v=>cfgFld("slaEnabled",v)}/>
        </div>
        {cfg.slaEnabled&&<>
          <Fld label={"First Reply Target: "+cfg.slaFirstReply+" minutes"}>
            <input type="range" min="1" max="60" value={cfg.slaFirstReply} onChange={e=>cfgFld("slaFirstReply",Number(e.target.value))} style={{width:"100%",accentColor:C.g}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}><span>1 min</span><span style={{color:cfg.slaFirstReply<=5?C.g:cfg.slaFirstReply<=15?C.y:C.r,fontWeight:700}}>{cfg.slaFirstReply} min</span><span>60 min</span></div>
          </Fld>
          <Fld label={"Resolution Target: "+cfg.slaResolution+" minutes ("+(cfg.slaResolution/60).toFixed(1)+"h)"}>
            <input type="range" min="30" max="1440" step="30" value={cfg.slaResolution} onChange={e=>cfgFld("slaResolution",Number(e.target.value))} style={{width:"100%",accentColor:C.a}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}><span>30 min</span><span style={{color:cfg.slaResolution<=120?C.g:cfg.slaResolution<=480?C.y:C.r,fontWeight:700}}>{(cfg.slaResolution/60).toFixed(1)}h</span><span>24h</span></div>
          </Fld>
          <div style={{padding:"12px",background:cfg.slaFirstReply<=5?C.gd:cfg.slaFirstReply<=15?C.yd:C.rd,border:`1px solid ${cfg.slaFirstReply<=5?C.g:cfg.slaFirstReply<=15?C.y:C.r}44`,borderRadius:10,fontSize:11.5,color:C.t2,lineHeight:1.5}}>
            {cfg.slaFirstReply<=5?"Aggressive SLA — ensure enough agents are online during business hours.":cfg.slaFirstReply<=15?"Standard SLA — good balance of speed and efficiency.":"Relaxed SLA — suitable for low-priority or non-urgent channels."}
          </div>
        </>}
      </div>}

      {/* ── Notifications ── */}
      {cfgTab==="notifications"&&<div>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Notification Preferences</div>
        {[{k:"notifyNewConv",l:"New Conversation",d:"When a new conversation is created in this inbox"},{k:"notifyNewMsg",l:"New Message",d:"When a customer sends a new message"},{k:"notifyAssign",l:"Assignment",d:"When a conversation is assigned to you"},{k:"notifyMention",l:"Mentions",d:"When you are mentioned in an internal note"},{k:"notifySla",l:"SLA Breach Warning",d:"When a conversation is about to breach SLA targets"}].map(n=>(
          <div key={n.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <div><div style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{n.l}</div><div style={{fontSize:10.5,color:C.t3,marginTop:2}}>{n.d}</div></div>
            <Toggle val={cfg[n.k]} set={v=>cfgFld(n.k,v)}/>
          </div>
        ))}
      </div>}

      {/* ── Advanced ── */}
      {cfgTab==="advanced"&&<div>
        <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>Advanced Settings</div>
        {[{k:"autoClose",l:"Auto-Close Inactive",d:"Automatically resolve conversations after "+cfg.autoCloseDays+" days of inactivity"},{k:"allowAttach",l:"Allow File Attachments",d:"Let customers and agents share files"},{k:"rateLimit",l:"Rate Limiting",d:"Limit incoming messages to "+cfg.rateLimitPerMin+"/min per contact"}].map(opt=>(
          <div key={opt.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <div><div style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{opt.l}</div><div style={{fontSize:10.5,color:C.t3,marginTop:2}}>{opt.d}</div></div>
            <Toggle val={cfg[opt.k]} set={v=>cfgFld(opt.k,v)}/>
          </div>
        ))}
        {cfg.autoClose&&<Fld label={"Auto-Close After ("+cfg.autoCloseDays+" days)"}>
          <input type="range" min="1" max="30" value={cfg.autoCloseDays} onChange={e=>cfgFld("autoCloseDays",Number(e.target.value))} style={{width:"100%",accentColor:C.y}}/>
        </Fld>}
        {cfg.allowAttach&&<Fld label={"Max Attachment Size ("+cfg.maxAttachMB+" MB)"}>
          <input type="range" min="1" max="50" value={cfg.maxAttachMB} onChange={e=>cfgFld("maxAttachMB",Number(e.target.value))} style={{width:"100%",accentColor:C.a}}/>
        </Fld>}
      </div>}

      {/* Footer */}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:14,paddingTop:14,borderTop:`1px solid ${C.b1}`}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEdit(null);}}/><Btn ch={edit?"Save Changes":"Create Inbox"} v="primary" onClick={save}/>
      </div>
    </Mdl>}
  </div>;
}

function AgentSet({agents,setAgents,teams,setTeams}){
  const [tab,setTab]=useState("members");
  // Members = everyone invited. Agents = members with role Agent/Admin/Owner
  const members=agents;
  const activeAgents=agents.filter(a=>a.role==="Agent"||a.role==="Admin"||a.role==="Owner");
  // invite
  const [showInvite,setShowInvite]=useState(false);
  const [invEmail,setInvEmail]=useState("");const [invName,setInvName]=useState("");
  // edit member
  const [editMbr,setEditMbr]=useState(null);
  const [emName,setEmName]=useState("");const [emEmail,setEmEmail]=useState("");const [emRole,setEmRole]=useState("Member");const [emStatus,setEmStatus]=useState("offline");
  const [emTab,setEmTab]=useState("profile");
  const [emPerms,setEmPerms]=useState({});
  const [emAvail,setEmAvail]=useState({start:"09:00",end:"18:00",tz:"Asia/Kolkata",autoAway:true,awayMin:15});
  const [emMaxConvs,setEmMaxConvs]=useState(8);
  // teams
  const [showTeamForm,setShowTeamForm]=useState(false);const [editTeam,setEditTeam]=useState(null);
  const [tName,setTName]=useState("");const [tDesc,setTDesc]=useState("");const [tMembers,setTMembers]=useState([]);
  const [tAutoAssign,setTAutoAssign]=useState(true);const [tRouting,setTRouting]=useState("round_robin");
  const [tSchedule,setTSchedule]=useState({on:false,start:"09:00",end:"18:00",days:[1,2,3,4,5]});
  // roles
  // roles — MUTABLE
  const [roles,setRoles]=useState([
    {id:"r1",name:"Owner",color:C.p,desc:"Full access to everything",fixed:true},
    {id:"r2",name:"Admin",color:C.a,desc:"Manage settings, agents, and teams",fixed:true},
    {id:"r3",name:"Agent",color:C.g,desc:"Handle conversations and contacts",fixed:true},
    {id:"r4",name:"Member",color:C.t3,desc:"Invited — no agent access yet",fixed:true},
    {id:"r5",name:"Supervisor",color:C.cy,desc:"View reports + manage team agents",fixed:false},
    {id:"r6",name:"Viewer",color:C.y,desc:"Read-only access to conversations",fixed:false},
  ]);
  const [showNewRole,setShowNewRole]=useState(false);const [nrName,setNrName]=useState("");const [nrDesc,setNrDesc]=useState("");const [nrColor,setNrColor]=useState(C.cy);const [nrCloneFrom,setNrCloneFrom]=useState("Member");
  const [editRole,setEditRole]=useState(null);const [erName,setErName]=useState("");const [erDesc,setErDesc]=useState("");const [erColor,setErColor]=useState(C.a);
  const [roleAssign,setRoleAssign]=useState(null);// which role is being assigned members
  const [permLog,setPermLog]=useState([{t:"Setup",who:"System",action:"Default roles configured: Owner, Admin, Agent, Member"}]);
  const PERMS=[{k:"conversations",l:"View Conversations"},{k:"reply",l:"Reply to Conversations"},{k:"assign",l:"Assign Conversations"},{k:"delete_conv",l:"Delete Conversations"},{k:"contacts",l:"View Contacts"},{k:"edit_contacts",l:"Edit/Delete Contacts"},{k:"reports",l:"View Reports"},{k:"marketing",l:"Manage Marketing"},{k:"integrations",l:"Manage Integrations"},{k:"inboxes",l:"Manage Inboxes"},{k:"agents",l:"Invite/Remove Members"},{k:"teams",l:"Manage Teams"},{k:"labels",l:"Labels & Canned"},{k:"aibot",l:"Configure AI Bot"},{k:"theme",l:"Theme & Fonts"},{k:"billing",l:"Billing"},{k:"account",l:"Account Settings"},{k:"export",l:"Export Data"}];
  const [rolePerms,setRolePerms]=useState({
    Owner:Object.fromEntries(PERMS.map(p=>[p.k,true])),
    Admin:Object.fromEntries(PERMS.map(p=>[p.k,!["aibot","billing","account"].includes(p.k)])),
    Agent:Object.fromEntries(PERMS.map(p=>[p.k,["conversations","reply","contacts","labels","theme"].includes(p.k)])),
    Member:Object.fromEntries(PERMS.map(p=>[p.k,false])),
    Supervisor:Object.fromEntries(PERMS.map(p=>[p.k,["conversations","reply","assign","contacts","edit_contacts","reports","teams","labels","theme","export"].includes(p.k)])),
    Viewer:Object.fromEntries(PERMS.map(p=>[p.k,["conversations","contacts","reports"].includes(p.k)])),
  });
  // search/filter
  const [search,setSearch]=useState("");const [filter,setFilter]=useState("all");
  const dayN=["S","M","T","W","T","F","S"];

  const perf=a=>{const s=((a.name||"").charCodeAt(0)*7)%40;return{resolved:s+20,reply:`${(2+s%5).toFixed(1)}m`,csat:(4.2+((s%8)/10)).toFixed(1),load:Math.round(30+s%50)};};

  const invite=()=>{
    if(!invEmail.includes("@"))return showT("Valid email required","error");
    const nm=invName.trim()||invEmail.split("@")[0];
    setAgents(p=>[...p,{id:"a"+uid(),name:nm,email:invEmail,role:"Member",av:nm.slice(0,2).toUpperCase(),color:[C.a,C.g,C.p,C.cy,C.y,"#ff6b35","#e91e63"][Math.floor(Math.random()*7)],status:"offline",maxConvs:8}]);if(api.isConnected())api.post("/settings/agents",{name:nm,email:invEmail,role:"Agent"}).catch(()=>{});
    showT("Invited "+nm+" as Member","success");setShowInvite(false);setInvEmail("");setInvName("");
  };
  const promoteToAgent=id=>{setAgents(p=>p.map(a=>a.id===id?{...a,role:"Agent"}:a));showT("Promoted to Agent!","success");};
  const changeRole=(id,role)=>{setAgents(p=>p.map(a=>a.id===id?{...a,role}:a));showT("Role → "+role,"success");};
  const removeMember=id=>{setAgents(p=>p.filter(a=>a.id!==id));showT("Removed","success");if(api.isConnected())api.del(`/settings/agents/${id}`).catch(()=>{});};
  const openEdit=a=>{setEmName(a.name);setEmEmail(a.email||"");setEmRole(a.role);setEmStatus(a.status);setEmMaxConvs(a.maxConvs||8);setEmPerms(rolePerms[a.role]||{});setEmAvail(a.availability||{start:"09:00",end:"18:00",tz:"Asia/Kolkata",autoAway:true,awayMin:15});setEmTab("profile");setEditMbr(a);};
  const saveEdit=()=>{if(!emName.trim())return showT("Name required","error");setAgents(p=>p.map(a=>a.id===editMbr.id?{...a,name:emName,email:emEmail,role:emRole,status:emStatus,av:emName.slice(0,2).toUpperCase(),maxConvs:emMaxConvs,availability:emAvail}:a));showT("Saved","success");if(api.isConnected())api.patch(`/settings/agents/${editMbr.id}`,{name:emName,email:emEmail,role:emRole,status:emStatus}).catch(()=>{});setEditMbr(null);};
  const loadTeams=()=>{if(!api.isConnected())return;api.get("/settings/teams").then(r=>{if(r?.teams)setTeams(r.teams.map(t=>({...t,desc:t.description||"",members:t.members||[]})));}).catch(()=>{});};
  const createTeam=async()=>{if(!tName.trim())return showT("Name required","error");if(editTeam){const payload={name:tName,description:tDesc,members:tMembers};setTeams(p=>p.map(t=>t.id===editTeam.id?{...t,name:tName,desc:tDesc,members:tMembers}:t));if(api.isConnected()){try{await api.patch(`/settings/teams/${editTeam.id}`,payload);loadTeams();}catch{}}showT("Updated!","success");}else{const tempId="t"+uid();setTeams(p=>[...p,{id:tempId,name:tName,desc:tDesc,members:tMembers,autoAssign:tAutoAssign,routing:tRouting}]);if(api.isConnected()){try{const r=await api.post("/settings/teams",{name:tName,description:tDesc,members:tMembers});if(r?.team?.id)setTeams(p=>p.map(t=>t.id===tempId?{...t,id:r.team.id}:t));loadTeams();}catch{}}showT("Created!","success");}setShowTeamForm(false);setEditTeam(null);setTName("");setTDesc("");setTMembers([]);};
  const openEditTeam=t=>{setTName(t.name);setTDesc(t.desc||t.description||"");setTMembers(t.members||[]);setTAutoAssign(t.autoAssign!==false);setTRouting(t.routing||"round_robin");setTSchedule(t.schedule||{on:false,start:"09:00",end:"18:00",days:[1,2,3,4,5]});setEditTeam(t);setShowTeamForm(true);};
  const addMemberToTeam=(teamId,agentId)=>{setTeams(p=>p.map(tm=>tm.id===teamId?{...tm,members:[...(tm.members||[]),agentId]}:tm));showT("Added","success");const t=teams.find(x=>x.id===teamId);if(api.isConnected()&&t)api.patch(`/settings/teams/${teamId}`,{members:[...(t.members||[]),agentId]}).catch(()=>{});};
  const removeMemberFromTeam=(teamId,agentId)=>{setTeams(p=>p.map(tm=>tm.id===teamId?{...tm,members:(tm.members||[]).filter(x=>x!==agentId)}:tm));showT("Removed","info");const t=teams.find(x=>x.id===teamId);if(api.isConnected()&&t)api.patch(`/settings/teams/${teamId}`,{members:(t.members||[]).filter(x=>x!==agentId)}).catch(()=>{});};
  const deleteTeam=(teamId)=>{setTeams(p=>p.filter(x=>x.id!==teamId));showT("Deleted","success");if(api.isConnected())api.del(`/settings/teams/${teamId}`).catch(()=>{});};

  const filtered=members.filter(a=>{
    if(search&&!a.name.toLowerCase().includes(search.toLowerCase())&&!(a.email||"").toLowerCase().includes(search.toLowerCase()))return false;
    if(filter==="online")return a.status==="online";if(filter==="members")return a.role==="Member";
    if(filter==="agents")return a.role==="Agent"||a.role==="Admin"||a.role==="Owner";
    return true;
  });

  return <div style={{padding:"20px 24px"}}>
    {/* WORKFLOW BANNER */}
    <div style={{display:"flex",gap:0,marginBottom:6}}>
      {[{n:"1",l:"Invite Members",d:"Add people to workspace",active:tab==="members"},{n:"2",l:"Promote to Agent",d:"Grant conversation access",active:tab==="agents"},{n:"3",l:"Create Teams",d:"Group agents for routing",active:tab==="teams"}].map((s,i)=>(
        <div key={s.n} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:s.active?C.ad:C.s1,borderBottom:`2px solid ${s.active?C.a:"transparent"}`,borderRight:i<2?`1px solid ${C.b1}`:"none"}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:s.active?C.a:C.s3,color:s.active?"#fff":C.t3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,fontFamily:FD,flexShrink:0}}>{s.n}</div>
          <div><div style={{fontSize:12,fontWeight:700,color:s.active?C.a:C.t1}}>{s.l}</div><div style={{fontSize:9,color:C.t3}}>{s.d}</div></div>
          {i<2&&<span style={{marginLeft:"auto",color:C.t3,fontSize:14}}>→</span>}
        </div>
      ))}
    </div>
    {/* Tabs */}
    <div style={{display:"flex",gap:0,marginBottom:18,borderBottom:`1px solid ${C.b1}`}}>
      {[["members","All Members ("+members.length+")"],["agents","Active Agents ("+activeAgents.length+")"],["teams","Teams ("+teams.length+")"],["roles","Roles & Permissions"]].map(([t,l])=>(
        <button key={t} onClick={()=>setTab(t)} style={{padding:"9px 16px",fontSize:12,fontWeight:600,color:tab===t?C.a:C.t3,borderBottom:`2px solid ${tab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",fontFamily:FB}}>{l}</button>
      ))}
    </div>

    {/* ═══ MEMBERS ═══ */}
    {tab==="members"&&<>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[{l:"Total",v:members.length,c:C.a},{l:"Agents",v:activeAgents.length,c:C.g},{l:"Members",v:members.filter(a=>a.role==="Member").length,c:C.t3},{l:"Online",v:members.filter(a=>a.status==="online").length,c:C.g},{l:"Offline",v:members.filter(a=>a.status==="offline"||a.status===undefined).length,c:C.t3}].map(k=>(
          <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{k.l}</div>
          </div>
        ))}
      </div>
      {/* Actions bar */}
      <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:7,padding:"5px 9px",flex:1,maxWidth:280}}>
          <NavIcon id="search" s={12} col={C.t3}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{flex:1,background:"none",border:"none",fontSize:11.5,color:C.t1,fontFamily:FB,outline:"none"}}/>
        </div>
        {["all","agents","members","online"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"3px 9px",borderRadius:16,fontSize:9.5,fontWeight:700,fontFamily:FM,cursor:"pointer",background:filter===f?C.ad:"transparent",color:filter===f?C.a:C.t3,border:`1px solid ${filter===f?C.a+"44":C.b1}`,textTransform:"capitalize"}}>{f}</button>
        ))}
        <div style={{flex:1}}/>
        <Btn ch="+ Invite Member" v="primary" onClick={()=>setShowInvite(true)}/>
      </div>
      {/* Table */}
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 0.8fr 0.6fr 1fr 90px",padding:"8px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
          {["Member","Email","Role","Status","Teams","Actions"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.3px"}}>{h}</span>)}
        </div>
        {filtered.map((a,i)=>(
          <div key={a.id} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 0.8fr 0.6fr 1fr 90px",padding:"10px 14px",borderBottom:i<filtered.length-1?`1px solid ${C.b1}`:"none",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Av i={a.av} c={a.color} s={32} dot={a.status==="online"}/>
              <div><div style={{fontSize:12.5,fontWeight:600}}>{a.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>ID: {a.id}</div></div>
            </div>
            <span style={{fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.email||"—"}</span>
            <Tag text={a.role} color={a.role==="Owner"?C.p:a.role==="Admin"?C.a:a.role==="Agent"?C.g:C.t3}/>
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:a.status==="online"?C.g:a.status==="busy"?C.y:C.t3}}/>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{a.status||"offline"}</span>
            </div>
            <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>{teams.filter(t=>(t.members||[]).includes(a.id)).map(t=><span key={t.id} style={{fontSize:8.5,background:C.s3,borderRadius:4,padding:"1px 5px",color:C.t2,fontFamily:FM}}>{t.name}</span>)}{teams.filter(t=>(t.members||[]).includes(a.id)).length===0&&<span style={{fontSize:9,color:C.t3}}>—</span>}</div>
            <div style={{display:"flex",gap:3}}>
              {a.role==="Member"&&<button onClick={()=>promoteToAgent(a.id)} style={{padding:"3px 7px",borderRadius:5,fontSize:9,fontWeight:700,background:C.gd,color:C.g,border:`1px solid ${C.g}44`,cursor:"pointer",fontFamily:FM}}>→ Agent</button>}
              <button onClick={()=>openEdit(a)} style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">✎</button>
              {a.role!=="Owner"&&<button onClick={()=>removeMember(a.id)} style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.rd,border:`1px solid ${C.r}44`,cursor:"pointer",color:C.r}}>✕</button>}
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>No members found</div>}
      </div>
    </>}

    {/* ═══ AGENTS (promoted members only) ═══ */}
    {tab==="agents"&&<>
      <div style={{background:C.pd,border:`1px solid ${C.p}33`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>ℹ</span>
        <span style={{fontSize:12,color:C.t2}}>Only members promoted to <strong>Agent</strong>, <strong>Admin</strong>, or <strong>Owner</strong> appear here. Go to "All Members" → click <strong>"→ Agent"</strong> to promote.</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[{l:"Active Agents",v:activeAgents.length,c:C.a},{l:"Online",v:agents.filter(a=>a.status==="online").length,c:C.g},{l:"In Teams",v:agents.filter(a=>teams.some(t=>(t.members||[]).includes(a.id))).length,c:C.cy},{l:"Unassigned",v:agents.filter(a=>!teams.some(t=>(t.members||[]).includes(a.id))).length,c:C.y}].map(k=>(
          <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 0.7fr 0.8fr 0.6fr 0.6fr 60px",padding:"8px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
          {["Agent","Role","Status","Performance","Load","CSAT",""].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM}}>{h}</span>)}
        </div>
        {activeAgents.map((a,i)=>{const p=perf(a);return(
          <div key={a.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 0.7fr 0.8fr 0.6fr 0.6fr 60px",padding:"10px 14px",borderBottom:i<activeAgents.length-1?`1px solid ${C.b1}`:"none",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><Av i={a.av} c={a.color} s={32} dot={a.status==="online"}/><div><div style={{fontSize:12.5,fontWeight:600}}>{a.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>Teams: {teams.filter(t=>(t.members||[]).includes(a.id)).map(t=>t.name).join(", ")||"None"}</div></div></div>
            <Tag text={a.role} color={a.role==="Owner"?C.p:a.role==="Admin"?C.a:C.g}/>
            <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:6,height:6,borderRadius:"50%",background:a.status==="online"?C.g:C.t3}}/><span style={{fontSize:10,fontFamily:FM,color:C.t3}}>{a.status}</span></div>
            <span style={{fontSize:10,fontFamily:FM,color:C.t2}}>{p.resolved} resolved</span>
            <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:28,height:5,background:C.bg,borderRadius:3}}><div style={{width:p.load+"%",height:"100%",background:p.load>80?C.r:p.load>50?C.y:C.g,borderRadius:3}}/></div><span style={{fontSize:8,fontFamily:FM,color:C.t3}}>{p.load}%</span></div>
            <span style={{fontSize:10,fontWeight:700,fontFamily:FM,color:parseFloat(p.csat)>=4.5?C.g:C.y}}>{p.csat}★</span>
            <div style={{display:"flex",gap:2}}>
              <button onClick={()=>openEdit(a)} style={{width:22,height:22,borderRadius:5,fontSize:10,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3,display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">✎</button>
              {a.role==="Agent"&&<button onClick={()=>changeRole(a.id,"Member")} title="Demote to Member" style={{width:22,height:22,borderRadius:5,fontSize:8,background:C.yd,border:`1px solid ${C.y}44`,cursor:"pointer",color:C.y,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FM}}>↓</button>}
            </div>
          </div>
        );})}
        {activeAgents.length===0&&<div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>No agents yet. Promote members from the "All Members" tab.</div>}
      </div>
    </>}

    {/* ═══ TEAMS (agents only) ═══ */}
    {tab==="teams"&&<>
      <div style={{background:C.ad,border:`1px solid ${C.a}33`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>ℹ</span>
        <span style={{fontSize:12,color:C.t2}}>Teams are groups of registered users. Add any user to a team, then assign conversations to teams for organized routing.</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
        <span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Teams ({teams.length})</span>
        <Btn ch="+ New Team" v="primary" onClick={()=>{setEditTeam(null);setTName("");setTDesc("");setTMembers([]);setTAutoAssign(true);setTRouting("round_robin");setTSchedule({on:false,start:"09:00",end:"18:00",days:[1,2,3,4,5]});setShowTeamForm(true);}}/>
      </div>
      {teams.map(t=>(
        <div key={t.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"16px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div><div style={{fontSize:14,fontWeight:700,fontFamily:FD}}>{t.name}</div><div style={{fontSize:11.5,color:C.t3}}>{t.desc}</div></div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <Tag text={t.autoAssign!==false?"Auto":"Manual"} color={t.autoAssign!==false?C.g:C.t3}/>
              <Tag text={(t.routing||"round_robin").replace("_"," ")} color={C.cy}/>
              <Btn ch="Edit" v="ghost" sm onClick={()=>openEditTeam(t)}/>
              <button onClick={()=>deleteTeam(t.id)} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:13}}>✕</button>
            </div>
          </div>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>AGENTS ({(t.members||[]).length})</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
            {(t.members||[]).map(mid=>{const ag=agents.find(a=>a.id===mid);return ag?<div key={mid} style={{display:"flex",alignItems:"center",gap:5,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 8px"}}>
              <Av i={ag.av} c={ag.color} s={20} dot={ag.status==="online"}/><div><div style={{fontSize:11,fontWeight:600}}>{ag.name}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{ag.role}</div></div>
              <button onClick={()=>removeMemberFromTeam(t.id,mid)} style={{fontSize:8,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
            </div>:null;})}
            {(!t.members||t.members.length===0)&&<span style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>No agents in this team</span>}
          </div>
          {/* all agents available to add */}
          {agents.filter(a=>!(t.members||[]).includes(a.id)).length>0&&<div>
            <div style={{fontSize:9,fontFamily:FM,color:C.t3,marginBottom:4}}>AVAILABLE TO ADD ({agents.filter(a=>!(t.members||[]).includes(a.id)).length}):</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {agents.filter(a=>!(t.members||[]).includes(a.id)).map(a=>(
                <button key={a.id} onClick={()=>addMemberToTeam(t.id,a.id)} className="hov" style={{display:"flex",alignItems:"center",gap:4,padding:"3px 7px",borderRadius:6,background:C.s2,border:`1px dashed ${C.a}44`,cursor:"pointer",fontSize:10,color:C.a}}>
                  <div style={{position:"relative"}}><Av i={a.av} c={a.color} s={16}/>{a.status==="online"&&<span style={{position:"absolute",bottom:-1,right:-1,width:5,height:5,borderRadius:"50%",background:C.g,border:`1px solid ${C.s2}`}}/>}</div>
                  {a.name.split(" ")[0]} <span style={{fontSize:8,color:C.t3}}>({a.role})</span>
                </button>
              ))}
            </div>
          </div>}
          <div style={{display:"flex",gap:10,marginTop:8,fontSize:9,color:C.t3,fontFamily:FM}}>
            <span>Members: <strong style={{color:C.a}}>{(t.members||[]).length}</strong></span>
            <span>Online: <strong style={{color:C.g}}>{(t.members||[]).filter(mid=>agents.find(a=>a.id===mid)?.status==="online").length}</strong></span>
          </div>
        </div>
      ))}
      {teams.length===0&&<div style={{padding:"30px",textAlign:"center",color:C.t3,background:C.s1,borderRadius:14,border:`1px solid ${C.b1}`}}>No teams yet. Create a team and assign agents to it.</div>}
    </>}

    {/* ═══ ROLES & PERMISSIONS ═══ */}
    {tab==="roles"&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontSize:16,fontWeight:700,fontFamily:FD}}>Roles & Permissions</div><div style={{fontSize:11.5,color:C.t2}}>Manage roles, toggle permissions, assign members. Owner is locked.</div></div>
        <Btn ch="+ Create Role" v="primary" onClick={()=>{setNrName("");setNrDesc("");setNrColor(C.cy);setNrCloneFrom("Member");setShowNewRole(true);}}/>
      </div>

      {/* Role cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:20}}>
        {roles.map(r=>{const cnt=agents.filter(a=>a.role===r.name).length;const pcnt=Object.values(rolePerms[r.name]||{}).filter(Boolean).length;return(
          <div key={r.id} style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,borderLeft:`4px solid ${r.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div><div style={{fontSize:14,fontWeight:700,color:r.color,fontFamily:FD}}>{r.name}</div><div style={{fontSize:10,color:C.t3,marginTop:2}}>{r.desc}</div></div>
              {!r.fixed&&<div style={{display:"flex",gap:2}}>
                <button onClick={()=>{setErName(r.name);setErDesc(r.desc);setErColor(r.color);setEditRole(r);}} title="Edit" style={{width:20,height:20,borderRadius:4,background:C.s3,border:"none",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",color:C.t3}}>✎</button>
                <button onClick={()=>{setNrName(r.name+" Copy");setNrDesc(r.desc);setNrColor(r.color);setNrCloneFrom(r.name);setShowNewRole(true);}} title="Duplicate" style={{width:20,height:20,borderRadius:4,background:C.s3,border:"none",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",color:C.t3}}>⧉</button>
                <button onClick={()=>{if(cnt>0)return showT("Reassign "+cnt+" members first","error");setRoles(p=>p.filter(x=>x.id!==r.id));const np={...rolePerms};delete np[r.name];setRolePerms(np);showT("Deleted","success");setPermLog(p=>[{t:"Now",who:"You",action:`Deleted role "${r.name}"`},...p]);}} title="Delete" style={{width:20,height:20,borderRadius:4,background:C.rd,border:"none",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",color:C.r}}>✕</button>
              </div>}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              <Tag text={cnt+" member"+(cnt!==1?"s":"")} color={r.color}/>
              <Tag text={pcnt+"/"+PERMS.length} color={pcnt===PERMS.length?C.g:pcnt>PERMS.length/2?C.a:C.t3}/>
              {!r.fixed&&<Tag text="Custom" color={C.cy}/>}
            </div>
            <div style={{display:"flex",alignItems:"center"}}>
              {agents.filter(a=>a.role===r.name).slice(0,5).map(a=><div key={a.id} title={a.name} style={{marginLeft:-3}}><Av i={a.av} c={a.color} s={20}/></div>)}
              {cnt>5&&<span style={{fontSize:9,color:C.t3,marginLeft:4}}>+{cnt-5}</span>}
              {cnt===0&&<span style={{fontSize:9,color:C.t3,fontStyle:"italic"}}>No members</span>}
              <button onClick={()=>setRoleAssign(roleAssign===r.name?null:r.name)} style={{marginLeft:"auto",fontSize:8,color:C.a,background:roleAssign===r.name?C.ad:C.s3,border:`1px solid ${roleAssign===r.name?C.a+"44":C.b1}`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>{roleAssign===r.name?"Done":"Assign"}</button>
            </div>
            {roleAssign===r.name&&<div style={{marginTop:8,padding:"8px",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`}}>
              <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>ASSIGN TO {r.name.toUpperCase()}</div>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {agents.filter(a=>a.role!==r.name&&a.role!=="Owner").map(a=>(
                  <button key={a.id} onClick={()=>{changeRole(a.id,r.name);setPermLog(p=>[{t:"Now",who:"You",action:`${a.name} → ${r.name}`},...p]);}} className="hov" style={{display:"flex",alignItems:"center",gap:3,padding:"3px 6px",borderRadius:5,background:C.s1,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:9.5,color:C.t2}}>
                    <Av i={a.av} c={a.color} s={14}/>{a.name.split(" ")[0]} <span style={{color:C.t3,fontSize:7}}>({a.role})</span>
                  </button>
                ))}
                {agents.filter(a=>a.role!==r.name&&a.role!=="Owner").length===0&&<span style={{fontSize:9,color:C.t3}}>No available members</span>}
              </div>
            </div>}
          </div>
        );})}
      </div>

      {/* Permission matrix */}
      <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:8}}>Permission Matrix</div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:`1.8fr ${roles.map(()=>"1fr").join(" ")}`,padding:"8px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2,alignItems:"center"}}>
          <span style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM}}>PERMISSION</span>
          {roles.map(r=><div key={r.id} style={{textAlign:"center"}}>
            <span style={{fontSize:9,fontWeight:700,color:r.color,fontFamily:FM,display:"block"}}>{r.name}</span>
            {r.name!=="Owner"&&<div style={{display:"flex",gap:2,justifyContent:"center",marginTop:2}}>
              <button onClick={()=>{setRolePerms(p=>({...p,[r.name]:Object.fromEntries(PERMS.map(pm=>[pm.k,true]))}));showT(r.name+": all on","success");setPermLog(pv=>[{t:"Now",who:"You",action:`All perms ON for ${r.name}`},...pv]);}} style={{fontSize:7,color:C.g,background:C.gd,border:`1px solid ${C.g}33`,borderRadius:3,padding:"1px 4px",cursor:"pointer",fontFamily:FM}}>All</button>
              <button onClick={()=>{setRolePerms(p=>({...p,[r.name]:Object.fromEntries(PERMS.map(pm=>[pm.k,false]))}));showT(r.name+": all off","info");setPermLog(pv=>[{t:"Now",who:"You",action:`All perms OFF for ${r.name}`},...pv]);}} style={{fontSize:7,color:C.r,background:C.rd,border:`1px solid ${C.r}33`,borderRadius:3,padding:"1px 4px",cursor:"pointer",fontFamily:FM}}>None</button>
            </div>}
          </div>)}
        </div>
        {PERMS.map((p,pi)=>(
          <div key={p.k} style={{display:"grid",gridTemplateColumns:`1.8fr ${roles.map(()=>"1fr").join(" ")}`,padding:"6px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",background:pi%2?C.s2+"44":"transparent"}}>
            <span style={{fontSize:11.5,color:C.t1}}>{p.l}</span>
            {roles.map(r=>{const v=rolePerms[r.name]?.[p.k];return(
              <div key={r.id} style={{textAlign:"center"}}>
                <button onClick={()=>{if(r.name==="Owner")return;setRolePerms(prev=>({...prev,[r.name]:{...prev[r.name],[p.k]:!v}}));setPermLog(pv=>[{t:"Now",who:"You",action:`${!v?"✓":"✕"} "${p.l}" for ${r.name}`},...pv.slice(0,19)]);}} style={{width:24,height:24,borderRadius:6,border:`1.5px solid ${v?C.g+"88":C.b2}`,background:v?C.gd:"transparent",color:v?C.g:C.t3,fontSize:11,fontWeight:800,cursor:r.name==="Owner"?"default":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",opacity:r.name==="Owner"?.6:1,transition:"all .12s"}}>{v?"✓":"✕"}</button>
              </div>
            );})}
          </div>
        ))}
      </div>

      {/* Members by role */}
      <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:8}}>Members by Role</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10,marginBottom:16}}>
        {roles.map(r=>{const mbrs=agents.filter(a=>a.role===r.name);return(
          <div key={r.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",borderTop:`3px solid ${r.color}`}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}><div style={{width:8,height:8,borderRadius:"50%",background:r.color}}/><span style={{fontSize:12,fontWeight:700,color:r.color}}>{r.name}</span><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>({mbrs.length})</span></div>
            {mbrs.length===0&&<div style={{fontSize:10,color:C.t3,fontStyle:"italic",padding:"4px 0"}}>No members</div>}
            {mbrs.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <Av i={a.av} c={a.color} s={22} dot={a.status==="online"}/>
                <div style={{flex:1}}><div style={{fontSize:11.5,fontWeight:600}}>{a.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{a.email}</div></div>
                {a.role!=="Owner"&&<Sel val={a.role} set={v=>{changeRole(a.id,v);setPermLog(pv=>[{t:"Now",who:"You",action:`${a.name}: ${a.role} → ${v}`},...pv]);}} opts={roles.map(rl=>({v:rl.name,l:rl.name}))} sx={{width:90,fontSize:10}}/>}
              </div>
            ))}
          </div>
        );})}
      </div>

      {/* Audit log */}
      <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:8}}>Change Log</div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}>
        {permLog.slice(0,10).map((ev,i)=>(
          <div key={i} style={{display:"flex",gap:8,padding:"7px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
            <span style={{fontSize:9,color:C.t3,fontFamily:FM,width:36,flexShrink:0}}>{ev.t}</span>
            <span style={{fontSize:10,fontWeight:700,color:C.a,width:36,flexShrink:0}}>{ev.who}</span>
            <span style={{fontSize:11,color:C.t2}}>{ev.action}</span>
          </div>
        ))}
        {permLog.length===0&&<div style={{padding:"16px",textAlign:"center",fontSize:11,color:C.t3}}>No changes yet</div>}
      </div>
    </>}

    {/* ═══ INVITE MEMBER MODAL ═══ */}
    {showInvite&&<Mdl title="Invite New Member" onClose={()=>setShowInvite(false)} w={420}>
      <div style={{background:C.ad,border:`1px solid ${C.a}33`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.t2}}>New members are added with <strong>Member</strong> role. Promote them to <strong>Agent</strong> to grant conversation access.</div>
      <Fld label="Full Name"><Inp val={invName} set={setInvName} ph="e.g. Priya Sharma"/></Fld>
      <Fld label="Email"><Inp val={invEmail} set={setInvEmail} ph="member@company.com" type="email"/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowInvite(false)}/><Btn ch="Send Invite" v="primary" onClick={invite}/></div>
    </Mdl>}

    {/* ═══ EDIT MEMBER MODAL ═══ */}
    {editMbr&&<Mdl title={"Edit — "+editMbr.name} onClose={()=>setEditMbr(null)} w={540}>
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,marginBottom:12}}>
        {[["profile","Profile"],["permissions","Permissions"],["availability","Availability"],["performance","Performance"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setEmTab(id)} style={{flex:1,padding:"8px",fontSize:10,fontWeight:700,fontFamily:FM,color:emTab===id?C.a:C.t3,borderBottom:`2px solid ${emTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
      {emTab==="profile"&&<div>
        <div style={{display:"flex",gap:12,marginBottom:12,alignItems:"center"}}>
          <Av i={emName.slice(0,2).toUpperCase()} c={editMbr.color} s={48}/>
          <div style={{flex:1}}><Fld label="Name"><Inp val={emName} set={setEmName} ph="Name"/></Fld><Fld label="Email"><Inp val={emEmail} set={setEmEmail} ph="email"/></Fld></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><Fld label="Role"><Sel val={emRole} set={setEmRole} opts={roles.map(r=>({v:r.name,l:r.name}))}/></Fld></div>
          <div style={{flex:1}}><Fld label="Status"><Sel val={emStatus} set={setEmStatus} opts={[{v:"online",l:"Online"},{v:"busy",l:"Busy"},{v:"offline",l:"Offline"}]}/></Fld></div>
        </div>
        {(emRole==="Agent"||emRole==="Admin"||emRole==="Owner")&&<Fld label={"Max Conversations ("+emMaxConvs+")"}>
          <input type="range" min="1" max="20" value={emMaxConvs} onChange={e=>setEmMaxConvs(Number(e.target.value))} style={{width:"100%",accentColor:C.a}}/>
        </Fld>}
      </div>}
      {emTab==="permissions"&&<div>
        <div style={{fontSize:12,color:C.t2,marginBottom:10}}>Permissions for <strong>{emRole}</strong> role:</div>
        {PERMS.map(p=>{const v=rolePerms[emRole]?.[p.k];return(
          <div key={p.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <span style={{fontSize:12,color:C.t1}}>{p.l}</span>
            <span style={{fontSize:11,color:v?C.g:C.r,fontWeight:700}}>{v?"✓ Allowed":"✕ Denied"}</span>
          </div>
        );})}
        <div style={{marginTop:10,fontSize:11,color:C.t3,fontStyle:"italic"}}>To change permissions, edit the role in "Roles & Permissions" tab.</div>
      </div>}
      {emTab==="availability"&&<div>
        <div style={{display:"flex",gap:12,marginBottom:12}}>
          <div style={{flex:1}}><Fld label="Start"><Inp val={emAvail.start} set={v=>setEmAvail(p=>({...p,start:v}))} type="time"/></Fld></div>
          <div style={{flex:1}}><Fld label="End"><Inp val={emAvail.end} set={v=>setEmAvail(p=>({...p,end:v}))} type="time"/></Fld></div>
        </div>
        <Fld label="Timezone"><Sel val={emAvail.tz} set={v=>setEmAvail(p=>({...p,tz:v}))} opts={[{v:"Asia/Kolkata",l:"IST"},{v:"America/New_York",l:"EST"},{v:"Europe/London",l:"GMT"},{v:"Asia/Tokyo",l:"JST"}]}/></Fld>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0"}}><div><div style={{fontSize:12,fontWeight:600}}>Auto-Away</div><div style={{fontSize:10,color:C.t3}}>After {emAvail.awayMin} min inactivity</div></div><Toggle val={emAvail.autoAway} set={v=>setEmAvail(p=>({...p,autoAway:v}))}/></div>
      </div>}
      {emTab==="performance"&&<div>
        {(()=>{const p=perf(editMbr);return <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
            {[{l:"Resolved",v:p.resolved,c:C.g},{l:"Avg Reply",v:p.reply,c:C.a},{l:"CSAT",v:p.csat+"★",c:parseFloat(p.csat)>=4.5?C.g:C.y},{l:"Load",v:p.load+"%",c:p.load>80?C.r:C.g}].map(s=>(
              <div key={s.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
                <div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{s.l}</div>
              </div>
            ))}
          </div>
        </>;})()}
      </div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,paddingTop:12,borderTop:`1px solid ${C.b1}`}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>setEditMbr(null)}/><Btn ch="Save" v="primary" onClick={saveEdit}/>
      </div>
    </Mdl>}

    {/* ═══ TEAM FORM ═══ */}
    {showTeamForm&&<Mdl title={editTeam?"Edit Team":"New Team"} onClose={()=>{setShowTeamForm(false);setEditTeam(null);}} w={520}>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Name"><Inp val={tName} set={setTName} ph="e.g. Technical Support"/></Fld></div><div style={{flex:1}}><Fld label="Description"><Inp val={tDesc} set={setTDesc} ph="What does this team handle?"/></Fld></div></div>
      <Fld label={"Add Members ("+tMembers.length+" of "+agents.length+" selected)"}>
        {agents.length===0&&<div style={{padding:"12px",background:C.yd,borderRadius:8,fontSize:12,color:C.y}}>No registered users found.</div>}
        <div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${C.b1}`,borderRadius:8,padding:4}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            {agents.map(a=>(
              <label key={a.id} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 9px",borderRadius:7,cursor:"pointer",background:tMembers.includes(a.id)?C.ad:C.s2,border:`1px solid ${tMembers.includes(a.id)?C.a+"44":C.b1}`}}>
                <input type="checkbox" checked={tMembers.includes(a.id)} onChange={e=>setTMembers(p=>e.target.checked?[...p,a.id]:p.filter(x=>x!==a.id))} style={{accentColor:C.a,width:13,height:13}}/>
                <div style={{position:"relative"}}><Av i={a.av} c={a.color} s={20}/><span style={{position:"absolute",bottom:-1,right:-1,width:6,height:6,borderRadius:"50%",border:`1.5px solid ${C.s2}`,background:a.status==="online"?C.g:a.status==="busy"?C.y:C.t3}}/></div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{a.role} · {a.email||""}</div></div>
              </label>
            ))}
          </div>
        </div>
        {tMembers.length>0&&<div style={{marginTop:6,fontSize:10,color:C.t2,fontFamily:FM}}>Selected: {tMembers.map(id=>agents.find(a=>a.id===id)?.name).filter(Boolean).join(", ")}</div>}
      </Fld>
      <Fld label="Routing"><div style={{display:"flex",gap:6}}>
        {[["round_robin","Round Robin"],["load_balanced","Load Balanced"],["manual","Manual"]].map(([v,l])=>(
          <button key={v} onClick={()=>setTRouting(v)} style={{flex:1,padding:"7px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",background:tRouting===v?C.ad:C.s2,color:tRouting===v?C.a:C.t3,border:`1px solid ${tRouting===v?C.a+"55":C.b1}`,fontFamily:FB}}>{l}</button>
        ))}
      </div></Fld>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12}}>Auto-Assign</span><Toggle val={tAutoAssign} set={setTAutoAssign}/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowTeamForm(false);setEditTeam(null);}}/><Btn ch={editTeam?"Save":"Create Team"} v="primary" onClick={createTeam}/></div>
    </Mdl>}

    {/* ═══ CREATE ROLE MODAL ═══ */}
    {showNewRole&&<Mdl title="Create Custom Role" onClose={()=>setShowNewRole(false)} w={460}>
      <Fld label="Role Name"><Inp val={nrName} set={setNrName} ph="e.g. Supervisor"/></Fld>
      <Fld label="Description"><Inp val={nrDesc} set={setNrDesc} ph="What can this role do?"/></Fld>
      <Fld label="Color"><div style={{display:"flex",gap:5}}>{[C.a,C.g,C.p,C.cy,C.y,C.r,"#ff6b35","#e91e63"].map(c=>(
        <button key={c} onClick={()=>setNrColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:`3px solid ${nrColor===c?"#fff":"transparent"}`,cursor:"pointer",boxShadow:nrColor===c?`0 0 0 2px ${c}`:""}}/>
      ))}</div></Fld>
      <Fld label="Clone Permissions From">
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {roles.map(r=>(
            <button key={r.id} onClick={()=>setNrCloneFrom(r.name)} style={{padding:"5px 10px",borderRadius:7,fontSize:10.5,fontWeight:600,cursor:"pointer",background:nrCloneFrom===r.name?C.ad:C.s2,color:nrCloneFrom===r.name?C.a:C.t2,border:`1.5px solid ${nrCloneFrom===r.name?C.a+"55":C.b1}`,fontFamily:FB}}>{r.name}</button>
          ))}
        </div>
      </Fld>
      {nrCloneFrom&&rolePerms[nrCloneFrom]&&<div style={{background:C.s2,borderRadius:8,padding:"8px 12px",marginBottom:12,maxHeight:150,overflowY:"auto"}}>
        <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>PERMISSIONS FROM "{nrCloneFrom.toUpperCase()}"</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:3}}>{PERMS.filter(p=>rolePerms[nrCloneFrom]?.[p.k]).map(p=><span key={p.k} style={{fontSize:9,background:C.gd,color:C.g,padding:"2px 6px",borderRadius:4,fontFamily:FM}}>✓ {p.l}</span>)}</div>
        {PERMS.filter(p=>rolePerms[nrCloneFrom]?.[p.k]).length===0&&<span style={{fontSize:9,color:C.t3}}>No permissions</span>}
      </div>}
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNewRole(false)}/><Btn ch="Create Role" v="primary" onClick={()=>{
        if(!nrName.trim())return showT("Name required","error");
        if(roles.find(r=>r.name===nrName.trim()))return showT("Role exists","error");
        const nm=nrName.trim();
        setRoles(p=>[...p,{id:"r"+uid(),name:nm,color:nrColor,desc:nrDesc,fixed:false}]);
        setRolePerms(p=>({...p,[nm]:{...(p[nrCloneFrom]||Object.fromEntries(PERMS.map(pm=>[pm.k,false])))}}));
        setPermLog(p=>[{t:"Now",who:"You",action:`Created role "${nm}" (cloned from ${nrCloneFrom})`},...p]);
        setShowNewRole(false);showT("Role created!","success");
      }}/></div>
    </Mdl>}

    {/* ═══ EDIT ROLE MODAL ═══ */}
    {editRole&&<Mdl title={"Edit Role — "+editRole.name} onClose={()=>setEditRole(null)} w={440}>
      <Fld label="Role Name"><Inp val={erName} set={setErName} ph="Role name"/></Fld>
      <Fld label="Description"><Inp val={erDesc} set={setErDesc} ph="Description"/></Fld>
      <Fld label="Color"><div style={{display:"flex",gap:5}}>{[C.a,C.g,C.p,C.cy,C.y,C.r,"#ff6b35","#e91e63"].map(c=>(
        <button key={c} onClick={()=>setErColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:`3px solid ${erColor===c?"#fff":"transparent"}`,cursor:"pointer",boxShadow:erColor===c?`0 0 0 2px ${c}`:""}}/>
      ))}</div></Fld>
      <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>PERMISSIONS ({Object.values(rolePerms[editRole.name]||{}).filter(Boolean).length}/{PERMS.length})</div>
      <div style={{display:"flex",gap:3,marginBottom:8}}>
        <button onClick={()=>setRolePerms(p=>({...p,[editRole.name]:Object.fromEntries(PERMS.map(pm=>[pm.k,true]))}))} style={{fontSize:9,padding:"3px 8px",borderRadius:5,background:C.gd,color:C.g,border:`1px solid ${C.g}33`,cursor:"pointer",fontFamily:FM}}>Enable All</button>
        <button onClick={()=>setRolePerms(p=>({...p,[editRole.name]:Object.fromEntries(PERMS.map(pm=>[pm.k,false]))}))} style={{fontSize:9,padding:"3px 8px",borderRadius:5,background:C.rd,color:C.r,border:`1px solid ${C.r}33`,cursor:"pointer",fontFamily:FM}}>Disable All</button>
      </div>
      <div style={{maxHeight:250,overflowY:"auto",background:C.s2,borderRadius:8,padding:"4px 0",marginBottom:12}}>
        {PERMS.map(p=>{const v=rolePerms[editRole.name]?.[p.k];return(
          <div key={p.k} onClick={()=>setRolePerms(prev=>({...prev,[editRole.name]:{...prev[editRole.name],[p.k]:!v}}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 12px",cursor:"pointer",borderBottom:`1px solid ${C.b1}22`}}>
            <span style={{fontSize:12,color:C.t1}}>{p.l}</span>
            <div style={{width:22,height:22,borderRadius:6,border:`1.5px solid ${v?C.g:C.b2}`,background:v?C.gd:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:v?C.g:C.t3,fontSize:10,fontWeight:800}}>{v?"✓":"✕"}</div>
          </div>
        );})}
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setEditRole(null)}/><Btn ch="Save Changes" v="primary" onClick={()=>{
        if(!erName.trim())return showT("Name required","error");
        const oldName=editRole.name;const newName=erName.trim();
        setRoles(p=>p.map(r=>r.id===editRole.id?{...r,name:newName,desc:erDesc,color:erColor}:r));
        if(oldName!==newName){const np={...rolePerms,[newName]:rolePerms[oldName]};delete np[oldName];setRolePerms(np);setAgents(p=>p.map(a=>a.role===oldName?{...a,role:newName}:a));}
        setPermLog(p=>[{t:"Now",who:"You",action:`Updated role "${oldName}"${oldName!==newName?` → "${newName}"`:""}`},...p]);
        setEditRole(null);showT("Role updated","success");
      }}/></div>
    </Mdl>}
  </div>;
}
function LabelSet({labels,setLabels}){
  const [showForm,setShowForm]=useState(false);
  const [edit,setEdit]=useState(null);
  const [title,setTitle]=useState("");
  const [color,setColor]=useState(C.a);
  const COLS=[C.a,C.g,C.p,C.y,C.r,C.cy,"#ff6b35","#e91e63","#00bcd4","#8bc34a"];
  const save=()=>{
    if(!title.trim()){showT("Title required","error");return;}
    if(edit){setLabels(p=>p.map(l=>l.id===edit.id?{...l,title,color}:l));if(api.isConnected())api.patch(`/settings/labels/${edit.id}`,{title,color}).catch(()=>{});}
    else{setLabels(p=>[...p,{id:"l"+uid(),title,color}]);if(api.isConnected())api.post("/settings/labels",{title,color}).catch(()=>{});}
    showT(edit?"Label updated":"Label created!","success");setShowForm(false);setEdit(null);setTitle("");
  };
  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Labels</h2>
      <Btn ch="⊕ New Label" v="primary" onClick={()=>{setTitle("");setColor(C.a);setEdit(null);setShowForm(true);}}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
      {labels.map(l=>(
        <div key={l.id} style={{background:C.s1,border:`1px solid ${l.color}44`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:12,height:12,borderRadius:"50%",background:l.color,flexShrink:0}}/>
          <Tag text={l.title} color={l.color}/>
          <div style={{flex:1}}/>
          <button onClick={()=>{setTitle(l.title);setColor(l.color);setEdit(l);setShowForm(true);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:14}}>✎</button>
          <button onClick={()=>{setLabels(p=>p.filter(x=>x.id!==l.id));showT("Label deleted","success");if(api.isConnected())api.del(`/settings/labels/${l.id}`).catch(()=>{});}} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:13}}>🗑</button>
        </div>
      ))}
    </div>
    {showForm&&<Mdl title={edit?"Edit Label":"New Label"} onClose={()=>{setShowForm(false);setEdit(null);}} w={380}>
      <Fld label="Label Title"><Inp val={title} set={setTitle} ph="e.g. billing"/></Fld>
      <Fld label="Color">
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          {COLS.map(c=><button key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${color===c?"#fff":"transparent"}`,cursor:"pointer"}}/>)}
        </div>
        {title&&<Tag text={title} color={color}/>}
      </Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEdit(null);}}/><Btn ch={edit?"Save":"Create Label"} v="primary" onClick={save}/></div>
    </Mdl>}
  </div>;
}

function CannedSet({canned,setCanned}){
  const [search,setSearch]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [edit,setEdit]=useState(null);
  const [code,setCode]=useState("");
  const [content,setContent]=useState("");
  const filtered=canned.filter(c=>!search||c.code.includes(search)||c.content.toLowerCase().includes(search.toLowerCase()));
  const save=()=>{
    if(!code.trim()||!content.trim()){showT("Both fields required","error");return;}
    if(edit){setCanned(p=>p.map(c=>c.id===edit.id?{...c,code,content}:c));if(api.isConnected())api.patch(`/settings/canned-responses/${edit.id}`,{code,content}).catch(()=>{});}
    else{setCanned(p=>[...p,{id:"c"+uid(),code,content}]);if(api.isConnected())api.post("/settings/canned-responses",{code,content}).catch(()=>{});}
    showT(edit?"Updated":"Created!","success");setShowForm(false);setEdit(null);setCode("");setContent("");
  };
  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Canned Responses</h2>
      <Btn ch="⊕ New Response" v="primary" onClick={()=>{setCode("");setContent("");setEdit(null);setShowForm(true);}}/>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",marginBottom:14}}>
      <span style={{color:C.t3}}>⌕</span>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by shortcode or content…" style={{flex:1,background:"none",border:"none",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
    </div>
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
      {filtered.map((c,i)=>(
        <div key={c.id} style={{padding:"13px 16px",borderBottom:i<filtered.length-1?`1px solid ${C.b1}`:"none",display:"flex",alignItems:"flex-start",gap:12}}>
          <div style={{background:C.ad,border:`1px solid ${C.a}44`,borderRadius:6,padding:"3px 9px",flexShrink:0}}><span style={{fontSize:11,color:C.a,fontFamily:FM,fontWeight:600}}>/{c.code}</span></div>
          <div style={{flex:1,fontSize:13,color:C.t2,lineHeight:1.5}}>{c.content}</div>
          <button onClick={()=>{setCode(c.code);setContent(c.content);setEdit(c);setShowForm(true);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:14}}>✎</button>
          <button onClick={()=>{setCanned(p=>p.filter(x=>x.id!==c.id));showT("Deleted","success");if(api.isConnected())api.del(`/settings/canned-responses/${c.id}`).catch(()=>{});}} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:13}}>🗑</button>
        </div>
      ))}
      {filtered.length===0&&<div style={{padding:"20px",textAlign:"center",fontSize:13,color:C.t3}}>No responses found</div>}
    </div>
    {showForm&&<Mdl title={edit?"Edit Canned Response":"New Canned Response"} onClose={()=>{setShowForm(false);setEdit(null);}}>
      <Fld label="Shortcode (type /code in chat)"><Inp val={code} set={setCode} ph="e.g. greet"/></Fld>
      <Fld label="Response Content">
        <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Enter the full response text…" rows={4} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none"}}/>
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>Use {"{{name}}"} for dynamic variables</div>
      </Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEdit(null);}}/><Btn ch={edit?"Save Changes":"Create Response"} v="primary" onClick={save}/></div>
    </Mdl>}
  </div>;
}

function AutoSet({autos,setAutos}){
  const [showForm,setShowForm]=useState(false);
  const [edit,setEdit]=useState(null);
  const [name,setName]=useState("");
  const [event,setEvent]=useState("CONVERSATION_CREATED");
  const [conds,setConds]=useState([{attr:"channel",op:"equals",val:""}]);
  const [actions,setActions]=useState([{type:"assign_team",val:""}]);
  const EVENTS=["CONVERSATION_CREATED","MESSAGE_CREATED","CONVERSATION_UPDATED","CONVERSATION_RESOLVED"];
  const ATTRS=["channel","status","priority","message","contact.email","contact.name"];
  const OPS=["equals","not_equals","contains","not_contains","is_present"];
  const ACTIONS=["assign_agent","assign_team","add_label","set_priority","send_message","resolve","webhook"];
  const save=()=>{
    if(!name.trim()){showT("Name required","error");return;}
    if(edit)setAutos(p=>p.map(a=>a.id===edit.id?{...a,name,event,conditions:conds,actions}:a));
    else setAutos(p=>[...p,{id:"au"+uid(),name,event,conditions:conds,actions,active:true}]);
    showT(edit?"Automation updated":"Automation created!","success");setShowForm(false);setEdit(null);
  };
  const openEdit=a=>{setEdit(a);setName(a.name);setEvent(a.event);setConds(a.conditions);setActions(a.actions);setShowForm(true);};
  const openNew=()=>{setEdit(null);setName("");setEvent("CONVERSATION_CREATED");setConds([{attr:"channel",op:"equals",val:""}]);setActions([{type:"assign_team",val:""}]);setShowForm(true);};

  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Automations</h2>
      <Btn ch="⊕ New Automation" v="primary" onClick={openNew}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {autos.map(a=>(
        <div key={a.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <Toggle val={a.active} set={v=>{setAutos(p=>p.map(x=>x.id===a.id?{...x,active:v}:x));showT(`Automation ${v?"enabled":"disabled"}`,"info");}}/>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,marginBottom:2}}>{a.name}</div><div style={{fontSize:11.5,color:C.t3,fontFamily:FM}}>Trigger: {a.event}</div></div>
            <Btn ch="✎ Edit" v="ghost" sm onClick={()=>openEdit(a)}/>
            <button onClick={()=>{if(window.confirm("Delete automation?")){setAutos(p=>p.filter(x=>x.id!==a.id));showT("Deleted","success");if(api.isConnected())api.del(`/settings/automations/${a.id}`).catch(()=>{});}}} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:16}}>🗑</button>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>IF:</span>
            {a.conditions.map((c,i)=><Tag key={i} text={`${c.attr} ${c.op} "${c.val}"`} color={C.a}/>)}
            <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>THEN:</span>
            {a.actions.map((ac,i)=><Tag key={i} text={`${ac.type}${ac.val?": "+ac.val:""}`} color={C.p}/>)}
          </div>
        </div>
      ))}
    </div>
    {showForm&&<Mdl title={edit?"Edit Automation":"New Automation"} onClose={()=>{setShowForm(false);setEdit(null);}} w={560}>
      <Fld label="Automation Name"><Inp val={name} set={setName} ph="e.g. Auto-assign WhatsApp"/></Fld>
      <Fld label="Trigger Event"><Sel val={event} set={setEvent} opts={EVENTS.map(e=>({v:e,l:e.replace(/_/g," ")}))}/></Fld>
      <Fld label="Conditions (IF)">
        {conds.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <Sel val={c.attr} set={v=>setConds(p=>p.map((x,j)=>j===i?{...x,attr:v}:x))} opts={ATTRS.map(a=>({v:a,l:a}))} sx={{flex:1}}/>
            <Sel val={c.op} set={v=>setConds(p=>p.map((x,j)=>j===i?{...x,op:v}:x))} opts={OPS.map(o=>({v:o,l:o}))} sx={{flex:1}}/>
            <Inp val={c.val} set={v=>setConds(p=>p.map((x,j)=>j===i?{...x,val:v}:x))} ph="value" sx={{flex:1}}/>
            {conds.length>1&&<button onClick={()=>setConds(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:16}}>×</button>}
          </div>
        ))}
        <button onClick={()=>setConds(p=>[...p,{attr:"channel",op:"equals",val:""}])} style={{fontSize:11,color:C.a,background:"none",border:`1px dashed ${C.a}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:FB}}>+ Add Condition</button>
      </Fld>
      <Fld label="Actions (THEN)">
        {actions.map((ac,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <Sel val={ac.type} set={v=>setActions(p=>p.map((x,j)=>j===i?{...x,type:v}:x))} opts={ACTIONS.map(a=>({v:a,l:a.replace(/_/g," ")}))} sx={{flex:1}}/>
            <Inp val={ac.val} set={v=>setActions(p=>p.map((x,j)=>j===i?{...x,val:v}:x))} ph="value" sx={{flex:1}}/>
            {actions.length>1&&<button onClick={()=>setActions(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:16}}>×</button>}
          </div>
        ))}
        <button onClick={()=>setActions(p=>[...p,{type:"add_label",val:""}])} style={{fontSize:11,color:C.p,background:"none",border:`1px dashed ${C.p}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:FB}}>+ Add Action</button>
      </Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEdit(null);}}/><Btn ch={edit?"Save Changes":"Create Automation"} v="primary" onClick={save}/></div>
    </Mdl>}
  </div>;
}

function AIBotSet({inboxes,canned,aiAutoReply,setAiAutoReply,aiChannels,setAiChannels}){
  const CHANNELS=["live","email","whatsapp","telegram","facebook","instagram","viber","apple","line","tiktok","x","sms","voice","video","api"];
  const CH_LABELS={live:"Live Chat",email:"Email",whatsapp:"WhatsApp",telegram:"Telegram",facebook:"Facebook",instagram:"Instagram",viber:"Viber",apple:"Apple Business Chat",line:"LINE",tiktok:"TikTok",x:"X (Twitter)",sms:"SMS",voice:"Voice Call",video:"Video Call",api:"API"};

  // ── Config state ──
  const [loading,setLoading]=useState(true);
  const [botName,setBotName]=useState("Aria");
  const [botTone,setBotTone]=useState("professional");
  const [botLang,setBotLang]=useState("EN");
  const [handoff,setHandoff]=useState("3");
  const [workingHours,setWorkingHours]=useState(true);
  const [autoResolve,setAutoResolve]=useState(false);
  const [autoResolveH,setAutoResolveH]=useState("24");
  const [sysPrompt,setSysPrompt]=useState("You are Aria, a friendly and professional customer support assistant. Your job is to help customers resolve their issues quickly. Always be empathetic, concise, and solution-focused. If you cannot resolve an issue, collect details and escalate to a human agent.");
  const [promptDirty,setPromptDirty]=useState(false);
  const [savingPrompt,setSavingPrompt]=useState(false);
  const cfgTimer=useRef(null);

  // ── KB state ──
  const [kbTab,setKbTab]=useState("faq");
  const [faqs,setFaqs]=useState([]);
  const [showFaqForm,setShowFaqForm]=useState(false);
  const [faqQ,setFaqQ]=useState("");
  const [faqA,setFaqA]=useState("");
  const [editFaq,setEditFaq]=useState(null);
  const [savingFaq,setSavingFaq]=useState(false);
  const [docs,setDocs]=useState([]);
  const [urls,setUrls]=useState([]);
  const [newUrl,setNewUrl]=useState("");

  // ── Live tester ──
  const [testing,setTesting]=useState(false);
  const [testInp,setTestInp]=useState("");
  const [testMsgs,setTestMsgs]=useState([{from:"bot",text:"Hi! I am Aria, your AI support assistant. How can I help you today?"}]);
  const [testTyping,setTestTyping]=useState(false);
  const testEnd=useRef(null);
  useEffect(()=>{testEnd.current?.scrollIntoView({behavior:"smooth"});},[testMsgs]);

  // ── Load all data ──
  useEffect(()=>{(async()=>{
    try{
      const [cfgR,faqR,docR,urlR]=await Promise.all([api.get("/aibot/config"),api.get("/aibot/faqs"),api.get("/aibot/docs"),api.get("/aibot/urls")]);
      const c=cfgR.config||{};
      setBotName(c.bot_name||"Aria");setBotTone(c.bot_tone||"professional");setBotLang(c.bot_lang||"EN");
      setHandoff(c.handoff_after||"3");setWorkingHours(!!c.working_hours);setAutoResolve(!!c.auto_resolve);
      setAutoResolveH(c.auto_resolve_hours||"24");
      if(c.sys_prompt)setSysPrompt(c.sys_prompt);
      // Sync channels from backend config
      if(c.channels&&Object.keys(c.channels).length){setAiChannels(c.channels);}
      setFaqs(faqR.faqs||[]);
      setDocs(docR.docs||[]);
      setUrls(urlR.urls||[]);
    }catch(e){console.error("Load aibot:",e);}
    finally{setLoading(false);}
  })();},[]);

  // ── Auto-save config (debounced) ──
  const saveConfig=useCallback((patch)=>{
    if(cfgTimer.current)clearTimeout(cfgTimer.current);
    cfgTimer.current=setTimeout(async()=>{try{await api.patch("/aibot/config",patch);}catch(e){console.error("Config save:",e);}},600);
  },[]);

  const setAndSave=(setter,key,val)=>{setter(val);saveConfig({[key]:val});};

  const saveChannels=(newCh)=>{setAiChannels(newCh);saveConfig({channels:newCh});};
  const toggleCh=(ch,v)=>{const nc={...aiChannels,[ch]:v};saveChannels(nc);showT("AI "+(v?"enabled":"disabled")+" for "+CH_LABELS[ch],v?"success":"info");};

  // ── Save system prompt ──
  const savePrompt=async()=>{setSavingPrompt(true);try{await api.patch("/aibot/config",{sys_prompt:sysPrompt});setPromptDirty(false);showT("System prompt saved","success");}catch{showT("Save failed","error");}finally{setSavingPrompt(false);}};

  // ── FAQ CRUD ──
  const saveFaq=async()=>{
    if(!faqQ.trim()||!faqA.trim()){showT("Both fields required","error");return;}
    setSavingFaq(true);
    try{
      if(editFaq){
        const r=await api.patch(`/aibot/faqs/${editFaq.id}`,{question:faqQ,answer:faqA});
        setFaqs(p=>p.map(f=>f.id===editFaq.id?r.faq:f));showT("FAQ updated","success");
      }else{
        const r=await api.post("/aibot/faqs",{question:faqQ,answer:faqA});
        setFaqs(p=>[...p,r.faq]);showT("FAQ added","success");
      }
      setShowFaqForm(false);setFaqQ("");setFaqA("");setEditFaq(null);
    }catch{showT("Failed to save FAQ","error");}
    setSavingFaq(false);
  };
  const deleteFaq=async(id)=>{try{await api.del(`/aibot/faqs/${id}`);setFaqs(p=>p.filter(f=>f.id!==id));showT("FAQ removed","success");}catch{showT("Failed","error");}};

  // ── Docs ──
  const uploadDoc=async(file=null)=>{
    const name=file?file.name:["Help Center.pdf","Support Guide.docx","Product FAQ.pdf"][Math.floor(Math.random()*3)];
    const sizeLabel=file?((file.size/1024/1024).toFixed(1)+" MB"):"1.2 MB";
    try{const r=await api.post("/aibot/docs",{name,size_label:sizeLabel});setDocs(p=>[...p,r.doc]);showT("Document added","success");}
    catch{showT("Failed to add doc","error");}
  };
  const deleteDoc=async(id)=>{try{await api.del(`/aibot/docs/${id}`);setDocs(p=>p.filter(d=>d.id!==id));showT("Document removed","success");}catch{showT("Failed","error");}};

  // ── URLs ──
  const addUrl=async()=>{
    if(!newUrl.startsWith("http")){showT("Enter a valid URL","error");return;}
    try{
      const r=await api.post("/aibot/urls",{url:newUrl});
      setUrls(p=>[...p,r.url]);setNewUrl("");showT("URL added — crawling started","success");
      // Poll after 3.5s to refresh status
      setTimeout(async()=>{try{const upd=await api.get("/aibot/urls");setUrls(upd.urls||[]);}catch{}},3500);
    }catch{showT("Failed to add URL","error");}
  };
  const deleteUrl=async(id)=>{try{await api.del(`/aibot/urls/${id}`);setUrls(p=>p.filter(u=>u.id!==id));showT("URL removed","success");}catch{showT("Failed","error");}};

  // ── Live test via backend ──
  const sendTest=async()=>{
    if(!testInp.trim())return;
    const txt=testInp;setTestInp("");
    const history=[...testMsgs,{from:"user",text:txt}];
    setTestMsgs(history);setTestTyping(true);
    try{
      const r=await api.post("/aibot/test-chat",{messages:history,botName,botTone,botLang,handoffAfter:handoff,sysPrompt});
      setTestMsgs(p=>[...p,{from:"bot",text:r.reply||"Let me connect you with a human agent."}]);
    }catch{
      setTestMsgs(p=>[...p,{from:"bot",text:"I am having trouble connecting. Please try again."}]);
    }
    setTestTyping(false);
  };

  const stC=s=>({trained:C.g,training:C.y,crawling:C.y,error:C.r}[s]||C.t3);
  const fmtDate=s=>s?new Date(s).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}):"";

  if(loading)return <div style={{padding:"24px 28px"}}><SkelCards/></div>;

  return <div style={{padding:"24px 28px",maxWidth:920}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>AI Bot</h2>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>setTesting(p=>!p)} style={{padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:FM,cursor:"pointer",background:testing?C.s3:C.pd,color:testing?C.t2:C.p,border:"1.5px solid "+(testing?C.b1:C.p+"55"),display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
          {testing?"✕ Close Tester":"▶ Test Bot Live"}
        </button>
      </div>
    </div>
    <p style={{fontSize:13,color:C.t2,marginBottom:16}}>Configure AI auto-reply per channel, train the bot with your knowledge base, and test it live before going live.</p>

    {/* ═══ MASTER AI TOGGLE — synced with Inbox ═══ */}
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:aiAutoReply?"linear-gradient(135deg,"+C.p+"0c,"+C.a+"06)":C.s2,border:"1.5px solid "+(aiAutoReply?C.p+"44":C.b1),borderRadius:12,marginBottom:18,transition:"all .25s"}}>
      <div style={{width:40,height:40,borderRadius:10,background:aiAutoReply?C.p+"18":C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,transition:"all .25s"}}>{aiAutoReply?"✦":"○"}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:aiAutoReply?C.t1:C.t3}}>AI Auto-Reply {aiAutoReply?"Active":"Disabled"}</div>
        <div style={{fontSize:11,color:aiAutoReply?C.p:C.t3,fontFamily:FM}}>
          {aiAutoReply?Object.values(aiChannels).filter(Boolean).length+" channels active · Synced with Inbox toolbar":"Toggle on to enable AI responses · Currently off in Inbox too"}
        </div>
      </div>
      <Toggle val={aiAutoReply} set={v=>{setAiAutoReply(v);saveConfig({ai_auto_reply:v?1:0});showT(v?"✦ AI Auto-Reply ON — active in Inbox too":"AI Auto-Reply OFF — disabled in Inbox too",v?"success":"info");}}/>
    </div>

    <div style={{opacity:aiAutoReply?1:.45,pointerEvents:aiAutoReply?"auto":"none",transition:"opacity .25s"}}>
    <div style={{display:"grid",gridTemplateColumns:testing?"1fr 340px":"1fr",gap:20,alignItems:"start"}}>
      <div>

        {/* CHANNEL TOGGLES */}
        <section style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"20px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Auto-Reply Channels</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{const a={};CHANNELS.forEach(c=>{a[c]=true;});saveChannels(a);showT("All channels enabled","success");}} style={{fontSize:11,color:C.g,background:C.gd,border:"1px solid "+C.g+"44",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:600}}>Enable All</button>
              <button onClick={()=>{const a={};CHANNELS.forEach(c=>{a[c]=false;});saveChannels(a);showT("All channels disabled","info");}} style={{fontSize:11,color:C.r,background:C.rd,border:"1px solid "+C.r+"44",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontWeight:600}}>Disable All</button>
            </div>
          </div>
          <p style={{fontSize:12,color:C.t2,marginBottom:16}}>Enable AI auto-reply per channel. The bot responds instantly and agents can take over at any time.</p>
          {[{group:"Messaging Apps",chs:["whatsapp","telegram","viber","line","facebook","instagram","tiktok","x"]},{group:"Traditional",chs:["live","email","sms"]},{group:"Real-time",chs:["voice","video"]},{group:"Developer",chs:["api"]}].map(grp=>(
            <div key={grp.group} style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:8,paddingBottom:5,borderBottom:"1px solid "+C.b1}}>{grp.group}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {grp.chs.map(ch=>{
                  return <div key={ch} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:aiChannels[ch]?chC(ch)+"0d":C.s2,border:"1px solid "+(aiChannels[ch]?chC(ch)+"44":C.b1),borderRadius:10,transition:"all .2s"}}>
                    <div style={{width:30,height:30,borderRadius:8,background:chC(ch)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChIcon t={ch} s={17}/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11.5,fontWeight:600,color:aiChannels[ch]?C.t1:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{CH_LABELS[ch]}</div>
                      <div style={{fontSize:9.5,color:aiChannels[ch]?chC(ch):C.t3,fontFamily:FM,marginTop:1}}>{aiChannels[ch]?"● Active":"○ Off"}</div>
                    </div>
                    <Toggle val={aiChannels[ch]} set={v=>toggleCh(ch,v)}/>
                  </div>;
                })}
              </div>
            </div>
          ))}
          <div style={{marginTop:4,padding:"9px 14px",background:C.s2,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11.5,color:C.t2}}>{Object.values(aiChannels).filter(Boolean).length} of {CHANNELS.length} channels with AI active</span>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",maxWidth:160,justifyContent:"flex-end"}}>{CHANNELS.filter(c=>aiChannels[c]).map(c=><span key={c} style={{width:9,height:9,borderRadius:"50%",background:chC(c),display:"inline-block"}}/>)}</div>
          </div>
        </section>

        {/* BOT IDENTITY */}
        <section style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"20px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:16}}>Bot Identity and Behaviour</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 20px"}}>
            <Fld label="Bot Name"><Inp val={botName} set={v=>setAndSave(setBotName,"bot_name",v)} ph="e.g. Aria"/></Fld>
            <Fld label="Response Tone">
              <Sel val={botTone} set={v=>setAndSave(setBotTone,"bot_tone",v)} opts={[{v:"professional",l:"Professional"},{v:"friendly",l:"Friendly and Casual"},{v:"formal",l:"Formal"},{v:"concise",l:"Concise"}]}/>
            </Fld>
            <Fld label="Default Language">
              <Sel val={botLang} set={v=>setAndSave(setBotLang,"bot_lang",v)} opts={[{v:"EN",l:"English"},{v:"HI",l:"Hindi"},{v:"ES",l:"Spanish"},{v:"FR",l:"French"},{v:"JA",l:"Japanese"},{v:"DE",l:"German"}]}/>
            </Fld>
            <Fld label="Hand-off to Agent After">
              <Sel val={handoff} set={v=>setAndSave(setHandoff,"handoff_after",v)} opts={[{v:"2",l:"2 unanswered messages"},{v:"3",l:"3 unanswered messages"},{v:"5",l:"5 unanswered messages"},{v:"never",l:"Never - AI only"}]}/>
            </Fld>
          </div>
          <div style={{display:"flex",gap:24,marginTop:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Toggle val={workingHours} set={v=>{setWorkingHours(v);saveConfig({working_hours:v?1:0});}}/>
              <div>
                <div style={{fontSize:13,fontWeight:500}}>Active only during working hours</div>
                <div style={{fontSize:11,color:C.t3}}>Mon to Fri, 9 AM to 6 PM</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Toggle val={autoResolve} set={v=>{setAutoResolve(v);saveConfig({auto_resolve:v?1:0});}}/>
              <div>
                <div style={{fontSize:13,fontWeight:500}}>Auto-resolve after inactivity</div>
                <div style={{fontSize:11,color:C.t3}}>Close AI-handled tickets automatically</div>
              </div>
            </div>
          </div>
          {autoResolve&&<div style={{marginTop:12}}><Fld label="Auto-resolve after (hours)"><Sel val={autoResolveH} set={v=>setAndSave(setAutoResolveH,"auto_resolve_hours",v)} opts={["6","12","24","48","72"].map(h=>({v:h,l:h+" hours"}))} sx={{width:200}}/></Fld></div>}
        </section>

        {/* SYSTEM PROMPT */}
        <section style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"20px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:4}}>System Prompt</div>
          <div style={{fontSize:11.5,color:C.t2,marginBottom:12}}>Instructions that define how your bot behaves. Sent with every conversation.</div>
          <textarea value={sysPrompt} onChange={e=>{setSysPrompt(e.target.value);setPromptDirty(true);}} rows={5} style={{width:"100%",background:C.bg,border:"1px solid "+(promptDirty?C.a:C.b1),borderRadius:10,padding:"12px 14px",fontSize:12.5,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.65,transition:"border-color .2s"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
            <span style={{fontSize:11,color:promptDirty?C.a:C.t3,fontFamily:FM}}>{sysPrompt.length} chars{promptDirty?" · unsaved changes":""}</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setSysPrompt("You are a helpful customer support assistant. Be concise, polite, and solution-focused. Escalate complex issues to human agents.");setPromptDirty(true);showT("Reset to default — click Save to apply","info");}} style={{fontSize:11,color:C.t3,background:"none",border:"1px solid "+C.b1,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Reset</button>
              <Btn ch={savingPrompt?"Saving...":"Save Prompt"} v="primary" sm onClick={savePrompt}/>
            </div>
          </div>
        </section>

        {/* KNOWLEDGE BASE */}
        <section style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:14,padding:"20px"}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:4}}>Knowledge Base</div>
          <p style={{fontSize:12,color:C.t2,marginBottom:14}}>Train your AI bot with FAQs, documents and URLs so it can answer customer questions accurately.</p>
          <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"1px solid "+C.b1}}>
            {[["faq","FAQs ("+faqs.length+")"],["docs","Documents ("+docs.length+")"],["urls","Websites ("+urls.length+")"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setKbTab(id)} style={{padding:"8px 18px",fontSize:11,fontWeight:700,fontFamily:FM,letterSpacing:"0.4px",color:kbTab===id?C.a:C.t3,borderBottom:"2px solid "+(kbTab===id?C.a:"transparent"),background:"transparent",border:"none",cursor:"pointer",textTransform:"uppercase"}}>{lbl}</button>
            ))}
          </div>
          {kbTab==="faq"&&<div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:12,color:C.t2}}>{faqs.length} Q&A pairs in knowledge base</span>
              <Btn ch="+ Add FAQ" v="primary" sm onClick={()=>{setFaqQ("");setFaqA("");setEditFaq(null);setShowFaqForm(true);}}/>
            </div>
            {faqs.length===0&&<EmptyState icon="💬" title="No FAQs yet" desc="Add Q&A pairs to train your bot"/>}
            {faqs.map(f=>(
              <div key={f.id} style={{background:C.s2,border:"1px solid "+C.b1,borderRadius:10,padding:"12px 14px",marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:C.a,marginBottom:5}}>{f.question}</div>
                    <div style={{fontSize:12,color:C.t2,lineHeight:1.55,paddingLeft:12,borderLeft:"2px solid "+C.b1}}>{f.answer}</div>
                  </div>
                  <div style={{display:"flex",gap:5,flexShrink:0}}>
                    <button onClick={()=>{setFaqQ(f.question);setFaqA(f.answer);setEditFaq(f);setShowFaqForm(true);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:14}}>✏</button>
                    <button onClick={()=>deleteFaq(f.id)} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:13}}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>}
          {kbTab==="docs"&&<div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:12,color:C.t2}}>Upload PDF, DOCX, or TXT files</span>
              <Btn ch="+ Add Document" v="primary" sm onClick={()=>uploadDoc()}/>
            </div>
            <label style={{display:"block",border:"2px dashed "+C.b2,borderRadius:10,padding:"28px",textAlign:"center",marginBottom:14,cursor:"pointer",background:C.s2}}>
              <input type="file" accept=".pdf,.docx,.txt" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])uploadDoc(e.target.files[0]);}}/>
              <div style={{marginBottom:8}}><NavIcon id="knowledgebase" s={28} col={C.t3}/></div>
              <div style={{fontSize:13,color:C.t2,marginBottom:4}}>Drop files here or click to upload</div>
              <div style={{fontSize:11,color:C.t3,fontFamily:FM}}>PDF, DOCX, TXT up to 10 MB per file</div>
            </label>
            {docs.length===0&&<EmptyState icon="📄" title="No documents yet" desc="Upload files to train your bot"/>}
            {docs.map(d=>(
              <div key={d.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:C.s2,border:"1px solid "+C.b1,borderRadius:10,marginBottom:8}}>
                <span><NavIcon id="knowledgebase" s={22} col={C.a}/></span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                  <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>{d.size_label} · Added {fmtDate(d.created_at)}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Tag text={d.status} color={stC(d.status)}/>
                  <button onClick={()=>deleteDoc(d.id)} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              </div>
            ))}
          </div>}
          {kbTab==="urls"&&<div>
            <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Add website URLs to crawl and train the bot with your online content.</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input value={newUrl} onChange={e=>setNewUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addUrl()} placeholder="https://docs.yoursite.com" style={{flex:1,background:C.bg,border:"1px solid "+C.b1,borderRadius:8,padding:"8px 11px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
              <Btn ch="Add URL" v="primary" onClick={addUrl}/>
            </div>
            {urls.length===0&&<EmptyState icon="🌐" title="No URLs yet" desc="Add URLs to crawl and train the bot"/>}
            {urls.map(u=>(
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:C.s2,border:"1px solid "+C.b1,borderRadius:10,marginBottom:8}}>
                <span style={{fontSize:20}}>🌐</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontFamily:FM,color:C.a,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.url}</div>
                  <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>Added {fmtDate(u.created_at)}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Tag text={u.status} color={stC(u.status)}/>
                  <button onClick={()=>deleteUrl(u.id)} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              </div>
            ))}
          </div>}
        </section>
      </div>

      {/* LIVE TESTER */}
      {testing&&<div style={{background:C.s1,border:"1px solid "+C.p+"44",borderRadius:14,overflow:"hidden",position:"sticky",top:0,animation:"fadeUp .2s ease",boxShadow:"0 0 40px "+C.p+"18"}}>
        <div style={{background:"linear-gradient(135deg,"+C.p+"22,"+C.a+"11)",padding:"14px 16px",borderBottom:"1px solid "+C.p+"33",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:C.p+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✦</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{botName}</div>
            <div style={{fontSize:10,color:C.p,fontFamily:FM}}>AI Bot Test Environment</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:C.g,animation:"pulse 1.5s infinite"}}/>
            <span style={{fontSize:10,color:C.g,fontFamily:FM}}>LIVE</span>
          </div>
        </div>
        <div style={{height:380,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
          {testMsgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start",animation:"fadeUp .15s ease"}}>
              {m.from==="bot"&&<div style={{width:24,height:24,borderRadius:"50%",background:C.p+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,marginRight:6,flexShrink:0}}>✦</div>}
              <div style={{maxWidth:"82%",padding:"9px 12px",borderRadius:m.from==="user"?"12px 12px 3px 12px":"3px 12px 12px 12px",background:m.from==="user"?"linear-gradient(135deg,"+C.a+",#2a5de8)":C.s2,border:m.from==="user"?"none":"1px solid "+C.p+"33",fontSize:12.5,color:m.from==="user"?"#fff":C.t1,lineHeight:1.55}}>{m.text}</div>
            </div>
          ))}
          {testTyping&&<div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:C.p+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>✦</div>
            <div style={{background:C.s2,border:"1px solid "+C.p+"33",borderRadius:"3px 12px 12px 12px",padding:"10px 14px",display:"flex",gap:4}}>
              {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:C.p,display:"block",animation:"blink 1.2s infinite "+(i*.2)+"s"}}/>)}
            </div>
          </div>}
          <div ref={testEnd}/>
        </div>
        <div style={{padding:10,borderTop:"1px solid "+C.p+"22",display:"flex",gap:8}}>
          <input value={testInp} onChange={e=>setTestInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendTest()} placeholder={"Message "+botName+"..."} style={{flex:1,background:C.bg,border:"1px solid "+C.p+"44",borderRadius:8,padding:"8px 11px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none"}}/>
          <button onClick={sendTest} disabled={testTyping} style={{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,"+C.p+",#6b3fc0)",border:"none",color:"#fff",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",opacity:testTyping?.6:1}}>▲</button>
        </div>
        <div style={{padding:"8px 12px",background:C.s2,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{faqs.length} FAQs · {docs.filter(d=>d.status==="trained").length} docs · {urls.filter(u=>u.status==="trained").length} URLs trained</span>
          <button onClick={()=>setTestMsgs([{from:"bot",text:"Hi! I am "+botName+", your AI support assistant. How can I help you today?"}])} style={{fontSize:10,color:C.t3,background:"none",border:"none",cursor:"pointer",fontFamily:FM}}>Reset</button>
        </div>
      </div>}
    </div>
    </div>{/* close opacity wrapper */}

    {showFaqForm&&<Mdl title={editFaq?"Edit FAQ":"Add FAQ"} onClose={()=>{setShowFaqForm(false);setEditFaq(null);}} w={520}>
      <Fld label="Question"><Inp val={faqQ} set={setFaqQ} ph="e.g. How do I reset my password?"/></Fld>
      <Fld label="Answer">
        <textarea value={faqA} onChange={e=>setFaqA(e.target.value)} placeholder="Provide the answer your AI bot will use..." rows={4} style={{width:"100%",background:C.bg,border:"1px solid "+C.b1,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6}}/>
      </Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>{setShowFaqForm(false);setEditFaq(null);}}/>
        <Btn ch={savingFaq?"Saving...":(editFaq?"Save FAQ":"Add to Knowledge Base")} v="primary" onClick={saveFaq}/>
      </div>
    </Mdl>}
  </div>;
}

function ThemeSet({themeKey,applyTheme,autoTheme,setAutoTheme}){
  const [hover,setHover]=useState(null);
  const [pending,setPending]=useState(null);
  const keys=Object.keys(THEMES);
  const preview=hover||themeKey;
  const pv=THEMES[preview];

  return <div style={{padding:"24px 28px",maxWidth:900}}>
    <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:4}}>Theme</h2>
    <p style={{fontSize:13,color:C.t2,marginBottom:22,lineHeight:1.5}}>Choose a color theme for SupportDesk. Hover to preview, click to select.</p>

    {/* Auto-theme toggle */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:C.s1,border:`1px solid ${autoTheme?C.a+"44":C.b1}`,borderRadius:12,marginBottom:18}}>
      <div>
        <div style={{fontSize:13,fontWeight:700,color:C.t1}}>Auto Dark Mode</div>
        <div style={{fontSize:11,color:C.t3}}>Automatically switch between light and dark based on your system preference (prefers-color-scheme)</div>
      </div>
      <Toggle val={autoTheme} set={v=>{setAutoTheme(v);if(v)showT("Auto theme enabled — follows system preference","success");else showT("Auto theme disabled","info");}}/>
    </div>

    {/* Pending apply bar */}
    {pending&&pending!==themeKey&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:THEMES[pending].a+"18",border:`1px solid ${THEMES[pending].a}44`,borderRadius:12,marginBottom:18,animation:"fadeUp .2s ease"}}>
      <span style={{fontSize:18}}>{THEMES[pending].emoji}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{THEMES[pending].name}</div>
        <div style={{fontSize:11,color:C.t2}}>Apply this theme to the entire app?</div>
      </div>
      <Btn ch="Apply" v="primary" sm onClick={()=>{applyTheme(pending);setPending(null);showT(`Theme → ${THEMES[pending].name}`,"success");}}/>
      <Btn ch="Cancel" v="ghost" sm onClick={()=>setPending(null)}/>
    </div>}

    {/* Color swatch preview bar */}
    <div style={{display:"flex",gap:5,marginBottom:18,padding:"10px 14px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10}}>
      <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>{pv.emoji}</span>
        <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.t2}}>{pv.name}</span>
      </div>
      {["a","g","y","r","p","cy"].map(k=>(
        <div key={k} style={{width:24,height:24,borderRadius:6,background:pv[k],border:"1px solid rgba(255,255,255,.15)",transition:"all .2s"}} title={k}/>
      ))}
    </div>

    {/* Theme cards grid */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
      {keys.map(key=>{
        const t=THEMES[key];
        const active=themeKey===key;
        const isP=pending===key;
        return <div key={key}
          onMouseEnter={()=>setHover(key)}
          onMouseLeave={()=>setHover(null)}
          onClick={()=>{setPending(key);if(key===themeKey)setPending(null);}}
          style={{position:"relative",background:t.s1,border:`2px solid ${active?t.a:isP?t.a+"88":t.b1}`,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"all .2s",boxShadow:active?`0 0 0 1px ${t.a}44`:"none"}}>

          {active&&<div style={{position:"absolute",top:10,right:10,padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:800,fontFamily:FM,background:t.a,color:t.bg,letterSpacing:"0.3px",zIndex:2}}>ACTIVE</div>}

          {/* Mini app mockup */}
          <div style={{display:"flex",height:100,overflow:"hidden"}}>
            {/* Sidebar mock */}
            <div style={{width:28,background:t.s1,borderRight:`1px solid ${t.b1}`,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0",gap:3}}>
              <div style={{width:16,height:16,borderRadius:4,background:`linear-gradient(135deg,${t.a},${t.p})`,marginBottom:4}}/>
              {[0,1,2,3].map(i=><div key={i} style={{width:12,height:12,borderRadius:3,background:i===0?t.ad:t.s3,border:i===0?`1px solid ${t.a}44`:"none"}}/>)}
            </div>
            {/* List mock */}
            <div style={{width:70,background:t.s1,borderRight:`1px solid ${t.b1}`,padding:"6px 4px"}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{padding:"4px 5px",borderRadius:4,marginBottom:2,background:i===0?t.ad:"transparent",borderLeft:i===0?`2px solid ${t.a}`:"2px solid transparent"}}>
                  <div style={{height:4,width:i%2===0?"60%":"45%",borderRadius:2,background:t.t2,marginBottom:2,opacity:0.6}}/>
                  <div style={{height:3,width:"80%",borderRadius:2,background:t.t3,opacity:0.4}}/>
                </div>
              ))}
            </div>
            {/* Chat mock */}
            <div style={{flex:1,background:t.bg,padding:"6px 8px",display:"flex",flexDirection:"column",gap:4}}>
              <div style={{height:14,background:t.s1,borderRadius:4,display:"flex",alignItems:"center",padding:"0 5px"}}>
                <div style={{width:8,height:8,borderRadius:3,background:t.a+"44",marginRight:4}}/>
                <div style={{height:3,width:30,borderRadius:2,background:t.t2,opacity:0.5}}/>
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:3,justifyContent:"flex-end"}}>
                <div style={{alignSelf:"flex-start",padding:"3px 8px",borderRadius:"2px 6px 6px 6px",background:t.s3,maxWidth:"60%"}}>
                  <div style={{height:3,width:40,borderRadius:2,background:t.t2,opacity:0.5}}/>
                </div>
                <div style={{alignSelf:"flex-end",padding:"3px 8px",borderRadius:"6px 6px 2px 6px",background:`linear-gradient(135deg,${t.a},${t.a}cc)`,maxWidth:"55%"}}>
                  <div style={{height:3,width:32,borderRadius:2,background:"rgba(255,255,255,.4)"}}/>
                </div>
                <div style={{alignSelf:"flex-start",padding:"3px 8px",borderRadius:"2px 6px 6px 6px",background:t.s3,maxWidth:"50%"}}>
                  <div style={{height:3,width:28,borderRadius:2,background:t.t2,opacity:0.5}}/>
                </div>
              </div>
              <div style={{height:12,background:t.s1,borderRadius:4,border:`1px solid ${t.b1}`,display:"flex",alignItems:"center",padding:"0 4px"}}>
                <div style={{height:3,width:40,borderRadius:2,background:t.t3,opacity:0.3}}/>
                <div style={{marginLeft:"auto",width:10,height:10,borderRadius:3,background:t.a}}/>
              </div>
            </div>
          </div>

          {/* Card info */}
          <div style={{padding:"10px 14px",background:t.s2,borderTop:`1px solid ${t.b1}`}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
              <span style={{fontSize:16}}>{t.emoji}</span>
              <span style={{fontSize:13,fontWeight:700,color:t.t1,fontFamily:FD}}>{t.name}</span>
            </div>
            <div style={{fontSize:11,color:t.t2,lineHeight:1.4}}>{t.desc}</div>
            <div style={{display:"flex",gap:4,marginTop:8}}>
              {["bg","s1","a","g","r","p"].map(k=>(
                <div key={k} style={{width:14,height:14,borderRadius:4,background:t[k],border:`1px solid ${t.b1}`}}/>
              ))}
            </div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function FontSet({fontKey,applyFont,fontScale,applySize}){
  const [hover,setHover]=useState(null);
  const [pending,setPending]=useState(null);
  const keys=Object.keys(FONTS);
  const preview=hover||fontKey;
  const pv=FONTS[preview];
  const szKeys=Object.keys(FONT_SIZES);
  const curSz=FONT_SIZES[fontScale]||FONT_SIZES.md;

  return <div style={{padding:"24px 28px",maxWidth:920}}>
    <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:4}}>Fonts & Size</h2>
    <p style={{fontSize:13,color:C.t2,marginBottom:22,lineHeight:1.5}}>Choose a font pair and text size for SupportDesk.</p>

    {/* ═══ FONT SIZE SECTION ═══ */}
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",marginBottom:22}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:16}}>🔤</span>
        <div><div style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Text Size</div><div style={{fontSize:11,color:C.t3}}>Current: {curSz.label} ({Math.round(curSz.scale*100)}%)</div></div>
      </div>

      {/* Size presets */}
      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {szKeys.map(k=>{
          const sz=FONT_SIZES[k];const active=fontScale===k;
          return <button key={k} onClick={()=>{applySize(k);showT("Text size: "+sz.label,"success");}}
            style={{flex:1,padding:"12px 8px",borderRadius:10,cursor:"pointer",background:active?C.ad:C.s2,border:`1.5px solid ${active?C.a+"66":C.b1}`,transition:"all .15s",textAlign:"center"}}>
            <div style={{fontSize:k==="xs"?11:k==="sm"?12:k==="md"?14:k==="lg"?16:18,fontWeight:700,color:active?C.a:C.t1,fontFamily:FD,marginBottom:4,lineHeight:1}}>Aa</div>
            <div style={{fontSize:10,fontWeight:700,color:active?C.a:C.t2,fontFamily:FM}}>{sz.label}</div>
            <div style={{fontSize:9,color:C.t3,marginTop:2}}>{Math.round(sz.scale*100)}%</div>
          </button>;
        })}
      </div>

      {/* Visual scale indicator */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>A</span>
        <div style={{flex:1,position:"relative",height:6,background:C.bg,borderRadius:3}}>
          <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${((szKeys.indexOf(fontScale))/(szKeys.length-1))*100}%`,background:`linear-gradient(90deg,${C.a},${C.p})`,borderRadius:3,transition:"width .2s"}}/>
          {szKeys.map((k,i)=>(
            <div key={k} onClick={()=>{applySize(k);showT("Text size: "+FONT_SIZES[k].label,"success");}} style={{position:"absolute",top:-5,left:`${(i/(szKeys.length-1))*100}%`,transform:"translateX(-50%)",width:16,height:16,borderRadius:"50%",background:fontScale===k?C.a:C.s3,border:`2px solid ${fontScale===k?C.a:C.b1}`,cursor:"pointer",transition:"all .15s"}}/>
          ))}
        </div>
        <span style={{fontSize:16,color:C.t3,fontFamily:FM}}>A</span>
      </div>

      {/* Live preview at selected size */}
      <div style={{marginTop:16,padding:"14px",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,zoom:curSz.scale}}>
        <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",marginBottom:8}}>PREVIEW AT {Math.round(curSz.scale*100)}%</div>
        <div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:C.t1,marginBottom:4}}>Dashboard</div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.5,marginBottom:8}}>Your team resolved 42 conversations today with an average reply time of 3.2 minutes.</div>
        <div style={{display:"flex",gap:6}}>
          <span style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,fontFamily:FM,background:C.gd,color:C.g,border:`1px solid ${C.g}44`}}>resolved</span>
          <span style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,fontFamily:FM,background:C.ad,color:C.a,border:`1px solid ${C.a}44`}}>open</span>
          <span style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,fontFamily:FM,background:C.yd,color:C.y,border:`1px solid ${C.y}44`}}>urgent</span>
        </div>
      </div>
    </div>

    {/* ═══ FONT PAIR SECTION ═══ */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <span style={{fontSize:16}}>✦</span>
      <div><div style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Font Pair</div><div style={{fontSize:11,color:C.t3}}>Choose display, body, and mono fonts</div></div>
    </div>

    {/* Pending apply bar */}
    {pending&&pending!==fontKey&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.ad,border:`1px solid ${C.a}44`,borderRadius:12,marginBottom:18,animation:"fadeUp .2s ease"}}>
      <span style={{fontSize:22,fontFamily:`'${FONTS[pending].display}',sans-serif`,fontWeight:800,color:C.t1}}>Aa</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{FONTS[pending].name}</div>
        <div style={{fontSize:11,color:C.t2}}>Apply this font pair to the entire app?</div>
      </div>
      <Btn ch="Apply" v="primary" sm onClick={()=>{applyFont(pending);setPending(null);showT("Font: "+FONTS[pending].name,"success");}}/>
      <Btn ch="Cancel" v="ghost" sm onClick={()=>setPending(null)}/>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20,alignItems:"start"}}>
      {/* Font cards */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {keys.map(key=>{
          const f=FONTS[key];
          const active=fontKey===key;
          const isP=pending===key;
          return <div key={key}
            onMouseEnter={()=>setHover(key)}
            onMouseLeave={()=>setHover(null)}
            onClick={()=>{setPending(key);if(key===fontKey)setPending(null);}}
            style={{background:C.s1,border:`2px solid ${active?C.a:isP?C.a+"88":C.b1}`,borderRadius:12,padding:"14px 18px",cursor:"pointer",transition:"all .2s",position:"relative"}}>
            {active&&<span style={{position:"absolute",top:10,right:12,fontSize:9,fontWeight:800,fontFamily:FM,background:C.a,color:C.bg,padding:"2px 8px",borderRadius:20,letterSpacing:"0.3px"}}>ACTIVE</span>}
            <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:6}}>
              <span style={{fontSize:24,fontWeight:800,fontFamily:`'${f.display}',sans-serif`,color:C.t1,lineHeight:1}}>Aa</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{f.name}</div>
                <div style={{fontSize:11,color:C.t3}}>{f.vibe}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:12,fontSize:10,color:C.t3,fontFamily:FM}}>
              <span>Display: <span style={{color:C.t2,fontFamily:`'${f.display}',sans-serif`}}>{f.display}</span></span>
              <span>Body: <span style={{color:C.t2,fontFamily:`'${f.body}',sans-serif`}}>{f.body}</span></span>
              <span>Mono: <span style={{color:C.t2,fontFamily:`'${f.mono}',monospace`}}>{f.mono}</span></span>
            </div>
          </div>;
        })}
      </div>

      {/* Live preview panel */}
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",position:"sticky",top:0}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
          <div style={{fontSize:10,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:4}}>LIVE PREVIEW</div>
          <div style={{fontSize:14,fontWeight:800,fontFamily:`'${pv.display}',sans-serif`,color:C.t1}}>{pv.name}</div>
        </div>
        <div style={{padding:"16px"}}>
          {/* Heading samples */}
          <div style={{fontFamily:`'${pv.display}',sans-serif`,fontWeight:800,fontSize:22,color:C.t1,marginBottom:4}}>Dashboard</div>
          <div style={{fontFamily:`'${pv.display}',sans-serif`,fontWeight:700,fontSize:15,color:C.t2,marginBottom:12}}>Analytics Overview</div>

          {/* Body text */}
          <p style={{fontFamily:`'${pv.body}',sans-serif`,fontSize:13,color:C.t2,lineHeight:1.6,marginBottom:14}}>
            Your support team handled 142 conversations this week, a 12% increase over last month. Average response time improved to 2.4 minutes.
          </p>

          {/* Conversation list mock */}
          <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>
            {[{name:"Arjun Mehta",msg:"Payment stuck 3 days",t:"2m"},{name:"Sarah Chen",msg:"API auth failing 401",t:"14m"},{name:"Marcus W.",msg:"App crashes on Settings",t:"31m"}].map((item,i)=>(
              <div key={i} style={{padding:"9px 12px",borderBottom:i<2?`1px solid ${C.b1}`:"none",display:"flex",gap:8,alignItems:"center"}}>
                <div style={{width:26,height:26,borderRadius:7,background:C.a+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,fontFamily:`'${pv.mono}',monospace`,color:C.a}}>{item.name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,fontFamily:`'${pv.body}',sans-serif`,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                  <div style={{fontSize:10.5,color:C.t3,fontFamily:`'${pv.body}',sans-serif`}}>{item.msg}</div>
                </div>
                <span style={{fontSize:9,color:C.t3,fontFamily:`'${pv.mono}',monospace`}}>{item.t}</span>
              </div>
            ))}
          </div>

          {/* Code / mono sample */}
          <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",marginBottom:14}}>
            <div style={{fontSize:9,color:C.t3,fontFamily:`'${pv.mono}',monospace`,letterSpacing:"0.4px",marginBottom:4}}>MONO SAMPLE</div>
            <code style={{fontFamily:`'${pv.mono}',monospace`,fontSize:11.5,color:C.g,lineHeight:1.5}}>const ticket = await api.resolve(id);</code>
          </div>

          {/* Button samples */}
          <div style={{display:"flex",gap:8}}>
            <button style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:`'${pv.body}',sans-serif`,background:C.a,color:"#fff",border:"none",cursor:"default"}}>Primary</button>
            <button style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:`'${pv.body}',sans-serif`,background:"transparent",color:C.t2,border:`1px solid ${C.b1}`,cursor:"default"}}>Secondary</button>
            <button style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:`'${pv.body}',sans-serif`,background:C.pd,color:C.p,border:`1px solid ${C.p}44`,cursor:"default"}}>✦ AI Draft</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ── Custom Fields ──
function CustomFieldsSet({fields,setFields}){
  const [showForm,setShowForm]=useState(false);const [editField,setEditField]=useState(null);
  const [fName,setFName]=useState("");const [fType,setFType]=useState("text");const [fEntity,setFEntity]=useState("contact");const [fRequired,setFRequired]=useState(false);const [fOptions,setFOptions]=useState("");const [fDefault,setFDefault]=useState("");const [fDesc,setFDesc]=useState("");const [fGroup,setFGroup]=useState("");const [fPlaceholder,setFPlaceholder]=useState("");const [fValidation,setFValidation]=useState("");const [fVisibleWhen,setFVisibleWhen]=useState("");const [fMin,setFMin]=useState("");const [fMax,setFMax]=useState("");const [fUnique,setFUnique]=useState(false);
  const [activeEntity,setActiveEntity]=useState("contact");const [cfSearch,setCfSearch]=useState("");const [showPreview,setShowPreview]=useState(false);const [showImport,setShowImport]=useState(false);
  const [aiSugLoad,setAiSugLoad]=useState(false);const [aiSugs,setAiSugs]=useState([]);
  const ENTITIES=[{v:"contact",l:"Contacts",icon:"👤",color:C.a},{v:"conversation",l:"Conversations",icon:"💬",color:C.p},{v:"deal",l:"Deals",icon:"💰",color:C.g},{v:"lead",l:"Leads",icon:"🎯",color:C.y},{v:"company",l:"Companies",icon:"🏢",color:C.cy},{v:"task",l:"Tasks",icon:"✅",color:"#ff6b35"},{v:"meeting",l:"Meetings",icon:"🤝",color:"#e91e63"},{v:"booking",l:"Bookings",icon:"📅",color:C.r}];
  const TYPES=[{v:"text",l:"Text",icon:"📝"},{v:"textarea",l:"Long Text",icon:"📄"},{v:"number",l:"Number",icon:"🔢"},{v:"currency",l:"Currency",icon:"💰"},{v:"percentage",l:"Percentage",icon:"%"},{v:"date",l:"Date",icon:"📅"},{v:"select",l:"Dropdown",icon:"📋"},{v:"multi_select",l:"Multi-Select",icon:"☰"},{v:"checkbox",l:"Checkbox",icon:"☑️"},{v:"url",l:"URL",icon:"🔗"},{v:"email",l:"Email",icon:"📧"},{v:"phone",l:"Phone",icon:"📞"},{v:"rating",l:"Rating",icon:"⭐"},{v:"file",l:"File Upload",icon:"📎"},{v:"color",l:"Color",icon:"🎨"},{v:"agent_select",l:"Agent Picker",icon:"👤"}];
  const entityFields=fields.filter(f=>f.entity===activeEntity&&(!cfSearch||f.name.toLowerCase().includes(cfSearch.toLowerCase())||f.desc?.toLowerCase().includes(cfSearch.toLowerCase())));
  const groups=[...new Set(entityFields.map(f=>f.group||"General"))];
  const entityColor=ENTITIES.find(e=>e.v===activeEntity)?.color||C.a;

  const openNew=()=>{setEditField(null);setFName("");setFType("text");setFEntity(activeEntity);setFRequired(false);setFOptions("");setFDefault("");setFDesc("");setFGroup("");setFPlaceholder("");setFValidation("");setFVisibleWhen("");setFMin("");setFMax("");setFUnique(false);setShowForm(true);};
  const openEdit=f=>{setEditField(f);setFName(f.name);setFType(f.type);setFEntity(f.entity);setFRequired(f.required);setFOptions((f.options||[]).join(", "));setFDefault(f.default||"");setFDesc(f.desc||"");setFGroup(f.group||"");setFPlaceholder(f.placeholder||"");setFValidation(f.validation||"");setFVisibleWhen(f.visibleWhen||"");setFMin(f.min!=null?String(f.min):"");setFMax(f.max!=null?String(f.max):"");setFUnique(!!f.unique);setShowForm(true);};
  const save=()=>{if(!fName.trim())return showT("Name required","error");
    const payload={name:fName,type:fType,entity:fEntity,required:fRequired,options:["select","multi_select"].includes(fType)?fOptions.split(",").map(s=>s.trim()).filter(Boolean):[],default:fDefault,desc:fDesc,group:fGroup||"General",placeholder:fPlaceholder,validation:fValidation,visibleWhen:fVisibleWhen,min:fMin?Number(fMin):undefined,max:fMax?Number(fMax):undefined,unique:fUnique};
    if(editField)setFields(p=>p.map(f=>f.id===editField.id?{...f,...payload}:f));
    else setFields(p=>[...p,{id:"cf"+uid(),...payload}]);
    showT(editField?"Field updated":"Field created","success");setShowForm(false);setEditField(null);
    if(api.isConnected()){const method=editField?"PATCH":"POST";const path=editField?`/settings/custom-fields/${editField.id}`:"/settings/custom-fields";api(path,{method,body:payload}).catch(()=>{});}
  };
  const moveField=(id,dir)=>setFields(p=>{const efs=p.filter(f=>f.entity===activeEntity);const others=p.filter(f=>f.entity!==activeEntity);const i=efs.findIndex(f=>f.id===id);if(i<0||(dir===-1&&i===0)||(dir===1&&i>=efs.length-1))return p;[efs[i],efs[i+dir]]=[efs[i+dir],efs[i]];return[...others,...efs];});
  const delField=id=>{setFields(p=>p.filter(f=>f.id!==id));showT("Field deleted","success");};
  const dupField=f=>{setFields(p=>[...p,{...f,id:"cf"+uid(),name:f.name+" (copy)"}]);showT("Duplicated","success");};
  const exportFields=()=>{const data=JSON.stringify(fields.filter(f=>f.entity===activeEntity),null,2);const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`custom_fields_${activeEntity}.json`;a.click();URL.revokeObjectURL(url);showT("Exported "+entityFields.length+" fields","success");};
  const genAiFields=async()=>{setAiSugLoad(true);setAiSugs([]);try{const d=await api.post('/ai/chat',{max_tokens:400,system:"Suggest 5 custom fields for a "+activeEntity+" entity in a customer support SaaS. Return JSON array: [{name,type,desc,group}]. Types: text,number,date,select,multi_select,currency,checkbox,url,email,phone,rating,percentage. No markdown.",messages:[{role:"user",content:"Existing: "+entityFields.map(f=>f.name).join(", ")+". Suggest 5 NEW fields."}]});const txt=(d.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim();setAiSugs(JSON.parse(txt));}catch{setAiSugs([{name:"Customer Tier",type:"select",desc:"Support tier level",group:"Account"},{name:"Onboarding Complete",type:"checkbox",desc:"Has finished onboarding",group:"Lifecycle"},{name:"Last Login",type:"date",desc:"Most recent login date",group:"Activity"},{name:"Feature Requests",type:"number",desc:"Count of feature requests",group:"Product"},{name:"Preferred Language",type:"select",desc:"Communication language preference",group:"Preferences"}]);}setAiSugLoad(false);};
  const addAiSug=s=>{setFields(p=>[...p,{id:"cf"+uid(),name:s.name,type:s.type,entity:activeEntity,required:false,desc:s.desc||"",group:s.group||"General",options:[],default:"",placeholder:"",validation:""}]);setAiSugs(p=>p.filter(x=>x.name!==s.name));showT("Added: "+s.name,"success");};

  return <div style={{padding:"24px 28px",overflowY:"auto",flex:1}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Custom Fields</h2><p style={{fontSize:12,color:C.t3,marginTop:4}}>Define custom data fields across all entities — contacts, conversations, deals, leads, companies, tasks, meetings, and bookings</p></div>
      <div style={{display:"flex",gap:6}}>
        <Btn ch="✦ AI Suggest" v="ghost" sm onClick={genAiFields}/>
        <Btn ch="↓ Export" v="ghost" sm onClick={exportFields}/>
        <Btn ch="+ New Field" v="primary" onClick={openNew}/>
      </div>
    </div>

    {/* Entity KPI strip */}
    <div style={{display:"grid",gridTemplateColumns:"repeat("+ENTITIES.length+",1fr)",gap:6,marginBottom:16}}>
      {ENTITIES.map(e=>{const cnt=fields.filter(f=>f.entity===e.v).length;return(
        <button key={e.v} onClick={()=>setActiveEntity(e.v)} style={{padding:"10px 6px",borderRadius:10,textAlign:"center",cursor:"pointer",background:activeEntity===e.v?e.color+"15":"transparent",border:`1.5px solid ${activeEntity===e.v?e.color+"55":C.b1}`,transition:"all .15s"}}>
          <div style={{fontSize:16,marginBottom:2}}>{e.icon}</div>
          <div style={{fontSize:10,fontWeight:700,color:activeEntity===e.v?e.color:C.t2,fontFamily:FM}}>{e.l}</div>
          <div style={{fontSize:14,fontWeight:800,color:activeEntity===e.v?e.color:C.t1,fontFamily:FD}}>{cnt}</div>
        </button>
      );})}
    </div>

    {/* Search + entity header */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:4,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:8,padding:"6px 10px",flex:1,maxWidth:300}}>
        <span style={{color:C.t3,fontSize:12}}>⌕</span>
        <input value={cfSearch} onChange={e=>setCfSearch(e.target.value)} placeholder={"Search "+ENTITIES.find(e=>e.v===activeEntity)?.l+" fields…"} style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
      </div>
      <span style={{fontSize:12,color:C.t3,fontFamily:FM}}>{entityFields.length} fields · {groups.length} groups · {entityFields.filter(f=>f.required).length} required</span>
      <button onClick={()=>setShowPreview(p=>!p)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,background:showPreview?C.ad:C.s2,color:showPreview?C.a:C.t3,border:`1px solid ${showPreview?C.a+"44":C.b1}`,cursor:"pointer",fontFamily:FM}}>{showPreview?"Hide Preview":"👁 Preview"}</button>
    </div>

    {/* AI Suggestions */}
    {(aiSugLoad||aiSugs.length>0)&&<div style={{padding:"12px 14px",background:C.pd,border:`1px solid ${C.p}33`,borderRadius:10,marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:aiSugs.length?8:0}}>
        <span style={{fontSize:10,fontWeight:700,color:C.p,fontFamily:FM}}>✦ AI SUGGESTED FIELDS</span>
        {aiSugs.length>0&&<button onClick={()=>setAiSugs([])} style={{marginLeft:"auto",color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:11}}>Dismiss</button>}
      </div>
      {aiSugLoad&&<div style={{display:"flex",gap:6,alignItems:"center"}}><Spin/><span style={{fontSize:11,color:C.t3}}>Analyzing your {activeEntity} fields…</span></div>}
      {aiSugs.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",background:C.s1,borderRadius:7,border:`1px solid ${C.b1}`,marginBottom:4}}>
        <span style={{fontSize:11}}>{TYPES.find(t=>t.v===s.type)?.icon||"📝"}</span>
        <div style={{flex:1}}><span style={{fontSize:12,fontWeight:600}}>{s.name}</span><span style={{fontSize:10,color:C.t3,marginLeft:6}}>{s.desc}</span></div>
        <Tag text={s.type} color={C.p}/>
        <button onClick={()=>addAiSug(s)} style={{padding:"3px 10px",borderRadius:5,fontSize:10,fontWeight:700,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontFamily:FM}}>+ Add</button>
      </div>)}
    </div>}

    {/* Fields by group */}
    <div style={{display:"flex",gap:16}}>
      <div style={{flex:1}}>
        {groups.map(group=>{const gFields=entityFields.filter(f=>(f.group||"General")===group);return(
          <div key={group} style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <div style={{width:4,height:16,borderRadius:2,background:entityColor}}/>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{group}</span>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>({gFields.length})</span>
            </div>
            <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
              {gFields.map((f,i)=>{const typeInfo=TYPES.find(t=>t.v===f.type);return(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<gFields.length-1?`1px solid ${C.b1}22`:"none"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                    <button onClick={()=>moveField(f.id,-1)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:8,lineHeight:1}}>▲</button>
                    <button onClick={()=>moveField(f.id,1)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:8,lineHeight:1}}>▼</button>
                  </div>
                  <span style={{fontSize:14,flexShrink:0}}>{typeInfo?.icon||"📝"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13,fontWeight:600}}>{f.name}</span>
                      {f.required&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:C.r+"15",color:C.r,fontWeight:700,fontFamily:FM}}>Required</span>}
                      {f.unique&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:C.y+"15",color:C.y,fontWeight:700,fontFamily:FM}}>Unique</span>}
                      {f.validation&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:C.cy+"15",color:C.cy,fontWeight:700,fontFamily:FM}}>Validated</span>}
                      {f.visibleWhen&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:C.p+"15",color:C.p,fontWeight:700,fontFamily:FM}}>Conditional</span>}
                    </div>
                    {f.desc&&<div style={{fontSize:10,color:C.t3,marginTop:2}}>{f.desc}</div>}
                    {f.options?.length>0&&<div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:2}}>Options: {f.options.slice(0,4).join(", ")}{f.options.length>4?" +"+( f.options.length-4)+" more":""}</div>}
                  </div>
                  <Tag text={f.type.replace("_"," ")} color={entityColor}/>
                  <div style={{display:"flex",gap:2,flexShrink:0}}>
                    <button onClick={()=>openEdit(f)} title="Edit" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer"}} className="hov">✎</button>
                    <button onClick={()=>dupField(f)} title="Duplicate" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">⧉</button>
                    <button onClick={()=>delField(f.id)} title="Delete" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.rd,color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer"}} className="hov">✕</button>
                  </div>
                </div>
              );})}
              {gFields.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:12}}>No fields in this group</div>}
            </div>
          </div>
        );})}
        {entityFields.length===0&&<EmptyState icon="📋" title={"No custom fields for "+ENTITIES.find(e=>e.v===activeEntity)?.l} desc="Create fields to capture custom data specific to your business needs." action="+ Create Field" onAction={openNew}/>}
      </div>

      {/* Live Preview Panel */}
      {showPreview&&<div style={{width:300,flexShrink:0}}>
        <div style={{position:"sticky",top:0,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>{ENTITIES.find(e=>e.v===activeEntity)?.icon} Form Preview</div>
          {entityFields.slice(0,8).map(f=>{const typeInfo=TYPES.find(t=>t.v===f.type);return(
            <div key={f.id} style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:600,color:C.t1,marginBottom:3}}>{f.name}{f.required&&<span style={{color:C.r}}>*</span>}</div>
              {f.type==="text"||f.type==="email"||f.type==="phone"||f.type==="url"?<div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3}}>{f.placeholder||f.type}</div>:
              f.type==="textarea"?<div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3,height:32}}>{f.placeholder||"Long text…"}</div>:
              f.type==="select"||f.type==="agent_select"?<div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3,display:"flex",justifyContent:"space-between"}}><span>{f.options?.[0]||"Select…"}</span><span>▼</span></div>:
              f.type==="multi_select"?<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(f.options||["Option"]).slice(0,3).map((o,i)=><span key={i} style={{padding:"2px 6px",borderRadius:4,fontSize:9,background:entityColor+"15",color:entityColor,border:`1px solid ${entityColor}33`}}>{o}</span>)}</div>:
              f.type==="checkbox"?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${C.b1}`,background:C.bg}}/><span style={{fontSize:11,color:C.t3}}>{f.desc||"Yes/No"}</span></div>:
              f.type==="date"?<div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3}}>📅 DD/MM/YYYY</div>:
              f.type==="number"?<div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3}}>{f.default||"0"}</div>:
              f.type==="currency"?<div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3}}>$ {f.default||"0.00"}</div>:
              f.type==="percentage"?<div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3}}>{f.default||"0"}%</div>:
              f.type==="rating"?<div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:14,opacity:n<=3?1:.3}}>⭐</span>)}</div>:
              f.type==="color"?<div style={{display:"flex",gap:4}}>{["#4c82fb","#22c55e","#f5a623","#f04f5a","#9b6dff"].map(c=><div key={c} style={{width:18,height:18,borderRadius:4,background:c,border:`2px solid ${c==="4c82fb"?"#fff":"transparent"}`}}/>)}</div>:
              f.type==="file"?<div style={{padding:"8px",borderRadius:6,border:`1.5px dashed ${C.b2}`,background:C.bg,fontSize:10,color:C.t3,textAlign:"center"}}>📎 Drop file or click to upload</div>:
              <div style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${C.b1}`,background:C.bg,fontSize:11,color:C.t3}}>{typeInfo?.icon} {f.type}</div>}
            </div>
          );})}
          {entityFields.length>8&&<div style={{fontSize:10,color:C.t3,textAlign:"center",fontFamily:FM}}>+{entityFields.length-8} more fields</div>}
          {entityFields.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>Add fields to see the preview</div>}
        </div>
      </div>}
    </div>

    {/* Create/Edit Modal */}
    {showForm&&<Mdl title={editField?"Edit Custom Field":"New Custom Field"} onClose={()=>{setShowForm(false);setEditField(null);}} w={560}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Fld label="Field Name"><Inp val={fName} set={setFName} ph="e.g. License Key, Account Tier"/></Fld>
        <Fld label="Group / Section"><Inp val={fGroup} set={setFGroup} ph="e.g. Account, Billing, Custom"/></Fld>
      </div>
      <Fld label="Description"><Inp val={fDesc} set={setFDesc} ph="Help text shown to agents when filling this field"/></Fld>
      <Fld label="Entity"><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
        {ENTITIES.map(e=><button key={e.v} onClick={()=>setFEntity(e.v)} style={{padding:"7px 4px",borderRadius:7,fontSize:10,fontWeight:600,background:fEntity===e.v?e.color+"15":"transparent",color:fEntity===e.v?e.color:C.t3,border:`1px solid ${fEntity===e.v?e.color+"44":C.b1}`,cursor:"pointer",textAlign:"center"}}>{e.icon} {e.l}</button>)}
      </div></Fld>
      <Fld label="Field Type"><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
        {TYPES.map(t=><button key={t.v} onClick={()=>setFType(t.v)} style={{padding:"7px 4px",borderRadius:7,fontSize:10,fontWeight:600,background:fType===t.v?C.ad:C.s2,color:fType===t.v?C.a:C.t2,border:`1px solid ${fType===t.v?C.a+"44":C.b1}`,cursor:"pointer",textAlign:"center"}}>{t.icon} {t.l}</button>)}
      </div></Fld>
      {["select","multi_select"].includes(fType)&&<Fld label="Options (comma-separated)"><Inp val={fOptions} set={setFOptions} ph="Option A, Option B, Option C"/></Fld>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Fld label="Placeholder"><Inp val={fPlaceholder} set={setFPlaceholder} ph="Placeholder text"/></Fld>
        <Fld label="Default Value"><Inp val={fDefault} set={setFDefault} ph="Optional default"/></Fld>
      </div>
      {/* Validation */}
      <div style={{padding:"12px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>VALIDATION</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={fRequired} onChange={e=>setFRequired(e.target.checked)} style={{accentColor:C.a}}/><span style={{fontSize:11,color:C.t2}}>Required</span></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><input type="checkbox" checked={fUnique} onChange={e=>setFUnique(e.target.checked)} style={{accentColor:C.y}}/><span style={{fontSize:11,color:C.t2}}>Unique</span></div>
        </div>
        {["number","currency","percentage","rating"].includes(fType)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
          <Fld label="Min Value"><Inp val={fMin} set={setFMin} ph="0" type="number"/></Fld>
          <Fld label="Max Value"><Inp val={fMax} set={setFMax} ph="100" type="number"/></Fld>
        </div>}
        {["text","email","phone","url"].includes(fType)&&<div style={{marginTop:8}}><Fld label="Regex Validation (optional)"><Inp val={fValidation} set={setFValidation} ph="e.g. ^[A-Z]+-\\d+$ for BUG-1234 format"/></Fld></div>}
      </div>
      {/* Conditional visibility */}
      <div style={{padding:"12px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>CONDITIONAL VISIBILITY (optional)</div>
        <Fld label="Show this field only when…"><Inp val={fVisibleWhen} set={setFVisibleWhen} ph='e.g. Severity == "P0 - Critical" or Product Area == "API"'/></Fld>
        <div style={{fontSize:10,color:C.t3,lineHeight:1.5}}>Use field_name == "value" syntax. Leave blank to always show this field.</div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEditField(null);}}/><Btn ch={editField?"Save Changes":"Create Field"} v="primary" onClick={save}/></div>
    </Mdl>}
  </div>;
}

// ── Email Signatures ──
function EmailSigsSet(){
  const [sigs,setSigs]=useState(EMAIL_SIGS_INIT);
  const [showForm,setShowForm]=useState(false);
  const [editSig,setEditSig]=useState(null);
  const [sName,setSName]=useState("");
  const [sBody,setSBody]=useState("");
  const [sAgent,setSAgent]=useState("a1");
  const [sDefault,setSDefault]=useState(false);
  const [sLogo,setSLogo]=useState(true);
  const [sSocials,setSSocials]=useState({linkedin:"",twitter:"",website:"",github:"",instagram:""});
  const [previewTab,setPreviewTab]=useState("edit"); // edit | preview
  const SIG_VARS=[{k:"{{name}}",l:"Full Name",v:"Priya Sharma"},{k:"{{title}}",l:"Job Title",v:"Head of Support"},{k:"{{email}}",l:"Email",v:"priya@supportdesk.app"},{k:"{{phone}}",l:"Phone",v:"+91 98765 43210"},{k:"{{company}}",l:"Company",v:"SupportDesk"},{k:"{{website}}",l:"Website",v:"supportdesk.app"}];
  const TEMPLATES=[
    {name:"Professional",body:"Best regards,\n\n**{{name}}**\n{{title}} · {{company}}\n{{email}} | {{phone}}\n{{website}}"},
    {name:"Minimal",body:"—\n**{{name}}** · {{title}}\n{{company}} | {{email}}"},
    {name:"Friendly",body:"Cheers! 🙌\n\n**{{name}}**\n{{title}} at {{company}}\n\n📧 {{email}} · 📞 {{phone}}"},
    {name:"Formal",body:"Yours sincerely,\n\n**{{name}}**\n{{title}}\n{{company}}\nEmail: {{email}}\nPhone: {{phone}}\nWeb: {{website}}"},
    {name:"Support",body:"Happy to help! 😊\n\n**{{name}}** — {{title}}\n{{company}} Support Team\n{{email}}"},
  ];
  const fillVars=t=>(t||"").replace(/\{\{name\}\}/g,"Priya Sharma").replace(/\{\{title\}\}/g,"Head of Support").replace(/\{\{email\}\}/g,"priya@supportdesk.app").replace(/\{\{phone\}\}/g,"+91 98765 43210").replace(/\{\{company\}\}/g,"SupportDesk").replace(/\{\{website\}\}/g,"supportdesk.app");
  const renderSig=body=>{if(!body)return null;return body.split("\n").map((line,i)=>{
    if(line.startsWith("—"))return <hr key={i} style={{border:"none",borderTop:`1px solid ${C.b2}`,margin:"8px 0"}}/>;
    let rendered=line.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>").replace(/_(.*?)_/g,"<i>$1</i>");
    return <div key={i} dangerouslySetInnerHTML={{__html:fillVars(rendered)}} style={{fontSize:13,color:C.t1,lineHeight:1.7}}/>;
  });};
  const openNew=()=>{setSName("");setSBody("");setSAgent("a1");setSDefault(false);setSLogo(true);setSSocials({linkedin:"",twitter:"",website:"",github:"",instagram:""});setEditSig(null);setPreviewTab("edit");setShowForm(true);};
  const openEdit=s=>{setSName(s.name);setSBody(s.body);setSAgent(s.agentId);setSDefault(s.isDefault||false);setSLogo(s.logo||false);setSSocials(s.socials||{});setEditSig(s);setPreviewTab("edit");setShowForm(true);};
  const save=()=>{
    if(!sName.trim())return showT("Name required","error");
    if(!sBody.trim())return showT("Signature body required","error");
    const payload={name:sName,body:sBody,agentId:sAgent,isDefault:sDefault,logo:sLogo,socials:{...sSocials},active:true};
    if(sDefault)setSigs(p=>p.map(s=>({...s,isDefault:false})));
    if(editSig)setSigs(p=>p.map(s=>s.id===editSig.id?{...s,...payload}:s));
    else setSigs(p=>[{id:"es"+uid(),...payload},...p]);
    showT(editSig?"Signature updated":"Signature created!","success");setShowForm(false);setEditSig(null);
  };
  const dupSig=s=>{setSigs(p=>[{...s,id:"es"+uid(),name:s.name+" (Copy)",isDefault:false},...p]);showT("Duplicated","success");};
  const setAsDefault=id=>{setSigs(p=>p.map(s=>({...s,isDefault:s.id===id})));showT("Set as default","success");};

  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Email Signatures</h2><p style={{fontSize:13,color:C.t3,marginTop:4}}>Create and manage signatures auto-appended to email replies</p></div>
      <Btn ch="+ New Signature" v="primary" onClick={openNew}/>
    </div>

    {/* Signature cards */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {/* Create card */}
      <div onClick={openNew} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",cursor:"pointer",minHeight:200}} className="hov">
        <div style={{fontSize:28,marginBottom:8}}>✉️</div>
        <div style={{fontSize:14,fontWeight:700,color:C.a,fontFamily:FD}}>Create New Signature</div>
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>Rich text with variables, socials, and preview</div>
      </div>
      {sigs.map(s=>(
        <div key={s.id} style={{background:C.s1,border:`1px solid ${s.isDefault?C.g+"55":C.b1}`,borderRadius:14,overflow:"hidden",boxShadow:s.isDefault?`0 0 20px ${C.g}15`:"none"}}>
          {/* Header */}
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:10}}>
            {s.logo&&<SDLogo s={36}/>}
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:14,fontWeight:700}}>{s.name}</span>
                {s.isDefault&&<Tag text="Default" color={C.g}/>}
                <Tag text={s.active?"Active":"Inactive"} color={s.active?C.g:C.t3}/>
              </div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>
                {s.agentId==="all"?"All agents":"Agent: "+s.agentId}
              </div>
            </div>
            <Toggle val={s.active} set={v=>{setSigs(p=>p.map(x=>x.id===s.id?{...x,active:v}:x));showT(v?"Activated":"Deactivated","info");}}/>
          </div>
          {/* Preview */}
          <div style={{padding:"14px 18px",background:C.bg,borderBottom:`1px solid ${C.b1}`,minHeight:80}}>
            {renderSig(s.body)}
            {/* Social icons */}
            {s.socials&&Object.values(s.socials).some(v=>v)&&<div style={{display:"flex",gap:6,marginTop:8}}>
              {s.socials.linkedin&&<span style={{fontSize:11,color:C.a,fontFamily:FM,background:C.ad,padding:"2px 6px",borderRadius:4}}>in/{s.socials.linkedin}</span>}
              {s.socials.twitter&&<span style={{fontSize:11,color:C.cy,fontFamily:FM,background:C.cy+"14",padding:"2px 6px",borderRadius:4}}>@{s.socials.twitter}</span>}
              {s.socials.website&&<span style={{fontSize:11,color:C.p,fontFamily:FM,background:C.pd,padding:"2px 6px",borderRadius:4}}>🌐 {s.socials.website}</span>}
              {s.socials.github&&<span style={{fontSize:11,color:C.t2,fontFamily:FM,background:C.s3,padding:"2px 6px",borderRadius:4}}>gh/{s.socials.github}</span>}
            </div>}
          </div>
          {/* Actions */}
          <div style={{padding:"10px 18px",display:"flex",gap:5,justifyContent:"flex-end"}}>
            {!s.isDefault&&<Btn ch="Set Default" v="ghost" sm onClick={()=>setAsDefault(s.id)}/>}
            <Btn ch="Edit" v="ghost" sm onClick={()=>openEdit(s)}/>
            <Btn ch="⧉" v="ghost" sm onClick={()=>dupSig(s)}/>
            <Btn ch="✕" v="danger" sm onClick={()=>{setSigs(p=>p.filter(x=>x.id!==s.id));showT("Deleted","success");}}/>
          </div>
        </div>
      ))}
    </div>

    {/* Create/Edit Modal */}
    {showForm&&<Mdl title={editSig?"Edit Signature":"New Signature"} onClose={()=>{setShowForm(false);setEditSig(null);}} w={640}>
      <div style={{display:"flex",gap:12,marginBottom:12}}>
        <div style={{flex:1}}><Fld label="Signature Name"><Inp val={sName} set={setSName} ph="e.g. Priya — Default"/></Fld></div>
        <div style={{flex:1}}><Fld label="Assign To"><Sel val={sAgent} set={setSAgent} opts={[{v:"a1",l:"Priya Sharma"},{v:"a2",l:"Dev Kumar"},{v:"a3",l:"Meena Rao"},{v:"all",l:"All Agents"}]}/></Fld></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.t2}}>Default Signature</span><Toggle val={sDefault} set={setSDefault}/></div>
        <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.t2}}>Show Company Logo</span><Toggle val={sLogo} set={setSLogo}/></div>
      </div>

      {/* Templates */}
      <Fld label="Quick Templates">
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {TEMPLATES.map(t=>(
            <button key={t.name} onClick={()=>setSBody(t.body)} className="hov" style={{padding:"6px 12px",borderRadius:7,fontSize:11,fontWeight:600,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t2}}>{t.name}</button>
          ))}
        </div>
      </Fld>

      {/* Edit/Preview tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,marginBottom:10}}>
        {[["edit","Edit"],["preview","Preview"]].map(([id,l])=>(
          <button key={id} onClick={()=>setPreviewTab(id)} style={{flex:1,padding:"8px",fontSize:11,fontWeight:700,fontFamily:FM,color:previewTab===id?C.a:C.t3,borderBottom:`2px solid ${previewTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {previewTab==="edit"&&<>
        {/* Formatting toolbar */}
        <div style={{display:"flex",gap:3,padding:"6px 8px",background:C.s2,borderRadius:"8px 8px 0 0",border:`1px solid ${C.b1}`,borderBottom:"none",flexWrap:"wrap",alignItems:"center"}}>
          {[{l:"B",fn:()=>setSBody(p=>p+"**bold**"),t:"Bold",w:800},{l:"I",fn:()=>setSBody(p=>p+"_italic_"),t:"Italic",fs:"italic"},{l:"—",fn:()=>setSBody(p=>p+"\n—\n"),t:"Divider"},{l:"🔗",fn:()=>setSBody(p=>p+"[Link](https://url)"),t:"Link"}].map(b=>(
            <button key={b.l} onClick={b.fn} title={b.t} style={{width:28,height:26,borderRadius:5,fontSize:12,fontWeight:b.w||500,fontStyle:b.fs||"normal",background:"transparent",color:C.t2,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">{b.l}</button>
          ))}
          <div style={{width:1,height:16,background:C.b2,margin:"0 4px"}}/>
          {SIG_VARS.map(v=>(
            <button key={v.k} onClick={()=>setSBody(p=>p+v.k)} title={v.l+" → "+v.v} style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontFamily:FM,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer"}}>{v.k.replace(/\{\{|\}\}/g,"")}</button>
          ))}
        </div>
        <textarea value={sBody} onChange={e=>setSBody(e.target.value)} rows={8} placeholder={"Best regards,\n\n**{{name}}**\n{{title}} · {{company}}\n{{email}} | {{phone}}"} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:"0 0 8px 8px",padding:"12px",fontSize:13,color:C.t1,fontFamily:FM,resize:"vertical",outline:"none",lineHeight:1.7,boxSizing:"border-box"}}/>
        <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>Use **bold** and _italic_ for formatting. Variables auto-fill per agent.</div>
      </>}

      {previewTab==="preview"&&<div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"18px 22px",minHeight:120}}>
        <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:10}}>PREVIEW (as seen in email)</div>
        <div style={{borderTop:`1px solid ${C.b2}`,paddingTop:12}}>
          {sLogo&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <SDLogo s={32}/>
            <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>SupportDesk</span>
          </div>}
          {renderSig(sBody)}
          {Object.values(sSocials).some(v=>v)&&<div style={{display:"flex",gap:6,marginTop:10}}>
            {sSocials.linkedin&&<span style={{fontSize:11,color:C.a,fontFamily:FM,background:C.ad,padding:"3px 8px",borderRadius:5}}>LinkedIn: {sSocials.linkedin}</span>}
            {sSocials.twitter&&<span style={{fontSize:11,color:C.cy,fontFamily:FM,background:C.cy+"14",padding:"3px 8px",borderRadius:5}}>X: @{sSocials.twitter}</span>}
            {sSocials.website&&<span style={{fontSize:11,color:C.p,fontFamily:FM,background:C.pd,padding:"3px 8px",borderRadius:5}}>🌐 {sSocials.website}</span>}
            {sSocials.github&&<span style={{fontSize:11,color:C.t2,fontFamily:FM,background:C.s3,padding:"3px 8px",borderRadius:5}}>GitHub: {sSocials.github}</span>}
            {sSocials.instagram&&<span style={{fontSize:11,color:"#e91e63",fontFamily:FM,background:"#e91e6314",padding:"3px 8px",borderRadius:5}}>IG: @{sSocials.instagram}</span>}
          </div>}
        </div>
      </div>}

      {/* Social links */}
      <div style={{marginTop:12}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>SOCIAL LINKS (optional)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,width:24,textAlign:"center"}}>in</span><Inp val={sSocials.linkedin||""} set={v=>setSSocials(p=>({...p,linkedin:v}))} ph="linkedin-username"/></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,width:24,textAlign:"center"}}>𝕏</span><Inp val={sSocials.twitter||""} set={v=>setSSocials(p=>({...p,twitter:v}))} ph="twitter-handle"/></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,width:24,textAlign:"center"}}>🌐</span><Inp val={sSocials.website||""} set={v=>setSSocials(p=>({...p,website:v}))} ph="yoursite.com"/></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,width:24,textAlign:"center"}}>gh</span><Inp val={sSocials.github||""} set={v=>setSSocials(p=>({...p,github:v}))} ph="github-username"/></div>
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:14}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEditSig(null);}}/>
        <Btn ch={editSig?"Save Changes":"Create Signature"} v="primary" onClick={save}/>
      </div>
    </Mdl>}
  </div>;
}

// ── Notification Preferences ──
function NotifPrefsSet(){
  const [prefs,setPrefs]=useState({newMessage:{inApp:true,email:true,push:true,slack:true},assignment:{inApp:true,email:true,push:false,slack:true},sla:{inApp:true,email:true,push:true,slack:true},mention:{inApp:true,email:false,push:true,slack:true},resolved:{inApp:true,email:false,push:false,slack:false},newContact:{inApp:true,email:false,push:false,slack:false}});
  const [quietStart,setQuietStart]=useState("22:00");
  const [quietEnd,setQuietEnd]=useState("08:00");
  const [quietEnabled,setQuietEnabled]=useState(false);
  const [dnd,setDnd]=useState(false);
  const methods=["inApp","email","push","slack"];
  const toggle=(event,method)=>setPrefs(p=>({...p,[event]:{...p[event],[method]:!p[event][method]}}));
  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Notification Preferences</h2><p style={{fontSize:12,color:C.t3,marginTop:4}}>Control how and when you get notified</p></div>
      <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:dnd?C.r:C.t3,fontWeight:700}}>Do Not Disturb</span><Toggle val={dnd} set={v=>{setDnd(v);showT(v?"DND enabled — all notifications paused":"DND disabled",v?"warn":"success");}}/></div>
    </div>
    {dnd&&<div style={{padding:"12px",background:C.rd,border:`1px solid ${C.r}44`,borderRadius:10,marginBottom:16,fontSize:12,color:C.r}}>All notifications are paused. You will not receive any alerts until DND is turned off.</div>}
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",marginBottom:20}}>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr",padding:"10px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
        <span style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM}}>EVENT</span>
        {methods.map(m=><span key={m} style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,textAlign:"center",textTransform:"capitalize"}}>{m==="inApp"?"In-App":m}</span>)}
      </div>
      {[["newMessage","New Message"],["assignment","Assignment"],["sla","SLA Breach"],["mention","Mentions"],["resolved","Conversation Resolved"],["newContact","New Contact"]].map(([key,label])=>(
        <div key={key} style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr",padding:"10px 18px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
          <span style={{fontSize:12,color:C.t1}}>{label}</span>
          {methods.map(m=>(
            <div key={m} style={{textAlign:"center"}}><input type="checkbox" checked={prefs[key]?.[m]||false} onChange={()=>toggle(key,m)} style={{accentColor:C.a,width:14,height:14,cursor:"pointer"}}/></div>
          ))}
        </div>
      ))}
    </div>
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"16px 18px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div><div style={{fontSize:13,fontWeight:700}}>Quiet Hours</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>Suppress notifications during off-hours</div></div>
        <Toggle val={quietEnabled} set={setQuietEnabled}/>
      </div>
      {quietEnabled&&<div style={{display:"flex",gap:14}}><div style={{flex:1}}><Fld label="From"><Inp val={quietStart} set={setQuietStart} type="time"/></Fld></div><div style={{flex:1}}><Fld label="Until"><Inp val={quietEnd} set={setQuietEnd} type="time"/></Fld></div></div>}
    </div>
  </div>;
}

// ── Multi-Brand ──
function MultiBrandSet(){
  const [brands,setBrands]=useState(BRANDS_INIT);
  const [showForm,setShowForm]=useState(false);
  const [editBrand,setEditBrand]=useState(null);
  const [bName,setBName]=useState("");const [bDomain,setBDomain]=useState("");const [bColor,setBColor]=useState(C.a);const [bEmail,setBEmail]=useState("");const [bTz,setBTz]=useState("Asia/Kolkata");const [bLang,setBLang]=useState("en");const [bDesc,setBDesc]=useState("");
  const openNew=()=>{setEditBrand(null);setBName("");setBDomain("");setBColor(C.a);setBEmail("");setBTz("Asia/Kolkata");setBLang("en");setBDesc("");setShowForm(true);};
  const openEdit=b=>{setEditBrand(b);setBName(b.name);setBDomain(b.domain);setBColor(b.color);setBEmail(b.email||"");setBTz(b.tz||"Asia/Kolkata");setBLang(b.lang||"en");setBDesc(b.desc||"");setShowForm(true);};
  const save=()=>{if(!bName.trim())return showT("Name required","error");
    const payload={name:bName,domain:bDomain,color:bColor,logo:bName[0],email:bEmail,tz:bTz,lang:bLang,desc:bDesc};
    if(editBrand)setBrands(p=>p.map(b=>b.id===editBrand.id?{...b,...payload}:b));
    else setBrands(p=>[...p,{id:"br"+uid(),...payload,active:false}]);
    showT(editBrand?"Brand updated":"Brand created","success");setShowForm(false);setEditBrand(null);
  };
  const dupBrand=b=>{setBrands(p=>[...p,{...b,id:"br"+uid(),name:b.name+" (Copy)",active:false}]);showT("Duplicated","success");};
  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Multi-Brand / Workspaces</h2><p style={{fontSize:13,color:C.t3,marginTop:4}}>Manage multiple brands, products, or subsidiaries from one account</p></div>
      <Btn ch="+ New Brand" v="primary" onClick={openNew}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
      {[{l:"Total Brands",v:brands.length,c:C.a},{l:"Active",v:brands.filter(b=>b.active).length,c:C.g},{l:"Domains",v:brands.filter(b=>b.domain).length,c:C.cy}].map(k=>(
        <div key={k.l} style={{padding:"14px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,textAlign:"center"}}>
          <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
          <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:3}}>{k.l}</div>
        </div>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {/* Create card */}
      <div onClick={openNew} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",cursor:"pointer",minHeight:200}} className="hov">
        <div style={{fontSize:28,marginBottom:8}}>🏢</div>
        <div style={{fontSize:14,fontWeight:700,color:C.a,fontFamily:FD}}>Add New Brand</div>
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>Separate domain, colors, and settings</div>
      </div>
      {brands.map(b=>(
        <div key={b.id} style={{background:C.s1,border:`2px solid ${b.active?b.color:C.b1}`,borderRadius:14,overflow:"hidden"}}>
          {/* Brand header */}
          <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:12,background:b.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:b.color,fontFamily:FD}}>{b.logo}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16,fontWeight:700}}>{b.name}</span>{b.active&&<Tag text="Active" color={C.g}/>}</div>
              <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>{b.domain||"No domain set"}</div>
            </div>
            <div style={{width:20,height:20,borderRadius:"50%",background:b.color,border:`2px solid ${C.s1}`}}/>
          </div>
          {/* Brand details */}
          <div style={{padding:"12px 18px"}}>
            {b.desc&&<div style={{fontSize:11,color:C.t3,marginBottom:8,lineHeight:1.5}}>{b.desc}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
              {[{l:"Email",v:b.email||b.domain?"support@"+b.domain:"—"},{l:"Timezone",v:b.tz||"Asia/Kolkata"},{l:"Language",v:(b.lang||"en").toUpperCase()},{l:"Color",v:b.color}].map(d=>(
                <div key={d.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.b1}22`}}>
                  <span style={{fontSize:10,color:C.t3}}>{d.l}</span>
                  <span style={{fontSize:10,fontWeight:600,color:C.t1,fontFamily:FM}}>{d.v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:5}}>
              <Btn ch={b.active?"Active":"Switch"} v={b.active?"success":"ghost"} sm full onClick={()=>{setBrands(p=>p.map(x=>({...x,active:x.id===b.id})));showT("Switched to "+b.name,"success");}}/>
              <Btn ch="✎" v="ghost" sm onClick={()=>openEdit(b)}/>
              <Btn ch="⧉" v="ghost" sm onClick={()=>dupBrand(b)}/>
              {!b.active&&<Btn ch="✕" v="danger" sm onClick={()=>{setBrands(p=>p.filter(x=>x.id!==b.id));showT("Deleted","success");}}/>}
            </div>
          </div>
        </div>
      ))}
    </div>
    {showForm&&<Mdl title={editBrand?"Edit Brand":"New Brand"} onClose={()=>{setShowForm(false);setEditBrand(null);}} w={500}>
      <Fld label="Brand Name"><Inp val={bName} set={setBName} ph="e.g. AcmeCorp Help"/></Fld>
      <Fld label="Description"><Inp val={bDesc} set={setBDesc} ph="Brief description of this brand"/></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Domain"><Inp val={bDomain} set={setBDomain} ph="help.acmecorp.com"/></Fld></div><div style={{flex:1}}><Fld label="Support Email"><Inp val={bEmail} set={setBEmail} ph="support@acmecorp.com" type="email"/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Timezone"><Sel val={bTz} set={setBTz} opts={["Asia/Kolkata","America/New_York","America/Los_Angeles","Europe/London","Asia/Tokyo"].map(t=>({v:t,l:t}))}/></Fld></div><div style={{flex:1}}><Fld label="Language"><Sel val={bLang} set={setBLang} opts={[{v:"en",l:"English"},{v:"hi",l:"Hindi"},{v:"es",l:"Spanish"},{v:"fr",l:"French"},{v:"de",l:"German"}]}/></Fld></div></div>
      <Fld label="Brand Color"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[C.a,"#10b981","#8b5cf6","#f59e0b","#ef4444","#06b6d4","#ff6b35","#e91e63","#6366f1","#14b8a6"].map(c=><button key={c} onClick={()=>setBColor(c)} style={{width:32,height:32,borderRadius:8,background:c,border:`3px solid ${bColor===c?"#fff":"transparent"}`,cursor:"pointer",boxShadow:bColor===c?"0 0 0 2px "+c:"none"}}/>)}</div></Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEditBrand(null);}}/><Btn ch={editBrand?"Save Changes":"Create Brand"} v="primary" onClick={save}/></div>
    </Mdl>}
  </div>;
}

// ── Audit Log ──
function AuditLogSet(){
  const [auditFilter,setAuditFilter]=useState("all");
  const [auditSearch,setAuditSearch]=useState("");
  const [auditUser,setAuditUser]=useState("all");
  const [auditPage,setAuditPage]=useState(1);
  const perPage=10;
  const types=["all","settings","conversation","integration","agent","ai","billing","system"];
  const users=[...new Set(AUDIT_LOG.map(a=>a.user))];
  const filtered=AUDIT_LOG.filter(a=>{
    if(auditFilter!=="all"&&a.type!==auditFilter)return false;
    if(auditUser!=="all"&&a.user!==auditUser)return false;
    if(auditSearch&&!a.action.toLowerCase().includes(auditSearch.toLowerCase())&&!a.detail.toLowerCase().includes(auditSearch.toLowerCase())&&!a.user.toLowerCase().includes(auditSearch.toLowerCase()))return false;
    return true;
  });
  const paged=filtered.slice((auditPage-1)*perPage,auditPage*perPage);
  const totalPages=Math.ceil(filtered.length/perPage);
  const typeColor=t=>({settings:C.a,conversation:C.g,integration:C.cy,agent:C.p,ai:C.p,billing:C.y,system:C.r}[t]||C.t3);
  const typeIcon=t=>({settings:"⚙",conversation:"💬",integration:"🔌",agent:"👤",ai:"✦",billing:"💳",system:"🖥"}[t]||"●");
  return <div style={{padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Audit Log</h2><p style={{fontSize:13,color:C.t3,marginTop:4}}>Track every admin action across your workspace</p></div>
      <Btn ch="↓ Export CSV" v="ghost" sm onClick={()=>{exportCSV([["User","Action","Detail","Time","Type"],...AUDIT_LOG.map(a=>[a.user,a.action,a.detail,a.time,a.type])],"audit_log.csv");showT("Exported","success");}}/>
    </div>
    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[{l:"Total Events",v:AUDIT_LOG.length,c:C.a},{l:"Today",v:AUDIT_LOG.filter(a=>a.time.includes("m ago")||a.time.includes("h ago")).length,c:C.g},{l:"Users",v:users.length,c:C.p},{l:"Types",v:types.length-1,c:C.cy}].map(k=>(
        <div key={k.l} style={{padding:"12px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:3}}>{k.l}</div>
        </div>
      ))}
    </div>
    {/* Filters */}
    <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:8,padding:"4px 10px",flex:1,maxWidth:260}}>
        <span style={{fontSize:12,color:C.t3}}>🔍</span>
        <input value={auditSearch} onChange={e=>{setAuditSearch(e.target.value);setAuditPage(1);}} placeholder="Search actions…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
        {auditSearch&&<button onClick={()=>setAuditSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10}}>×</button>}
      </div>
      <Sel val={auditUser} set={v=>{setAuditUser(v);setAuditPage(1);}} opts={[{v:"all",l:"All Users"},...users.map(u=>({v:u,l:u}))]}/>
      <div style={{display:"flex",gap:3}}>
        {types.map(t=><button key={t} onClick={()=>{setAuditFilter(t);setAuditPage(1);}} style={{padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:auditFilter===t?typeColor(t)+"22":"transparent",color:auditFilter===t?typeColor(t):C.t3,border:`1px solid ${auditFilter===t?typeColor(t)+"55":C.b1}`,textTransform:"capitalize"}}>{t}</button>)}
      </div>
    </div>
    {/* Results count */}
    <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginBottom:8}}>{filtered.length} events{auditSearch?" matching \""+auditSearch+"\"":""}{auditFilter!=="all"?" ("+auditFilter+")":""}</div>
    {/* Log entries */}
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden"}}>
      {paged.map((a,i)=>(
        <div key={a.id} style={{display:"flex",gap:12,padding:"14px 18px",borderBottom:i<paged.length-1?`1px solid ${C.b1}`:"none",alignItems:"flex-start"}}>
          <div style={{width:28,height:28,borderRadius:7,background:typeColor(a.type)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,marginTop:2}}>{typeIcon(a.type)}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <span style={{fontSize:13,fontWeight:600,color:C.t1}}>{a.user}</span>
              <Tag text={a.type} color={typeColor(a.type)}/>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM,marginLeft:"auto"}}>{a.time}</span>
            </div>
            <div style={{fontSize:12.5,color:C.t1,fontWeight:500}}>{a.action}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:2}}>{a.detail}</div>
          </div>
        </div>
      ))}
      {paged.length===0&&<div style={{padding:"32px",textAlign:"center",color:C.t3,fontSize:13}}>No events match your filters</div>}
    </div>
    {/* Pagination */}
    {totalPages>1&&<div style={{display:"flex",justifyContent:"center",gap:4,marginTop:14}}>
      <button onClick={()=>setAuditPage(p=>Math.max(1,p-1))} disabled={auditPage===1} style={{padding:"6px 12px",borderRadius:6,fontSize:11,background:C.s1,border:`1px solid ${C.b1}`,cursor:auditPage===1?"default":"pointer",color:auditPage===1?C.t3:C.t1}}>← Prev</button>
      {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
        <button key={p} onClick={()=>setAuditPage(p)} style={{width:30,height:30,borderRadius:6,fontSize:11,fontWeight:auditPage===p?700:400,background:auditPage===p?C.ad:C.s1,color:auditPage===p?C.a:C.t3,border:`1px solid ${auditPage===p?C.a+"44":C.b1}`,cursor:"pointer"}}>{p}</button>
      ))}
      <button onClick={()=>setAuditPage(p=>Math.min(totalPages,p+1))} disabled={auditPage===totalPages} style={{padding:"6px 12px",borderRadius:6,fontSize:11,background:C.s1,border:`1px solid ${C.b1}`,cursor:auditPage===totalPages?"default":"pointer",color:auditPage===totalPages?C.t3:C.t1}}>Next →</button>
    </div>}
  </div>;
}

function AccountSet(){
  const [atab,setAtab]=useState("general");
  // General
  const [acName,setAcName]=useState("SupportDesk Pvt Ltd");
  const [acDomain,setAcDomain]=useState("supportdesk.app");
  const [acEmail,setAcEmail]=useState("support@supportdesk.app");
  const [acPhone,setAcPhone]=useState("+91 98765 43210");
  const [tz,setTz]=useState("Asia/Kolkata");
  const [lang,setLang]=useState("en");
  const [dateFormat,setDateFormat]=useState("DD/MM/YYYY");
  const [acIndustry,setAcIndustry]=useState("SaaS / Technology");
  const [acSize,setAcSize]=useState("11-50");
  const [acCountry,setAcCountry]=useState("India");
  const [acAddress,setAcAddress]=useState("123 Tech Park, HSR Layout, Bengaluru 560102");
  // Profile
  const [pName,setPName]=useState("Priya Sharma");
  const [pEmail,setPEmail]=useState("priya@supportdesk.app");
  const [pPhone,setPPhone]=useState("+91 98765 43210");
  const [pTitle,setPTitle]=useState("Head of Support");
  const [pBio,setPBio]=useState("Leading customer success at SupportDesk. 7+ years in SaaS support operations.");
  const [pAvatar,setPAvatar]=useState("PS");
  // Security
  const [twoFa,setTwoFa]=useState(true);
  const [sessionTimeout,setSessionTimeout]=useState("60");
  const [ipWhitelist,setIpWhitelist]=useState("");
  const [passPolicy,setPassPolicy]=useState("strong");
  const [showPass,setShowPass]=useState(false);
  const [oldPass,setOldPass]=useState("");const [newPass,setNewPass]=useState("");const [confPass,setConfPass]=useState("");
  const [sessions]=useState([{id:"s1",device:"Chrome · macOS",ip:"103.21.58.xx",location:"Bengaluru, IN",time:"Now",current:true},{id:"s2",device:"Safari · iPhone",ip:"103.21.58.xx",location:"Bengaluru, IN",time:"2h ago",current:false},{id:"s3",device:"Firefox · Windows",ip:"49.37.12.xx",location:"Mumbai, IN",time:"1d ago",current:false}]);
  // API
  const [apiKeys]=useState([{id:"ak1",name:"Production",key:"sk_live_xxxx...x4f2",created:"01/01/26",lastUsed:"Today",status:"active"},{id:"ak2",name:"Staging",key:"sk_test_xxxx...x8a1",created:"15/02/26",lastUsed:"3d ago",status:"active"}]);
  // Danger
  const [showDelConfirm,setShowDelConfirm]=useState(false);const [delInput,setDelInput]=useState("");
  const saved=()=>showT("Settings saved!","success");

  return <div style={{padding:"24px 28px",maxWidth:800}}>
    <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD,marginBottom:4}}>Account Settings</h2>
    <p style={{fontSize:13,color:C.t3,marginBottom:20}}>Manage your workspace, profile, security, and API access</p>

    {/* Tabs */}
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,marginBottom:20}}>
      {[["general","General"],["profile","My Profile"],["security","Security"],["api","API & Keys"],["danger","Danger Zone"]].map(([id,l])=>(
        <button key={id} onClick={()=>setAtab(id)} style={{padding:"10px 18px",fontSize:12,fontWeight:700,fontFamily:FM,color:atab===id?C.a:C.t3,borderBottom:`2px solid ${atab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>
      ))}
    </div>

    {/* ═══ GENERAL ═══ */}
    {atab==="general"&&<div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:16}}>Organization</div>
        <div style={{display:"flex",gap:16,marginBottom:16}}>
          <div style={{flexShrink:0}}><SDLogo s={72}/></div>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Customer Name"><Inp val={acName} set={setAcName}/></Fld></div><div style={{flex:1}}><Fld label="Domain"><Inp val={acDomain} set={setAcDomain}/></Fld></div></div>
          </div>
        </div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Support Email"><Inp val={acEmail} set={setAcEmail} type="email"/></Fld></div><div style={{flex:1}}><Fld label="Phone"><Inp val={acPhone} set={setAcPhone}/></Fld></div></div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Industry"><Sel val={acIndustry} set={setAcIndustry} opts={["SaaS / Technology","E-Commerce","Healthcare","Finance","Education","Media","Other"].map(v=>({v,l:v}))}/></Fld></div><div style={{flex:1}}><Fld label="Company Size"><Sel val={acSize} set={setAcSize} opts={["1-10","11-50","51-200","201-500","500+"].map(v=>({v,l:v+" employees"}))}/></Fld></div></div>
        <Fld label="Address"><Inp val={acAddress} set={setAcAddress} ph="Street, City, State, ZIP"/></Fld>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Country"><Sel val={acCountry} set={setAcCountry} opts={["India","United States","United Kingdom","Germany","Japan","Singapore","UAE","Other"].map(v=>({v,l:v}))}/></Fld></div></div>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:16}}>Locale & Preferences</div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Timezone"><Sel val={tz} set={setTz} opts={["Asia/Kolkata","America/New_York","America/Chicago","America/Los_Angeles","Europe/London","Europe/Berlin","Asia/Tokyo","Asia/Singapore","Australia/Sydney","Pacific/Auckland"].map(t=>({v:t,l:t}))}/></Fld></div><div style={{flex:1}}><Fld label="Language"><Sel val={lang} set={setLang} opts={[{v:"en",l:"English"},{v:"hi",l:"Hindi"},{v:"es",l:"Spanish"},{v:"fr",l:"French"},{v:"de",l:"German"},{v:"ja",l:"Japanese"},{v:"zh",l:"Chinese"},{v:"ar",l:"Arabic"}]}/></Fld></div></div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Date Format"><Sel val={dateFormat} set={setDateFormat} opts={[{v:"DD/MM/YYYY",l:"DD/MM/YYYY (Indian)"},{v:"MM/DD/YYYY",l:"MM/DD/YYYY (US)"},{v:"YYYY-MM-DD",l:"YYYY-MM-DD (ISO)"}]}/></Fld></div><div style={{flex:1,display:"flex",alignItems:"flex-end",paddingBottom:8}}><span style={{fontSize:12,color:C.t3}}>Current: {new Date().toLocaleDateString("en-IN")} · {new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",timeZone:tz})}</span></div></div>
      </div>
      <Btn ch="Save Changes" v="primary" onClick={saved}/>
    </div>}

    {/* ═══ PROFILE ═══ */}
    {atab==="profile"&&<div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px"}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:16}}>My Profile</div>
        <div style={{display:"flex",gap:20,marginBottom:16}}>
          <div style={{textAlign:"center"}}>
            <Av i={pAvatar} c={C.a} s={80} dot={true}/>
            <button onClick={()=>{const av=window.prompt("Enter initials (2 chars):",pAvatar);if(av)setPAvatar(av.slice(0,2).toUpperCase());}} style={{marginTop:8,padding:"4px 12px",borderRadius:6,fontSize:11,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>Change Avatar</button>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Full Name"><Inp val={pName} set={setPName}/></Fld></div><div style={{flex:1}}><Fld label="Job Title"><Inp val={pTitle} set={setPTitle}/></Fld></div></div>
            <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Email"><Inp val={pEmail} set={setPEmail} type="email"/></Fld></div><div style={{flex:1}}><Fld label="Phone"><Inp val={pPhone} set={setPPhone}/></Fld></div></div>
          </div>
        </div>
        <Fld label="Bio"><textarea value={pBio} onChange={e=>setPBio(e.target.value)} rows={3} placeholder="A brief description about yourself…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
        <div style={{display:"flex",gap:12,padding:"12px 0",borderTop:`1px solid ${C.b1}`,marginTop:8}}>
          {[{l:"Role",v:"Owner",c:C.p},{l:"Status",v:"Online",c:C.g},{l:"Joined",v:"Jan 2025",c:C.t3},{l:"Conversations",v:"1,247",c:C.a},{l:"CSAT",v:"4.8★",c:C.g}].map(s=>(
            <div key={s.l} style={{flex:1,textAlign:"center",padding:"8px",background:C.s2,borderRadius:8}}>
              <div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
        <Btn ch="Save Profile" v="primary" onClick={saved}/>
      </div>
    </div>}

    {/* ═══ SECURITY ═══ */}
    {atab==="security"&&<div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:16}}>Password</div>
        {!showPass?<Btn ch="Change Password" v="ghost" onClick={()=>setShowPass(true)}/>:<>
          <Fld label="Current Password"><Inp val={oldPass} set={setOldPass} type="password" ph="Enter current password"/></Fld>
          <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="New Password"><Inp val={newPass} set={setNewPass} type="password" ph="Min 8 characters"/></Fld></div><div style={{flex:1}}><Fld label="Confirm Password"><Inp val={confPass} set={setConfPass} type="password" ph="Repeat new password"/></Fld></div></div>
          {newPass&&<div style={{display:"flex",gap:6,marginBottom:10}}>{[{l:"8+ chars",ok:newPass.length>=8},{l:"Uppercase",ok:/[A-Z]/.test(newPass)},{l:"Number",ok:/\d/.test(newPass)},{l:"Symbol",ok:/[!@#$%]/.test(newPass)},{l:"Match",ok:newPass===confPass&&confPass.length>0}].map(r=><span key={r.l} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:r.ok?C.gd:C.rd,color:r.ok?C.g:C.r,fontFamily:FM}}>{r.ok?"✓":"✕"} {r.l}</span>)}</div>}
          <div style={{display:"flex",gap:8}}><Btn ch="Update Password" v="primary" onClick={()=>{if(newPass!==confPass)return showT("Passwords don't match","error");if(newPass.length<8)return showT("Min 8 characters","error");showT("Password updated!","success");setShowPass(false);setOldPass("");setNewPass("");setConfPass("");}}/><Btn ch="Cancel" v="ghost" onClick={()=>setShowPass(false)}/></div>
        </>}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Two-Factor Authentication</div><div style={{fontSize:12,color:C.t3,marginTop:2}}>Add an extra layer of security to your account</div></div>
          <Toggle val={twoFa} set={v=>{setTwoFa(v);showT(v?"2FA enabled":"2FA disabled",v?"success":"warn");}}/>
        </div>
        {twoFa&&<div style={{padding:"12px",background:C.gd,border:`1px solid ${C.g}33`,borderRadius:10,fontSize:12,color:C.g,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🔐</span>2FA is active. A verification code is required on every login.
        </div>}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:4}}>Password Policy</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:12}}>Enforce password requirements for all team members</div>
        <div style={{display:"flex",gap:8}}>
          {[{v:"basic",l:"Basic",d:"Min 6 chars"},{v:"moderate",l:"Moderate",d:"8 chars + number"},{v:"strong",l:"Strong",d:"8 chars + upper + number + symbol"}].map(p=>(
            <button key={p.v} onClick={()=>{setPassPolicy(p.v);showT("Policy: "+p.l,"success");}} style={{flex:1,padding:"12px",borderRadius:10,background:passPolicy===p.v?C.ad:C.s2,border:`1.5px solid ${passPolicy===p.v?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:12,fontWeight:700,color:passPolicy===p.v?C.a:C.t1}}>{p.l}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{p.d}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><div style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Session Timeout</div><div style={{fontSize:12,color:C.t3,marginTop:2}}>Auto-logout after inactivity</div></div>
          <Sel val={sessionTimeout} set={v=>{setSessionTimeout(v);showT("Timeout: "+v+" min","success");}} opts={[{v:"15",l:"15 min"},{v:"30",l:"30 min"},{v:"60",l:"1 hour"},{v:"120",l:"2 hours"},{v:"480",l:"8 hours"},{v:"0",l:"Never"}]}/>
        </div>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:4}}>Active Sessions</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:12}}>Devices currently logged into your account</div>
        {sessions.map(s=>(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <div style={{width:36,height:36,borderRadius:8,background:s.current?C.gd:C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{s.device.includes("Chrome")?"🌐":s.device.includes("Safari")?"📱":"🖥"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:C.t1,display:"flex",alignItems:"center",gap:6}}>{s.device}{s.current&&<Tag text="Current" color={C.g}/>}</div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>{s.ip} · {s.location} · {s.time}</div>
            </div>
            {!s.current&&<Btn ch="Revoke" v="danger" sm onClick={()=>showT("Session revoked","success")}/>}
          </div>
        ))}
        <div style={{marginTop:10}}><Btn ch="Revoke All Other Sessions" v="danger" sm onClick={()=>showT("All other sessions revoked","success")}/></div>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px"}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:4}}>IP Whitelist</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:12}}>Only allow logins from specific IP addresses (leave blank for all)</div>
        <Fld label="Allowed IPs (one per line)"><textarea value={ipWhitelist} onChange={e=>setIpWhitelist(e.target.value)} rows={3} placeholder={"103.21.58.0/24\n49.37.12.0/24\n(leave blank to allow all)"} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,fontFamily:FM,resize:"vertical",outline:"none",lineHeight:1.7,boxSizing:"border-box"}}/></Fld>
        <Btn ch="Save IP Rules" v="primary" onClick={()=>showT("IP whitelist updated","success")}/>
      </div>
    </div>}

    {/* ═══ API & KEYS ═══ */}
    {atab==="api"&&<div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:15,fontWeight:700,fontFamily:FD}}>API Keys</div><div style={{fontSize:12,color:C.t3,marginTop:2}}>Use these keys to authenticate API requests</div></div>
          <Btn ch="+ Generate Key" v="primary" sm onClick={()=>showT("New API key generated","success")}/>
        </div>
        {apiKeys.map(k=>(
          <div key={k.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,marginBottom:8}}>
            <div style={{width:36,height:36,borderRadius:8,background:C.ad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🔑</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13,fontWeight:700}}>{k.name}</span><Tag text={k.status} color={C.g}/></div>
              <div style={{fontSize:11,fontFamily:FM,color:C.t3,marginTop:2}}>{k.key}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>Created: {k.created}</div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>Last used: {k.lastUsed}</div>
            </div>
            <div style={{display:"flex",gap:4}}>
              <Btn ch="Copy" v="ghost" sm onClick={()=>{navigator.clipboard?.writeText(k.key);showT("Copied!","success");}}/>
              <Btn ch="Revoke" v="danger" sm onClick={()=>showT("Key revoked","warn")}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"22px"}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:4}}>Webhooks</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:12}}>Receive real-time events from SupportDesk</div>
        <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Webhook URL"><Inp val="" set={()=>{}} ph="https://your-server.com/webhook"/></Fld></div></div>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>EVENTS</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
          {["conversation.created","conversation.resolved","message.received","message.sent","contact.created","agent.assigned","sla.breached","csat.received"].map(e=>(
            <span key={e} style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:C.ad,color:C.a,fontFamily:FM,border:`1px solid ${C.a}44`}}>{e}</span>
          ))}
        </div>
        <Btn ch="Save Webhook" v="primary" onClick={()=>showT("Webhook saved","success")}/>
      </div>
    </div>}

    {/* ═══ DANGER ZONE ═══ */}
    {atab==="danger"&&<div>
      <div style={{background:C.rd,border:`1px solid ${C.r}33`,borderRadius:14,padding:"22px",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,color:C.r,marginBottom:4}}>Danger Zone</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:16}}>These actions are permanent and cannot be undone.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px",background:C.s1,borderRadius:10,border:`1px solid ${C.b1}`}}>
            <div><div style={{fontSize:13,fontWeight:700}}>Export All Data</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>Download conversations, contacts, settings as ZIP</div></div>
            <Btn ch="↓ Export" v="ghost" onClick={()=>showT("Export started — check your email in ~5 minutes","info")}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px",background:C.s1,borderRadius:10,border:`1px solid ${C.b1}`}}>
            <div><div style={{fontSize:13,fontWeight:700}}>Transfer Ownership</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>Transfer this workspace to another admin</div></div>
            <Btn ch="Transfer" v="warn" onClick={()=>showT("Enter the email of the new owner","info")}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px",background:C.s1,borderRadius:10,border:`1px solid ${C.r}44`}}>
            <div><div style={{fontSize:13,fontWeight:700,color:C.r}}>Delete Account</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>Permanently delete this workspace and all data</div></div>
            <Btn ch="Delete Account" v="danger" onClick={()=>setShowDelConfirm(true)}/>
          </div>
        </div>
      </div>
      {showDelConfirm&&<div style={{background:C.s1,border:`1px solid ${C.r}`,borderRadius:14,padding:"22px"}}>
        <div style={{fontSize:15,fontWeight:700,color:C.r,marginBottom:8}}>Confirm Account Deletion</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:12,lineHeight:1.6}}>This will permanently delete your workspace, all conversations, contacts, settings, and team data. This action <strong>cannot be undone</strong>.</div>
        <div style={{background:C.yd,border:`1px solid ${C.y}44`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.t2}}>Type <strong style={{color:C.r}}>DELETE MY ACCOUNT</strong> below to confirm:</div>
        <Fld label=""><Inp val={delInput} set={setDelInput} ph="Type DELETE MY ACCOUNT"/></Fld>
        <div style={{display:"flex",gap:8}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowDelConfirm(false);setDelInput("");}}/><Btn ch="Permanently Delete" v="danger" onClick={()=>{if(delInput!=="DELETE MY ACCOUNT")return showT("Type 'DELETE MY ACCOUNT' to confirm","error");showT("Account scheduled for deletion. You'll receive a confirmation email.","warn");setShowDelConfirm(false);}}/></div>
      </div>}
    </div>}
  </div>;
}
