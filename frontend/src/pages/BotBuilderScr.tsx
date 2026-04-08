import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── AI CHATBOT FLOW BUILDER ──────────────────────────────────────────────
export default function BotBuilderScr(){
  const NODE_TYPES=[
    {t:"trigger",l:"Trigger",d:"Start the flow",icon:"⚡",c:C.g,fields:["trigger_event"]},
    {t:"message",l:"Send Message",d:"Bot sends text",icon:"💬",c:C.a,fields:["text","delay"]},
    {t:"buttons",l:"Button Menu",d:"Show clickable options",icon:"🔘",c:C.cy,fields:["text","buttons"]},
    {t:"condition",l:"Condition",d:"If/else branch",icon:"🔀",c:C.y,fields:["condition","yes_label","no_label"]},
    {t:"collect",l:"Collect Input",d:"Ask user for data",icon:"📝",c:"#ff6b35",fields:["field","validation"]},
    {t:"ai",l:"AI Response",d:"Claude answers",icon:"✦",c:C.p,fields:["prompt","model","fallback"]},
    {t:"api",l:"API Call",d:"Call external API",icon:"🔌",c:C.cy,fields:["url","method","headers"]},
    {t:"assign",l:"Assign Agent",d:"Route to human",icon:"👤",c:C.r,fields:["team","method"]},
    {t:"tag",l:"Add Tag",d:"Label the conversation",icon:"🏷",c:C.y,fields:["tag"]},
    {t:"delay",l:"Wait",d:"Pause before next",icon:"⏱",c:C.t3,fields:["duration"]},
    {t:"close",l:"Close Chat",d:"End conversation",icon:"✅",c:C.g,fields:["message"]},
    {t:"transfer",l:"Transfer",d:"Move to team/inbox",icon:"↗",c:C.a,fields:["target"]}
  ];
  const TRIGGERS=["Customer opens chat","Message received","Page visit","Button clicked","Keyword match","Off-hours message","Returning visitor","Cart abandoned","No agent available","Custom event"];
  const TEMPLATES=[
    {id:"bt1",name:"Welcome & Route",desc:"Greet → ask intent → route to team",nodes:[
      {id:"n1",type:"trigger",label:"Customer Opens Chat",config:{trigger_event:"Customer opens chat"}},
      {id:"n2",type:"message",label:"Hi! 👋 Welcome to SupportDesk. How can I help?",config:{text:"Hi! 👋 Welcome to SupportDesk. How can I help?",delay:"0"}},
      {id:"n3",type:"buttons",label:"Choose a topic",config:{text:"What do you need help with?",buttons:["Billing","Technical Support","Sales","Other"]}},
      {id:"n4",type:"condition",label:"Is Billing?",config:{condition:"button == Billing",yes_label:"Yes",no_label:"No"}},
      {id:"n5",type:"ai",label:"AI: Answer billing FAQ",config:{prompt:"Answer billing questions helpfully",model:"claude-sonnet",fallback:"Let me connect you to our billing team."}},
      {id:"n6",type:"assign",label:"Route to Support Team",config:{team:"Support",method:"round_robin"}}
    ]},
    {id:"bt2",name:"Lead Qualifier",desc:"Collect info → qualify → assign sales",nodes:[
      {id:"n1",type:"trigger",label:"Visitor on pricing page",config:{trigger_event:"Page visit"}},
      {id:"n2",type:"message",label:"Interested in our plans?",config:{text:"I see you're checking out our pricing! Want me to help find the right plan?",delay:"3"}},
      {id:"n3",type:"collect",label:"Ask company name",config:{field:"company",validation:"required"}},
      {id:"n4",type:"collect",label:"Ask team size",config:{field:"team_size",validation:"number"}},
      {id:"n5",type:"condition",label:"Team > 10?",config:{condition:"team_size > 10",yes_label:"Enterprise",no_label:"Starter/Pro"}},
      {id:"n6",type:"assign",label:"Assign to Sales",config:{team:"Sales",method:"round_robin"}},
      {id:"n7",type:"message",label:"Try self-serve",config:{text:"Check out our Pro plan at supportdesk.app/pricing!"}}
    ]},
    {id:"bt3",name:"Off-Hours Bot",desc:"Auto-reply when team is offline",nodes:[
      {id:"n1",type:"trigger",label:"Off-hours message",config:{trigger_event:"Off-hours message"}},
      {id:"n2",type:"message",label:"We're offline",config:{text:"Thanks for reaching out! Our team is currently offline. We'll respond within 4 hours.",delay:"0"}},
      {id:"n3",type:"collect",label:"Get email",config:{field:"email",validation:"email"}},
      {id:"n4",type:"tag",label:"Tag as after-hours",config:{tag:"after-hours"}},
      {id:"n5",type:"close",label:"Close with promise",config:{message:"We'll email you as soon as we're back!"}}
    ]}
  ];
  const [bots,setBots]=useState([
    {id:"bot1",name:"Welcome Bot",desc:"Default greeting and routing flow",status:"active",template:"bt1",nodes:TEMPLATES[0].nodes,stats:{triggered:2840,completed:2120,handoff:480,avgTime:"45s"}},
    {id:"bot2",name:"Sales Qualifier",desc:"Qualify leads on pricing page",status:"draft",template:"bt2",nodes:TEMPLATES[1].nodes,stats:{triggered:0,completed:0,handoff:0,avgTime:"—"}},
    {id:"bot3",name:"After Hours",desc:"Auto-reply when offline",status:"active",template:"bt3",nodes:TEMPLATES[2].nodes,stats:{triggered:890,completed:820,handoff:70,avgTime:"32s"}}
  ]);
  const [activeBot,setActiveBot]=useState(null);
  const [sel,setSel]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [showNewBot,setShowNewBot]=useState(false);
  const [newBotName,setNewBotName]=useState("");const [newBotDesc,setNewBotDesc]=useState("");const [newBotTpl,setNewBotTpl]=useState("bt1");
  const [testMode,setTestMode]=useState(false);const [testStep,setTestStep]=useState(0);const [testInput,setTestInput]=useState("");const [testMsgs,setTestMsgs]=useState([]);
  const [editLabel,setEditLabel]=useState("");
  const [viewTab,setViewTab]=useState("flow"); // flow | test | analytics
  const colors=NODE_TYPES.reduce((m,n)=>{m[n.t]=n.c;return m;},{});
  const icons=NODE_TYPES.reduce((m,n)=>{m[n.t]=n.icon;return m;},{});
  const bot=bots.find(b=>b.id===activeBot);

  const createBot=()=>{
    if(!newBotName.trim())return showT("Name required","error");
    const tpl=TEMPLATES.find(t=>t.id===newBotTpl);
    const nb={id:"bot"+uid(),name:newBotName,desc:newBotDesc,status:"draft",template:newBotTpl,nodes:tpl?tpl.nodes.map(n=>({...n,id:"n"+uid()})):[{id:"n"+uid(),type:"trigger",label:"Start",config:{trigger_event:"Customer opens chat"}}],stats:{triggered:0,completed:0,handoff:0,avgTime:"—"}};
    setBots(p=>[nb,...p]);setActiveBot(nb.id);setShowNewBot(false);setNewBotName("");setNewBotDesc("");showT("Bot created!","success");
  };
  const addNode=type=>{if(!bot)return;const nt=NODE_TYPES.find(n=>n.t===type);const nn={id:"n"+uid(),type,label:nt?.l||type,config:{}};setBots(p=>p.map(b=>b.id===activeBot?{...b,nodes:[...b.nodes,nn]}:b));setShowAdd(false);setSel(nn.id);showT("Node added","success");};
  const delNode=id=>{setBots(p=>p.map(b=>b.id===activeBot?{...b,nodes:b.nodes.filter(n=>n.id!==id)}:b));setSel(null);showT("Deleted","success");};
  const updateNode=(id,patch)=>setBots(p=>p.map(b=>b.id===activeBot?{...b,nodes:b.nodes.map(n=>n.id===id?{...n,...patch}:n)}:b));
  const moveNode=(id,dir)=>setBots(p=>p.map(b=>{if(b.id!==activeBot)return b;const i=b.nodes.findIndex(n=>n.id===id);if(i<0||(dir===-1&&i===0)||(dir===1&&i>=b.nodes.length-1))return b;const nn=[...b.nodes];[nn[i],nn[i+dir]]=[nn[i+dir],nn[i]];return{...b,nodes:nn};}));
  const dupBot=b2=>{setBots(p=>[{...b2,id:"bot"+uid(),name:b2.name+" (Copy)",status:"draft",stats:{triggered:0,completed:0,handoff:0,avgTime:"—"}},...p]);showT("Duplicated","success");};
  const delBot=id=>{setBots(p=>p.filter(b=>b.id!==id));if(activeBot===id)setActiveBot(null);showT("Bot deleted","success");};
  const toggleBot=id=>setBots(p=>p.map(b=>b.id===id?{...b,status:b.status==="active"?"draft":"active"}:b));
  // Test mode
  const startTest=()=>{setTestMode(true);setTestStep(0);setTestMsgs([{from:"system",text:"Bot test started…"}]);if(bot?.nodes[0])setTestMsgs([{from:"bot",text:bot.nodes[0].label}]);};
  const testNext=()=>{const next=testStep+1;if(!bot||next>=bot.nodes.length){setTestMsgs(p=>[...p,{from:"system",text:"✅ Flow complete!"}]);return;}const n=bot.nodes[next];setTestStep(next);setTestMsgs(p=>[...p,{from:n.type==="collect"?"bot-ask":"bot",text:n.label}]);};
  const testReply=()=>{if(!testInput.trim())return;setTestMsgs(p=>[...p,{from:"user",text:testInput}]);setTestInput("");testNext();};
  const selNode=bot?.nodes.find(n=>n.id===sel);

  // ═══ LIST VIEW ═══
  if(!activeBot)return <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <div><h2 style={{fontSize:20,fontWeight:800,fontFamily:FD}}>Bot Builder</h2><p style={{fontSize:13,color:C.t3,marginTop:4}}>Create visual chatbot flows — no code required</p></div>
      <Btn ch="+ Create Bot" v="primary" onClick={()=>{setNewBotName("");setNewBotDesc("");setNewBotTpl("bt1");setShowNewBot(true);}}/>
    </div>
    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
      {[{l:"Total Bots",v:bots.length,c:C.a},{l:"Active",v:bots.filter(b=>b.status==="active").length,c:C.g},{l:"Triggered",v:bots.reduce((s,b)=>s+b.stats.triggered,0).toLocaleString(),c:C.cy},{l:"Handoff Rate",v:Math.round(bots.reduce((s,b)=>s+b.stats.handoff,0)/Math.max(bots.reduce((s,b)=>s+b.stats.triggered,0),1)*100)+"%",c:C.y}].map(k=>(
        <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"14px",textAlign:"center"}}>
          <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
          <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>{k.l}</div>
        </div>
      ))}
    </div>
    {/* Bot list */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      {/* Create card */}
      <div onClick={()=>setShowNewBot(true)} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",cursor:"pointer",minHeight:180}} className="hov">
        <div style={{width:48,height:48,borderRadius:14,background:C.ad,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,fontSize:22}}>🤖</div>
        <div style={{fontSize:14,fontWeight:700,color:C.a,fontFamily:FD}}>Create New Bot</div>
        <div style={{fontSize:11,color:C.t3,marginTop:4}}>Start from template or scratch</div>
      </div>
      {bots.map(b=>(
        <div key={b.id} style={{background:C.s1,border:`1px solid ${b.status==="active"?C.g+"44":C.b1}`,borderRadius:14,padding:"18px",cursor:"pointer"}} onClick={()=>{setActiveBot(b.id);setSel(null);setViewTab("flow");}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div><div style={{fontSize:15,fontWeight:700,fontFamily:FD}}>{b.name}</div><div style={{fontSize:11,color:C.t3,marginTop:3}}>{b.desc}</div></div>
            <div style={{display:"flex",gap:3}}>
              <Tag text={b.status} color={b.status==="active"?C.g:C.t3}/>
              <Toggle val={b.status==="active"} set={()=>toggleBot(b.id)}/>
            </div>
          </div>
          <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
            {b.nodes.slice(0,5).map(n=><span key={n.id} style={{fontSize:10,background:colors[n.type]+"18",color:colors[n.type],padding:"2px 6px",borderRadius:5,fontFamily:FM}}>{icons[n.type]} {n.type}</span>)}
            {b.nodes.length>5&&<span style={{fontSize:9,color:C.t3}}>+{b.nodes.length-5} more</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
            {[{l:"Triggered",v:b.stats.triggered},{l:"Completed",v:b.stats.completed},{l:"Handoff",v:b.stats.handoff},{l:"Avg Time",v:b.stats.avgTime}].map(s=>(
              <div key={s.l} style={{textAlign:"center",padding:"6px",background:C.s2,borderRadius:6}}>
                <div style={{fontSize:13,fontWeight:800,fontFamily:FM,color:C.t1}}>{typeof s.v==="number"?s.v.toLocaleString():s.v}</div>
                <div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:4,marginTop:10,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
            <Btn ch="Edit" v="ghost" sm onClick={()=>{setActiveBot(b.id);setSel(null);setViewTab("flow");}}/>
            <Btn ch="⧉" v="ghost" sm onClick={()=>dupBot(b)}/>
            <Btn ch="✕" v="danger" sm onClick={()=>delBot(b.id)}/>
          </div>
        </div>
      ))}
    </div>
    {/* Templates */}
    <div style={{fontSize:16,fontWeight:700,fontFamily:FD,marginBottom:12}}>Templates</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      {TEMPLATES.map(tpl=>(
        <div key={tpl.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:4}}>{tpl.name}</div>
          <div style={{fontSize:11,color:C.t3,marginBottom:10}}>{tpl.desc}</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:10}}>{tpl.nodes.map(n=><span key={n.id} style={{fontSize:14}}>{icons[n.type]}</span>)}</div>
          <Btn ch="Use Template" v="primary" sm full onClick={()=>{setNewBotName(tpl.name);setNewBotDesc(tpl.desc);setNewBotTpl(tpl.id);setShowNewBot(true);}}/>
        </div>
      ))}
    </div>
    {/* Create bot modal */}
    {showNewBot&&<Mdl title="Create New Bot" onClose={()=>setShowNewBot(false)} w={460}>
      <Fld label="Bot Name"><Inp val={newBotName} set={setNewBotName} ph="e.g. Welcome Bot"/></Fld>
      <Fld label="Description"><Inp val={newBotDesc} set={setNewBotDesc} ph="What does this bot do?"/></Fld>
      <Fld label="Start From Template">
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {TEMPLATES.map(t=>(
            <button key={t.id} onClick={()=>setNewBotTpl(t.id)} style={{flex:1,padding:"10px",borderRadius:8,background:newBotTpl===t.id?C.ad:C.s2,border:`1.5px solid ${newBotTpl===t.id?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"center",minWidth:120}}>
              <div style={{fontSize:12,fontWeight:700,color:newBotTpl===t.id?C.a:C.t1}}>{t.name}</div>
              <div style={{fontSize:9,color:C.t3,marginTop:2}}>{t.nodes.length} nodes</div>
            </button>
          ))}
          <button onClick={()=>setNewBotTpl("")} style={{flex:1,padding:"10px",borderRadius:8,background:!newBotTpl?C.ad:C.s2,border:`1.5px solid ${!newBotTpl?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"center",minWidth:120}}>
            <div style={{fontSize:12,fontWeight:700,color:!newBotTpl?C.a:C.t1}}>Blank</div>
            <div style={{fontSize:9,color:C.t3,marginTop:2}}>Start empty</div>
          </button>
        </div>
      </Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNewBot(false)}/><Btn ch="Create Bot" v="primary" onClick={createBot}/></div>
    </Mdl>}
  </div>;

  // ═══ EDITOR VIEW ═══
  return <div style={{flex:1,display:"flex",minWidth:0}}>
    {/* Left: Node list */}
    <div style={{width:260,background:C.s1,borderRight:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.b1}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
          <button onClick={()=>setActiveBot(null)} style={{fontSize:12,color:C.t3,background:C.s3,border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 8px",cursor:"pointer"}}>← Back</button>
          <div style={{flex:1}}/>
          <Tag text={bot.status} color={bot.status==="active"?C.g:C.t3}/>
          <Toggle val={bot.status==="active"} set={()=>toggleBot(activeBot)}/>
        </div>
        <div style={{fontSize:16,fontWeight:700,fontFamily:FD}}>{bot.name}</div>
        <div style={{fontSize:11,color:C.t3,marginTop:2}}>{bot.desc}</div>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`}}>
        {[["flow","Flow"],["test","Test"],["analytics","Stats"]].map(([id,l])=>(
          <button key={id} onClick={()=>{setViewTab(id);if(id==="test")startTest();}} style={{flex:1,padding:"8px",fontSize:10,fontWeight:700,fontFamily:FM,color:viewTab===id?C.a:C.t3,borderBottom:`2px solid ${viewTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"10px 12px"}}><Btn ch="+ Add Node" v="primary" full onClick={()=>setShowAdd(true)}/></div>
      <div style={{flex:1,overflowY:"auto",padding:"0 8px 8px"}}>
        <div style={{fontSize:9,color:C.t3,fontFamily:FM,padding:"4px 6px",letterSpacing:"0.5px"}}>NODES ({bot.nodes.length})</div>
        {bot.nodes.map((n,i)=>(
          <div key={n.id} draggable style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:8,background:sel===n.id?C.ad:C.s2,border:`1px solid ${sel===n.id?C.a+"44":C.b1}`,cursor:"pointer",marginBottom:4}} onClick={()=>setSel(n.id)}>
            <span style={{fontSize:14}}>{icons[n.type]}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11.5,fontWeight:600,color:sel===n.id?C.a:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</div>
              <div style={{fontSize:9,color:colors[n.type],fontFamily:FM}}>{n.type}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <button onClick={e=>{e.stopPropagation();moveNode(n.id,-1);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:7}}>▲</button>
              <button onClick={e=>{e.stopPropagation();moveNode(n.id,1);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:7}}>▼</button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Center: Canvas/Test/Analytics */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
      {viewTab==="flow"&&<div style={{flex:1,overflowY:"auto",padding:20}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          {bot.nodes.map((n,i)=>(
            <div key={n.id}>
              {i>0&&<div style={{display:"flex",justifyContent:"center",padding:"6px 0"}}><div style={{width:2,height:24,background:C.b2}}/></div>}
              <div onClick={()=>setSel(n.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",background:sel===n.id?colors[n.type]+"12":C.s1,border:`1.5px solid ${sel===n.id?colors[n.type]:C.b1}`,borderRadius:12,cursor:"pointer",transition:"all .15s",borderLeft:`4px solid ${colors[n.type]}`}}>
                <div style={{width:36,height:36,borderRadius:10,background:colors[n.type]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icons[n.type]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><Tag text={n.type} color={colors[n.type]}/><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>#{i+1}</span></div>
                  <div style={{fontSize:14,fontWeight:600,color:C.t1,marginTop:4}}>{n.label}</div>
                  {n.config?.text&&<div style={{fontSize:11,color:C.t3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.config.text}</div>}
                  {n.config?.buttons&&<div style={{display:"flex",gap:3,marginTop:4}}>{n.config.buttons.map((b,j)=><span key={j} style={{fontSize:9,background:C.s3,padding:"2px 6px",borderRadius:4,color:C.t2,fontFamily:FM}}>{b}</span>)}</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();delNode(n.id);}} style={{width:24,height:24,borderRadius:6,background:C.rd,border:"none",color:C.r,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              </div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"center",padding:"12px 0"}}>
            <button onClick={()=>setShowAdd(true)} style={{padding:"8px 20px",borderRadius:10,border:`2px dashed ${C.a}44`,background:"transparent",color:C.a,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:FD}}>+ Add Node</button>
          </div>
        </div>
      </div>}

      {viewTab==="test"&&<div style={{flex:1,display:"flex",flexDirection:"column",maxWidth:420,margin:"0 auto",width:"100%",padding:20}}>
        <div style={{fontSize:14,fontWeight:700,fontFamily:FD,textAlign:"center",marginBottom:12}}>🤖 Test: {bot.name}</div>
        <div style={{flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 16px",background:C.a,color:"#fff",fontSize:13,fontWeight:700}}>SupportDesk Bot</div>
          <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
            {testMsgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start",marginBottom:8}}>
                <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:m.from==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.from==="user"?C.a:m.from==="system"?C.s3:C.s2,color:m.from==="user"?"#fff":m.from==="system"?C.t3:C.t1,fontSize:13,lineHeight:1.5}}>
                  {m.from==="bot-ask"&&<span style={{fontSize:9,color:C.p,fontFamily:FM,display:"block",marginBottom:2}}>📝 Collecting input</span>}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:"10px 14px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:6}}>
            <input value={testInput} onChange={e=>setTestInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")testReply();}} placeholder="Type a response…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,outline:"none",fontFamily:FB}}/>
            <Btn ch="Send" v="primary" sm onClick={testReply}/>
            <Btn ch="Skip" v="ghost" sm onClick={testNext}/>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:10}}><Btn ch="Reset Test" v="ghost" sm onClick={startTest}/></div>
      </div>}

      {viewTab==="analytics"&&<div style={{flex:1,overflowY:"auto",padding:20}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[{l:"Triggered",v:bot.stats.triggered,c:C.a},{l:"Completed",v:bot.stats.completed,c:C.g},{l:"Handoff",v:bot.stats.handoff,c:C.y},{l:"Avg Time",v:bot.stats.avgTime,c:C.cy}].map(s=>(
            <div key={s.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:800,fontFamily:FD,color:s.c}}>{typeof s.v==="number"?s.v.toLocaleString():s.v}</div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px",marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:12}}>Completion Funnel</div>
          {bot.nodes.map((n,i)=>{const pct=Math.max(100-i*14,10);return(
            <div key={n.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:14,width:22}}>{icons[n.type]}</span>
              <span style={{fontSize:11,color:C.t2,width:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</span>
              <div style={{flex:1,height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:colors[n.type],borderRadius:4,transition:"width .5s"}}/></div>
              <span style={{fontSize:11,fontWeight:700,fontFamily:FM,color:colors[n.type],width:35,textAlign:"right"}}>{pct}%</span>
            </div>
          );})}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"18px"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:12}}>Node Performance</div>
          <div style={{display:"grid",gridTemplateColumns:"50px 1fr 60px 60px 60px",padding:"8px 0",borderBottom:`1px solid ${C.b1}`,fontFamily:FM,fontSize:9,color:C.t3}}>
            <span>Type</span><span>Label</span><span style={{textAlign:"right"}}>Reached</span><span style={{textAlign:"right"}}>Exited</span><span style={{textAlign:"right"}}>Time</span>
          </div>
          {bot.nodes.map((n,i)=>(
            <div key={n.id} style={{display:"grid",gridTemplateColumns:"50px 1fr 60px 60px 60px",padding:"8px 0",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
              <span style={{fontSize:14}}>{icons[n.type]}</span>
              <span style={{fontSize:12,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</span>
              <span style={{fontSize:11,fontFamily:FM,color:C.g,textAlign:"right"}}>{Math.max(bot.stats.triggered-i*180,50)}</span>
              <span style={{fontSize:11,fontFamily:FM,color:C.y,textAlign:"right"}}>{Math.round((i+1)*8)}</span>
              <span style={{fontSize:11,fontFamily:FM,color:C.t3,textAlign:"right"}}>{5+i*3}s</span>
            </div>
          ))}
        </div>
      </div>}
    </div>

    {/* Right: Node editor */}
    {sel&&selNode&&viewTab==="flow"&&<div style={{width:280,background:C.s1,borderLeft:`1px solid ${C.b1}`,padding:16,flexShrink:0,overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Edit Node</span><button onClick={()=>setSel(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button></div>
      <div style={{marginBottom:12}}><Tag text={selNode.type} color={colors[selNode.type]}/></div>
      <Fld label="Label"><Inp val={selNode.label} set={v=>updateNode(sel,{label:v})} ph="Node label"/></Fld>
      {/* Type-specific fields */}
      {selNode.type==="trigger"&&<Fld label="Trigger Event">
        <div style={{display:"flex",flexDirection:"column",gap:3}}>{TRIGGERS.map(tr=>(
          <button key={tr} onClick={()=>updateNode(sel,{config:{...selNode.config,trigger_event:tr}})} style={{padding:"6px 10px",borderRadius:6,fontSize:11,background:selNode.config?.trigger_event===tr?C.ad:C.s2,color:selNode.config?.trigger_event===tr?C.a:C.t2,border:`1px solid ${selNode.config?.trigger_event===tr?C.a+"44":C.b1}`,cursor:"pointer",textAlign:"left"}}>{tr}</button>
        ))}</div>
      </Fld>}
      {selNode.type==="message"&&<><Fld label="Message Text"><textarea value={selNode.config?.text||""} onChange={e=>updateNode(sel,{config:{...selNode.config,text:e.target.value}})} rows={4} placeholder="Bot message…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
        <Fld label={"Delay ("+((selNode.config?.delay)||"0")+"s)"}><input type="range" min="0" max="10" value={selNode.config?.delay||0} onChange={e=>updateNode(sel,{config:{...selNode.config,delay:e.target.value}})} style={{width:"100%",accentColor:C.a}}/></Fld>
      </>}
      {selNode.type==="buttons"&&<><Fld label="Prompt Text"><Inp val={selNode.config?.text||""} set={v=>updateNode(sel,{config:{...selNode.config,text:v}})} ph="What do you need?"/></Fld>
        <Fld label="Buttons">{(selNode.config?.buttons||[]).map((b,i)=>(
          <div key={i} style={{display:"flex",gap:4,marginBottom:4}}><Inp val={b} set={v=>{const nb=[...(selNode.config?.buttons||[])];nb[i]=v;updateNode(sel,{config:{...selNode.config,buttons:nb}});}} ph={"Option "+(i+1)}/><button onClick={()=>{const nb=(selNode.config?.buttons||[]).filter((_,j)=>j!==i);updateNode(sel,{config:{...selNode.config,buttons:nb}});}} style={{color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button></div>
        ))}<button onClick={()=>updateNode(sel,{config:{...selNode.config,buttons:[...(selNode.config?.buttons||[]),"New option"]}})} style={{fontSize:11,color:C.a,background:"none",border:`1px dashed ${C.a}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer",width:"100%"}}>+ Add Button</button></Fld>
      </>}
      {selNode.type==="condition"&&<><Fld label="Condition"><Inp val={selNode.config?.condition||""} set={v=>updateNode(sel,{config:{...selNode.config,condition:v}})} ph="e.g. intent == billing"/></Fld>
        <div style={{display:"flex",gap:8}}><div style={{flex:1}}><Fld label="Yes Path"><Inp val={selNode.config?.yes_label||"Yes"} set={v=>updateNode(sel,{config:{...selNode.config,yes_label:v}})}/></Fld></div>
        <div style={{flex:1}}><Fld label="No Path"><Inp val={selNode.config?.no_label||"No"} set={v=>updateNode(sel,{config:{...selNode.config,no_label:v}})}/></Fld></div></div>
      </>}
      {selNode.type==="collect"&&<><Fld label="Field Name"><Inp val={selNode.config?.field||""} set={v=>updateNode(sel,{config:{...selNode.config,field:v}})} ph="e.g. email, name"/></Fld>
        <Fld label="Validation"><Sel val={selNode.config?.validation||"none"} set={v=>updateNode(sel,{config:{...selNode.config,validation:v}})} opts={[{v:"none",l:"None"},{v:"required",l:"Required"},{v:"email",l:"Email"},{v:"number",l:"Number"},{v:"phone",l:"Phone"}]}/></Fld>
      </>}
      {selNode.type==="ai"&&<><Fld label="AI Prompt"><textarea value={selNode.config?.prompt||""} onChange={e=>updateNode(sel,{config:{...selNode.config,prompt:e.target.value}})} rows={3} placeholder="Instructions for AI…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
        <Fld label="Fallback Message"><Inp val={selNode.config?.fallback||""} set={v=>updateNode(sel,{config:{...selNode.config,fallback:v}})} ph="If AI can't answer…"/></Fld>
      </>}
      {selNode.type==="assign"&&<><Fld label="Team"><Inp val={selNode.config?.team||""} set={v=>updateNode(sel,{config:{...selNode.config,team:v}})} ph="e.g. Support, Sales"/></Fld>
        <Fld label="Method"><Sel val={selNode.config?.method||"round_robin"} set={v=>updateNode(sel,{config:{...selNode.config,method:v}})} opts={[{v:"round_robin",l:"Round Robin"},{v:"load_balanced",l:"Load Balanced"},{v:"manual",l:"Manual Queue"}]}/></Fld>
      </>}
      {selNode.type==="tag"&&<Fld label="Tag"><Inp val={selNode.config?.tag||""} set={v=>updateNode(sel,{config:{...selNode.config,tag:v}})} ph="e.g. vip, urgent"/></Fld>}
      {selNode.type==="delay"&&<Fld label={"Duration ("+(selNode.config?.duration||"5")+"s)"}><input type="range" min="1" max="60" value={selNode.config?.duration||5} onChange={e=>updateNode(sel,{config:{...selNode.config,duration:e.target.value}})} style={{width:"100%",accentColor:C.y}}/></Fld>}
      {selNode.type==="api"&&<><Fld label="URL"><Inp val={selNode.config?.url||""} set={v=>updateNode(sel,{config:{...selNode.config,url:v}})} ph="https://api.example.com"/></Fld>
        <Fld label="Method"><Sel val={selNode.config?.method||"GET"} set={v=>updateNode(sel,{config:{...selNode.config,method:v}})} opts={[{v:"GET",l:"GET"},{v:"POST",l:"POST"},{v:"PUT",l:"PUT"}]}/></Fld>
      </>}
      {selNode.type==="close"&&<Fld label="Closing Message"><Inp val={selNode.config?.message||""} set={v=>updateNode(sel,{config:{...selNode.config,message:v}})} ph="Thanks for chatting!"/></Fld>}
      {selNode.type==="transfer"&&<Fld label="Transfer To"><Inp val={selNode.config?.target||""} set={v=>updateNode(sel,{config:{...selNode.config,target:v}})} ph="Team or inbox name"/></Fld>}
      <div style={{marginTop:14}}><Btn ch="Delete Node" v="danger" full sm onClick={()=>delNode(sel)}/></div>
    </div>}

    {/* Add node modal */}
    {showAdd&&<Mdl title="Add Node" onClose={()=>setShowAdd(false)} w={480}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {NODE_TYPES.map(n=>(
          <button key={n.t} onClick={()=>addNode(n.t)} className="hov" style={{padding:"14px 10px",borderRadius:10,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"center",transition:"all .1s"}}>
            <div style={{fontSize:24,marginBottom:6}}>{n.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:n.c}}>{n.l}</div>
            <div style={{fontSize:10,color:C.t3,marginTop:2}}>{n.d}</div>
          </button>
        ))}
      </div>
    </Mdl>}
  </div>;
}


