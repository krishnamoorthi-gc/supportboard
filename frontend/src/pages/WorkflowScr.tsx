import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── WORKFLOW BUILDER ─────────────────────────────────────────────────────
export default function WorkflowScr(){
  const [workflows,setWorkflows]=useState([
    {id:"wf1",name:"Auto-assign by channel",active:true,trigger:"New conversation",conditions:[{attr:"channel",op:"equals",val:"WhatsApp"}],actions:[{type:"Assign team",val:"WA Team"},{type:"Add label",val:"whatsapp"}],runs:342,lastRun:"2m ago"},
    {id:"wf2",name:"SLA breach escalation",active:true,trigger:"SLA breached",conditions:[{attr:"priority",op:"equals",val:"Urgent"}],actions:[{type:"Notify",val:"Manager"},{type:"Set priority",val:"Urgent"}],runs:28,lastRun:"1h ago"},
    {id:"wf3",name:"Auto-close stale tickets",active:false,trigger:"No reply 7d",conditions:[{attr:"status",op:"equals",val:"Snoozed"}],actions:[{type:"Send message",val:"Follow-up"},{type:"Resolve",val:""}],runs:156,lastRun:"1d ago"},
    {id:"wf4",name:"VIP customer routing",active:true,trigger:"New conversation",conditions:[{attr:"plan",op:"equals",val:"Enterprise"},{attr:"tag",op:"contains",val:"vip"}],actions:[{type:"Set priority",val:"Urgent"},{type:"Assign agent",val:"Priya"},{type:"Notify",val:"Slack"}],runs:89,lastRun:"4h ago"},
  ]);
  const [showForm,setShowForm]=useState(false);const [editWf,setEditWf]=useState(null);
  const [wfName,setWfName]=useState("");const [wfTrigger,setWfTrigger]=useState("New conversation");const [wfConds,setWfConds]=useState([{attr:"channel",op:"equals",val:""}]);const [wfActions,setWfActions]=useState([{type:"Assign team",val:""}]);const [wfDesc,setWfDesc]=useState("");
  const TRIGGERS=["New conversation","Message received","SLA breached","Conversation resolved","No reply 7d","Priority changed","Label added","Agent assigned","Contact created","CSAT received"];
  const ATTRS=["channel","status","priority","plan","tag","message","contact.email","contact.name","agent","label"];
  const OPS=["equals","not_equals","contains","not_contains","is_present","greater_than","less_than"];
  const ACTION_TYPES=["Assign agent","Assign team","Add label","Remove label","Set priority","Send message","Send email","Notify","Resolve","Snooze","Webhook","Add tag"];
  const openNew=()=>{setEditWf(null);setWfName("");setWfTrigger("New conversation");setWfConds([{attr:"channel",op:"equals",val:""}]);setWfActions([{type:"Assign team",val:""}]);setWfDesc("");setShowForm(true);};
  const openEdit=w=>{setEditWf(w);setWfName(w.name);setWfTrigger(w.trigger);setWfConds(w.conditions.length?[...w.conditions]:[{attr:"channel",op:"equals",val:""}]);setWfActions(w.actions.length?[...w.actions]:[{type:"Assign team",val:""}]);setWfDesc(w.desc||"");setShowForm(true);};
  const save=()=>{if(!wfName.trim())return showT("Name required","error");
    const payload={name:wfName,trigger:wfTrigger,conditions:wfConds.filter(c=>c.val),actions:wfActions.filter(a=>a.type),desc:wfDesc};
    if(editWf)setWorkflows(p=>p.map(w=>w.id===editWf.id?{...w,...payload}:w));
    else setWorkflows(p=>[{id:"wf"+uid(),...payload,active:true,runs:0,lastRun:"never"},...p]);
    showT(editWf?"Workflow updated":"Workflow created!","success");setShowForm(false);setEditWf(null);
  };
  const dupWf=w=>{setWorkflows(p=>[{...w,id:"wf"+uid(),name:w.name+" (copy)",runs:0,lastRun:"never"},...p]);showT("Duplicated","success");};
  return <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div><h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Workflow Automation</h2><p style={{fontSize:13,color:C.t3,marginTop:4}}>Automate repetitive tasks with trigger → condition → action rules</p></div>
      <Btn ch="+ New Workflow" v="primary" onClick={openNew}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[{l:"Active",v:workflows.filter(w=>w.active).length,c:C.g},{l:"Total Runs",v:workflows.reduce((s,w)=>s+w.runs,0).toLocaleString(),c:C.a},{l:"Avg Time Saved",v:"4.2 min",c:C.p},{l:"Error Rate",v:"0.3%",c:C.cy}].map(k=>(
        <div key={k.l} style={{padding:"14px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
          <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:3}}>{k.l}</div>
        </div>
      ))}
    </div>
    {workflows.map(w=>(
      <div key={w.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px 18px",marginBottom:10,borderLeft:`4px solid ${w.active?C.g:C.t3}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <Toggle val={w.active} set={v=>{setWorkflows(p=>p.map(x=>x.id===w.id?{...x,active:v}:x));showT(v?"Enabled":"Disabled","success");}}/>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{w.name}</div>{w.desc&&<div style={{fontSize:11,color:C.t3,marginTop:2}}>{w.desc}</div>}</div>
          <div style={{display:"flex",gap:4}}>
            <Btn ch="✎ Edit" v="ghost" sm onClick={()=>openEdit(w)}/>
            <Btn ch="⧉" v="ghost" sm onClick={()=>dupWf(w)}/>
            <Btn ch="✕" v="danger" sm onClick={()=>{setWorkflows(p=>p.filter(x=>x.id!==w.id));showT("Deleted","success");}}/>
          </div>
        </div>
        {/* Visual flow */}
        <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
          <span style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:C.yd,color:C.y,fontFamily:FM,fontWeight:700}}>⚡ {w.trigger}</span>
          {w.conditions.map((c,i)=><span key={i}><span style={{color:C.t3,fontSize:10,margin:"0 3px"}}>→</span><span style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:C.ad,color:C.a,fontFamily:FM}}>IF {c.attr} {c.op} "{c.val}"</span></span>)}
          {w.actions.map((a,i)=><span key={i}><span style={{color:C.t3,fontSize:10,margin:"0 3px"}}>→</span><span style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:C.pd,color:C.p,fontFamily:FM}}>{a.type}{a.val?": "+a.val:""}</span></span>)}
        </div>
        <div style={{display:"flex",gap:12,fontSize:10,color:C.t3,fontFamily:FM}}>
          <span>{w.runs.toLocaleString()} runs</span><span>·</span><span>Last: {w.lastRun}</span>
        </div>
      </div>
    ))}
    {showForm&&<Mdl title={editWf?"Edit Workflow":"New Workflow"} onClose={()=>{setShowForm(false);setEditWf(null);}} w={580}>
      <Fld label="Workflow Name"><Inp val={wfName} set={setWfName} ph="e.g. Auto-assign VIP customers"/></Fld>
      <Fld label="Description (optional)"><Inp val={wfDesc} set={setWfDesc} ph="What does this workflow do?"/></Fld>
      <Fld label="Trigger (WHEN)"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{TRIGGERS.map(t=>(
        <button key={t} onClick={()=>setWfTrigger(t)} style={{padding:"6px 10px",borderRadius:7,fontSize:10,background:wfTrigger===t?C.yd:"transparent",color:wfTrigger===t?C.y:C.t2,border:`1px solid ${wfTrigger===t?C.y+"44":C.b1}`,cursor:"pointer",fontWeight:wfTrigger===t?700:400}}>⚡ {t}</button>
      ))}</div></Fld>
      <Fld label="Conditions (IF)">
        {wfConds.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
            <Sel val={c.attr} set={v=>setWfConds(p=>p.map((x,j)=>j===i?{...x,attr:v}:x))} opts={ATTRS.map(a=>({v:a,l:a}))}/>
            <Sel val={c.op} set={v=>setWfConds(p=>p.map((x,j)=>j===i?{...x,op:v}:x))} opts={OPS.map(o=>({v:o,l:o.replace(/_/g," ")}))}/>
            <Inp val={c.val} set={v=>setWfConds(p=>p.map((x,j)=>j===i?{...x,val:v}:x))} ph="value"/>
            {wfConds.length>1&&<button onClick={()=>setWfConds(p=>p.filter((_,j)=>j!==i))} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>}
          </div>
        ))}
        <button onClick={()=>setWfConds(p=>[...p,{attr:"channel",op:"equals",val:""}])} style={{fontSize:11,color:C.a,background:"none",border:`1px dashed ${C.a}44`,borderRadius:6,padding:"4px 12px",cursor:"pointer"}}>+ Add Condition</button>
      </Fld>
      <Fld label="Actions (THEN)">
        {wfActions.map((a,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
            <Sel val={a.type} set={v=>setWfActions(p=>p.map((x,j)=>j===i?{...x,type:v}:x))} opts={ACTION_TYPES.map(t=>({v:t,l:t}))}/>
            <Inp val={a.val} set={v=>setWfActions(p=>p.map((x,j)=>j===i?{...x,val:v}:x))} ph="value"/>
            {wfActions.length>1&&<button onClick={()=>setWfActions(p=>p.filter((_,j)=>j!==i))} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>}
          </div>
        ))}
        <button onClick={()=>setWfActions(p=>[...p,{type:"Add label",val:""}])} style={{fontSize:11,color:C.p,background:"none",border:`1px dashed ${C.p}44`,borderRadius:6,padding:"4px 12px",cursor:"pointer"}}>+ Add Action</button>
      </Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowForm(false);setEditWf(null);}}/><Btn ch={editWf?"Save Changes":"Create Workflow"} v="primary" onClick={save}/></div>
    </Mdl>}
  </div>;
}


