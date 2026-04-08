import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── DEVELOPER CONSOLE ────────────────────────────────────────────────────
export default function DevConsoleScr(){
  const [dTab,setDTab]=useState("playground");
  const [apiMethod,setApiMethod]=useState("GET");const [apiPath,setApiPath]=useState("/v1/conversations");
  const [apiResp,setApiResp]=useState(null);const [apiLoading,setApiLoading]=useState(false);
  const [apiBody,setApiBody]=useState('{"subject":"Test","channel":"email"}');
  const [apiHistory,setApiHistory]=useState([]);
  const [eventLog]=useState([{id:"e1",type:"webhook",event:"conversation.created",time:"09:02:14",status:"200"},{id:"e2",type:"webhook",event:"message.sent",time:"09:05:33",status:"200"},{id:"e3",type:"api",event:"GET /contacts",time:"09:10:01",status:"200"},{id:"e4",type:"webhook",event:"conversation.resolved",time:"09:15:44",status:"200"},{id:"e5",type:"api",event:"POST /messages",time:"09:22:18",status:"201"},{id:"e6",type:"webhook",event:"sla.breach",time:"09:30:00",status:"500"}]);
  const [wsConnected]=useState(true);
  const [apiKeys]=useState([{id:"k1",name:"Production",key:"sk_live_4f8a...b2c1",scope:"full",created:"Mar 1",lastUsed:"2m ago"},{id:"k2",name:"Read Only",key:"sk_read_9e2f...d4a7",scope:"read",created:"Mar 5",lastUsed:"1h ago"},{id:"k3",name:"Webhook Only",key:"sk_hook_1c3d...f8e2",scope:"webhook",created:"Mar 10",lastUsed:"4h ago"}]);
  const runApi=()=>{setApiLoading(true);const start=Date.now();setTimeout(()=>{const resp=JSON.stringify({data:[{id:"cv1",subject:"Payment stuck",status:"open"},{id:"cv2",subject:"API auth failing",status:"open"}],meta:{total:5,page:1}},null,2);setApiResp(resp);setApiLoading(false);setApiHistory(p=>[{id:"h"+Date.now(),method:apiMethod,path:apiPath,status:200,time:Date.now()-start+"ms",ts:new Date().toLocaleTimeString()},...p].slice(0,10));},800);};
  return <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
    <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:16}}>Developer Console</h2>
    <div style={{display:"flex",gap:3,marginBottom:16,borderBottom:`1px solid ${C.b1}`}}>
      {["playground","events","sdk","keys","limits"].map(t=><button key={t} onClick={()=>setDTab(t)} style={{padding:"8px 14px",fontSize:10.5,fontWeight:700,fontFamily:FM,color:dTab===t?C.a:C.t3,borderBottom:`2px solid ${dTab===t?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",textTransform:"capitalize"}}>{t}{t==="events"&&wsConnected&&<span style={{width:6,height:6,borderRadius:"50%",background:C.g,display:"inline-block",marginLeft:4,animation:"pulse 1.5s infinite"}}/>}</button>)}
    </div>
    {dTab==="playground"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>API Playground</div>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <Sel val={apiMethod} set={setApiMethod} opts={["GET","POST","PUT","DELETE","PATCH"].map(x=>({v:x,l:x}))} sx={{width:90}}/>
          <Inp val={apiPath} set={setApiPath} ph="/v1/endpoint"/>
        </div>
        {(apiMethod==="POST"||apiMethod==="PUT"||apiMethod==="PATCH")&&<div style={{marginBottom:8}}><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>REQUEST BODY</div><textarea value={apiBody} onChange={e=>setApiBody(e.target.value)} rows={4} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"7px 10px",fontSize:11,color:C.t1,fontFamily:FM,resize:"none",outline:"none",boxSizing:"border-box"}}/></div>}
        <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4}}>HEADERS</div>
        <div style={{padding:"6px 8px",background:C.bg,borderRadius:6,marginBottom:10,fontSize:10,fontFamily:FM,color:C.t3,border:`1px solid ${C.b1}`}}>Authorization: Bearer sk_live_4f8a...b2c1<br/>Content-Type: application/json</div>
        <Btn ch={apiLoading?"Running…":"▶ Send Request"} v="primary" full onClick={runApi}/>
        {apiHistory.length>0&&<div style={{marginTop:12}}>
          <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>HISTORY ({apiHistory.length})</div>
          {apiHistory.map(h=><div key={h.id} style={{display:"flex",gap:6,alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.b1}22`,fontSize:10}}>
            <Tag text={h.method} color={h.method==="GET"?C.a:h.method==="POST"?C.g:h.method==="DELETE"?C.r:C.y}/>
            <span style={{flex:1,color:C.t2,fontFamily:FM}}>{h.path}</span>
            <Tag text={h.status+""} color={h.status<300?C.g:C.r}/>
            <span style={{color:C.t3,fontFamily:FM}}>{h.time}</span>
          </div>)}
        </div>}
      </div>
      <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:11,fontWeight:700,color:C.a,fontFamily:FM}}>RESPONSE</span>{apiResp&&<button onClick={()=>{navigator.clipboard?.writeText(apiResp);showT("Copied","success");}} style={{fontSize:9,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:4,padding:"2px 6px",cursor:"pointer",fontFamily:FM}}>Copy</button>}</div>
        <pre style={{fontSize:11,color:C.t2,fontFamily:FM,whiteSpace:"pre-wrap",lineHeight:1.5,margin:0}}>{apiResp||"// Send a request to see the response"}</pre>
      </div>
    </div>}
    {dTab==="events"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"60px 1fr 120px 50px",padding:"8px 14px",borderBottom:`1px solid ${C.b1}`}}>
        {["Type","Event","Time","Status"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.4px"}}>{h}</span>)}
      </div>
      {eventLog.map(e=><div key={e.id} style={{display:"grid",gridTemplateColumns:"60px 1fr 120px 50px",padding:"8px 14px",borderBottom:`1px solid ${C.b1}22`}}>
        <Tag text={e.type} color={e.type==="api"?C.a:C.p}/>
        <span style={{fontSize:12,color:C.t2}}>{e.event}</span>
        <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{e.time}</span>
        <Tag text={e.status} color={e.status.startsWith("2")?C.g:C.r}/>
      </div>)}
    </div>}
    {dTab==="sdk"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {["JavaScript","Python","Ruby","Go","cURL","PHP"].map(lang=><div key={lang} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px"}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>{lang}</div>
        <pre style={{fontSize:10,color:C.cy,fontFamily:FM,background:C.bg,borderRadius:6,padding:"8px",margin:0,whiteSpace:"pre-wrap"}}>
{lang==="cURL"?"curl -X GET \\\n  https://api.deskapp.io/v1/conversations \\\n  -H 'Authorization: Bearer sk_...'":lang==="Python"?("from desk"+"_sdk "+"im"+"port Client\nclient = Client('sk_...')\nconvs = client.conversations.list()"):lang==="JavaScript"?("const SDK = require('desk-"+"sdk');\nconst client = SDK.init('sk_...');\nconst convs = await client.conversations.list();"):"// See docs for "+lang+" SDK"}
        </pre>
        <Btn ch="Copy" v="ghost" sm onClick={()=>showT("Copied "+lang+" snippet","success")}/>
      </div>)}
    </div>}
    {dTab==="keys"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:700}}>API Keys & Scoping</span><Btn ch="+ New Key" v="primary" sm onClick={()=>showT("Key created","success")}/></div>
      {apiKeys.map(k=><div key={k.id} style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}22`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600}}>{k.name}</div><div style={{fontSize:11,color:C.t3,fontFamily:FM}}>{k.key}</div></div>
        <Tag text={k.scope==="full"?"Full Access":k.scope==="read"?"Read Only":"Webhooks"} color={k.scope==="full"?C.g:k.scope==="read"?C.a:C.p}/>
        <div style={{fontSize:10,color:C.t3,fontFamily:FM,textAlign:"right"}}><div>Created {k.created}</div><div>Last used {k.lastUsed}</div></div>
        <button onClick={()=>showT("Key revoked","success")} style={{fontSize:9,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:FM}}>Revoke</button>
      </div>)}
      <div style={{padding:12}}>
        <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>SCOPE OPTIONS</div>
        {[{s:"full",l:"Full Access",d:"Read + Write + Delete on all endpoints"},{s:"read",l:"Read Only",d:"GET requests only — no mutations"},{s:"webhook",l:"Webhooks Only",d:"Receive webhook events, no API calls"},{s:"conversations",l:"Conversations Only",d:"CRUD on /v1/conversations/* endpoints only"},{s:"contacts",l:"Contacts Only",d:"CRUD on /v1/contacts/* endpoints only"}].map(o=>(
          <div key={o.s} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <Tag text={o.s} color={o.s==="full"?C.g:o.s==="read"?C.a:C.p}/>
            <div style={{flex:1}}><div style={{fontSize:11.5,fontWeight:600}}>{o.l}</div><div style={{fontSize:10,color:C.t3}}>{o.d}</div></div>
          </div>
        ))}
      </div>
    </div>}
    {dTab==="limits"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:16}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>Rate Limits & Usage</div>
      {[{l:"API Calls",used:2847,limit:10000,unit:"/day"},{l:"Webhooks",used:156,limit:500,unit:"/hour"},{l:"File Uploads",used:23,limit:100,unit:"/day"},{l:"AI Tokens",used:45200,limit:100000,unit:"/day"}].map(r=><div key={r.l} style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:600}}>{r.l}</span><span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{r.used.toLocaleString()} / {r.limit.toLocaleString()} {r.unit}</span></div>
        <div style={{height:8,background:C.s3,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:Math.round(r.used/r.limit*100)+"%",background:r.used/r.limit>0.8?C.r:r.used/r.limit>0.5?C.y:C.g,borderRadius:4}}/></div>
      </div>)}
    </div>}
  </div>;
}


