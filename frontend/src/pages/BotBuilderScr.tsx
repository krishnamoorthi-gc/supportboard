import { useState, useEffect, useRef } from "react";
import { C, FD, FB, FM, api, uid, showT, Btn, Inp, Sel, Mdl, Fld, Tag, Toggle, Spin } from "../shared";

// ─── CHAT DETAIL (agent can reply) ──────────────────────────────────────
function ChatDetail({chat,setViewChat,api,backendOrigin,bot}:any){
  const [msgs,setMsgs]=useState(chat.messages||[]);
  const [reply,setReply]=useState("");
  const [sending,setSending]=useState(false);
  const [status,setStatus]=useState(chat.status||"active");
  const scrollRef=useRef<HTMLDivElement>(null);
  const pollRef=useRef<any>(null);

  const scrollDown=()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;};
  useEffect(()=>{scrollDown();},[msgs]);

  // Poll for new messages every 3s
  useEffect(()=>{
    const poll=async()=>{
      try{
        const r=await api.get(`/settings/bot-chats/${chat.id}`);
        if(r?.chat){
          setMsgs(r.chat.messages||[]);
          setStatus(r.chat.status||"active");
        }
      }catch{}
    };
    pollRef.current=setInterval(poll,3000);
    return()=>{if(pollRef.current)clearInterval(pollRef.current);};
  },[chat.id]);

  const sendReply=async()=>{
    if(!reply.trim()||sending)return;
    setSending(true);
    try{
      const r=await api.post(`/settings/bot-chats/${chat.id}/reply`,{message:reply.trim()});
      if(r?.messages){setMsgs(r.messages);setStatus("agent_connected");}
      setReply("");
    }catch{showT("Failed to send","error");}
    setSending(false);
  };

  const statusLabel:any={"active":"Bot Active","waiting_agent":"Waiting for Agent","agent_connected":"Agent Connected","closed":"Closed"};
  const statusColor:any={"active":C.g,"waiting_agent":C.y,"agent_connected":C.a,"closed":C.t3};

  return(<div>
    <button onClick={()=>setViewChat(null)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:C.a,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:FM,marginBottom:12,padding:0}}>← Back to all chats</button>
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column",height:"calc(100vh - 200px)",maxHeight:620}}>
      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:32,height:32,borderRadius:8,background:statusColor[status]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
          {status==="waiting_agent"?"🔔":status==="agent_connected"?"👤":"💬"}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700}}>{chat.visitor_name||"Visitor"}</div>
          <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{chat.visitor_email||"No email"} · {new Date(chat.created_at).toLocaleString()}</div>
        </div>
        <Tag text={statusLabel[status]||status} color={statusColor[status]||C.t3}/>
      </div>
      {/* Messages */}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:16,background:"#f9f9fb"}}>
        {msgs.map((m:any,i:number)=>(
          <div key={i} style={{marginBottom:8}}>
            {m.f==="sys"&&<div style={{textAlign:"center",fontSize:10,color:C.t3,fontFamily:FM,padding:"3px 0"}}>{m.t}</div>}
            {m.f==="user"&&<div style={{display:"flex",justifyContent:"flex-end"}}>
              <div style={{maxWidth:"80%"}}>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM,textAlign:"right",marginBottom:2}}>{chat.visitor_name||"Visitor"}</div>
                <div style={{padding:"8px 12px",borderRadius:"12px 12px 2px 12px",background:C.a,color:"#fff",fontSize:12,lineHeight:1.5}}>{m.t}</div>
              </div>
            </div>}
            {m.f==="agent"&&<div style={{display:"flex",justifyContent:"flex-start"}}>
              <div style={{maxWidth:"80%"}}>
                <div style={{fontSize:9,color:C.p,fontFamily:FM,marginBottom:2}}>👤 {m.agent_name||"Agent"}</div>
                <div style={{padding:"8px 12px",borderRadius:"12px 12px 12px 2px",background:"#ede9fe",border:`1px solid #c4b5fd`,fontSize:12,lineHeight:1.5,color:"#1e1b4b"}}>{m.t}</div>
              </div>
            </div>}
            {(m.f==="bot"||m.f==="ai"||m.f==="kb"||m.f==="ask")&&<div style={{display:"flex",justifyContent:"flex-start"}}>
              <div style={{maxWidth:"80%"}}>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:2}}>
                  {m.f==="ai"?"✦ AI":m.f==="kb"?"📚 KB":"🤖 Bot"}
                </div>
                <div style={{padding:"8px 12px",borderRadius:"12px 12px 12px 2px",background:"#fff",border:`1px solid ${C.b1}`,fontSize:12,lineHeight:1.5}}>{m.t}</div>
              </div>
            </div>}
          </div>
        ))}
        {msgs.length===0&&<div style={{textAlign:"center",padding:20,color:C.t3,fontSize:12}}>No messages yet.</div>}
      </div>
      {/* Reply input */}
      <div style={{padding:"12px 14px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:8,background:"#fff",flexShrink:0}}>
        <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)sendReply();}} placeholder="Type a reply as agent…" style={{flex:1,border:`1.5px solid ${C.b1}`,borderRadius:10,padding:"9px 13px",fontSize:13,outline:"none",fontFamily:FB,color:C.t1}}/>
        <button onClick={sendReply} disabled={sending||!reply.trim()} style={{padding:"0 16px",borderRadius:10,background:C.a,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:sending?"default":"pointer",opacity:sending||!reply.trim()?0.5:1}}>
          {sending?"…":"Send"}
        </button>
      </div>
    </div>
  </div>);
}

// ─── AI CHATBOT FLOW BUILDER ──────────────────────────────────────────────
export default function BotBuilderScr(){
  const NODE_TYPES=[
    {t:"trigger",l:"Trigger",d:"Start the flow",icon:"⚡",c:C.g},
    {t:"message",l:"Send Message",d:"Bot sends text",icon:"💬",c:C.a},
    {t:"buttons",l:"Button Menu",d:"Show clickable options",icon:"🔘",c:C.cy},
    {t:"condition",l:"Condition",d:"If/else branch",icon:"🔀",c:C.y},
    {t:"collect",l:"Collect Input",d:"Ask user for data",icon:"📝",c:"#ff6b35"},
    {t:"ai",l:"AI Response",d:"Claude answers",icon:"✦",c:C.p},
    {t:"api",l:"API Call",d:"Call external API",icon:"🔌",c:C.cy},
    {t:"assign",l:"Assign Agent",d:"Route to human",icon:"👤",c:C.r},
    {t:"tag",l:"Add Tag",d:"Label the conversation",icon:"🏷",c:C.y},
    {t:"delay",l:"Wait",d:"Pause before next",icon:"⏱",c:C.t3},
    {t:"close",l:"Close Chat",d:"End conversation",icon:"✅",c:C.g},
    {t:"transfer",l:"Transfer",d:"Move to team/inbox",icon:"↗",c:C.a}
  ];
  const TRIGGERS=["Customer opens chat","Message received","Page visit","Button clicked","Keyword match","Off-hours message","Returning visitor","Cart abandoned","No agent available","Custom event"];
  const TEMPLATES=[
    {id:"bt1",name:"Welcome & Route",desc:"Greet → ask intent → route to team",nodes:[
      {id:"n1",type:"trigger",label:"Customer Opens Chat",config:{trigger_event:"Customer opens chat"}},
      {id:"n2",type:"message",label:"Hi! 👋 Welcome! How can I help?",config:{text:"Hi! 👋 Welcome! How can I help?",delay:"0"}},
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
      {id:"n7",type:"message",label:"Try self-serve",config:{text:"Check out our pricing page!"}}
    ]},
    {id:"bt3",name:"Off-Hours Bot",desc:"Auto-reply when team is offline",nodes:[
      {id:"n1",type:"trigger",label:"Off-hours message",config:{trigger_event:"Off-hours message"}},
      {id:"n2",type:"message",label:"We're offline",config:{text:"Thanks for reaching out! Our team is offline. We'll respond within 4 hours.",delay:"0"}},
      {id:"n3",type:"collect",label:"Get email",config:{field:"email",validation:"email"}},
      {id:"n4",type:"tag",label:"Tag as after-hours",config:{tag:"after-hours"}},
      {id:"n5",type:"close",label:"Close with promise",config:{message:"We'll email you as soon as we're back!"}}
    ]}
  ];

  // ── State ──
  const [bots,setBots]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [activeBot,setActiveBot]=useState(null);
  const [sel,setSel]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [showNewBot,setShowNewBot]=useState(false);
  const [newBotName,setNewBotName]=useState("");
  const [newBotDesc,setNewBotDesc]=useState("");
  const [newBotTpl,setNewBotTpl]=useState("bt1");
  const [testStep,setTestStep]=useState(0);
  const [testInput,setTestInput]=useState("");
  const [testMsgs,setTestMsgs]=useState([]);
  const [lastButtonClick,setLastButtonClick]=useState("");
  const [viewTab,setViewTab]=useState("flow");
  // Knowledge
  const [newKbTitle,setNewKbTitle]=useState("");
  const [newKbContent,setNewKbContent]=useState("");
  const [editKbId,setEditKbId]=useState(null);
  const [editKbTitle,setEditKbTitle]=useState("");
  const [editKbContent,setEditKbContent]=useState("");
  const [kbUploading,setKbUploading]=useState(false);
  const kbFileRef=useRef(null);
  // Setup
  const [setupDirty,setSetupDirty]=useState(false);
  // Publish
  const [copied,setCopied]=useState("");
  // Chat history
  const [botChats,setBotChats]=useState([]);
  const [chatLoading,setChatLoading]=useState(false);
  const [viewChat,setViewChat]=useState(null);
  const loadBotChats=async()=>{
    if(!activeBot)return;
    setChatLoading(true);
    try{const r=await api.get(`/settings/bot-chats?bot_id=${activeBot}`);setBotChats(r.chats||[]);}catch{}
    setChatLoading(false);
  };
  // Live sessions
  const [liveSessions,setLiveSessions]=useState([]);
  const liveTimer=useRef(null);

  const colors=NODE_TYPES.reduce((m,n)=>{m[n.t]=n.c;return m;},{});
  const icons=NODE_TYPES.reduce((m,n)=>{m[n.t]=n.icon;return m;},{});
  const bot=bots.find(b=>b.id===activeBot);

  // ── Load bots ──
  useEffect(()=>{loadBots();},[]);

  // ── Live session polling when on live tab ──
  useEffect(()=>{
    if(viewTab==="live"&&activeBot){
      pollLive();
      liveTimer.current=setInterval(pollLive,5000);
    }
    return()=>{if(liveTimer.current)clearInterval(liveTimer.current);};
  },[viewTab,activeBot]);

  const loadBots=async()=>{
    setLoading(true);
    try{
      const data=await api.get("/settings/bots");
      if(data?.bots)setBots(data.bots);
    }catch(e){showT("Failed to load bots","error");}
    setLoading(false);
  };

  const pollLive=async()=>{
    if(!activeBot)return;
    try{
      const r=await api.get(`/settings/bot-chats?bot_id=${activeBot}`);
      const chats=(r.chats||[]).map((ch:any)=>{
        const msgs=ch.messages||[];
        const lastMsg=msgs.length>0?msgs[msgs.length-1]:null;
        const elapsed=ch.created_at?Math.floor((Date.now()-new Date(ch.created_at).getTime())/1000):0;
        const mins=Math.floor(elapsed/60);const secs=elapsed%60;
        return{
          id:ch.id,
          user:ch.visitor_name||ch.visitor_email||"Visitor",
          page:ch.visitor_email||"—",
          step:msgs.length+" msgs",
          status:ch.status||"active",
          time:`${mins}:${String(secs).padStart(2,"0")}`,
          msg:lastMsg?lastMsg.t:"No messages yet"
        };
      });
      setLiveSessions(chats);
    }catch{setLiveSessions([]);}
  };

  // ── CRUD ──
  const createBot=async()=>{
    if(!newBotName.trim())return showT("Name required","error");
    const tpl=TEMPLATES.find(t=>t.id===newBotTpl);
    const nodes=tpl?tpl.nodes.map(n=>({...n,id:"n"+uid()})):[{id:"n"+uid(),type:"trigger",label:"Start",config:{trigger_event:"Customer opens chat"}}];
    const setup={greeting:"Hi! How can I help you today?",tone:"friendly",fallback:"Let me connect you to a human agent.",collect_email:true,show_branding:true};
    try{
      const data=await api.post("/settings/bots",{name:newBotName,desc:newBotDesc,template:newBotTpl||null,nodes,knowledge:[],setup});
      if(data?.bot){
        setBots(p=>[data.bot,...p]);
        setActiveBot(data.bot.id);setSel(null);setViewTab("setup");
        setShowNewBot(false);setNewBotName("");setNewBotDesc("");setNewBotTpl("bt1");
        showT("Bot created! Configure setup now.","success");
      }
    }catch(e){showT("Failed to create bot","error");}
  };

  const saveBot=async(botId,patch,quiet=false)=>{
    setSaving(true);
    try{
      const data=await api.patch(`/settings/bots/${botId}`,patch);
      if(data?.bot)setBots(p=>p.map(b=>b.id===botId?{...b,...data.bot}:b));
      if(!quiet)showT("Saved!","success");
    }catch(e){showT("Failed to save","error");}
    setSaving(false);
  };

  const delBot=async(id)=>{
    try{
      await api.del(`/settings/bots/${id}`);
      setBots(p=>p.filter(b=>b.id!==id));
      if(activeBot===id)setActiveBot(null);
      showT("Bot deleted","success");
    }catch(e){showT("Failed to delete","error");}
  };

  const dupBot=async(b2)=>{
    try{
      const data=await api.post("/settings/bots",{name:b2.name+" (Copy)",desc:b2.desc||b2.description,template:b2.template,nodes:(b2.nodes||[]).map(n=>({...n,id:"n"+uid()})),knowledge:b2.knowledge||[],setup:b2.setup||{}});
      if(data?.bot)setBots(p=>[data.bot,...p]);
      showT("Duplicated","success");
    }catch(e){showT("Failed to duplicate","error");}
  };

  const toggleBot=async(id)=>{
    const b=bots.find(x=>x.id===id);if(!b)return;
    const newStatus=b.status==="active"?"draft":"active";
    setBots(p=>p.map(x=>x.id===id?{...x,status:newStatus}:x));
    try{await api.patch(`/settings/bots/${id}`,{status:newStatus});}
    catch(e){setBots(p=>p.map(x=>x.id===id?{...x,status:b.status}:x));showT("Failed","error");}
  };

  // ── Node ops ──
  const addNode=type=>{
    if(!bot)return;
    const nt=NODE_TYPES.find(n=>n.t===type);
    const nn={id:"n"+uid(),type,label:nt?.l||type,config:{}};
    setBots(p=>p.map(b=>b.id===activeBot?{...b,nodes:[...b.nodes,nn]}:b));
    setShowAdd(false);setSel(nn.id);
  };
  const delNode=id=>{setBots(p=>p.map(b=>b.id===activeBot?{...b,nodes:b.nodes.filter(n=>n.id!==id)}:b));setSel(null);};
  const updateNode=(id,patch)=>setBots(p=>p.map(b=>b.id===activeBot?{...b,nodes:b.nodes.map(n=>n.id===id?{...n,...patch}:n)}:b));
  const moveNode=(id,dir)=>setBots(p=>p.map(b=>{
    if(b.id!==activeBot)return b;
    const i=b.nodes.findIndex(n=>n.id===id);
    if(i<0||(dir===-1&&i===0)||(dir===1&&i>=b.nodes.length-1))return b;
    const nn=[...b.nodes];[nn[i],nn[i+dir]]=[nn[i+dir],nn[i]];return{...b,nodes:nn};
  }));

  // ── Test mode ──
  const evalCond=(condition:string,lastInput:string,lastBtn:string):boolean=>{
    if(!condition)return true;
    const c=condition.toLowerCase().trim();
    const bm=c.match(/button\s*==\s*(.+)/);
    if(bm)return lastBtn.toLowerCase().trim()===bm[1].toLowerCase().trim();
    const tm=c.match(/(?:text|input)\s+(?:contains|==)\s*(.+)/);
    if(tm)return lastInput.toLowerCase().includes(tm[1].toLowerCase().trim());
    return true;
  };
  const runFlow=(fromIdx:number,msgs:any[],lastBtn:string,lastInput:string)=>{
    if(!bot)return;
    let ms=[...msgs];
    for(let i=fromIdx;i<bot.nodes.length;i++){
      const n=bot.nodes[i];
      if(n.type==="trigger"||n.type==="delay"){continue;}
      if(n.type==="condition"){
        const met=evalCond(n.config?.condition||"",lastInput,lastBtn);
        ms=[...ms,{from:"system",text:`🔀 ${n.label} → ${met?(n.config?.yes_label||"Yes"):(n.config?.no_label||"No")}`}];
        setTestMsgs(ms);setTestStep(i);
        if(!met){setTimeout(()=>runFlow(i+2,ms,lastBtn,lastInput),300);return;}
        continue;
      }
      if(n.type==="message"){
        ms=[...ms,{from:"bot",text:n.config?.text||n.label}];
        setTestMsgs(ms);setTestStep(i);continue;
      }
      if(n.type==="ai"){
        ms=[...ms,{from:"bot-ai",text:n.config?.prompt||n.label}];
        setTestMsgs(ms);setTestStep(i);continue;
      }
      if(n.type==="assign"){
        ms=[...ms,{from:"bot",text:`👤 ${n.label}${n.config?.team?` → ${n.config.team}`:""}`}];
        setTestMsgs(ms);setTestStep(i);continue;
      }
      if(n.type==="tag"){
        ms=[...ms,{from:"system",text:`🏷 Tag: ${n.config?.tag||n.label}`}];
        setTestMsgs(ms);setTestStep(i);continue;
      }
      if(n.type==="close"){
        ms=[...ms,{from:"bot",text:n.config?.message||n.label},{from:"system",text:"✅ Flow complete!"}];
        setTestMsgs(ms);setTestStep(i);return;
      }
      if(n.type==="buttons"){
        ms=[...ms,{from:"bot",text:n.config?.text||n.label,buttons:n.config?.buttons}];
        setTestMsgs(ms);setTestStep(i);return;
      }
      if(n.type==="collect"){
        ms=[...ms,{from:"bot-ask",text:`Please enter your ${n.config?.field||"response"}`}];
        setTestMsgs(ms);setTestStep(i);return;
      }
      ms=[...ms,{from:"bot",text:n.label}];setTestMsgs(ms);setTestStep(i);
    }
    setTestMsgs([...ms,{from:"system",text:"✅ Flow complete! Bot handled this conversation."}]);
  };
  const startTest=()=>{
    setTestStep(0);setTestInput("");setLastButtonClick("");
    setTestMsgs([]);
    setTimeout(()=>runFlow(0,[],"",""),300);
  };
  const testReply=(txt?:string)=>{
    const msg=txt||testInput;if(!msg.trim())return;
    const curNode=bot?.nodes[testStep];
    const isBtn=curNode?.type==="buttons";
    const newBtn=isBtn?msg:lastButtonClick;
    if(isBtn)setLastButtonClick(msg);
    const newMsgs=[...testMsgs,{from:"user",text:msg}];
    setTestMsgs(newMsgs);setTestInput("");
    setTimeout(()=>runFlow(testStep+1,newMsgs,newBtn,msg),400);
  };

  // ── Knowledge ──
  const addKbText=async()=>{
    if(!newKbTitle.trim()||!newKbContent.trim())return showT("Title and content required","error");
    if(!bot)return;
    const item={id:"kb"+uid(),title:newKbTitle,content:newKbContent,type:"text",created_at:new Date().toISOString()};
    const knowledge=[...(bot.knowledge||[]),item];
    setBots(p=>p.map(b=>b.id===activeBot?{...b,knowledge}:b));
    setNewKbTitle("");setNewKbContent("");
    await saveBot(activeBot,{knowledge},true);
    showT("Knowledge added!","success");
  };

  const handleKbFile=async(e)=>{
    const file=e.target.files?.[0];if(!file||!bot)return;
    const allowed=["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/png","image/jpeg","image/gif","image/webp","text/plain"];
    if(!allowed.includes(file.type))return showT("Unsupported file. Use PDF, Word, image, or TXT","error");
    setKbUploading(true);
    try{
      const form=new FormData();form.append("file",file);
      const token=(window as any).__sdToken||localStorage.getItem("sd_token");
      const res=await fetch(`${import.meta.env.VITE_BACKEND_URL||"http://localhost:4002"}/api/upload`,{method:"POST",headers:{Authorization:"Bearer "+token},body:form});
      const uploaded=await res.json();
      const ext=file.name.split(".").pop()?.toLowerCase()||"";
      const fileType=ext==="pdf"?"pdf":["doc","docx"].includes(ext)?"word":["png","jpg","jpeg","gif","webp"].includes(ext)?"image":"text";
      const item={id:"kb"+uid(),title:file.name,content:`Uploaded ${fileType.toUpperCase()} file: ${file.name}`,type:fileType,url:uploaded.url,size:file.size,created_at:new Date().toISOString()};
      const knowledge=[...(bot.knowledge||[]),item];
      setBots(p=>p.map(b=>b.id===activeBot?{...b,knowledge}:b));
      await saveBot(activeBot,{knowledge},true);
      showT(`${fileType.toUpperCase()} uploaded to knowledge base!`,"success");
    }catch(e){showT("Upload failed","error");}
    setKbUploading(false);
    if(kbFileRef.current)kbFileRef.current.value="";
  };

  const delKb=async(kbId)=>{
    if(!bot)return;
    const knowledge=(bot.knowledge||[]).filter(k=>k.id!==kbId);
    setBots(p=>p.map(b=>b.id===activeBot?{...b,knowledge}:b));
    await saveBot(activeBot,{knowledge},true);
    showT("Removed","success");
  };

  const startEditKb=(k)=>{setEditKbId(k.id);setEditKbTitle(k.title);setEditKbContent(k.content);};
  const saveEditKb=async()=>{
    if(!bot||!editKbId)return;
    const knowledge=(bot.knowledge||[]).map(k=>k.id===editKbId?{...k,title:editKbTitle,content:editKbContent}:k);
    setBots(p=>p.map(b=>b.id===activeBot?{...b,knowledge}:b));
    setEditKbId(null);
    await saveBot(activeBot,{knowledge},true);
    showT("Updated!","success");
  };

  // ── Setup ──
  const updateSetup=(patch)=>{
    if(!bot)return;
    setBots(p=>p.map(b=>b.id===activeBot?{...b,setup:{...(b.setup||{}), ...patch}}:b));
    setSetupDirty(true);
  };
  const saveSetup=async()=>{await saveBot(activeBot,{setup:bot?.setup||{}});setSetupDirty(false);};

  // ── Publish ──
  const copyText=(text,key)=>{
    navigator.clipboard.writeText(text).then(()=>{setCopied(key);setTimeout(()=>setCopied(""),2500);});
  };
  const origin=window.location.origin;
  const backendOrigin=import.meta.env.VITE_BACKEND_URL||"http://localhost:4002";

  const selNode=bot?.nodes.find(n=>n.id===sel);
  const kbFileTypes="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,text/plain";
  const kbTypeIcon={pdf:"📄",word:"📝",image:"🖼️",text:"📋",default:"📎"};

  // ════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════
  if(!activeBot)return(
    <div style={{flex:1,padding:"24px 28px",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD}}>Bot Builder</h2>
          <p style={{fontSize:13,color:C.t3,marginTop:4}}>Design, train, and deploy intelligent agents across your channels</p>
        </div>
        <Btn ch="+ New Bot" v="primary" onClick={()=>{setNewBotName("");setNewBotDesc("");setNewBotTpl("bt1");setShowNewBot(true);}}/>
      </div>

      {loading?<div style={{display:"flex",justifyContent:"center",padding:60}}><Spin/></div>:<>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            {l:"Total Bots",v:bots.length,c:C.a},
            {l:"Active",v:bots.filter(b=>b.status==="active").length,c:C.g},
            {l:"Triggered",v:bots.reduce((s,b)=>s+(b.stats?.triggered||0),0).toLocaleString(),c:C.cy},
            {l:"Handoff Rate",v:Math.round(bots.reduce((s,b)=>s+(b.stats?.handoff||0),0)/Math.max(bots.reduce((s,b)=>s+(b.stats?.triggered||0),0),1)*100)+"%",c:C.y}
          ].map(k=>(
            <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Bot cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
          <div onClick={()=>setShowNewBot(true)} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",cursor:"pointer",minHeight:180}} className="hov">
            <div style={{width:48,height:48,borderRadius:14,background:C.ad,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,fontSize:22}}>🤖</div>
            <div style={{fontSize:14,fontWeight:700,color:C.a,fontFamily:FD}}>Create New Bot</div>
            <div style={{fontSize:11,color:C.t3,marginTop:4}}>Start from template or blank</div>
          </div>
          {bots.map(b=>(
            <div key={b.id} style={{background:C.s1,border:`1px solid ${b.status==="active"?C.g+"44":C.b1}`,borderRadius:14,padding:"18px",cursor:"pointer"}} onClick={()=>{setActiveBot(b.id);setSel(null);setViewTab("flow");}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,fontFamily:FD}}>{b.name}</div>
                  <div style={{fontSize:11,color:C.t3,marginTop:3}}>{b.description||b.desc}</div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <Tag text={b.status} color={b.status==="active"?C.g:C.t3}/>
                  <Toggle val={b.status==="active"} set={e=>{e?.stopPropagation?.();toggleBot(b.id);}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                {(b.nodes||[]).slice(0,5).map(n=>(
                  <span key={n.id} style={{fontSize:10,background:colors[n.type]+"18",color:colors[n.type],padding:"2px 6px",borderRadius:5,fontFamily:FM}}>{icons[n.type]} {n.type}</span>
                ))}
                {(b.nodes||[]).length>5&&<span style={{fontSize:9,color:C.t3}}>+{(b.nodes||[]).length-5} more</span>}
              </div>
              {/* KB badge */}
              {(b.knowledge||[]).length>0&&<div style={{fontSize:10,color:C.p,marginBottom:8,fontFamily:FM}}>📚 {b.knowledge.length} knowledge item{b.knowledge.length>1?"s":""}</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                {[{l:"Triggered",v:b.stats?.triggered||0},{l:"Completed",v:b.stats?.completed||0},{l:"Handoff",v:b.stats?.handoff||0},{l:"Avg Time",v:b.stats?.avgTime||"—"}].map(s=>(
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

        {/* Quick Start Templates */}
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:4}}>Quick Start Templates</div>
        <p style={{fontSize:12,color:C.t3,marginBottom:12}}>Click a template to instantly create a configured bot</p>
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
      </>}

      {showNewBot&&<Mdl title="Create New Bot" onClose={()=>setShowNewBot(false)} w={480}>
        <Fld label="Bot Name"><Inp val={newBotName} set={setNewBotName} ph="e.g. Welcome Bot"/></Fld>
        <Fld label="Description"><Inp val={newBotDesc} set={setNewBotDesc} ph="What does this bot do?"/></Fld>
        <Fld label="Start From Template">
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TEMPLATES.map(t=>(
              <button key={t.id} onClick={()=>setNewBotTpl(t.id)} style={{flex:1,padding:"10px",borderRadius:8,background:newBotTpl===t.id?C.ad:C.s2,border:`1.5px solid ${newBotTpl===t.id?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"center",minWidth:110}}>
                <div style={{fontSize:11,fontWeight:700,color:newBotTpl===t.id?C.a:C.t1}}>{t.name}</div>
                <div style={{fontSize:9,color:C.t3,marginTop:2}}>{t.nodes.length} nodes</div>
              </button>
            ))}
            <button onClick={()=>setNewBotTpl("")} style={{flex:1,padding:"10px",borderRadius:8,background:!newBotTpl?C.ad:C.s2,border:`1.5px solid ${!newBotTpl?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"center",minWidth:110}}>
              <div style={{fontSize:11,fontWeight:700,color:!newBotTpl?C.a:C.t1}}>Blank</div>
              <div style={{fontSize:9,color:C.t3,marginTop:2}}>Start empty</div>
            </button>
          </div>
        </Fld>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn ch="Cancel" v="ghost" onClick={()=>setShowNewBot(false)}/>
          <Btn ch="Create Bot" v="primary" onClick={createBot}/>
        </div>
      </Mdl>}
    </div>
  );

  // ════════════════════════════════════════════════════════
  // EDITOR VIEW
  // ════════════════════════════════════════════════════════
  const tabs=[["setup","Setup"],["flow","Flow"],["test","Preview"],["analytics","Stats"],["knowledge","Knowledge"],["publish","Publish"],["chats","Chats"],["live","Live"]];

  return(
    <div style={{flex:1,display:"flex",minWidth:0,height:"100%"}}>
      {/* Left sidebar */}
      <div style={{width:250,background:C.s1,borderRight:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <button onClick={()=>{setActiveBot(null);setSel(null);}} style={{fontSize:11,color:C.t3,background:C.s3,border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 8px",cursor:"pointer"}}>← Back</button>
            <div style={{flex:1}}/>
            <Tag text={bot.status} color={bot.status==="active"?C.g:C.t3}/>
            <Toggle val={bot.status==="active"} set={()=>toggleBot(activeBot)}/>
          </div>
          <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:2}}>{bot.name}</div>
          <div style={{fontSize:11,color:C.t3}}>{bot.description||bot.desc}</div>
        </div>
        {/* Nav tabs */}
        <div style={{padding:"6px 8px",borderBottom:`1px solid ${C.b1}`}}>
          {tabs.map(([id,l])=>(
            <button key={id} onClick={()=>{setViewTab(id);if(id==="test")startTest();if(id==="live")pollLive();if(id==="chats")loadBotChats();}} style={{display:"flex",alignItems:"center",width:"100%",padding:"7px 10px",borderRadius:7,background:viewTab===id?C.ad:"transparent",color:viewTab===id?C.a:C.t2,border:"none",cursor:"pointer",fontSize:12,fontWeight:viewTab===id?700:500,fontFamily:FM,marginBottom:2,textAlign:"left",gap:8}}>
              <span style={{fontSize:14}}>{{"setup":"⚙️","flow":"🔀","test":"👁️","analytics":"📊","knowledge":"📚","publish":"🚀","chats":"💬","live":"🟢"}[id]}</span>
              {l}
              {id==="knowledge"&&(bot.knowledge||[]).length>0&&<span style={{marginLeft:"auto",fontSize:9,background:C.p+"22",color:C.p,borderRadius:10,padding:"1px 6px",fontFamily:FM}}>{bot.knowledge.length}</span>}
              {id==="live"&&liveSessions.length>0&&<span style={{marginLeft:"auto",fontSize:9,background:C.g+"22",color:C.g,borderRadius:10,padding:"1px 6px",fontFamily:FM}}>{liveSessions.length}</span>}
            </button>
          ))}
        </div>
        {viewTab==="flow"&&<>
          <div style={{padding:"10px 10px 4px"}}><Btn ch="+ Add Node" v="primary" full onClick={()=>setShowAdd(true)}/></div>
          <div style={{flex:1,overflowY:"auto",padding:"0 6px 6px"}}>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,padding:"6px 6px 2px",letterSpacing:"0.5px"}}>NODES ({bot.nodes.length})</div>
            {bot.nodes.map(n=>(
              <div key={n.id} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 8px",borderRadius:7,background:sel===n.id?C.ad:C.s2,border:`1px solid ${sel===n.id?C.a+"44":C.b1}`,cursor:"pointer",marginBottom:3}} onClick={()=>setSel(n.id)}>
                <span style={{fontSize:13}}>{icons[n.type]}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:sel===n.id?C.a:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</div>
                  <div style={{fontSize:9,color:colors[n.type],fontFamily:FM}}>{n.type}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column"}}>
                  <button onClick={e=>{e.stopPropagation();moveNode(n.id,-1);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:7,lineHeight:1}}>▲</button>
                  <button onClick={e=>{e.stopPropagation();moveNode(n.id,1);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:7,lineHeight:1}}>▼</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:"8px 10px",borderTop:`1px solid ${C.b1}`}}>
            <Btn ch={saving?"Saving…":"Save Flow"} v="primary" full onClick={()=>saveBot(activeBot,{nodes:bot.nodes})} disabled={saving}/>
          </div>
        </>}
      </div>

      {/* Center content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflowY:"auto"}}>

        {/* ── SETUP TAB ── */}
        {viewTab==="setup"&&<div style={{padding:24,maxWidth:680,margin:"0 auto",width:"100%"}}>
          <div style={{fontSize:16,fontWeight:700,fontFamily:FD,marginBottom:4}}>Bot Setup</div>
          <p style={{fontSize:13,color:C.t3,marginBottom:20}}>Configure your bot's personality, greeting, and behavior.</p>

          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:20,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Identity</div>
            <Fld label="Bot Name"><Inp val={bot.name} set={v=>setBots(p=>p.map(b=>b.id===activeBot?{...b,name:v}:b))} ph="Bot name"/></Fld>
            <Fld label="Description"><Inp val={bot.description||bot.desc||""} set={v=>setBots(p=>p.map(b=>b.id===activeBot?{...b,description:v}:b))} ph="What does this bot do?"/></Fld>
          </div>

          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:20,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Greeting & Tone</div>
            <Fld label="Opening Message">
              <textarea value={bot.setup?.greeting||"Hi! How can I help you today?"} onChange={e=>updateSetup({greeting:e.target.value})} rows={2} placeholder="What the bot says first…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            </Fld>
            <Fld label="Fallback Message">
              <textarea value={bot.setup?.fallback||"Let me connect you to a human agent."} onChange={e=>updateSetup({fallback:e.target.value})} rows={2} placeholder="When bot can't answer…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            </Fld>
            <Fld label="Tone">
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["friendly","professional","concise","empathetic","playful"].map(tone=>(
                  <button key={tone} onClick={()=>updateSetup({tone})} style={{padding:"6px 14px",borderRadius:20,fontSize:12,background:bot.setup?.tone===tone?C.ad:C.s2,color:bot.setup?.tone===tone?C.a:C.t2,border:`1px solid ${bot.setup?.tone===tone?C.a+"44":C.b1}`,cursor:"pointer",fontFamily:FM,textTransform:"capitalize"}}>{tone}</button>
                ))}
              </div>
            </Fld>
          </div>

          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:20,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Behavior</div>
            {[
              {k:"collect_email",l:"Collect visitor email",d:"Ask for email if not provided"},
              {k:"show_branding",l:"Show SupportDesk branding",d:"Display 'Powered by SupportDesk'"},
              {k:"human_handoff",l:"Enable human handoff",d:"Allow bot to route to agents"},
              {k:"typing_delay",l:"Show typing indicator",d:"Simulate realistic bot typing"},
              {k:"read_receipts",l:"Send read receipts",d:"Show user their messages are seen"},
            ].map(opt=>(
              <div key={opt.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <div><div style={{fontSize:13,fontWeight:600,color:C.t1}}>{opt.l}</div><div style={{fontSize:11,color:C.t3}}>{opt.d}</div></div>
                <Toggle val={bot.setup?.[opt.k]!==false} set={()=>updateSetup({[opt.k]:bot.setup?.[opt.k]===false})}/>
              </div>
            ))}
          </div>

          {/* ── PRE-CHAT FORM ── */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:20,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Pre-Chat Form</div>
                <div style={{fontSize:11,color:C.t3}}>Collect visitor info before starting the conversation. Data saved to Contacts.</div>
              </div>
              <Toggle val={!!bot.setup?.pre_chat_enabled} set={()=>updateSetup({pre_chat_enabled:!bot.setup?.pre_chat_enabled})}/>
            </div>

            {bot.setup?.pre_chat_enabled&&<>
              <Fld label="Form Title">
                <Inp val={bot.setup?.pre_chat_title||"Before we start…"} set={v=>updateSetup({pre_chat_title:v})} ph="Form heading"/>
              </Fld>
              <Fld label="Form Description">
                <Inp val={bot.setup?.pre_chat_desc||"Please share some details so we can help you better."} set={v=>updateSetup({pre_chat_desc:v})} ph="Short description"/>
              </Fld>

              <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:8,marginTop:8}}>Form Fields</div>
              {(bot.setup?.pre_chat_fields||[
                {id:"pf1",name:"name",label:"Full Name",type:"text",required:true,map_to:"name"},
                {id:"pf2",name:"email",label:"Email",type:"email",required:true,map_to:"email"},
                {id:"pf3",name:"phone",label:"Phone",type:"tel",required:false,map_to:"phone"},
              ]).map((f,i)=>(
                <div key={f.id} style={{display:"flex",gap:6,alignItems:"center",padding:"8px 10px",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,marginBottom:6}}>
                  <span style={{fontSize:14,cursor:"grab",color:C.t3}}>⠿</span>
                  <div style={{flex:1,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    <input value={f.label} onChange={e=>{const fields=[...(bot.setup?.pre_chat_fields||[{id:"pf1",name:"name",label:"Full Name",type:"text",required:true,map_to:"name"},{id:"pf2",name:"email",label:"Email",type:"email",required:true,map_to:"email"},{id:"pf3",name:"phone",label:"Phone",type:"tel",required:false,map_to:"phone"}])];fields[i]={...fields[i],label:e.target.value};updateSetup({pre_chat_fields:fields});}} placeholder="Label" style={{flex:1,minWidth:80,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none"}}/>
                    <select value={f.type} onChange={e=>{const fields=[...(bot.setup?.pre_chat_fields||[{id:"pf1",name:"name",label:"Full Name",type:"text",required:true,map_to:"name"},{id:"pf2",name:"email",label:"Email",type:"email",required:true,map_to:"email"},{id:"pf3",name:"phone",label:"Phone",type:"tel",required:false,map_to:"phone"}])];fields[i]={...fields[i],type:e.target.value};updateSetup({pre_chat_fields:fields});}} style={{width:72,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 6px",fontSize:11,color:C.t2,outline:"none"}}>
                      {["text","email","tel","number","select","textarea"].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={f.map_to||""} onChange={e=>{const fields=[...(bot.setup?.pre_chat_fields||[{id:"pf1",name:"name",label:"Full Name",type:"text",required:true,map_to:"name"},{id:"pf2",name:"email",label:"Email",type:"email",required:true,map_to:"email"},{id:"pf3",name:"phone",label:"Phone",type:"tel",required:false,map_to:"phone"}])];fields[i]={...fields[i],map_to:e.target.value};updateSetup({pre_chat_fields:fields});}} style={{width:90,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 6px",fontSize:11,color:C.t2,outline:"none"}}>
                      <option value="">No mapping</option>
                      {["name","email","phone","company","location","notes"].map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                    <label style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:C.t3,cursor:"pointer",whiteSpace:"nowrap"}}>
                      <input type="checkbox" checked={!!f.required} onChange={()=>{const fields=[...(bot.setup?.pre_chat_fields||[{id:"pf1",name:"name",label:"Full Name",type:"text",required:true,map_to:"name"},{id:"pf2",name:"email",label:"Email",type:"email",required:true,map_to:"email"},{id:"pf3",name:"phone",label:"Phone",type:"tel",required:false,map_to:"phone"}])];fields[i]={...fields[i],required:!fields[i].required};updateSetup({pre_chat_fields:fields});}} style={{accentColor:C.a}}/> Required
                    </label>
                  </div>
                  <button onClick={()=>{const fields=[...(bot.setup?.pre_chat_fields||[{id:"pf1",name:"name",label:"Full Name",type:"text",required:true,map_to:"name"},{id:"pf2",name:"email",label:"Email",type:"email",required:true,map_to:"email"},{id:"pf3",name:"phone",label:"Phone",type:"tel",required:false,map_to:"phone"}])];fields.splice(i,1);updateSetup({pre_chat_fields:fields});}} style={{width:22,height:22,borderRadius:6,background:C.rd,border:"none",color:C.r,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                </div>
              ))}
              <button onClick={()=>{const fields=[...(bot.setup?.pre_chat_fields||[{id:"pf1",name:"name",label:"Full Name",type:"text",required:true,map_to:"name"},{id:"pf2",name:"email",label:"Email",type:"email",required:true,map_to:"email"},{id:"pf3",name:"phone",label:"Phone",type:"tel",required:false,map_to:"phone"}])];fields.push({id:"pf"+uid(),name:"field_"+fields.length,label:"",type:"text",required:false,map_to:""});updateSetup({pre_chat_fields:fields});}} style={{padding:"6px 14px",borderRadius:8,border:`1.5px dashed ${C.a}44`,background:"transparent",color:C.a,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FD,marginTop:4}}>+ Add Field</button>

              <div style={{marginTop:12,padding:"10px 12px",background:C.ad,borderRadius:8,border:`1px solid ${C.a}22`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.t1}}>Auto-capture IP & Location</div>
                    <div style={{fontSize:10,color:C.t3}}>Automatically detect visitor's IP address and geo-location</div>
                  </div>
                  <Toggle val={bot.setup?.pre_chat_geo!==false} set={()=>updateSetup({pre_chat_geo:bot.setup?.pre_chat_geo===false})}/>
                </div>
              </div>
            </>}
          </div>

          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            <Btn ch={saving?"Saving…":"Save Setup"} v="primary" onClick={saveSetup} disabled={saving}/>
          </div>
        </div>}

        {/* ── FLOW TAB ── */}
        {viewTab==="flow"&&<div style={{flex:1,padding:20}}>
          <div style={{maxWidth:580,margin:"0 auto"}}>
            {bot.nodes.length===0&&<div style={{textAlign:"center",padding:"48px",color:C.t3,background:C.s1,borderRadius:12,border:`2px dashed ${C.b1}`}}>
              <div style={{fontSize:32,marginBottom:10}}>⚡</div>
              <div style={{fontWeight:700,marginBottom:4}}>No nodes yet</div>
              <div style={{fontSize:13,marginBottom:16}}>Add your first node to build the flow</div>
              <Btn ch="+ Add First Node" v="primary" onClick={()=>setShowAdd(true)}/>
            </div>}
            {bot.nodes.map((n,i)=>(
              <div key={n.id}>
                {i>0&&<div style={{display:"flex",justifyContent:"center",padding:"6px 0"}}><div style={{width:2,height:22,background:C.b2}}/></div>}
                <div onClick={()=>setSel(n.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",background:sel===n.id?colors[n.type]+"12":C.s1,border:`1.5px solid ${sel===n.id?colors[n.type]:C.b1}`,borderRadius:12,cursor:"pointer",borderLeft:`4px solid ${colors[n.type]}`}}>
                  <div style={{width:34,height:34,borderRadius:9,background:colors[n.type]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icons[n.type]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}><Tag text={n.type} color={colors[n.type]}/><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>#{i+1}</span></div>
                    <div style={{fontSize:13,fontWeight:600,color:C.t1,marginTop:3}}>{n.label}</div>
                    {n.config?.text&&<div style={{fontSize:11,color:C.t3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.config.text}</div>}
                    {n.config?.buttons&&<div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap"}}>{n.config.buttons.map((b,j)=><span key={j} style={{fontSize:9,background:C.s3,padding:"2px 6px",borderRadius:4,color:C.t2,fontFamily:FM}}>{b}</span>)}</div>}
                  </div>
                  <button onClick={e=>{e.stopPropagation();delNode(n.id);}} style={{width:24,height:24,borderRadius:6,background:C.rd,border:"none",color:C.r,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
                </div>
              </div>
            ))}
            {bot.nodes.length>0&&<div style={{display:"flex",justifyContent:"center",padding:"12px 0"}}>
              <button onClick={()=>setShowAdd(true)} style={{padding:"7px 18px",borderRadius:10,border:`2px dashed ${C.a}44`,background:"transparent",color:C.a,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FD}}>+ Add Node</button>
            </div>}
          </div>
        </div>}

        {/* ── PREVIEW / TEST TAB ── */}
        {viewTab==="test"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:20}}>
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12,color:C.t2}}>Preview: {bot.name}</div>
          <div style={{width:370,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:16,overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:`0 8px 32px ${C.a}18`}}>
            {/* Chat header */}
            <div style={{padding:"12px 16px",background:bot.setup?.greeting?C.a:C.a,color:"#fff",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>{bot.name}</div>
                <div style={{fontSize:10,opacity:0.8}}>● Online</div>
              </div>
            </div>
            {/* Messages */}
            <div style={{flex:1,minHeight:300,maxHeight:400,overflowY:"auto",padding:"14px 14px 8px"}}>
              {testMsgs.length===0&&<div style={{textAlign:"center",color:C.t3,fontSize:12,padding:"20px 0"}}>Click "Start Test" to preview</div>}
              {testMsgs.map((m,i)=>(
                <div key={i} style={{marginBottom:8}}>
                  {m.from==="system"&&<div style={{textAlign:"center",fontSize:10,color:C.t3,fontFamily:FM,padding:"4px 0"}}>{m.text}</div>}
                  {m.from!=="system"&&<div style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"82%"}}>
                      <div style={{padding:"8px 12px",borderRadius:m.from==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.from==="user"?C.a:C.s2,color:m.from==="user"?"#fff":C.t1,fontSize:13,lineHeight:1.5}}>
                        {m.from==="bot-ask"&&<span style={{fontSize:9,color:C.p,fontFamily:FM,display:"block",marginBottom:2}}>📝 Collecting input</span>}
                        {m.from==="bot-ai"&&<span style={{fontSize:9,color:C.p,fontFamily:FM,display:"block",marginBottom:2}}>✦ AI Response</span>}
                        {m.text}
                      </div>
                      {m.buttons&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                        {m.buttons.map((b,j)=><button key={j} onClick={()=>testReply(b)} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${C.a}55`,background:"transparent",color:C.a,fontSize:11,cursor:"pointer",fontFamily:FM}}>{b}</button>)}
                      </div>}
                    </div>
                  </div>}
                </div>
              ))}
            </div>
            {/* Input */}
            <div style={{padding:"8px 12px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:6,background:C.bg}}>
              <input value={testInput} onChange={e=>setTestInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")testReply();}} placeholder="Type a message…" style={{flex:1,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"7px 10px",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
              <Btn ch="→" v="primary" sm onClick={()=>testReply()}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn ch="Start Test" v="primary" sm onClick={startTest}/>
            <Btn ch="Reset" v="ghost" sm onClick={()=>{setTestMsgs([]);setTestStep(0);}}/>
          </div>
          <div style={{marginTop:10,fontSize:11,color:C.t3}}>
            Node {testStep+1} of {bot.nodes.length} — {bot.nodes[testStep]?.type||"—"}
          </div>
        </div>}

        {/* ── ANALYTICS TAB ── */}
        {viewTab==="analytics"&&<div style={{padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
            {[{l:"Triggered",v:bot.stats?.triggered||0,c:C.a},{l:"Completed",v:bot.stats?.completed||0,c:C.g},{l:"Handoff",v:bot.stats?.handoff||0,c:C.y},{l:"Avg Time",v:bot.stats?.avgTime||"—",c:C.cy}].map(s=>(
              <div key={s.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px",textAlign:"center"}}>
                <div style={{fontSize:26,fontWeight:800,fontFamily:FD,color:s.c}}>{typeof s.v==="number"?s.v.toLocaleString():s.v}</div>
                <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:18,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Completion Funnel</div>
            {bot.nodes.map((n,i)=>{const pct=Math.max(100-i*14,10);return(
              <div key={n.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:13,width:20}}>{icons[n.type]}</span>
                <span style={{fontSize:11,color:C.t2,width:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</span>
                <div style={{flex:1,height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:colors[n.type],borderRadius:4}}/></div>
                <span style={{fontSize:11,fontWeight:700,fontFamily:FM,color:colors[n.type],width:35,textAlign:"right"}}>{pct}%</span>
              </div>
            );})}
          </div>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:10}}>Node Performance</div>
            <div style={{display:"grid",gridTemplateColumns:"40px 1fr 60px 60px 55px",padding:"6px 0",borderBottom:`1px solid ${C.b1}`,fontFamily:FM,fontSize:9,color:C.t3}}>
              <span/><span>Node</span><span style={{textAlign:"right"}}>Reached</span><span style={{textAlign:"right"}}>Exited</span><span style={{textAlign:"right"}}>Avg Time</span>
            </div>
            {bot.nodes.map((n,i)=>(
              <div key={n.id} style={{display:"grid",gridTemplateColumns:"40px 1fr 60px 60px 55px",padding:"7px 0",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
                <span style={{fontSize:13}}>{icons[n.type]}</span>
                <span style={{fontSize:12,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</span>
                <span style={{fontSize:11,fontFamily:FM,color:C.g,textAlign:"right"}}>{Math.max((bot.stats?.triggered||0)-i*180,50)}</span>
                <span style={{fontSize:11,fontFamily:FM,color:C.y,textAlign:"right"}}>{(i+1)*8}</span>
                <span style={{fontSize:11,fontFamily:FM,color:C.t3,textAlign:"right"}}>{5+i*3}s</span>
              </div>
            ))}
          </div>
        </div>}

        {/* ── KNOWLEDGE TAB ── */}
        {viewTab==="knowledge"&&<div style={{padding:20,maxWidth:740,margin:"0 auto",width:"100%"}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:4}}>Knowledge Base</div>
          <p style={{fontSize:13,color:C.t3,marginBottom:20}}>Feed your bot with FAQs, documents, and content. The AI uses this to answer questions accurately.</p>

          {/* File Upload Area */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:20,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:10}}>Upload Files</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[
                {icon:"📄",label:"PDF Documents",ext:".pdf",accept:"application/pdf"},
                {icon:"📝",label:"Word Documents",ext:".doc, .docx",accept:".doc,.docx"},
                {icon:"🖼️",label:"Images",ext:".png, .jpg, .gif, .webp",accept:"image/*"},
                {icon:"📋",label:"Text Files",ext:".txt",accept:"text/plain"},
              ].map(ft=>(
                <div key={ft.label} style={{border:`1px dashed ${C.b1}`,borderRadius:8,padding:"12px",textAlign:"center",cursor:"pointer",background:C.bg}} onClick={()=>kbFileRef.current?.click()}>
                  <div style={{fontSize:24,marginBottom:4}}>{ft.icon}</div>
                  <div style={{fontSize:11,fontWeight:600,color:C.t1}}>{ft.label}</div>
                  <div style={{fontSize:9,color:C.t3,marginTop:2}}>{ft.ext}</div>
                </div>
              ))}
            </div>
            <input ref={kbFileRef} type="file" accept={kbFileTypes} onChange={handleKbFile} style={{display:"none"}}/>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <Btn ch={kbUploading?"Uploading…":"📎 Upload File"} v="ghost" onClick={()=>kbFileRef.current?.click()} disabled={kbUploading}/>
            </div>
          </div>

          {/* Text Entry */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:20,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:12}}>Add Text Knowledge</div>
            <Fld label="Title / Topic"><Inp val={newKbTitle} set={setNewKbTitle} ph="e.g. Refund Policy, How to reset password…"/></Fld>
            <Fld label="Content">
              <textarea value={newKbContent} onChange={e=>setNewKbContent(e.target.value)} rows={5} placeholder="Paste FAQ answers, policy text, product descriptions, or any content the bot should reference when answering questions…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            </Fld>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <Btn ch={saving?"Saving…":"Add to Knowledge Base"} v="primary" onClick={addKbText} disabled={saving}/>
            </div>
          </div>

          {/* Knowledge items list */}
          <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:10}}>
            Knowledge Items {(bot.knowledge||[]).length>0&&<span style={{fontSize:11,background:C.p+"22",color:C.p,borderRadius:10,padding:"1px 8px",marginLeft:6,fontFamily:FM}}>{bot.knowledge.length}</span>}
          </div>
          {(bot.knowledge||[]).length===0?(
            <div style={{textAlign:"center",padding:"36px",color:C.t3,fontSize:13,background:C.s1,borderRadius:12,border:`1px dashed ${C.b1}`}}>
              <div style={{fontSize:36,marginBottom:10}}>📚</div>
              <div style={{fontWeight:600,marginBottom:4}}>No knowledge items yet</div>
              <div>Upload files or add text content above to train your bot</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {(bot.knowledge||[]).map(k=>(
                <div key={k.id} style={{background:C.s1,border:`1px solid ${editKbId===k.id?C.a+"44":C.b1}`,borderRadius:10,padding:"14px",transition:"border-color .15s"}}>
                  {editKbId===k.id?(
                    <>
                      <Fld label="Title"><Inp val={editKbTitle} set={setEditKbTitle} ph="Topic title"/></Fld>
                      <Fld label="Content">
                        <textarea value={editKbContent} onChange={e=>setEditKbContent(e.target.value)} rows={4} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                      </Fld>
                      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                        <Btn ch="Cancel" v="ghost" sm onClick={()=>setEditKbId(null)}/>
                        <Btn ch={saving?"Saving…":"Save"} v="primary" sm onClick={saveEditKb} disabled={saving}/>
                      </div>
                    </>
                  ):(
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{fontSize:22,flexShrink:0,marginTop:2}}>{kbTypeIcon[k.type]||kbTypeIcon.default}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:4}}>{k.title}</div>
                        {k.url?(
                          <div style={{fontSize:11,color:C.a,fontFamily:FM}}>
                            {k.type==="image"?<img src={`${import.meta.env.VITE_BACKEND_URL||"http://localhost:4002"}${k.url}`} alt={k.title} style={{maxHeight:80,borderRadius:6,marginTop:4,display:"block"}}/>:<span>{k.content}</span>}
                          </div>
                        ):(
                          <div style={{fontSize:12,color:C.t3,maxHeight:60,overflow:"hidden",lineHeight:1.5}}>{k.content}</div>
                        )}
                        <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>
                          {k.type?.toUpperCase()||"TEXT"}
                          {k.size&&<span> · {(k.size/1024).toFixed(1)} KB</span>}
                          {k.created_at&&<span> · {new Date(k.created_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        {!k.url&&<Btn ch="Edit" v="ghost" sm onClick={()=>startEditKb(k)}/>}
                        <Btn ch="✕" v="danger" sm onClick={()=>delKb(k.id)}/>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* ── PUBLISH TAB ── */}
        {viewTab==="publish"&&<div style={{padding:20,maxWidth:680,margin:"0 auto",width:"100%"}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:4}}>Publish & Embed</div>
          <p style={{fontSize:13,color:C.t3,marginBottom:20}}>Deploy your bot on your website or any external application.</p>

          {/* Status */}
          <div style={{background:C.s1,border:`1px solid ${bot.status==="active"?C.g+"44":C.b1}`,borderRadius:12,padding:18,marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:bot.status==="active"?C.g+"22":C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{bot.status==="active"?"🟢":"⚪"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:FD}}>{bot.status==="active"?"Bot is Live":"Bot is Draft"}</div>
              <div style={{fontSize:12,color:C.t3,marginTop:2}}>{bot.status==="active"?"Your bot is active and responding to visitors.":"Toggle to active to make it live."}</div>
            </div>
            <Toggle val={bot.status==="active"} set={()=>toggleBot(activeBot)}/>
          </div>

          {/* Direct Link */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:18,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:4}}>Direct Link</div>
            <div style={{fontSize:12,color:C.t3,marginBottom:10}}>Share this URL to open your bot in a standalone chat window.</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <code style={{flex:1,fontSize:11,color:C.t2,fontFamily:FM,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"9px 12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{backendOrigin}/chat?bot={bot.embed_token}</code>
              <Btn ch={copied==="link"?"✓ Copied":"Copy"} v={copied==="link"?"primary":"ghost"} sm onClick={()=>copyText(`${backendOrigin}/chat?bot=${bot.embed_token}`,"link")}/>
              <Btn ch="Open ↗" v="primary" sm onClick={()=>window.open(`${backendOrigin}/chat?bot=${bot.embed_token}`,"_blank")}/>
            </div>
          </div>

          {/* Script Embed */}
          <EmbedBlock title="Website Widget Script" desc={`Paste before </body> on any website to show the chat widget.`} copied={copied} copyKey="script" onCopy={()=>copyText(
`<!-- SupportDesk Bot Widget -->
<script>
  (function(d,s,id){
    var js,fjs=d.getElementsByTagName(s)[0];
    if(d.getElementById(id))return;
    js=d.createElement(s);js.id=id;
    js.src='${backendOrigin}/widget/bot.js';
    js.setAttribute('data-bot-id','${bot.embed_token}');
    js.setAttribute('data-name','${bot.name}');
    fjs.parentNode.insertBefore(js,fjs);
  }(document,'script','sd-bot-js'));
</script>`,"script")}>
            <pre style={{fontSize:11,color:C.t2,fontFamily:FM,margin:0,lineHeight:1.6,overflowX:"auto",whiteSpace:"pre-wrap"}}>
{`<!-- SupportDesk Bot Widget -->
<script>
  (function(d,s,id){
    var js,fjs=d.getElementsByTagName(s)[0];
    if(d.getElementById(id))return;
    js=d.createElement(s);js.id=id;
    js.src='${backendOrigin}/widget/bot.js';
    js.setAttribute('data-bot-id','${bot.embed_token}');
    js.setAttribute('data-name','${bot.name}');
    fjs.parentNode.insertBefore(js,fjs);
  }(document,'script','sd-bot-js'));
</script>`}
            </pre>
          </EmbedBlock>

          {/* iFrame */}
          <EmbedBlock title="iFrame Embed" desc="Embed the chat window directly inside a page section." copied={copied} copyKey="iframe" onCopy={()=>copyText(
`<iframe
  src="${backendOrigin}/chat?bot=${bot.embed_token}"
  width="400" height="600"
  style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);"
  title="${bot.name}">
</iframe>`,"iframe")}>
            <pre style={{fontSize:11,color:C.t2,fontFamily:FM,margin:0,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
{`<iframe
  src="${backendOrigin}/chat?bot=${bot.embed_token}"
  width="400" height="600"
  style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);"
  title="${bot.name}">
</iframe>`}
            </pre>
          </EmbedBlock>

          {/* React / Vue snippet */}
          <EmbedBlock title="React / Next.js Component" desc="Use inside any React or Next.js application." copied={copied} copyKey="react" onCopy={()=>copyText(
`import { useEffect } from 'react';

export function SupportBot() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${backendOrigin}/widget/bot.js';
    script.setAttribute('data-bot-id', '${bot.embed_token}');
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);
  return null;
}`,"react")}>
            <pre style={{fontSize:11,color:C.t2,fontFamily:FM,margin:0,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
{`import { useEffect } from 'react';

export function SupportBot() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${backendOrigin}/widget/bot.js';
    script.setAttribute('data-bot-id', '${bot.embed_token}');
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);
  return null;
}`}
            </pre>
          </EmbedBlock>

          {/* Vue / Angular */}
          <EmbedBlock title="Vue.js / Nuxt" desc="Add to any Vue component's onMounted lifecycle." copied={copied} copyKey="vue" onCopy={()=>copyText(
`<script setup>
import { onMounted, onUnmounted } from 'vue';
let script;
onMounted(() => {
  script = document.createElement('script');
  script.src = '${backendOrigin}/widget/bot.js';
  script.setAttribute('data-bot-id', '${bot.embed_token}');
  document.body.appendChild(script);
});
onUnmounted(() => { if(script) document.body.removeChild(script); });
</script>
<template><div /></template>`,"vue")}>
            <pre style={{fontSize:11,color:C.t2,fontFamily:FM,margin:0,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
{`<script setup>
import { onMounted, onUnmounted } from 'vue';
let script;
onMounted(() => {
  script = document.createElement('script');
  script.src = '${backendOrigin}/widget/bot.js';
  script.setAttribute('data-bot-id', '${bot.embed_token}');
  document.body.appendChild(script);
});
onUnmounted(() => { if(script) document.body.removeChild(script); });
</script>`}
            </pre>
          </EmbedBlock>

          {/* Mobile App - React Native / Flutter */}
          <EmbedBlock title="Mobile App (React Native)" desc="Use a WebView to embed the chat in iOS/Android." copied={copied} copyKey="mobile" onCopy={()=>copyText(
`import React from 'react';
import { WebView } from 'react-native-webview';

export function SupportChat() {
  return (
    <WebView
      source={{ uri: '${backendOrigin}/chat?bot=${bot.embed_token}' }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
    />
  );
}`,"mobile")}>
            <pre style={{fontSize:11,color:C.t2,fontFamily:FM,margin:0,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
{`import React from 'react';
import { WebView } from 'react-native-webview';

export function SupportChat() {
  return (
    <WebView
      source={{ uri: '${backendOrigin}/chat?bot=${bot.embed_token}' }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
    />
  );
}`}
            </pre>
          </EmbedBlock>

          <EmbedBlock title="Flutter (Mobile App)" desc="Use webview_flutter package to embed in Flutter." copied={copied} copyKey="flutter" onCopy={()=>copyText(
`import 'package:webview_flutter/webview_flutter.dart';

class SupportChatView extends StatefulWidget {
  @override
  _SupportChatViewState createState() => _SupportChatViewState();
}

class _SupportChatViewState extends State<SupportChatView> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(
        '${backendOrigin}/chat?bot=${bot.embed_token}'));
  }

  @override
  Widget build(BuildContext context) {
    return WebViewWidget(controller: controller);
  }
}`,"flutter")}>
            <pre style={{fontSize:11,color:C.t2,fontFamily:FM,margin:0,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
{`import 'package:webview_flutter/webview_flutter.dart';

class SupportChatView extends StatefulWidget {
  @override
  _State createState() => _State();
}

class _State extends State<SupportChatView> {
  late final WebViewController ctrl;
  @override
  void initState() {
    super.initState();
    ctrl = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(
        '${backendOrigin}/chat?bot=${bot.embed_token}'));
  }
  @override
  Widget build(BuildContext c) =>
    WebViewWidget(controller: ctrl);
}`}
            </pre>
          </EmbedBlock>

          {/* API Token */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:18,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:4}}>Bot Token (API Access)</div>
            <div style={{fontSize:12,color:C.t3,marginBottom:10}}>Use this token for REST API integration or webhooks.</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.t2,fontFamily:FM,letterSpacing:"0.04em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bot.embed_token}</div>
              <Btn ch={copied==="token"?"✓ Copied":"Copy"} v={copied==="token"?"primary":"ghost"} sm onClick={()=>copyText(bot.embed_token,"token")}/>
            </div>
          </div>

          {/* Quick Setup Steps */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:10}}>Quick Integration Steps</div>
            {[
              {p:"HTML Website",steps:["Copy the Widget Script code above","Paste it before the closing </body> tag in your HTML file","Save and reload your page — the chat icon appears at bottom-right"]},
              {p:"React / Next.js",steps:["Copy the React Component code above","Save as SupportBot.tsx in your components folder","Import and add <SupportBot /> to your App or Layout component"]},
              {p:"Vue / Nuxt",steps:["Copy the Vue component code above","Save as SupportBot.vue in your components folder","Add <SupportBot /> to your app layout"]},
              {p:"React Native",steps:["Install: npm install react-native-webview","Copy the React Native code above into a component file","Use <SupportChat /> in your navigation screen"]},
              {p:"Flutter",steps:["Add webview_flutter to pubspec.yaml dependencies","Run flutter pub get","Copy the Flutter code above and use SupportChatView() in your widget tree"]},
              {p:"WordPress",steps:["Go to Appearance → Theme Editor → footer.php","Paste the Widget Script code before </body>","Save changes — widget appears on all pages"]},
            ].map(g=>(
              <div key={g.p} style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:C.a,marginBottom:4}}>{g.p}</div>
                {g.steps.map((s,i)=>(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:3}}>
                    <span style={{width:18,height:18,borderRadius:"50%",background:C.ad,color:C.a,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,fontFamily:FM}}>{i+1}</span>
                    <span style={{fontSize:11,color:C.t2,lineHeight:1.5}}>{s}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>}

        {/* ── CHATS TAB ── */}
        {viewTab==="chats"&&<div style={{padding:20,maxWidth:800,margin:"0 auto",width:"100%"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Chat History</div>
              <p style={{fontSize:12,color:C.t3,marginTop:2}}>All conversations from this bot</p>
            </div>
            <Btn ch="↻ Refresh" v="ghost" sm onClick={loadBotChats}/>
          </div>

          {chatLoading&&<Spin/>}

          {!chatLoading&&!viewChat&&<>
            {botChats.length===0&&<div style={{textAlign:"center",padding:40,color:C.t3,background:C.s1,borderRadius:12,border:`1px solid ${C.b1}`}}>
              <div style={{fontSize:28,marginBottom:8}}>💬</div>
              <div style={{fontWeight:600,marginBottom:4}}>No conversations yet</div>
              <div style={{fontSize:12}}>Conversations will appear here when visitors use this bot.</div>
            </div>}
            {botChats.map(ch=>(
              <div key={ch.id} onClick={()=>setViewChat(ch)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:6,cursor:"pointer",transition:"border-color .15s"}} className="hov">
                <div style={{width:36,height:36,borderRadius:10,background:C.ad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>💬</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,fontWeight:600}}>{ch.visitor_name||"Visitor"}</span>
                    {ch.visitor_email&&<span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{ch.visitor_email}</span>}
                    <Tag text={ch.status||"active"} color={ch.status==="active"?C.g:C.t3}/>
                  </div>
                  <div style={{fontSize:11,color:C.t3,marginTop:2}}>
                    {(ch.messages||[]).length} messages · {new Date(ch.created_at).toLocaleString()}
                  </div>
                </div>
                <span style={{fontSize:14,color:C.t3}}>→</span>
              </div>
            ))}
          </>}

          {viewChat&&<ChatDetail chat={viewChat} setViewChat={setViewChat} api={api} backendOrigin={backendOrigin} bot={bot}/>}
        </div>}

        {/* ── LIVE SESSIONS TAB ── */}
        {viewTab==="live"&&<div style={{padding:20,maxWidth:800,margin:"0 auto",width:"100%"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:2}}>Live Bot Sessions</div>
              <p style={{fontSize:12,color:C.t3}}>Real-time view of users interacting with this bot right now</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:C.g,display:"inline-block",boxShadow:`0 0 6px ${C.g}`}}/>
              <span style={{fontSize:12,color:C.g,fontFamily:FM,fontWeight:700}}>Live</span>
              <Btn ch="↻ Refresh" v="ghost" sm onClick={pollLive}/>
            </div>
          </div>

          {/* Active count */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
            {[
              {l:"Active Sessions",v:liveSessions.filter(s=>s.status==="active").length,c:C.g},
              {l:"Completed Today",v:liveSessions.filter(s=>s.status==="done").length,c:C.a},
              {l:"Avg Session Time",v:"1m 24s",c:C.cy},
            ].map(s=>(
              <div key={s.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>

          {liveSessions.length===0?(
            <div style={{textAlign:"center",padding:"48px",color:C.t3,background:C.s1,borderRadius:12,border:`1px dashed ${C.b1}`}}>
              <div style={{fontSize:36,marginBottom:10}}>🟢</div>
              <div style={{fontWeight:600,marginBottom:4}}>No active sessions</div>
              <div style={{fontSize:13}}>Activate your bot and deploy it to see live user sessions here</div>
            </div>
          ):(
            <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 100px 80px 80px 120px",padding:"10px 16px",borderBottom:`1px solid ${C.b1}`,fontFamily:FM,fontSize:10,color:C.t3,fontWeight:700,letterSpacing:"0.5px"}}>
                <span>USER</span><span>PAGE</span><span>STEP</span><span>STATUS</span><span style={{textAlign:"right"}}>DURATION</span>
              </div>
              {liveSessions.map(s=>(
                <div key={s.id} style={{display:"grid",gridTemplateColumns:"1fr 100px 80px 80px 120px",padding:"12px 16px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{s.user}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:1}}>{s.msg}</div>
                  </div>
                  <span style={{fontSize:11,color:C.t2,fontFamily:FM}}>{s.page}</span>
                  <span style={{fontSize:11,fontFamily:FM}}>
                    <Tag text={s.step} color={colors[s.step]||C.t3}/>
                  </span>
                  <span>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:s.status==="active"?C.g+"22":C.s3,color:s.status==="active"?C.g:C.t3,fontFamily:FM,fontWeight:700}}>{s.status==="active"?"● Active":"✓ Done"}</span>
                  </span>
                  <span style={{fontSize:12,color:C.t2,textAlign:"right",fontFamily:FM}}>{s.time}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{marginTop:12,fontSize:11,color:C.t3,textAlign:"center",fontFamily:FM}}>
            Auto-refreshes every 5 seconds · {new Date().toLocaleTimeString()}
          </div>
        </div>}
      </div>

      {/* Right: Node editor (flow tab only) */}
      {sel&&selNode&&viewTab==="flow"&&<div style={{width:272,background:C.s1,borderLeft:`1px solid ${C.b1}`,padding:14,flexShrink:0,overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Edit Node</span>
          <button onClick={()=>setSel(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:14}}>×</button>
        </div>
        <div style={{marginBottom:10}}><Tag text={selNode.type} color={colors[selNode.type]}/></div>
        <Fld label="Label"><Inp val={selNode.label} set={v=>updateNode(sel,{label:v})} ph="Node label"/></Fld>
        {selNode.type==="trigger"&&<Fld label="Trigger Event">
          <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:200,overflowY:"auto"}}>{TRIGGERS.map(tr=>(
            <button key={tr} onClick={()=>updateNode(sel,{config:{...selNode.config,trigger_event:tr}})} style={{padding:"5px 8px",borderRadius:6,fontSize:11,background:selNode.config?.trigger_event===tr?C.ad:C.s2,color:selNode.config?.trigger_event===tr?C.a:C.t2,border:`1px solid ${selNode.config?.trigger_event===tr?C.a+"44":C.b1}`,cursor:"pointer",textAlign:"left"}}>{tr}</button>
          ))}</div>
        </Fld>}
        {selNode.type==="message"&&<>
          <Fld label="Message Text"><textarea value={selNode.config?.text||""} onChange={e=>updateNode(sel,{config:{...selNode.config,text:e.target.value}})} rows={4} placeholder="Bot message…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
          <Fld label={"Delay ("+((selNode.config?.delay)||"0")+"s)"}><input type="range" min="0" max="10" value={selNode.config?.delay||0} onChange={e=>updateNode(sel,{config:{...selNode.config,delay:e.target.value}})} style={{width:"100%",accentColor:C.a}}/></Fld>
        </>}
        {selNode.type==="buttons"&&<>
          <Fld label="Prompt Text"><Inp val={selNode.config?.text||""} set={v=>updateNode(sel,{config:{...selNode.config,text:v}})} ph="What do you need?"/></Fld>
          <Fld label="Buttons">{(selNode.config?.buttons||[]).map((b,i)=>(
            <div key={i} style={{display:"flex",gap:4,marginBottom:4}}>
              <Inp val={b} set={v=>{const nb=[...(selNode.config?.buttons||[])];nb[i]=v;updateNode(sel,{config:{...selNode.config,buttons:nb}});}} ph={"Option "+(i+1)}/>
              <button onClick={()=>{const nb=(selNode.config?.buttons||[]).filter((_,j)=>j!==i);updateNode(sel,{config:{...selNode.config,buttons:nb}});}} style={{color:C.r,background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✕</button>
            </div>
          ))}
          <button onClick={()=>updateNode(sel,{config:{...selNode.config,buttons:[...(selNode.config?.buttons||[]),"New option"]}})} style={{fontSize:11,color:C.a,background:"none",border:`1px dashed ${C.a}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer",width:"100%"}}>+ Add Button</button>
          </Fld>
        </>}
        {selNode.type==="condition"&&<>
          <Fld label="Condition"><Inp val={selNode.config?.condition||""} set={v=>updateNode(sel,{config:{...selNode.config,condition:v}})} ph="e.g. intent == billing"/></Fld>
          <div style={{display:"flex",gap:6}}>
            <div style={{flex:1}}><Fld label="Yes Path"><Inp val={selNode.config?.yes_label||"Yes"} set={v=>updateNode(sel,{config:{...selNode.config,yes_label:v}})}/></Fld></div>
            <div style={{flex:1}}><Fld label="No Path"><Inp val={selNode.config?.no_label||"No"} set={v=>updateNode(sel,{config:{...selNode.config,no_label:v}})}/></Fld></div>
          </div>
        </>}
        {selNode.type==="collect"&&<>
          <Fld label="Field Name"><Inp val={selNode.config?.field||""} set={v=>updateNode(sel,{config:{...selNode.config,field:v}})} ph="e.g. email, name"/></Fld>
          <Fld label="Validation"><Sel val={selNode.config?.validation||"none"} set={v=>updateNode(sel,{config:{...selNode.config,validation:v}})} opts={[{v:"none",l:"None"},{v:"required",l:"Required"},{v:"email",l:"Email"},{v:"number",l:"Number"},{v:"phone",l:"Phone"}]}/></Fld>
        </>}
        {selNode.type==="ai"&&<>
          <Fld label="AI Prompt"><textarea value={selNode.config?.prompt||""} onChange={e=>updateNode(sel,{config:{...selNode.config,prompt:e.target.value}})} rows={3} placeholder="Instructions for AI…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 10px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/></Fld>
          <Fld label="Fallback Message"><Inp val={selNode.config?.fallback||""} set={v=>updateNode(sel,{config:{...selNode.config,fallback:v}})} ph="If AI can't answer…"/></Fld>
        </>}
        {selNode.type==="assign"&&<>
          <Fld label="Team"><Inp val={selNode.config?.team||""} set={v=>updateNode(sel,{config:{...selNode.config,team:v}})} ph="e.g. Support, Sales"/></Fld>
          <Fld label="Method"><Sel val={selNode.config?.method||"round_robin"} set={v=>updateNode(sel,{config:{...selNode.config,method:v}})} opts={[{v:"round_robin",l:"Round Robin"},{v:"load_balanced",l:"Load Balanced"},{v:"manual",l:"Manual Queue"}]}/></Fld>
        </>}
        {selNode.type==="tag"&&<Fld label="Tag"><Inp val={selNode.config?.tag||""} set={v=>updateNode(sel,{config:{...selNode.config,tag:v}})} ph="e.g. vip, urgent"/></Fld>}
        {selNode.type==="delay"&&<Fld label={"Duration ("+(selNode.config?.duration||"5")+"s)"}><input type="range" min="1" max="60" value={selNode.config?.duration||5} onChange={e=>updateNode(sel,{config:{...selNode.config,duration:e.target.value}})} style={{width:"100%",accentColor:C.y}}/></Fld>}
        {selNode.type==="api"&&<>
          <Fld label="URL"><Inp val={selNode.config?.url||""} set={v=>updateNode(sel,{config:{...selNode.config,url:v}})} ph="https://api.example.com"/></Fld>
          <Fld label="Method"><Sel val={selNode.config?.method||"GET"} set={v=>updateNode(sel,{config:{...selNode.config,method:v}})} opts={[{v:"GET",l:"GET"},{v:"POST",l:"POST"},{v:"PUT",l:"PUT"}]}/></Fld>
        </>}
        {selNode.type==="close"&&<Fld label="Closing Message"><Inp val={selNode.config?.message||""} set={v=>updateNode(sel,{config:{...selNode.config,message:v}})} ph="Thanks for chatting!"/></Fld>}
        {selNode.type==="transfer"&&<Fld label="Transfer To"><Inp val={selNode.config?.target||""} set={v=>updateNode(sel,{config:{...selNode.config,target:v}})} ph="Team or inbox name"/></Fld>}
        <div style={{marginTop:12}}><Btn ch="Delete Node" v="danger" full sm onClick={()=>delNode(sel)}/></div>
      </div>}

      {/* Add node modal */}
      {showAdd&&<Mdl title="Add Node" onClose={()=>setShowAdd(false)} w={480}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {NODE_TYPES.map(n=>(
            <button key={n.t} onClick={()=>addNode(n.t)} className="hov" style={{padding:"12px 8px",borderRadius:10,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:5}}>{n.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:n.c}}>{n.l}</div>
              <div style={{fontSize:9,color:C.t3,marginTop:2}}>{n.d}</div>
            </button>
          ))}
        </div>
      </Mdl>}
    </div>
  );
}

// ── Embed Block sub-component ──────────────────────────────────────────────
function EmbedBlock({title,desc,copied,copyKey,onCopy,children}:{title:string;desc:string;copied:string;copyKey:string;onCopy:()=>void;children:any}){
  return(
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:18,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{title}</div>
        <button onClick={onCopy} style={{background:copied===copyKey?C.a:C.s3,color:copied===copyKey?"#fff":C.t2,border:`1px solid ${C.b1}`,borderRadius:6,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:FM,flexShrink:0,marginLeft:10}}>
          {copied===copyKey?"✓ Copied":"Copy"}
        </button>
      </div>
      <div style={{fontSize:12,color:C.t3,marginBottom:10}}>{desc}</div>
      <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",overflowX:"auto"}}>
        {children}
      </div>
    </div>
  );
}
