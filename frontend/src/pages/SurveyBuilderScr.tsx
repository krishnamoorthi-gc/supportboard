import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── CSAT SURVEY BUILDER ──────────────────────────────────────────────────
export default function SurveyBuilderScr(){
  const [sTab,setSTab]=useState("builder");
  const [questions,setQuestions]=useState([
    {id:"q1",type:"stars",label:"How satisfied are you with our support?",required:true},
    {id:"q2",type:"nps",label:"How likely are you to recommend us?",required:true},
    {id:"q3",type:"thumbs",label:"Was your issue resolved?",required:false},
    {id:"q4",type:"text",label:"Any additional feedback?",required:false}
  ]);
  const [selQ,setSelQ]=useState(null);
  const [trigger,setTrigger]=useState("after_resolve");const [delay,setDelay]=useState("0");
  const [showPreview,setShowPreview]=useState(false);const [previewStep,setPreviewStep]=useState(0);const [previewAnswers,setPreviewAnswers]=useState({});
  const qtypes=[{v:"stars",l:"⭐ Stars (1-5)"},{v:"nps",l:"📊 NPS (0-10)"},{v:"thumbs",l:"👍 Thumbs"},{v:"text",l:"📝 Open Text"},{v:"choice",l:"📋 Choice"},{v:"emoji",l:"😊 Emoji"}];
  const addQ=type=>{setQuestions(p=>[...p,{id:"q"+uid(),type,label:"New question",required:false}]);showT("Added","success");};
  const delQ=id=>{setQuestions(p=>p.filter(q=>q.id!==id));setSelQ(null);};
  const moveQ=(id,dir)=>{setQuestions(p=>{const i=p.findIndex(q=>q.id===id);if((dir===-1&&i===0)||(dir===1&&i===p.length-1))return p;const n=[...p];[n[i],n[i+dir]]=[n[i+dir],n[i]];return n;});};
  const renderPQ=(q,i)=>{const ans=previewAnswers[q.id];return <div key={q.id} style={{marginBottom:14}}>
    <div style={{fontSize:12.5,fontWeight:600,marginBottom:6}}>{i+1}. {q.label}{q.required&&<span style={{color:C.r}}> *</span>}</div>
    {q.type==="stars"&&<div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(s=><button key={s} onClick={()=>setPreviewAnswers(p=>({...p,[q.id]:s}))} style={{fontSize:22,background:"none",border:"none",cursor:"pointer",opacity:ans>=s?1:0.3}}>⭐</button>)}</div>}
    {q.type==="nps"&&<div style={{display:"flex",gap:2}}>{Array.from({length:11}).map((_,n)=><button key={n} onClick={()=>setPreviewAnswers(p=>({...p,[q.id]:n}))} style={{width:26,height:26,borderRadius:5,fontSize:10,fontWeight:700,background:ans===n?n<=6?C.r:n<=8?C.y:C.g:C.s3,color:ans===n?"#fff":C.t2,border:`1px solid ${ans===n?"transparent":C.b1}`,cursor:"pointer"}}>{n}</button>)}</div>}
    {q.type==="thumbs"&&<div style={{display:"flex",gap:6}}>{[{v:"up",e:"👍"},{v:"down",e:"👎"}].map(o=><button key={o.v} onClick={()=>setPreviewAnswers(p=>({...p,[q.id]:o.v}))} style={{fontSize:26,padding:"6px 14px",borderRadius:8,background:ans===o.v?C.ad:C.s3,border:`2px solid ${ans===o.v?C.a:C.b1}`,cursor:"pointer"}}>{o.e}</button>)}</div>}
    {q.type==="emoji"&&<div style={{display:"flex",gap:4}}>{["😡","😞","😐","🙂","😍"].map((e,j)=><button key={e} onClick={()=>setPreviewAnswers(p=>({...p,[q.id]:j}))} style={{fontSize:26,padding:"4px 8px",borderRadius:8,background:ans===j?C.ad:C.s3,border:`2px solid ${ans===j?C.a:C.b1}`,cursor:"pointer"}}>{e}</button>)}</div>}
    {q.type==="text"&&<textarea placeholder="Type feedback…" rows={3} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"7px 10px",fontSize:12,color:C.t1,fontFamily:FB,resize:"none",outline:"none"}}/>}
    {q.type==="choice"&&<div style={{display:"flex",flexDirection:"column",gap:3}}>{["Very satisfied","Satisfied","Neutral","Dissatisfied"].map(o=><button key={o} onClick={()=>setPreviewAnswers(p=>({...p,[q.id]:o}))} style={{padding:"7px 10px",borderRadius:6,background:ans===o?C.ad:C.s2,border:`1.5px solid ${ans===o?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"left",fontSize:11.5,color:ans===o?C.a:C.t2}}>{o}</button>)}</div>}
  </div>;};
  return <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>CSAT Survey Builder</h2>
      <div style={{display:"flex",gap:5}}><Btn ch="Preview" v="ghost" onClick={()=>{setShowPreview(true);setPreviewStep(0);setPreviewAnswers({});}}/><Btn ch="Publish" v="primary" onClick={()=>showT("Published!","success")}/></div>
    </div>
    <div style={{display:"flex",gap:3,marginBottom:14,borderBottom:`1px solid ${C.b1}`}}>
      {["builder","triggers","responses","analytics"].map(t=><button key={t} onClick={()=>setSTab(t)} style={{padding:"7px 12px",fontSize:10,fontWeight:700,fontFamily:FM,color:sTab===t?C.a:C.t3,borderBottom:`2px solid ${sTab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}
    </div>
    {sTab==="builder"&&<div style={{display:"flex",gap:14}}>
      <div style={{flex:1}}>
        {questions.map((q,i)=><div key={q.id} onClick={()=>setSelQ(q.id)} className="hov" style={{padding:"10px 12px",background:selQ===q.id?C.ad:C.s1,border:`1.5px solid ${selQ===q.id?C.a+"55":C.b1}`,borderRadius:9,marginBottom:6,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",flexDirection:"column",gap:1}}><button onClick={e=>{e.stopPropagation();moveQ(q.id,-1);}} style={{background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:7}}>▲</button><button onClick={e=>{e.stopPropagation();moveQ(q.id,1);}} style={{background:"none",border:"none",cursor:"pointer",color:C.t3,fontSize:7}}>▼</button></div>
          <span style={{fontSize:10,color:C.t3,fontFamily:FM,width:14}}>{i+1}.</span>
          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{q.label}</div><div style={{fontSize:9.5,color:C.t3,fontFamily:FM}}>{qtypes.find(t=>t.v===q.type)?.l}{q.required?" · Required":""}</div></div>
          <button onClick={e=>{e.stopPropagation();delQ(q.id);}} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:11}}>✕</button>
        </div>)}
        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:8}}>{qtypes.map(t=><button key={t.v} onClick={()=>addQ(t.v)} className="hov" style={{padding:"5px 8px",borderRadius:5,fontSize:9.5,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t2}}>+ {t.l}</button>)}</div>
      </div>
      {selQ&&(()=>{const q=questions.find(x=>x.id===selQ);return q?<div style={{width:260,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:12,flexShrink:0}}>
        <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Edit Question</div>
        <Fld label="Text"><Inp val={q.label} set={v=>setQuestions(p=>p.map(x=>x.id===selQ?{...x,label:v}:x))} ph="Question"/></Fld>
        <Fld label="Type"><Sel val={q.type} set={v=>setQuestions(p=>p.map(x=>x.id===selQ?{...x,type:v}:x))} opts={qtypes.map(t=>({v:t.v,l:t.l}))}/></Fld>
        <div style={{display:"flex",alignItems:"center",gap:5,marginTop:6}}><Toggle val={q.required} set={v=>setQuestions(p=>p.map(x=>x.id===selQ?{...x,required:v}:x))}/><span style={{fontSize:10.5,color:C.t2}}>Required</span></div>
      </div>:null;})()}
    </div>}
    {sTab==="triggers"&&<div style={{maxWidth:460}}>
      <Fld label="Send when:"><Sel val={trigger} set={setTrigger} opts={[{v:"after_resolve",l:"After resolve"},{v:"after_24h",l:"24h after resolve"},{v:"after_close",l:"Customer closes chat"},{v:"manual",l:"Manual"}]}/></Fld>
      <Fld label="Delay:"><Sel val={delay} set={setDelay} opts={[{v:"0",l:"Immediately"},{v:"1",l:"1 hour"},{v:"24",l:"24 hours"}]}/></Fld>
      <Btn ch="Save" v="primary" onClick={()=>showT("Saved!","success")}/>
    </div>}
    {sTab==="responses"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}>
      {[{d:"Today",n:24,avg:4.3,nps:72},{d:"Yesterday",n:31,avg:4.1,nps:68},{d:"2d ago",n:28,avg:4.5,nps:75}].map(r=><div key={r.d} style={{display:"grid",gridTemplateColumns:"1fr 60px 60px 60px",padding:"8px 12px",borderBottom:`1px solid ${C.b1}22`}}>
        <span style={{fontSize:11.5}}>{r.d}</span><span style={{fontSize:11,fontWeight:600}}>{r.n}</span><span style={{fontSize:11,color:r.avg>=4?C.g:C.y,fontWeight:700}}>{r.avg}★</span><span style={{fontSize:11,color:r.nps>=70?C.g:C.y,fontWeight:700}}>{r.nps}</span>
      </div>)}
    </div>}
    {sTab==="analytics"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      {[{l:"Responses",v:"247",c:C.a},{l:"Avg CSAT",v:"4.3★",c:C.g},{l:"NPS",v:"72",c:C.p},{l:"Rate",v:"38%",c:C.cy},{l:"Promoters",v:"64%",c:C.g},{l:"Detractors",v:"12%",c:C.r}].map(k=><div key={k.l} style={{padding:12,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:9,textAlign:"center"}}><div style={{fontSize:8.5,color:C.t3,fontFamily:FM,marginBottom:4}}>{k.l}</div><div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div></div>)}
    </div>}
    {showPreview&&<Mdl title="Survey Preview" onClose={()=>setShowPreview(false)} w={420}>
      <div style={{background:C.bg,borderRadius:8,padding:14,border:`1px solid ${C.b1}`}}>
        <div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:14,fontWeight:700}}>We'd love your feedback!</div></div>
        {questions.slice(0,previewStep+1).map((q,i)=>renderPQ(q,i))}
        <div style={{textAlign:"center",marginTop:10}}>{previewStep<questions.length-1?<Btn ch="Next →" v="primary" onClick={()=>setPreviewStep(p=>p+1)}/>:<Btn ch="Submit" v="primary" onClick={()=>{setShowPreview(false);showT("Submitted!","success");}}/>}</div>
      </div>
    </Mdl>}
  </div>;
}


