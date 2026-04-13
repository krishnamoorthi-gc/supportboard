import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";
import PortalScr from "./PortalScr";

// ─── WIDGET ───────────────────────────────────────────────────────────────
export default function WidgetScr({inboxes,aiAutoReply,setAiAutoReply}){
  // Backend config state
  const [wtab,setWtab]=useState("general");
  const [color,setColor]=useState("#4c82fb");
  const [teamName,setTeamName]=useState("SupportDesk");
  const [tagline,setTagline]=useState("We typically reply in minutes");
  const [position,setPosition]=useState("right");
  const [chatEnabled,setChatEnabled]=useState(true);
  const [voiceEnabled,setVoiceEnabled]=useState(false);
  const [videoEnabled,setVideoEnabled]=useState(false);
  const [proactive,setProactive]=useState(true);
  const [proactiveMsg,setProactiveMsg]=useState("Hi! Need help? Chat with us.");
  const [proactiveDelay,setProactiveDelay]=useState("5");
  // Chat settings
  const [greeting,setGreeting]=useState("👋 Hi! How can we help you today?");
  const [offlineMsg,setOfflineMsg]=useState("We're currently offline. Leave a message and we'll get back ASAP.");
  const [preChatForm,setPreChatForm]=useState(true);
  const [fileUpload,setFileUpload]=useState(true);
  const [emojiEnabled,setEmojiEnabled]=useState(true);
  const [requireEmail,setRequireEmail]=useState(false);
  const [requirePhone,setRequirePhone]=useState(false);
  // Voice settings
  const [voiceMaxQueue,setVoiceMaxQueue]=useState("5");
  const [voiceHoursOnly,setVoiceHoursOnly]=useState(true);
  const [voiceQueuePos,setVoiceQueuePos]=useState(true);
  const [voiceCallback,setVoiceCallback]=useState(true);
  const [voiceVoicemail,setVoiceVoicemail]=useState(true);
  const [voiceRecording,setVoiceRecording]=useState(false);
  // Video settings
  const [videoWaitRoom,setVideoWaitRoom]=useState(true);
  const [videoScreenShare,setVideoScreenShare]=useState(true);
  const [videoCoBrowse,setVideoCoBrowse]=useState(false);
  const [videoRecording,setVideoRecording]=useState(false);
  const [videoMaxDuration,setVideoMaxDuration]=useState("30");

  // Live widget preview state
  const [wOpen,setWOpen]=useState(null);
  const [wStep,setWStep]=useState("form");
  const [wName,setWName]=useState("");
  const [wEmail,setWEmail]=useState("");
  const [wMsgs,setWMsgs]=useState([{from:"bot",text:"👋 Hi! How can we help you today?"}]);
  const [wInp,setWInp]=useState("");
  const [wTyping,setWTyping]=useState(false);
  const [callState,setCallState]=useState("idle");
  const [callTime,setCallTime]=useState(0);
  const [callMuted,setCallMuted]=useState(false);
  const [videoState,setVideoState]=useState("idle");
  const [videoTime,setVideoTime]=useState(0);
  const [vidMic,setVidMic]=useState(true);
  const [vidCam,setVidCam]=useState(true);
  const [vidScreen,setVidScreen]=useState(false);
  const [showProactive,setShowProactive]=useState(false);
  const wmEnd=useRef(null);
  const callTimer=useRef(null);
  const videoTimer=useRef(null);
  useEffect(()=>{wmEnd.current?.scrollIntoView({behavior:"smooth"});},[wMsgs]);
  useEffect(()=>{if(proactive&&!wOpen){const t=setTimeout(()=>setShowProactive(true),(parseInt(proactiveDelay)||5)*1000);return()=>clearTimeout(t);}else setShowProactive(false);},[proactive,wOpen,proactiveDelay]);

  const startChat=()=>{if(preChatForm&&!wName.trim())return showT("Name required","error");setWStep("chat");setTimeout(()=>{setWTyping(true);setTimeout(()=>{setWTyping(false);setWMsgs(p=>[...p,{from:"bot",text:`Hi ${wName||"there"}! How can I help you today?`}]);},1200);},500);};
  const sendW=async()=>{
    if(!wInp.trim())return;const txt=wInp;setWInp("");
    const history=[...wMsgs,{from:"user",text:txt}];setWMsgs(history);setWTyping(true);
    try{
      const data=await api.post('/ai/chat',{max_tokens:300,
          system:`You are a friendly support bot for ${teamName}. Customer: ${wName||"Visitor"}. Be concise (1-3 sentences), empathetic. No markdown.`,
          messages:history.filter(m=>m.from!=="sys").slice(-10).map(m=>({role:m.from==="user"?"user":"assistant",content:m.text}))});
      setWMsgs(p=>[...p,{from:"bot",text:data.content?.[0]?.text||"Connecting you with an agent!"}]);
    }catch(e){setWMsgs(p=>[...p,{from:"bot",text:"Thanks! A support agent will be with you shortly. Ticket #WEB-"+Math.floor(Math.random()*9000+1000)}]);}
    setWTyping(false);
  };
  const startCall=()=>{setCallState("ringing");setTimeout(()=>{setCallState("connected");setCallTime(0);callTimer.current=setInterval(()=>setCallTime(p=>p+1),1000);},2500);};
  const endCall=()=>{setCallState("idle");setCallTime(0);clearInterval(callTimer.current);};
  const startVideo=()=>{setVideoState(videoWaitRoom?"waiting":"connected");if(videoWaitRoom)setTimeout(()=>{setVideoState("connected");setVideoTime(0);videoTimer.current=setInterval(()=>setVideoTime(p=>p+1),1000);},3000);else{setVideoTime(0);videoTimer.current=setInterval(()=>setVideoTime(p=>p+1),1000);}};
  const endVideo=()=>{setVideoState("idle");setVideoTime(0);clearInterval(videoTimer.current);};
  const fmtCallTime=s=>{const m=Math.floor(s/60);const ss=s%60;return `${m}:${ss<10?"0"+ss:ss}`;};
  const resetWidget=()=>{setWStep("form");setWName("");setWEmail("");setWMsgs([{from:"bot",text:greeting}]);setWInp("");setWOpen(null);endCall();endVideo();};

  const CfgRow=({label,desc,val,set})=><div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.b1}22`}}>
    <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600,color:C.t1}}>{label}</div>{desc&&<div style={{fontSize:11,color:C.t3,marginTop:2}}>{desc}</div>}</div>
    <Toggle val={val} set={set}/>
  </div>;

  const enabledChannels=[chatEnabled&&"chat",voiceEnabled&&"voice",videoEnabled&&"video"].filter(Boolean);

  return <div style={{flex:1,display:"flex",minWidth:0}}>
    {/* ═══ LEFT: BACKEND CONFIG ═══ */}
    <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:`1px solid ${C.b1}`}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.b1}`,background:C.s1}}>
        <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:2}}>Widget Configuration</h2>
        <p style={{fontSize:12,color:C.t3}}>Configure chat, voice & video channels for your website widget</p>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`}}>
        {[["general","General"],["chat","Chat"],["voice","Voice"],["video","Video"],["install","Install"],["portal","Portal"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setWtab(id)} style={{flex:1,padding:"10px 4px",fontSize:10.5,fontWeight:700,fontFamily:FM,color:wtab===id?C.a:C.t3,background:wtab===id?C.ad:"transparent",border:"none",borderBottom:`2px solid ${wtab===id?C.a:"transparent"}`,cursor:"pointer"}}>{lbl}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>

        {/* ── GENERAL TAB ── */}
        {wtab==="general"&&<div>
          <Fld label="Widget Color">
            <div style={{display:"flex",gap:6}}>
              {["#4c82fb","#1fd07a","#9b6dff","#f5a623","#f04f5a","#22d4e8","#ff6b35","#e91e63"].map(c=>(
                <button key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${color===c?"#fff":"transparent"}`,cursor:"pointer"}}/>
              ))}
            </div>
          </Fld>
          <Fld label="Team Name"><Inp val={teamName} set={setTeamName} ph="Your team name"/></Fld>
          <Fld label="Tagline"><Inp val={tagline} set={setTagline} ph="We reply in minutes"/></Fld>
          <Fld label="Position"><Sel val={position} set={setPosition} opts={[{v:"right",l:"Bottom Right"},{v:"left",l:"Bottom Left"}]}/></Fld>

          <div style={{fontSize:11,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",margin:"20px 0 10px",paddingBottom:6,borderBottom:`1px solid ${C.b1}`}}>CHANNEL TOGGLES</div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:chatEnabled?C.gd:C.s2,border:`1px solid ${chatEnabled?C.g+"44":C.b1}`,borderRadius:10}}>
              <span style={{fontSize:20}}>💬</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.t1}}>Live Chat</div><div style={{fontSize:11,color:C.t3}}>Text-based messaging with customers</div></div>
              <Toggle val={chatEnabled} set={setChatEnabled}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:voiceEnabled?C.gd:C.s2,border:`1px solid ${voiceEnabled?C.g+"44":C.b1}`,borderRadius:10}}>
              <ChIcon t="voice" s={20}/>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.t1}}>Voice Call</div><div style={{fontSize:11,color:C.t3}}>Let visitors call your team from the widget</div></div>
              <Toggle val={voiceEnabled} set={setVoiceEnabled}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:videoEnabled?C.gd:C.s2,border:`1px solid ${videoEnabled?C.g+"44":C.b1}`,borderRadius:10}}>
              <ChIcon t="video" s={20}/>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.t1}}>Video Call</div><div style={{fontSize:11,color:C.t3}}>Face-to-face support with screen sharing</div></div>
              <Toggle val={videoEnabled} set={setVideoEnabled}/>
            </div>
          </div>

          <div style={{fontSize:11,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",margin:"20px 0 10px",paddingBottom:6,borderBottom:`1px solid ${C.b1}`}}>PROACTIVE CHAT</div>
          <CfgRow label="Enable proactive popup" desc="Auto-show a message to idle visitors" val={proactive} set={setProactive}/>
          {proactive&&<><Fld label="Message"><Inp val={proactiveMsg} set={setProactiveMsg} ph="Hi! Need help?"/></Fld>
          <Fld label="Delay (seconds)"><Inp val={proactiveDelay} set={setProactiveDelay} ph="5" type="number"/></Fld></>}
        </div>}

        {/* ── CHAT TAB ── */}
        {wtab==="chat"&&<div>
          <Fld label="Greeting Message"><Inp val={greeting} set={setGreeting} ph="Hi! How can we help?"/></Fld>
          <Fld label="Offline Message"><Inp val={offlineMsg} set={setOfflineMsg} ph="We're currently offline..."/></Fld>
          <CfgRow label="Pre-chat form" desc="Collect name/email before chat starts" val={preChatForm} set={setPreChatForm}/>
          <CfgRow label="AI Bot auto-reply" desc="AI responds first, then hands off to agent — synced with Inbox" val={aiAutoReply} set={v=>{setAiAutoReply(v);showT(v?"✦ AI Auto-Reply ON — also active in Inbox":"AI Auto-Reply OFF — also disabled in Inbox",v?"success":"info");}}/>
          <CfgRow label="File uploads" desc="Allow visitors to send files" val={fileUpload} set={setFileUpload}/>
          <CfgRow label="Emoji reactions" desc="Show emoji picker in chat" val={emojiEnabled} set={setEmojiEnabled}/>
          <CfgRow label="Require email" desc="Make email mandatory in pre-chat form" val={requireEmail} set={setRequireEmail}/>
          <CfgRow label="Require phone" desc="Make phone mandatory in pre-chat form" val={requirePhone} set={setRequirePhone}/>
        </div>}

        {/* ── VOICE TAB ── */}
        {wtab==="voice"&&<div>
          {!voiceEnabled&&<div style={{padding:"14px",background:C.yd,border:`1px solid ${C.y}44`,borderRadius:10,marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:16}}>⚠️</span>
            <div style={{flex:1,fontSize:12,color:C.y}}>Voice calling is disabled. Enable it in the General tab.</div>
            <Btn ch="Enable" v="warn" sm onClick={()=>{setVoiceEnabled(true);showT("Voice calling enabled","success");}}/>
          </div>}
          <Fld label="Max Queue Size"><Inp val={voiceMaxQueue} set={setVoiceMaxQueue} ph="5" type="number"/></Fld>
          <CfgRow label="Working hours only" desc="Only allow calls during business hours" val={voiceHoursOnly} set={setVoiceHoursOnly}/>
          <CfgRow label="Show queue position" desc="Tell callers their position in the queue" val={voiceQueuePos} set={setVoiceQueuePos}/>
          <CfgRow label="Callback option" desc="Let callers request a callback instead of waiting" val={voiceCallback} set={setVoiceCallback}/>
          <CfgRow label="Voicemail" desc="Allow voicemail when no agents available" val={voiceVoicemail} set={setVoiceVoicemail}/>
          <CfgRow label="Call recording" desc="Record calls for quality assurance" val={voiceRecording} set={setVoiceRecording}/>
        </div>}

        {/* ── VIDEO TAB ── */}
        {wtab==="video"&&<div>
          {!videoEnabled&&<div style={{padding:"14px",background:C.yd,border:`1px solid ${C.y}44`,borderRadius:10,marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:16}}>⚠️</span>
            <div style={{flex:1,fontSize:12,color:C.y}}>Video calling is disabled. Enable it in the General tab.</div>
            <Btn ch="Enable" v="warn" sm onClick={()=>{setVideoEnabled(true);showT("Video calling enabled","success");}}/>
          </div>}
          <CfgRow label="Waiting room" desc="Hold visitors before connecting to an agent" val={videoWaitRoom} set={setVideoWaitRoom}/>
          <CfgRow label="Screen sharing" desc="Allow visitors to share their screen" val={videoScreenShare} set={setVideoScreenShare}/>
          <CfgRow label="Co-browsing" desc="Agent can see and navigate the visitor's page" val={videoCoBrowse} set={setVideoCoBrowse}/>
          <CfgRow label="Session recording" desc="Record video sessions for review" val={videoRecording} set={setVideoRecording}/>
          <Fld label="Max Duration (minutes)"><Inp val={videoMaxDuration} set={setVideoMaxDuration} ph="30" type="number"/></Fld>
        </div>}

        {/* ── INSTALL TAB ── */}
        {wtab==="install"&&<div>
          <p style={{fontSize:12.5,color:C.t2,marginBottom:16,lineHeight:1.5}}>Paste this snippet before your closing <code style={{color:C.g,fontFamily:FM}}>&lt;/body&gt;</code> tag. It auto-enables {enabledChannels.join(", ")||"nothing"} based on your config.</p>
          <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px 16px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>HTML EMBED</span>
              <button onClick={()=>{navigator.clipboard?.writeText(`<script src="https://cdn.supportdesk.io/widget.js" data-color="${color}" data-chat="${chatEnabled}" data-voice="${voiceEnabled}" data-video="${videoEnabled}"></script>`);showT("Copied!","success");}} style={{fontSize:10,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:FM}}>Copy</button>
            </div>
            <code style={{fontSize:11.5,color:C.g,fontFamily:FM,lineHeight:1.8,display:"block"}}>
              {'<script'}<br/>{'  src="https://cdn.supportdesk.io/widget.js"'}<br/>{`  data-color="${color}"`}<br/>{`  data-chat="${chatEnabled}"`}<br/>{`  data-voice="${voiceEnabled}"`}<br/>{`  data-video="${videoEnabled}"`}<br/>{'></script>'}
            </code>
          </div>
          <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>REACT / NPM</span>
              <button onClick={()=>showT("Copied!","success")} style={{fontSize:10,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:FM}}>Copy</button>
            </div>
            <code style={{fontSize:11.5,color:C.p,fontFamily:FM,lineHeight:1.8,display:"block"}}>
              {'imp'+'ort { Widget } from '}{'"desk'+'-sdk/react";'}<br/><br/>
              {'<Widget'}<br/>{`  color="${color}"`}<br/>{`  chat={${chatEnabled}}`}<br/>{`  voice={${voiceEnabled}}`}<br/>{`  video={${videoEnabled}}`}<br/>{'/>'}
            </code>
          </div>
        </div>}
        {wtab==="portal"&&<PortalScr/>}
      </div>
    </div>

    {/* ═══ RIGHT: LIVE WIDGET PREVIEW ═══ */}
    <div style={{width:420,background:C.bg,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Live Preview</span>
        <div style={{flex:1}}/>
        <button onClick={resetWidget} style={{fontSize:10,color:C.t3,background:C.s3,border:`1px solid ${C.b1}`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:FM}}>↺ Reset</button>
      </div>
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>
        {/* Fake website background */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#0a0f1e,#131e35)"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:40,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",padding:"0 16px",gap:12,borderBottom:"1px solid rgba(255,255,255,.07)"}}>
            <div style={{width:60,height:6,background:color,borderRadius:3,opacity:0.8}}/>
            {[70,55,65].map((w,i)=><div key={i} style={{width:w,height:4,background:"#ffffff15",borderRadius:3}}/>)}
          </div>
          <div style={{position:"absolute",top:"40%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
            <div style={{width:180,height:8,background:"#ffffff10",borderRadius:4,margin:"0 auto 10px"}}/>
            <div style={{width:250,height:5,background:"#ffffff08",borderRadius:3,margin:"0 auto 6px"}}/>
            <div style={{width:100,height:30,background:color+"44",borderRadius:6,margin:"12px auto 0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#ffffff60"}}>Get Started →</div>
          </div>
        </div>

        {/* Proactive popup */}
        {showProactive&&!wOpen&&<div style={{position:"absolute",bottom:enabledChannels.length>1?90:78,[position]:18,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"10px 14px",maxWidth:220,animation:"fadeUp .2s ease",boxShadow:"0 8px 30px rgba(0,0,0,.6)"}}>
          <div style={{fontSize:12,color:C.t1,lineHeight:1.5,marginBottom:6}}>{proactiveMsg}</div>
          <button onClick={()=>{setShowProactive(false);setWOpen("chat");}} style={{fontSize:11,color:color,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Chat now →</button>
          <button onClick={()=>setShowProactive(false)} style={{position:"absolute",top:4,right:8,background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:12}}>×</button>
        </div>}

        {/* FAB launcher buttons */}
        <div style={{position:"absolute",bottom:16,[position]:16,display:"flex",flexDirection:"column",gap:8,alignItems:position==="right"?"flex-end":"flex-start"}}>
          {videoEnabled&&<button onClick={()=>{setWOpen(wOpen==="video"?null:"video");if(videoState==="idle")startVideo();}} style={{width:44,height:44,borderRadius:"50%",background:wOpen==="video"?C.p:`linear-gradient(135deg,${C.p},${C.p}cc)`,border:"none",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${C.p}55`,transition:"transform .2s",transform:wOpen==="video"?"scale(1.1)":"scale(1)"}}><ChIcon t="video" s={18} col="#fff"/></button>}
          {voiceEnabled&&<button onClick={()=>{setWOpen(wOpen==="voice"?null:"voice");if(callState==="idle")startCall();}} style={{width:44,height:44,borderRadius:"50%",background:wOpen==="voice"?C.g:`linear-gradient(135deg,${C.g},${C.g}cc)`,border:"none",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${C.g}55`,transition:"transform .2s",transform:wOpen==="voice"?"scale(1.1)":"scale(1)"}}><ChIcon t="voice" s={18} col="#fff"/></button>}
          {chatEnabled&&<button onClick={()=>setWOpen(wOpen==="chat"?null:"chat")} style={{width:54,height:54,borderRadius:"50%",background:`linear-gradient(135deg,${color},${color}cc)`,border:"none",cursor:"pointer",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 20px ${color}55`,transition:"transform .2s",transform:wOpen==="chat"?"scale(1.1)":"scale(1)"}}>{wOpen==="chat"?"×":"💬"}</button>}
        </div>

        {/* ── CHAT PANEL ── */}
        {wOpen==="chat"&&<div style={{position:"absolute",bottom:enabledChannels.length>1?130:84,[position]:16,width:310,height:400,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:16,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp .2s ease",boxShadow:"0 20px 60px rgba(0,0,0,.7)"}}>
          <div style={{background:`linear-gradient(135deg,${color},${color}bb)`,padding:"12px 14px",display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>💬</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{teamName}</div><div style={{fontSize:10,color:"rgba(255,255,255,.7)"}}>● Online · {tagline}</div></div>
          </div>
          {wStep==="form"&&preChatForm?<div style={{flex:1,padding:14,display:"flex",flexDirection:"column",gap:10}}>
            <p style={{fontSize:12,color:C.t2,lineHeight:1.4}}>Fill in your details to start chatting.</p>
            <div><div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:4}}>NAME *</div><Inp val={wName} set={setWName} ph="Your name"/></div>
            {(requireEmail||true)&&<div><div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:4}}>EMAIL {requireEmail?"*":"(optional)"}</div><Inp val={wEmail} set={setWEmail} ph="you@example.com"/></div>}
            <button onClick={startChat} style={{background:color,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FB,marginTop:"auto"}}>Start Chat →</button>
          </div>:<>
            <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:6}}>
              {wMsgs.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start",animation:"fadeUp .2s ease"}}><div style={{maxWidth:"82%",padding:"8px 11px",borderRadius:m.from==="user"?"11px 11px 3px 11px":"3px 11px 11px 11px",background:m.from==="user"?`linear-gradient(135deg,${color},${color}bb)`:C.s3,border:m.from==="user"?"none":`1px solid ${C.b1}`,fontSize:12,color:m.from==="user"?"#fff":C.t1,lineHeight:1.5}}>{m.text}</div></div>))}
              {wTyping&&<div style={{display:"flex"}}><div style={{background:C.s3,border:`1px solid ${C.b1}`,borderRadius:"3px 11px 11px 11px",padding:"10px 13px",display:"flex",gap:4}}>{[0,1,2].map(i=><span key={i} style={{width:5,height:5,borderRadius:"50%",background:C.t3,animation:`blink 1.2s infinite ${i*0.2}s`}}/>)}</div></div>}
              <div ref={wmEnd}/>
            </div>
            <div style={{padding:7,borderTop:`1px solid ${C.b1}`,display:"flex",gap:5}}>
              <input value={wInp} onChange={e=>setWInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendW()} placeholder="Type a message…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"7px 10px",fontSize:11,color:C.t1,fontFamily:FB,outline:"none"}}/>
              <button onClick={sendW} style={{width:30,height:30,borderRadius:7,background:color,border:"none",color:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>↑</button>
            </div>
          </>}
        </div>}

        {/* ── VOICE CALL PANEL ── */}
        {wOpen==="voice"&&<div style={{position:"absolute",bottom:enabledChannels.length>1?130:84,[position]:16,width:280,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:16,overflow:"hidden",animation:"fadeUp .2s ease",boxShadow:"0 20px 60px rgba(0,0,0,.7)"}}>
          <div style={{background:`linear-gradient(135deg,${C.g},${C.g}bb)`,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff"}}><ChIcon t="voice" s={14} col="#fff"/> Voice Call</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.7)"}}>{teamName}</div>
          </div>
          <div style={{padding:"24px 20px",textAlign:"center"}}>
            {callState==="ringing"&&<>
              <div style={{width:60,height:60,borderRadius:"50%",background:C.g+"22",border:`2px solid ${C.g}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px",animation:"pulse 1.5s infinite"}}><ChIcon t="voice" s={28} col="#fff"/></div>
              <div style={{fontSize:14,fontWeight:700,color:C.t1,marginBottom:4}}>Ringing…</div>
              <div style={{fontSize:11,color:C.t3}}>Connecting to an agent</div>
              <button onClick={endCall} style={{marginTop:18,width:48,height:48,borderRadius:"50%",background:C.r,border:"none",color:"#fff",fontSize:18,cursor:"pointer"}}>✕</button>
            </>}
            {callState==="connected"&&<>
              <div style={{width:60,height:60,borderRadius:"50%",background:C.g+"22",border:`2px solid ${C.g}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px"}}>🎧</div>
              <div style={{fontSize:14,fontWeight:700,color:C.g,marginBottom:4}}>Connected</div>
              <div style={{fontSize:20,fontFamily:FM,fontWeight:700,color:C.t1,marginBottom:14}}>{fmtCallTime(callTime)}</div>
              <div style={{display:"flex",justifyContent:"center",gap:12}}>
                <button onClick={()=>setCallMuted(p=>!p)} style={{width:44,height:44,borderRadius:"50%",background:callMuted?C.y+"22":C.s3,border:`1px solid ${callMuted?C.y+"55":C.b1}`,color:callMuted?C.y:C.t2,cursor:"pointer",fontSize:16}}>{callMuted?"🔇":"🎤"}</button>
                <button onClick={endCall} style={{width:44,height:44,borderRadius:"50%",background:C.r,border:"none",color:"#fff",fontSize:16,cursor:"pointer"}}>✕</button>
              </div>
            </>}
            {callState==="idle"&&<>
              <div style={{fontSize:13,color:C.t2,marginBottom:14}}>Click to start a voice call</div>
              <button onClick={startCall} style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${C.g},${C.g}cc)`,border:"none",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:`0 4px 16px ${C.g}44`}}><ChIcon t="voice" s={22} col="#fff"/></button>
            </>}
          </div>
        </div>}

        {/* ── VIDEO CALL PANEL ── */}
        {wOpen==="video"&&<div style={{position:"absolute",bottom:enabledChannels.length>1?130:84,[position]:16,width:300,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:16,overflow:"hidden",animation:"fadeUp .2s ease",boxShadow:"0 20px 60px rgba(0,0,0,.7)"}}>
          {videoState==="waiting"&&<div style={{padding:"30px 20px",textAlign:"center"}}>
            <div style={{width:60,height:60,borderRadius:"50%",background:C.p+"22",border:`2px solid ${C.p}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px",animation:"pulse 1.5s infinite"}}><ChIcon t="video" s={28} col="#fff"/></div>
            <div style={{fontSize:14,fontWeight:700,color:C.t1,marginBottom:4}}>Waiting Room</div>
            <div style={{fontSize:11,color:C.t3,marginBottom:16}}>An agent will admit you shortly…</div>
            <button onClick={endVideo} style={{padding:"8px 20px",borderRadius:8,background:C.r,color:"#fff",border:"none",fontSize:12,cursor:"pointer"}}>Leave</button>
          </div>}
          {videoState==="connected"&&<>
            <div style={{height:180,background:"linear-gradient(135deg,#1a1040,#0a1020)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <div style={{textAlign:"center"}}>
                <div style={{width:50,height:50,borderRadius:"50%",background:C.p+"33",border:`2px solid ${C.p}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,margin:"0 auto 8px"}}>👤</div>
                <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>Agent · {fmtCallTime(videoTime)}</div>
              </div>
              {/* Self preview */}
              <div style={{position:"absolute",bottom:8,right:8,width:70,height:52,borderRadius:8,background:vidCam?"#333":"#111",border:`1px solid ${C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:vidCam?10:14,color:C.t3}}>
                {vidCam?"You":"🚫"}
              </div>
              {vidScreen&&<div style={{position:"absolute",top:6,left:6,padding:"2px 6px",borderRadius:4,background:C.g+"33",border:`1px solid ${C.g}44`,fontSize:8,color:C.g,fontFamily:FM}}>SHARING</div>}
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:8,padding:"12px"}}>
              <button onClick={()=>setVidMic(p=>!p)} style={{width:38,height:38,borderRadius:"50%",background:vidMic?C.s3:C.r+"22",border:`1px solid ${vidMic?C.b1:C.r+"55"}`,color:vidMic?C.t2:C.r,cursor:"pointer",fontSize:14}}>{vidMic?"🎤":"🔇"}</button>
              <button onClick={()=>setVidCam(p=>!p)} style={{width:38,height:38,borderRadius:"50%",background:vidCam?C.s3:C.r+"22",border:`1px solid ${vidCam?C.b1:C.r+"55"}`,color:vidCam?C.t2:C.r,cursor:"pointer",fontSize:14}}>{vidCam?<ChIcon t="video" s={14}/>:"✕"}</button>
              {videoScreenShare&&<button onClick={()=>setVidScreen(p=>!p)} style={{width:38,height:38,borderRadius:"50%",background:vidScreen?C.g+"22":C.s3,border:`1px solid ${vidScreen?C.g+"55":C.b1}`,color:vidScreen?C.g:C.t2,cursor:"pointer",fontSize:14}}>🖥</button>}
              <button onClick={endVideo} style={{width:38,height:38,borderRadius:"50%",background:C.r,border:"none",color:"#fff",cursor:"pointer",fontSize:14}}>✕</button>
            </div>
          </>}
          {videoState==="idle"&&<div style={{padding:"30px 20px",textAlign:"center"}}>
            <div style={{fontSize:13,color:C.t2,marginBottom:14}}>Start a video call with our team</div>
            <button onClick={startVideo} style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${C.p},${C.p}cc)`,border:"none",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:`0 4px 16px ${C.p}44`}}><ChIcon t="video" s={22} col="#fff"/></button>
          </div>}
        </div>}

        {/* No channels enabled */}
        {enabledChannels.length===0&&<div style={{position:"absolute",bottom:20,[position]:20,padding:"12px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,fontSize:12,color:C.t3}}>Enable at least one channel in General tab</div>}
      </div>
    </div>
  </div>;
}


