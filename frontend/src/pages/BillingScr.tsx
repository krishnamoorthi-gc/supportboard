import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

export default function BillingScr(){
  const [plan,setPlan]=useState("Pro");
  const [showUpgrade,setShowUpgrade]=useState(null);
  const [btab,setBtab]=useState("plans");
  const [payMethod,setPayMethod]=useState({type:"card",brand:"Visa",last4:"4242",expiry:"12/27",name:"Priya Sharma"});
  const [showPayEdit,setShowPayEdit]=useState(false);
  const [payCard,setPayCard]=useState("");const [payExp,setPayExp]=useState("");const [payCvv,setPayCvv]=useState("");const [payName,setPayName]=useState("");
  const PLANS=[
    {id:"Starter",price:"Free",mo:0,color:C.t2,features:["5 agents","3 inboxes","Live chat + Email","Basic reports","7-day history"]},
    {id:"Pro",price:"₹4,999/mo",mo:4999,color:C.a,features:["25 agents","10 inboxes","All channels","AI Copilot","Advanced reports","Automations","90-day history"]},
    {id:"Enterprise",price:"Custom",mo:0,color:C.p,features:["Unlimited agents","Unlimited inboxes","SSO / SAML","SLA management","Audit logs","Dedicated support","Custom integrations"]},
  ];
  const INVOICES=[{id:"INV-2026003",month:"Mar 2026",amount:"₹5,899",status:"paid",date:"01/03/26"},{id:"INV-2026002",month:"Feb 2026",amount:"₹5,899",status:"paid",date:"01/02/26"},{id:"INV-2026001",month:"Jan 2026",amount:"₹5,899",status:"paid",date:"01/01/26"},{id:"INV-2025012",month:"Dec 2025",amount:"₹4,999",status:"paid",date:"01/12/25"},{id:"INV-2025011",month:"Nov 2025",amount:"₹4,999",status:"paid",date:"01/11/25"}];
  return <div style={{flex:1,padding:"28px 32px",overflowY:"auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD}}>Billing & Plans</h2>
      <div style={{display:"flex",gap:4}}>
        {[["plans","Plans"],["payment","Payment"],["invoices","Invoices"],["usage","Usage"]].map(([id,l])=>(
          <button key={id} onClick={()=>setBtab(id)} style={{padding:"5px 14px",borderRadius:7,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:btab===id?C.ad:"transparent",color:btab===id?C.a:C.t3,border:`1px solid ${btab===id?C.a+"50":C.b1}`}}>{l}</button>
        ))}
      </div>
    </div>
    <p style={{color:C.t2,fontSize:14,marginBottom:24}}>You're on the <span style={{color:C.a,fontWeight:600}}>{plan} plan</span> · Renews on Apr 15, 2026</p>

    {btab==="plans"&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
      {PLANS.map(p=>(
        <div key={p.id} style={{background:C.s1,border:`1px solid ${plan===p.id?p.color:C.b1}`,borderRadius:14,padding:"20px",boxShadow:plan===p.id?`0 0 30px ${p.color}20`:"none"}}>
          {plan===p.id&&<div style={{marginBottom:8}}><Tag text="Current Plan" color={p.color}/></div>}
          <div style={{fontSize:19,fontWeight:800,fontFamily:FD,color:p.color,margin:"10px 0 4px"}}>{p.id}</div>
          <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>{p.price}</div>
          {p.features.map(f=><div key={f} style={{fontSize:12.5,color:C.t2,marginBottom:7,display:"flex",gap:7}}><span style={{color:C.g}}>✓</span>{f}</div>)}
          <button onClick={()=>plan!==p.id&&setShowUpgrade(p.id)} style={{marginTop:16,width:"100%",padding:"10px",borderRadius:9,fontSize:12.5,fontWeight:600,fontFamily:FB,cursor:plan===p.id?"default":"pointer",background:plan===p.id?"transparent":p.color,color:plan===p.id?p.color:"#fff",border:`1px solid ${p.color}`}}>
            {plan===p.id?"Current Plan":PLANS.findIndex(x=>x.id===p.id)<PLANS.findIndex(x=>x.id===plan)?"Downgrade →":"Upgrade →"}
          </button>
        </div>
      ))}
    </div>}

    {btab==="payment"&&<div>
      {/* Current method */}
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"20px",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Payment Method</div>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`}}>
          <div style={{width:48,height:32,borderRadius:6,background:`linear-gradient(135deg,${C.a},${C.p})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{payMethod.brand}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>•••• •••• •••• {payMethod.last4}</div><div style={{fontSize:11,color:C.t3}}>{payMethod.name} · Exp {payMethod.expiry}</div></div>
          <Tag text="Default" color={C.g}/>
          <Btn ch="Edit" v="ghost" sm onClick={()=>{setPayCard("");setPayExp("");setPayCvv("");setPayName(payMethod.name);setShowPayEdit(true);}}/>
        </div>
      </div>
      {/* Billing address */}
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"20px"}}>
        <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Billing Address</div>
        {[{l:"Name",v:"SupportDesk Pvt Ltd"},{l:"Address",v:"123 Tech Park, HSR Layout"},{l:"City",v:"Bengaluru, Karnataka 560102"},{l:"Country",v:"India"},{l:"GSTIN",v:"29AABCS1234F1Z5"}].map(r=>(
          <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <span style={{fontSize:12,color:C.t3}}>{r.l}</span>
            <span style={{fontSize:12,fontWeight:600}}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>}

    {btab==="invoices"&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 0.8fr 0.6fr 60px",padding:"10px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
        {["Invoice","Period","Amount","Status",""].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM}}>{h}</span>)}
      </div>
      {INVOICES.map(inv=>(
        <div key={inv.id} style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 0.8fr 0.6fr 60px",padding:"12px 18px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:600,fontFamily:FM,color:C.a}}>{inv.id}</span>
          <span style={{fontSize:12,color:C.t2}}>{inv.month}</span>
          <span style={{fontSize:13,fontWeight:700}}>{inv.amount}</span>
          <Tag text={inv.status} color={inv.status==="paid"?C.g:C.y}/>
          <button onClick={()=>showT(`Downloading ${inv.id}.pdf…`,"info")} style={{fontSize:10,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:FM}}>↓ PDF</button>
        </div>
      ))}
    </div>}

    {btab==="usage"&&<div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Usage This Month</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
          {[{l:"Agents",used:4,total:25,c:C.a},{l:"Inboxes",used:3,total:10,c:C.cy},{l:"Conversations",used:224,total:999,c:C.g},{l:"AI Credits",used:342,total:1000,c:C.p}].map(u=>(
            <div key={u.l} style={{background:C.s2,borderRadius:10,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:u.c}}>{u.used}</div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:6}}>of {u.total===999?"∞":u.total} {u.l.toLowerCase()}</div>
              <div style={{height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:`${Math.min((u.used/u.total)*100,100)}%`,height:"100%",background:u.c,borderRadius:3}}/></div>
              <div style={{fontSize:9,color:u.used/u.total>0.8?C.r:C.t3,fontFamily:FM,marginTop:4}}>{Math.round(u.used/u.total*100)}% used</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px"}}>
        <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Daily Usage Trend</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
          {[12,18,22,15,28,34,31,24,19,27,32,38,25,20].map((v,i)=>(
            <div key={i} style={{flex:1,background:v>30?C.a:C.a+"66",borderRadius:"3px 3px 0 0",height:`${(v/40)*100}%`,transition:"height .5s"}} title={`Day ${i+1}: ${v} conversations`}/>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:8,color:C.t3,fontFamily:FM}}>1</span><span style={{fontSize:8,color:C.t3,fontFamily:FM}}>14</span></div>
      </div>
    </div>}

    {/* Upgrade modal */}
    {showUpgrade&&<Mdl title={PLANS.findIndex(x=>x.id===showUpgrade)<PLANS.findIndex(x=>x.id===plan)?`Downgrade to ${showUpgrade}`:`Upgrade to ${showUpgrade}`} onClose={()=>setShowUpgrade(null)} w={420}>
      <p style={{fontSize:14,color:C.t2,marginBottom:18,lineHeight:1.6}}>You're changing from <strong style={{color:C.t1}}>{plan}</strong> to <strong style={{color:PLANS.find(p=>p.id===showUpgrade)?.color}}>{showUpgrade}</strong>.</p>
      {showUpgrade!=="Enterprise"&&showUpgrade!=="Starter"&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px",marginBottom:18}}>
        <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginBottom:8}}>PAYMENT SUMMARY</div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,color:C.t2}}>{showUpgrade} Plan</span><span style={{fontSize:13,fontWeight:600}}>₹{PLANS.find(p=>p.id===showUpgrade)?.mo?.toLocaleString()}/mo</span></div>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.t2}}>GST (18%)</span><span style={{fontSize:13,color:C.t3}}>₹{Math.round((PLANS.find(p=>p.id===showUpgrade)?.mo||0)*0.18).toLocaleString()}</span></div>
        <div style={{height:1,background:C.b1,margin:"10px 0"}}/>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:14,fontWeight:700}}>Total</span><span style={{fontSize:14,fontWeight:700,color:C.g}}>₹{Math.round((PLANS.find(p=>p.id===showUpgrade)?.mo||0)*1.18).toLocaleString()}/mo</span></div>
        <div style={{marginTop:10,fontSize:11,color:C.t3}}>Charged to {payMethod.brand} •••• {payMethod.last4}</div>
      </div>}
      {showUpgrade==="Starter"&&<div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:10,padding:"14px",marginBottom:18,fontSize:12,color:C.t2}}>Downgrading to Starter will remove access to: AI Copilot, advanced reports, automations, and extra channels. Your data will be retained for 30 days.</div>}
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>setShowUpgrade(null)}/>
        <Btn ch={showUpgrade==="Enterprise"?"Contact Sales →":"Confirm Change →"} v="primary" onClick={()=>{setPlan(showUpgrade);setShowUpgrade(null);showT(`Changed to ${showUpgrade}!`,"success");}}/>
      </div>
    </Mdl>}

    {/* Payment edit modal */}
    {showPayEdit&&<Mdl title="Update Payment Method" onClose={()=>setShowPayEdit(false)} w={420}>
      <Fld label="Card Number"><Inp val={payCard} set={setPayCard} ph="4242 4242 4242 4242"/></Fld>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}}><Fld label="Expiry"><Inp val={payExp} set={setPayExp} ph="MM/YY"/></Fld></div>
        <div style={{flex:1}}><Fld label="CVV"><Inp val={payCvv} set={setPayCvv} ph="•••" type="password"/></Fld></div>
      </div>
      <Fld label="Cardholder Name"><Inp val={payName} set={setPayName} ph="Name on card"/></Fld>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn ch="Cancel" v="ghost" onClick={()=>setShowPayEdit(false)}/>
        <Btn ch="Save Card" v="primary" onClick={()=>{if(!payCard.trim()||!payExp.trim())return showT("Fill all fields","error");setPayMethod({type:"card",brand:payCard.startsWith("4")?"Visa":"Mastercard",last4:payCard.slice(-4),expiry:payExp,name:payName||"Priya Sharma"});setShowPayEdit(false);showT("Payment method updated","success");}}/>
      </div>
    </Mdl>}
  </div>;
}

