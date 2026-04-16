import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, API_BASE, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── TEAM CHAT ────────────────────────────────────────────────────────────
// ─── TEAM CHAT (Slack/Cliq-class) ─────────────────────────────────────────
const TC_SECTIONS=[{id:"starred",name:"Starred"},{id:"channels",name:"Channels"},{id:"dms",name:"Direct Messages"}];
// Exported empty stubs — real data comes from API
export const TC_CHANNELS:any[]=[];
export const TC_DMS:any[]=[];
const REACTIONS_SET=["👍","❤️","🔥","🎉","👀","🚀","✅","💯","🙏","😂","😢","🤔","💪","🤝","❓","⚡"];
const SLASH_CMDS=[{cmd:"/remind",desc:"Set a reminder"},{cmd:"/poll",desc:"Create a poll"},{cmd:"/status",desc:"Update status"},{cmd:"/mute",desc:"Mute channel"},{cmd:"/topic",desc:"Set channel topic"},{cmd:"/invite",desc:"Invite to channel"},{cmd:"/shrug",desc:"¯\\_(ツ)_/¯"},{cmd:"/ai",desc:"Ask AI"},{cmd:"/ticket",desc:"Create ticket from chat"},{cmd:"/call",desc:"Start huddle"},{cmd:"/giphy",desc:"Send a GIF"},{cmd:"/leave",desc:"Leave channel"}];

export default function TeamChatScr({agents,setAgents,fontKey,themeKey}){
  const [channels,setChannels]=useState<any[]>([]);
  // ═══ MULTI-PANE ═══
  const [panes,setPanes]=useState([]); // secondary pane channel/dm IDs (max 2)
  const [paneInputs,setPaneInputs]=useState({});
  const _backendOrigin = API_BASE.replace(/\/api$/, '');
  const _resolveUrl = (url:string|null|undefined) => {
    if (!url) return null;
    if (url.startsWith('blob:') || url.startsWith('http')) return url;
    return _backendOrigin + (url.startsWith('/') ? '' : '/') + url;
  };
  function parseApiMsg(m:any) {
    let rxArr:any[] = [];
    try {
      const raw = typeof m.reactions === 'string' ? JSON.parse(m.reactions || '{}') : (m.reactions || {});
      rxArr = Object.entries(raw).map(([emoji, users]) => ({ emoji, users }));
    } catch(e) {}
    const atts = typeof m.attachments === 'string' ? JSON.parse(m.attachments || '[]') : (m.attachments || []);
    const file = atts.length > 0 ? {
      name: atts[0].name,
      size: atts[0].size,
      type: atts[0].type,
      url: _resolveUrl(atts[0].url),
      contentType: atts[0].contentType || '',
      isVoice: !!(atts[0].isVoice),
      duration: atts[0].duration || null,
    } : null;
    const msgTime = m.created_at ? new Date(m.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : '';
    let seenBy:string[] = [];
    try { seenBy = Array.isArray(m.seen_by) ? m.seen_by : JSON.parse(m.seen_by || '[]'); } catch {}
    return { id: m.id, uid: m.sender_id, text: m.text || '', t: msgTime, date: 'Today', reactions: rxArr, thread: m.thread || [], pinned: false, file, seen_by: seenBy, sender_name: m.sender_name, sender_avatar: m.sender_avatar, sender_color: m.sender_color };
  }
  const openPane = (chId) => {
    if (chId === activeCh || panes.includes(chId)) return;
    setPanes(p => p.length >= 2 ? [p[1], chId] : [...p, chId]);
    if (api.isConnected() && !tcMsgs[chId]?.length) {
      api.get(`/chat/channels/${chId}/messages`).then(r => {
        if (r?.messages?.length) setTcMsgs(p => ({ ...p, [chId]: r.messages.map(parseApiMsg) }));
      }).catch(() => {});
    }
  };
  const closePane=(chId)=>setPanes(p=>p.filter(x=>x!==chId));
  const paneSend=(chId:string)=>{
    const txt=(paneInputs[chId]||"").trim();if(!txt)return;
    const myId=myIdRef.current;
    setTcMsgs(p=>({...p,[chId]:[...(p[chId]||[]),{id:"tm"+uid(),uid:myId,text:txt,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:null}]}));
    setPaneInputs(p=>({...p,[chId]:""}));
    if(api.isConnected())api.post(`/chat/channels/${chId}/messages`,{text:txt}).catch(()=>{});
  };;
  // Public channels auto-include all agents/members
  const getChMembers=ch=>{if(!ch)return[];if(!ch.private)return agents.map(a=>a.id);return ch.members||[];};
  const [tcMsgs,setTcMsgs]=useState<Record<string,any[]>>({});
  const [activeCh,setActiveCh]=useState("");
  const [tcInp,setTcInp]=useState("");
  const [showThread,setShowThread]=useState(null);const [threadInp,setThreadInp]=useState("");
  const [showReactions,setShowReactions]=useState(null);
  const [showNewCh,setShowNewCh]=useState(false);const [newChName,setNewChName]=useState("");const [newChDesc,setNewChDesc]=useState("");const [newChPrivate,setNewChPrivate]=useState(false);
  const [showHuddle,setShowHuddle]=useState(false);
  const [tcSearch,setTcSearch]=useState("");
  const [collapsed,setCollapsed]=useState({});
  const [pinnedMsgs,setPinnedMsgs]=useState<Record<string,string[]>>({});
  const [bookmarks,setBookmarks]=useState([]);
  const [editingMsg,setEditingMsg]=useState(null);const [editText,setEditText]=useState("");
  const [showPinned,setShowPinned]=useState(false);
  const [showPoll,setShowPoll]=useState(false);const [pollQ,setPollQ]=useState("");const [pollOpts,setPollOpts]=useState(["","",""]);
  const [polls,setPolls]=useState<Record<string,any[]>>({});
  const [userStatus,setUserStatus]=useState({emoji:"🟢",text:"Available"});const [showStatusPicker,setShowStatusPicker]=useState(false);
  const [showMembers,setShowMembers]=useState(false);const [showChInfo,setShowChInfo]=useState(false);
  // ── Channel & Member management ──
  const [tcDms,setTcDms]=useState<any[]>([]);
  const [showInvite,setShowInvite]=useState(false);
  const [showEditCh,setShowEditCh]=useState(false);
  const [editChName,setEditChName]=useState("");const [editChDesc,setEditChDesc]=useState("");const [editChTopic,setEditChTopic]=useState("");const [editChPrivate,setEditChPrivate]=useState(false);
  const [showNewDm,setShowNewDm]=useState(false);
  const [showDeleteCh,setShowDeleteCh]=useState(false);
  const [typingUsers,setTypingUsers]=useState({});
  // ── Decode JWT to get current agent ID ──
  useEffect(()=>{
    const token=api.getToken();
    if(token){try{const p=JSON.parse(atob(token.split('.')[1]));if(p.id)myIdRef.current=p.id;}catch{}}
  },[]);

  // ── Keep activeChRef in sync ──
  useEffect(()=>{activeChRef.current=activeCh;},[activeCh]);

  // ── WebSocket: handle incoming real-time events ──
  const handleWsMsg=useCallback((msg:any)=>{
    switch(msg.type){
      case 'tc_message':
        if(msg.message){
          const m=msg.message;
          // Skip messages sent by the current user (already added optimistically)
          if(m.sender_id===myIdRef.current)break;
          const parsed=parseApiMsg(m);
          setTcMsgs(p=>{
            const chMsgs=p[msg.channelId]||[];
            // Deduplicate: skip if a message with this real ID already exists
            if(chMsgs.some((e:any)=>e.id===parsed.id))return p;
            return{...p,[msg.channelId]:[...chMsgs,parsed]};
          });
          if(msg.channelId===activeChRef.current){
            sendReadReceipt(msg.channelId);
          } else {
            setChannels(p=>p.map(c=>c.id===msg.channelId?{...c,unread:(c.unread||0)+1}:c));
          }
          try{playNotifSound?.();}catch{}
        }
        break;
      case 'tc_typing':
        if(msg.from!==myIdRef.current){
          setTypingUsers(p=>({...p,[msg.channelId]:msg.isTyping?[msg.from]:(p[msg.channelId]||[]).filter((u:string)=>u!==msg.from)}));
          if(msg.isTyping)setTimeout(()=>setTypingUsers(p=>({...p,[msg.channelId]:(p[msg.channelId]||[]).filter((u:string)=>u!==msg.from)})),4000);
        }
        break;
      case 'tc_reaction':
        if(msg.agentId!==myIdRef.current){
          setTcMsgs(p=>{
            const msgs=p[msg.channelId];if(!msgs)return p;
            return{...p,[msg.channelId]:msgs.map((m:any)=>{
              if(m.id!==msg.messageId)return m;
              const reactions=Object.entries(msg.reactions||{}).map(([emoji,users])=>({emoji,users}));
              return{...m,reactions};
            })};
          });
        }
        break;
      case 'tc_msg_delete':
        setTcMsgs(p=>{const msgs=p[msg.channelId];if(!msgs)return p;return{...p,[msg.channelId]:msgs.filter((m:any)=>m.id!==msg.messageId)};});
        break;
      case 'tc_msg_edit':
        setTcMsgs(p=>{const msgs=p[msg.channelId];if(!msgs)return p;return{...p,[msg.channelId]:msgs.map((m:any)=>m.id===msg.messageId?{...m,text:msg.text,edited:true}:m)};});
        break;
      case 'tc_channel_new':
        if(msg.channel){
          const ch=msg.channel;
          let mems:string[]=[];try{mems=typeof ch.members==='string'?JSON.parse(ch.members):ch.members||[];}catch{}
          setChannels(p=>{if(p.some((c:any)=>c.id===ch.id))return p;const next=[...p,{id:ch.id,name:ch.name,desc:ch.description||'',icon:ch.type==='private'?'🔒':'#',private:ch.type==='private',members:mems,unread:0,starred:false,muted:false,topic:ch.topic||'',bookmarks:[]}];return next;});
          // Auto-select if we have no active channel
          setActiveCh(p=>p?p:ch.id);
        }
        break;
      case 'tc_poll_new':
        if(msg.poll&&msg.channelId){
          const pl=msg.poll;
          const opts=(pl.options||[]).map((o:any)=>({text:o.text,votes:o.votes||[]}));
          setPolls(p=>({...p,[msg.channelId]:[...(p[msg.channelId]||[]).filter((x:any)=>x.id!==pl.id),{id:pl.id,q:pl.question,opts,closed:!!pl.closed}]}));
        }
        break;
      case 'tc_poll_vote':
        setPolls(p=>({...p,[msg.channelId]:(p[msg.channelId]||[]).map((pl:any)=>pl.id===msg.pollId?{...pl,opts:msg.options.map((o:any)=>({text:o.text,votes:o.votes||[]}))}:pl)}));
        break;
      case 'tc_thread_reply':
        if(msg.message&&msg.message.sender_id!==myIdRef.current){
          const t2=msg.message;
          setTcMsgs(p=>{const msgs=p[msg.channelId];if(!msgs)return p;return{...p,[msg.channelId]:msgs.map((m:any)=>m.id===msg.parentId?{...m,thread:[...m.thread,{id:t2.id,uid:t2.sender_id,text:t2.text,t:new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}]}:m)};});
        }
        break;
      case 'connected':
        // Server sends the list of currently online agents so we can initialise presence immediately
        if(msg.onlineAgents&&setAgents){
          setAgents((p:any[])=>p.map(a=>({...a,status:msg.onlineAgents.includes(a.id)?'online':a.status==='online'?'offline':a.status})));
        }
        break;
      case 'presence':
        if(setAgents)setAgents((p:any[])=>p.map(a=>a.id===msg.agentId?{...a,status:msg.status}:a));
        break;
      case 'tc_call_offer':
        setIncomingCall({from:msg.from,callId:msg.callId,offer:msg.offer,callerName:msg.callerName||'Team Member',callType:msg.callType||'voice'});
        break;
      case 'tc_call_answer':
        if(peerRef.current)peerRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer)).catch(()=>{});
        break;
      case 'tc_call_ice':
        if(peerRef.current&&msg.candidate)peerRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(()=>{});
        break;
      case 'tc_call_end':
        endCall(false);
        break;
      case 'tc_read':
        // Another agent has read messages — update seen_by on those messages
        if(msg.seenMap){
          setTcMsgs(p=>{
            const chMsgs=p[msg.channelId];if(!chMsgs)return p;
            return{...p,[msg.channelId]:chMsgs.map((m:any)=>{
              if(!msg.seenMap[m.id])return m;
              const seenBy:string[]=msg.seenMap[m.id]||[];
              return{...m,seen_by:seenBy};
            })};
          });
        }
        break;
    }
  },[setAgents]);

  // ── WebSocket connection with auto-reconnect ──
  useEffect(()=>{
    const token=api.getToken();
    if(!token)return;
    let ws:WebSocket;let reconnTimer:any;let pingTimer:any;
    let killed=false; // prevents stale reconnect after cleanup (StrictMode / unmount)
    const connect=()=>{
      if(killed)return;
      const base=(import.meta.env.VITE_BACKEND_URL??window.location.origin).replace(/^http/,'ws');
      ws=new WebSocket(`${base}/ws?token=${token}`);
      wsRef.current=ws;
      ws.onopen=()=>{pingTimer=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'ping'}));},25000);};
      ws.onmessage=(e)=>{try{handleWsMsg(JSON.parse(e.data));}catch{}};
      ws.onclose=()=>{clearInterval(pingTimer);if(!killed){wsRef.current=null;reconnTimer=setTimeout(connect,3000);}};
      ws.onerror=()=>{ws.close();};
    };
    connect();
    return()=>{killed=true;clearTimeout(reconnTimer);clearInterval(pingTimer);if(ws){ws.onclose=null;ws.close();}wsRef.current=null;};
  },[handleWsMsg]);

  const sendWs=(data:any)=>{if(wsRef.current?.readyState===1)wsRef.current.send(JSON.stringify(data));};

  // ── WebRTC call helpers ──
  const endCall=(sendSignal=true)=>{
    if(sendSignal&&callTargetRef.current)sendWs({type:'tc_call_end',targetId:callTargetRef.current,callId:callIdRef.current});
    clearInterval(callTimerRef.current);callTimerRef.current=null;
    peerRef.current?.close();peerRef.current=null;
    localStreamRef.current?.getTracks().forEach(t=>t.stop());localStreamRef.current=null;
    if(localVideoRef.current)localVideoRef.current.srcObject=null;
    if(remoteVideoRef.current)remoteVideoRef.current.srcObject=null;
    if(remoteAudioRef.current)remoteAudioRef.current.srcObject=null;
    callIdRef.current=null;callTargetRef.current=null;
    setActiveCall(null);setShowHuddle(false);setHuddleMic(true);setHuddleCam(false);setHuddleScreen(false);
    setCallType(null);setCallDuration(0);setRemoteHasVideo(false);
  };

  const RTC_CONFIG:RTCConfiguration={iceServers:[
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:stun1.l.google.com:19302'},
    {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
    {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
    {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'},
  ],iceTransportPolicy:'all' as RTCIceTransportPolicy};
  const AUDIO_CONSTRAINTS={audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}};

  const initCall=async(targetId:string,type:"voice"|"video"|"screen"="voice")=>{
    const callId='call'+uid();
    callIdRef.current=callId;callTargetRef.current=targetId;
    setCallType(type);
    const pc=new RTCPeerConnection(RTC_CONFIG);
    peerRef.current=pc;

    // Connection state monitoring
    pc.onconnectionstatechange=()=>{
      const s=pc.connectionState;
      if(s==='failed'){showT('Call connection failed — check your network','error');endCall(true);}
      if(s==='disconnected')showT('Call connection unstable…','info');
    };
    pc.oniceconnectionstatechange=()=>{
      if(pc.iceConnectionState==='failed'){pc.restartIce();}
    };

    try{
      let stream:MediaStream;
      if(type==="screen"){
        const screenStream=await(navigator.mediaDevices as any).getDisplayMedia({video:{cursor:"always"},audio:true}).catch(()=>null);
        const existingAudio=localStreamRef.current?.getAudioTracks()||[];
        const micStream=existingAudio.length>0?null:await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS).catch(()=>null);
        const tracks=[...(screenStream?.getTracks()||[]),...existingAudio,...(micStream?.getAudioTracks()||[])];
        stream=new MediaStream(tracks);
        setHuddleScreen(true);setHuddleCam(false);
        screenStream?.getVideoTracks()[0]?.addEventListener('ended',()=>endCall(true));
      }else{
        const preview=localStreamRef.current;
        const previewHasVideo=(preview?.getVideoTracks().filter(t=>t.readyState==="live").length||0)>0;
        const needsVideo=type==="video";
        if(preview&&(needsVideo===previewHasVideo)){
          stream=preview;
        }else{
          stream=await navigator.mediaDevices.getUserMedia({...AUDIO_CONSTRAINTS,video:needsVideo});
        }
        setHuddleCam(needsVideo);setHuddleScreen(false);
      }
      localStreamRef.current=stream;
      if(localVideoRef.current)localVideoRef.current.srcObject=stream;
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
    }catch(e){showT('Microphone/camera access required for calls','error');endCall(true);return;}

    pc.onicecandidate=(e)=>{if(e.candidate)sendWs({type:'tc_call_ice',targetId,callId,candidate:e.candidate});};
    pc.ontrack=(e)=>{
      const s=e.streams[0];
      if(remoteVideoRef.current){remoteVideoRef.current.srcObject=s;remoteVideoRef.current.play().catch(()=>{});}
      if(remoteAudioRef.current){remoteAudioRef.current.srcObject=s;remoteAudioRef.current.play().catch(()=>{});}
      if(e.track.kind==="video")setRemoteHasVideo(true);
    };
    const offer=await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true});
    await pc.setLocalDescription(offer);
    const callerName=agents.find((a:any)=>a.id===myIdRef.current)?.name||'Team Member';
    sendWs({type:'tc_call_offer',targetId,callId,offer,callerName,channelId:activeCh,callType:type});
    setActiveCall({callId,targetId,type:'outgoing'});setShowHuddle(true);
    setCallDuration(0);callTimerRef.current=setInterval(()=>setCallDuration(p=>p+1),1000);
    showT(type==="video"?"Video call started…":type==="screen"?"Screen share started…":"Voice call started…","info");
  };

  const acceptCall=async()=>{
    if(!incomingCall)return;
    const type=(incomingCall.callType||"voice") as "voice"|"video"|"screen";
    const fromId=incomingCall.from;const cId=incomingCall.callId;
    setCallType(type);
    const pc=new RTCPeerConnection(RTC_CONFIG);
    peerRef.current=pc;callIdRef.current=cId;callTargetRef.current=fromId;

    pc.onconnectionstatechange=()=>{
      const s=pc.connectionState;
      if(s==='failed'){showT('Call connection failed','error');endCall(true);}
      if(s==='disconnected')showT('Call connection unstable…','info');
    };
    pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')pc.restartIce();};

    try{
      const stream=await navigator.mediaDevices.getUserMedia({...AUDIO_CONSTRAINTS,video:type==="video"});
      localStreamRef.current=stream;
      if(localVideoRef.current)localVideoRef.current.srcObject=stream;
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      setHuddleCam(type==="video");
    }catch{showT('Microphone/camera access required','error');endCall(true);return;}

    pc.onicecandidate=(e)=>{if(e.candidate)sendWs({type:'tc_call_ice',targetId:fromId,callId:cId,candidate:e.candidate});};
    pc.ontrack=(e)=>{
      const s=e.streams[0];
      if(remoteVideoRef.current){remoteVideoRef.current.srcObject=s;remoteVideoRef.current.play().catch(()=>{});}
      if(remoteAudioRef.current){remoteAudioRef.current.srcObject=s;remoteAudioRef.current.play().catch(()=>{});}
      if(e.track.kind==="video")setRemoteHasVideo(true);
    };
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer=await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendWs({type:'tc_call_answer',targetId:fromId,callId:cId,answer});
    setActiveCall({callId:cId,targetId:fromId,type:'incoming'});
    setIncomingCall(null);setShowHuddle(true);
    setCallDuration(0);callTimerRef.current=setInterval(()=>setCallDuration(p=>p+1),1000);
  };

  // Mark all messages in a channel as read
  const sendReadReceipt=useCallback((chId:string)=>{
    if(!chId||!api.isConnected())return;
    api.post(`/chat/channels/${chId}/read`,{}).catch(()=>{});
  },[]);

  // Send typing event via WebSocket
  const sendTypingEvent=()=>{
    sendWs({type:'tc_typing',channelId:activeCh,isTyping:true});
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current=setTimeout(()=>sendWs({type:'tc_typing',channelId:activeCh,isTyping:false}),3000);
  };
  // ── Call / WebRTC state ──
  const [incomingCall,setIncomingCall]=useState<{from:string,callId:string,offer:RTCSessionDescriptionInit,callerName:string,callType?:string}|null>(null);
  const [activeCall,setActiveCall]=useState<{callId:string,targetId:string,type:string}|null>(null);
  const [callType,setCallType]=useState<"voice"|"video"|"screen"|null>(null);
  const [callDuration,setCallDuration]=useState(0);
  const [remoteHasVideo,setRemoteHasVideo]=useState(false);
  const [showSchedule,setShowSchedule]=useState(false);const [scheduleTime,setScheduleTime]=useState("");
  const [msgSearch,setMsgSearch]=useState("");const [showMsgSearch,setShowMsgSearch]=useState(false);
  const [showSlash,setShowSlash]=useState(false);
  const [showFwd,setShowFwd]=useState(null);const [reminderMsg,setReminderMsg]=useState(null);const [reminderTime,setReminderTime]=useState("30");
  const [profilePop,setProfilePop]=useState(null);
  const [showAiPanel,setShowAiPanel]=useState(false);
  const [aiSummary,setAiSummary]=useState(null);const [aiSumLoad,setAiSumLoad]=useState(false);
  const [aiSugs,setAiSugs]=useState([]);const [aiSugLoad,setAiSugLoad]=useState(false);
  const [aiStandup,setAiStandup]=useState(null);const [aiStdLoad,setAiStdLoad]=useState(false);
  // ── Invite to workspace (shared with Settings) ──
  const [showWsInvite,setShowWsInvite]=useState(false);const [wsInvName,setWsInvName]=useState("");const [wsInvEmail,setWsInvEmail]=useState("");
  const inviteToWorkspace=async()=>{
    if(!wsInvEmail.includes("@"))return showT("Valid email required","error");
    const nm=wsInvName.trim()||wsInvEmail.split("@")[0];
    if(api.isConnected()){
      const r=await api.post("/settings/agents",{name:nm,email:wsInvEmail,role:"member"}).catch(()=>null);
      if(r?.agent)setAgents((p:any[])=>[...p,{...r.agent,av:r.agent.avatar||nm.slice(0,2).toUpperCase(),color:r.agent.color||C.a,status:"offline"}]);
      else setAgents((p:any[])=>[...p,{id:"a"+uid(),name:nm,email:wsInvEmail,role:"Member",av:nm.slice(0,2).toUpperCase(),color:[C.a,C.g,C.p,C.cy,C.y,"#ff6b35"][Math.floor(Math.random()*6)],status:"offline",maxConvs:8}]);
    }else{
      setAgents((p:any[])=>[...p,{id:"a"+uid(),name:nm,email:wsInvEmail,role:"Member",av:nm.slice(0,2).toUpperCase(),color:[C.a,C.g,C.p,C.cy,C.y,"#ff6b35"][Math.floor(Math.random()*6)],status:"offline",maxConvs:8}]);
    }
    showT(nm+" added to workspace as Member","success");setShowWsInvite(false);setWsInvName("");setWsInvEmail("");
  };
  const ref=useRef(null);
  const fileRef=useRef(null);
  // ── Real-time refs ──
  const wsRef=useRef<WebSocket|null>(null);
  const myIdRef=useRef<string>(""); // current logged-in agent ID from JWT
  const activeChRef=useRef<string>("");
  const typingTimeoutRef=useRef<any>(null);
  const peerRef=useRef<RTCPeerConnection|null>(null);
  const localStreamRef=useRef<MediaStream|null>(null);
  const localVideoRef=useRef<HTMLVideoElement|null>(null);
  const remoteVideoRef=useRef<HTMLVideoElement|null>(null);
  const remoteAudioRef=useRef<HTMLAudioElement|null>(null);
  const callIdRef=useRef<string|null>(null);
  const callTargetRef=useRef<string|null>(null);
  const callTimerRef=useRef<any>(null);
  const activeCallRef=useRef<any>(null);
  useEffect(()=>{activeCallRef.current=activeCall;},[activeCall]);
  // ── Voice recording state ──
  const [isRecording,setIsRecording]=useState(false);
  const [recordingSec,setRecordingSec]=useState(0);
  const mediaRecorderRef=useRef<MediaRecorder|null>(null);
  const audioChunksRef=useRef<Blob[]>([]);
  const recordTimerRef=useRef<any>(null);
  const handleFileUpload=async(e:any)=>{
    const f=e.target.files?.[0];if(!f)return;
    const MAX_MB=50;
    if(f.size>MAX_MB*1024*1024){showT(`File too large — max ${MAX_MB} MB`,"error");e.target.value="";return;}
    const sizeMB=(f.size/1024/1024).toFixed(1);
    const ext=f.name.split('.').pop()?.toLowerCase()||'bin';
    const isImg=f.type.startsWith('image/');
    const isAudio=f.type.startsWith('audio/');
    const isVideo=f.type.startsWith('video/');
    const myId=myIdRef.current;
    const msgText=isAudio?`🎵 ${f.name}`:isVideo?`🎬 ${f.name}`:`📎 ${f.name}`;
    const tempId="tm"+uid();
    // Optimistic: show immediately
    const fileObj:any={name:f.name,size:sizeMB+" MB",type:ext,contentType:f.type};
    if(isImg)fileObj.previewUrl=URL.createObjectURL(f);
    setTcMsgs(p=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:tempId,uid:myId,text:msgText,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:fileObj,seen_by:[]}]}));
    if(api.isConnected()){
      try{
        const fd=new FormData();fd.append("file",f);
        const r=await api.upload("/upload",fd).catch(()=>null);
        const url=r?.url||null;
        const att={name:f.name,size:sizeMB+" MB",type:ext,url,contentType:f.type};
        const res=await api.post(`/chat/channels/${activeCh}/messages`,{text:msgText,attachments:url?[att]:[]}).catch(()=>null);
        // Replace temp ID with real DB id and add server URL
        if(res?.message?.id){
          setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any)=>m.id===tempId?{...m,id:res.message.id,file:{...m.file,url}}:m)}));
        }
      }catch{}
    }
    showT("File shared: "+f.name,"success");e.target.value="";
  };
  // ── Voice recording ──
  const startRecording=async()=>{
    if(isRecording)return;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      const mimeType=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
      const mr=new MediaRecorder(stream,{mimeType});
      audioChunksRef.current=[];
      mr.ondataavailable=(e)=>{if(e.data.size>0)audioChunksRef.current.push(e.data);};
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        clearInterval(recordTimerRef.current);
        const blob=new Blob(audioChunksRef.current,{type:mimeType});
        const durSec=recordingSec;
        const dur=`${Math.floor(durSec/60)}:${String(durSec%60).padStart(2,'0')}`;
        const fname=`voice-${Date.now()}.webm`;
        const myId=myIdRef.current;
        const msgText=`🎙️ Voice message (${dur})`;
        const tempId="tm"+uid();
        let previewUrl=URL.createObjectURL(blob);
        const fileObj={name:fname,size:(blob.size/1024).toFixed(0)+" KB",type:"webm",contentType:mimeType,url:previewUrl,isVoice:true,duration:dur};
        setTcMsgs(p=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:tempId,uid:myId,text:msgText,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:fileObj,seen_by:[]}]}));
        setIsRecording(false);setRecordingSec(0);
        if(api.isConnected()){
          try{
            const fd=new FormData();fd.append("file",new File([blob],fname,{type:mimeType}));
            const r=await api.upload("/upload",fd).catch(()=>null);
            const url=r?.url||null;
            const att={name:fname,size:(blob.size/1024).toFixed(0)+" KB",type:"webm",url,contentType:mimeType,isVoice:true,duration:dur};
            const res=await api.post(`/chat/channels/${activeCh}/messages`,{text:msgText,attachments:url?[att]:[]}).catch(()=>null);
            if(res?.message?.id){
              setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any)=>m.id===tempId?{...m,id:res.message.id,file:{...m.file,url:_resolveUrl(url)||previewUrl}}:m)}));
            }
          }catch{}
        }
        showT("Voice message sent","success");
      };
      mr.start(250);
      mediaRecorderRef.current=mr;
      setIsRecording(true);setRecordingSec(0);
      recordTimerRef.current=setInterval(()=>setRecordingSec(p=>p+1),1000);
    }catch{showT("Microphone access required for voice messages","error");}
  };
  const stopRecording=()=>{
    if(mediaRecorderRef.current&&mediaRecorderRef.current.state!=="inactive"){
      mediaRecorderRef.current.stop();
    }
  };
  // ── New features state ──
  const [drafts,setDrafts]=useState({});
  const [scheduledMsgs,setScheduledMsgs]=useState([]);
  const [showScheduledList,setShowScheduledList]=useState(false);
  const [showFilesPanel,setShowFilesPanel]=useState(false);
  const [showEmojiPicker,setShowEmojiPicker]=useState(false);
  const [mentionSearch,setMentionSearch]=useState(null);
  const [chNotifPrefs,setChNotifPrefs]=useState({});
  const [showChNotif,setShowChNotif]=useState(false);
  const [lastRead]=useState<Record<string,string>>({});
  const [showFmtBar]=useState(true);
  const EMOJI_GRID=["😀","😂","🤣","😊","😍","🥰","😎","🤔","😢","😡","🥳","🤯","😴","🤮","🥺","😈","👍","👎","👏","🙌","🤝","💪","🔥","❤️","💯","✅","❌","⭐","🚀","🎉","🎯","💡","📌","📎","🔗","⚡","🏆","💎","🌟","⏰","📊","💬","🤖","🔔","🔕","📱","💻","🎧","☕"];
  const tcUnreadTotal=channels.reduce((s,c)=>s+c.unread,0)+tcDms.reduce((s,d)=>s+d.unread,0);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[tcMsgs,activeCh]);
  // ═══ TEAM CHAT API LOADING ═══
  useEffect(()=>{
    if(!api.isConnected())return;
    api.get("/chat/channels").then((r:any)=>{
      if(r?.channels?.length){
        const mapped=r.channels.map((c:any)=>{
          let mems:string[]=[];try{mems=typeof c.members==='string'?JSON.parse(c.members):c.members||[];}catch{}
          return{...c,unread:0,starred:false,muted:false,desc:c.description||'',icon:c.type==='private'?'🔒':'#',private:c.type==='private',members:mems,topic:c.topic||'',bookmarks:[]};
        });
        setChannels(mapped);
        // Auto-select first channel if nothing is active
        setActiveCh(p=>p?p:mapped[0]?.id||'');
      }
    }).catch(()=>{});
    api.get("/chat/dms").then((r:any)=>{
      if(r?.dms?.length)setTcDms(r.dms.map((d:any)=>{
        let mems:string[]=[];try{mems=typeof d.members==='string'?JSON.parse(d.members):d.members||[];}catch{}
        const otherId=mems.find((m:string)=>m!==myIdRef.current)||mems[1];
        return{id:d.id,agentId:otherId,unread:0,starred:false};
      }));
    }).catch(()=>{});
  },[]);

  // Load messages and polls when switching channel
  const [tcMsgsLoading,setTcMsgsLoading]=useState(false);
  useEffect(()=>{
    if(!api.isConnected()||!activeCh)return;
    if(!tcMsgs[activeCh]?.length){
      setTcMsgsLoading(true);
      api.get(`/chat/channels/${activeCh}/messages`).then((r:any) => {
        if (r?.messages?.length) setTcMsgs(p => ({ ...p, [activeCh]: r.messages.map(parseApiMsg) }));
      }).catch(() => {}).finally(() => setTcMsgsLoading(false));
    }
    // Mark all messages in this channel as read
    sendReadReceipt(activeCh);
    // Clear unread badge for this channel
    setChannels(p=>p.map(c=>c.id===activeCh?{...c,unread:0}:c));
    // Load polls for channel
    api.get(`/chat/channels/${activeCh}/polls`).then((r:any)=>{
      if(r?.polls?.length)setPolls(p=>({...p,[activeCh]:r.polls.map((pl:any)=>({
        id:pl.id,q:pl.question,
        opts:(pl.options||[]).map((o:any)=>({text:o.text,votes:o.votes||[]})),
        closed:!!pl.closed
      }))}));
    }).catch(()=>{});
  },[activeCh, sendReadReceipt]);
  // Keyboard shortcuts
  useEffect(()=>{const h=e=>{if(e.ctrlKey&&e.key==="/"){e.preventDefault();setTcInp("/");setShowSlash(true);}if(e.ctrlKey&&e.shiftKey&&e.key==="M"){e.preventDefault();setChannels(p=>p.map(c=>c.id===activeCh?{...c,muted:!c.muted}:c));showT(aCh?.muted?"Unmuted":"Muted","info");}if(e.key==="Escape"){setShowThread(null);setShowMembers(false);setShowChInfo(false);setShowAiPanel(false);setShowFilesPanel(false);setShowEmojiPicker(false);setMentionSearch(null);setProfilePop(null);}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[activeCh]);

  // ── Auto-start local media preview when call modal opens ──
  useEffect(()=>{
    if(!showHuddle||!callType||activeCallRef.current)return;
    let cancelled=false;
    (async()=>{
      try{
        if(callType==="video"){
          const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:{width:{ideal:1280},height:{ideal:720},facingMode:"user"}});
          if(cancelled){stream.getTracks().forEach(t=>t.stop());return;}
          localStreamRef.current=stream;
          if(localVideoRef.current){localVideoRef.current.srcObject=stream;localVideoRef.current.play().catch(()=>{});}
          setHuddleMic(true);setHuddleCam(true);
        }else if(callType==="voice"){
          const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
          if(cancelled){stream.getTracks().forEach(t=>t.stop());return;}
          localStreamRef.current=stream;
          setHuddleMic(true);setHuddleCam(false);
        }else if(callType==="screen"){
          try{
            const screenStream=await(navigator.mediaDevices as any).getDisplayMedia({video:{cursor:"always",displaySurface:"monitor"},audio:true});
            if(cancelled){screenStream.getTracks().forEach(t=>t.stop());return;}
            const micStream=await navigator.mediaDevices.getUserMedia({audio:true}).catch(()=>null);
            const combined=new MediaStream([...screenStream.getTracks(),...(micStream?.getAudioTracks()||[])]);
            localStreamRef.current=combined;
            if(localVideoRef.current){localVideoRef.current.srcObject=combined;localVideoRef.current.play().catch(()=>{});}
            setHuddleScreen(true);setHuddleMic(true);
            screenStream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(!cancelled)setHuddleScreen(false);});
          }catch{if(!cancelled){setShowHuddle(false);showT("Screen share cancelled","info");}}
        }
      }catch{if(!cancelled)showT("Camera/mic access denied — check browser permissions","error");}
    })();
    return()=>{
      cancelled=true;
      if(!activeCallRef.current){
        localStreamRef.current?.getTracks().forEach(t=>t.stop());
        localStreamRef.current=null;
        if(localVideoRef.current)localVideoRef.current.srcObject=null;
      }
    };
  },[showHuddle,callType]);

  const aCh=channels.find(c=>c.id===activeCh);const aDm=tcDms.find(d=>d.id===activeCh);
  const dmAg=aDm?agents.find(a=>a.id===aDm.agentId):null;
  const curMsgs=tcMsgs[activeCh]||[];const fMsgs=msgSearch?curMsgs.filter(m=>m.text.toLowerCase().includes(msgSearch.toLowerCase())):curMsgs;
  const ag=agents.reduce((m,a)=>{m[a.id]=a;return m;},{});
  const chPins=pinnedMsgs[activeCh]||[];const chLabel=aCh?"#"+aCh.name:dmAg?.name||"";
  const switchCh=id=>{if(tcInp.trim())setDrafts(p=>({...p,[activeCh]:tcInp}));setActiveCh(id);setTcInp(drafts[id]||"");setShowThread(null);setAiSummary(null);setMsgSearch("");setShowEmojiPicker(false);setMentionSearch(null);};

  const handleInp=e=>{const v=e.target.value;setTcInp(v);setShowSlash(v.startsWith("/")&&v.length<20);setAiSugs([]);sendTypingEvent();
    const atMatch=v.match(/@(\w*)$/);if(atMatch){setMentionSearch(atMatch[1].toLowerCase());setShowEmojiPicker(false);}else setMentionSearch(null);
  };
  const insertMention=name=>{setTcInp(p=>p.replace(/@\w*$/,"@"+name.split(" ")[0]+" "));setMentionSearch(null);};
  const insertFmt=(pre,suf)=>{setTcInp(p=>p+pre+(suf||""));};
  const insertEmoji=e=>{setTcInp(p=>p+e);setShowEmojiPicker(false);};
  const scheduleMsg=()=>{if(!tcInp.trim()||!scheduleTime)return;setScheduledMsgs(p=>[...p,{id:"sch"+uid(),ch:activeCh,text:tcInp,time:scheduleTime}]);setTcInp("");setShowSchedule(false);setScheduleTime("");showT("Scheduled!","success");};
  const cancelScheduled=id=>{setScheduledMsgs(p=>p.filter(s=>s.id!==id));showT("Cancelled","info");};
  const copyPermalink=mid=>{navigator.clipboard?.writeText(`#/teamchat?ch=${activeCh}&msg=${mid}`);showT("Link copied!","success");};
  const [huddleMic,setHuddleMic]=useState(true);const [huddleCam,setHuddleCam]=useState(false);const [huddleScreen,setHuddleScreen]=useState(false);
  // Re-sync local stream to the video element after the huddle UI renders/updates.
  // initCall captures the stream BEFORE setShowHuddle(true) renders the video elements,
  // so localVideoRef.current is null at capture time — this effect fixes that.
  useEffect(()=>{
    if(!showHuddle||!localStreamRef.current)return;
    if(localVideoRef.current&&localVideoRef.current.srcObject!==localStreamRef.current){
      localVideoRef.current.srcObject=localStreamRef.current;
      localVideoRef.current.play().catch(()=>{});
    }
  },[showHuddle,activeCall,huddleCam,huddleScreen]);
  const send=()=>{
    if(!tcInp.trim())return;const t=tcInp.trim();setTcInp("");setShowSlash(false);
    if(t==="/shrug"){addMsg("¯\\_(ツ)_/¯");return;}
    if(t.startsWith("/mute")){setChannels(p=>p.map(c=>c.id===activeCh?{...c,muted:!c.muted}:c));showT(aCh?.muted?"Unmuted":"Muted","info");return;}
    if(t.startsWith("/topic ")){setChannels(p=>p.map(c=>c.id===activeCh?{...c,topic:t.slice(7)}:c));showT("Topic updated","success");return;}
    if(t.startsWith("/status ")){setUserStatus({emoji:t.slice(8,10),text:t.slice(10).trim()||"Custom"});showT("Status set","success");return;}
    if(t.startsWith("/call")){setShowHuddle(true);return;}
    if(t.startsWith("/ai ")){
      const question=t.slice(4).trim();
      addMsg(question);
      addMsg("🤖 Thinking…",true);
      api.post('/ai/chat',{max_tokens:500,system:"You are a helpful team assistant in a support desk platform. Answer concisely and helpfully.",messages:[{role:"user",content:question}]})
        .then((d:any)=>{
          const reply=d.content?.[0]?.text||"Sorry, I couldn't process that.";
          setTcMsgs((p:any)=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any,i:number)=>
            i===(p[activeCh]||[]).length-1&&m.isBot?{...m,text:"🤖 "+reply}:m
          )}));
        })
        .catch(()=>{
          setTcMsgs((p:any)=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any,i:number)=>
            i===(p[activeCh]||[]).length-1&&m.isBot?{...m,text:"🤖 AI is not configured. Set ANTHROPIC_API_KEY in the backend .env file."}:m
          )}));
        });
      return;
    }
    if(t.startsWith("/remind ")){const parts=t.slice(8);setReminderMsg({id:"r"+uid(),text:parts});showT("Reminder set: "+parts,"success");return;}
    if(t.startsWith("/poll ")){setPollQ(t.slice(6));setShowPoll(true);return;}
    if(t.startsWith("/invite")){setShowInvite(true);return;}
    if(t.startsWith("/ticket")){addMsg("📋 Created support ticket from this conversation",true);showT("Ticket created from chat","success");return;}
    if(t.startsWith("/giphy ")){addMsg("🖼️ [GIF: "+t.slice(7)+"]");return;}
    if(t.startsWith("/leave")){leaveCh(activeCh);return;}
    addMsg(t);
  };
  const addMsg=(text:string,isBot?:boolean)=>{
    const myId=myIdRef.current;
    const newMsg={id:"tm"+uid(),uid:isBot?"bot":myId,text,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:null,isBot,seen_by:[]};
    setTcMsgs(p=>({...p,[activeCh]:[...(p[activeCh]||[]),newMsg]}));
    if(!isBot&&api.isConnected()){
      api.post(`/chat/channels/${activeCh}/messages`,{text}).then((r:any)=>{
        // Replace temp id with real DB id
        if(r?.message?.id){
          setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any)=>m.id===newMsg.id?{...m,id:r.message.id}:m)}));
        }
      }).catch(()=>{});
    }
  };
  const sendTh=()=>{
    if(!threadInp.trim()||!showThread)return;const text=threadInp.trim();
    const myId=myIdRef.current;
    setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any)=>m.id===showThread.id?{...m,thread:[...m.thread,{id:"tr"+uid(),uid:myId,text,t:now()}]}:m)}));
    setThreadInp("");
    if(api.isConnected())api.post(`/chat/messages/${showThread.id}/thread`,{text}).catch(()=>{});
  };
  const react=(mid:string,em:string)=>{
    const myId=myIdRef.current;
    setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any)=>{
      if(m.id!==mid)return m;
      const ex=m.reactions.find((r:any)=>r.emoji===em);
      if(ex){
        if(ex.users.includes(myId))return{...m,reactions:m.reactions.map((r:any)=>r.emoji===em?{...r,users:r.users.filter((u:string)=>u!==myId)}:r).filter((r:any)=>r.users.length>0)};
        return{...m,reactions:m.reactions.map((r:any)=>r.emoji===em?{...r,users:[...r.users,myId]}:r)};
      }
      return{...m,reactions:[...m.reactions,{emoji:em,users:[myId]}]};
    })}));
    setShowReactions(null);
    if(api.isConnected())api.post(`/chat/messages/${mid}/react`,{emoji:em}).catch(()=>{});
  };
  const del=(mid:string)=>{
    setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).filter((m:any)=>m.id!==mid)}));
    showT("Deleted","success");
    if(api.isConnected())api.del(`/chat/messages/${mid}`).catch(()=>{});
  };
  const saveEd=()=>{
    setTcMsgs(p=>({...p,[activeCh]:(p[activeCh]||[]).map((m:any)=>m.id===editingMsg?{...m,text:editText,edited:true}:m)}));
    if(api.isConnected())api.patch(`/chat/messages/${editingMsg}`,{text:editText}).catch(()=>{});
    setEditingMsg(null);showT("Edited","success");
  };
  const pin=mid=>{setPinnedMsgs(p=>{const c=p[activeCh]||[];const isPinned=c.includes(mid);const next=isPinned?c.filter(x=>x!==mid):[...c,mid];if(api.isConnected())api.patch(`/chat/messages/${mid}`,{pinned:!isPinned}).catch(()=>{});return{...p,[activeCh]:next};});showT("Pin toggled","success");};
  const star=cid=>{setChannels(p=>p.map(c=>c.id===cid?{...c,starred:!c.starred}:c));};
  const fwd=(msg:any,to:string)=>{
    const myId=myIdRef.current;
    setTcMsgs(p=>({...p,[to]:[...(p[to]||[]),{id:"tm"+uid(),uid:myId,text:`↪️ Fwd from ${chLabel}:\n> ${msg.text.slice(0,200)}`,t:now(),date:"Today",reactions:[],thread:[],pinned:false,file:null}]}));
    showT("Forwarded","success");setShowFwd(null);
    if(api.isConnected())api.post(`/chat/channels/${to}/messages`,{text:`↪️ Fwd from ${chLabel}:\n> ${msg.text.slice(0,200)}`}).catch(()=>{});
  };
  const createCh=async()=>{
    if(!newChName.trim())return showT("Name required","error");
    const myId=myIdRef.current;
    const chName=newChName.trim().toLowerCase().replace(/\s+/g,"-");
    if(api.isConnected()){
      const r=await api.post("/chat/channels",{name:chName,description:newChDesc,type:newChPrivate?"private":"public",members:[myId]}).catch(()=>null);
      if(r?.channel){
        const ch=r.channel;let mems:string[]=[];try{mems=typeof ch.members==='string'?JSON.parse(ch.members):ch.members||[];}catch{}
        setChannels((p:any[])=>{if(p.some(c=>c.id===ch.id))return p;return[...p,{id:ch.id,name:ch.name,desc:ch.description||newChDesc,icon:newChPrivate?"🔒":"#",private:newChPrivate,members:mems,unread:0,starred:false,muted:false,topic:"",bookmarks:[]}];});
        setActiveCh(ch.id);
      }
    }else{
      const id="ch"+uid();
      setChannels((p:any[])=>[...p,{id,name:chName,desc:newChDesc,icon:newChPrivate?"🔒":"#",private:newChPrivate,members:[myId],unread:0,starred:false,muted:false,topic:"",bookmarks:[]}]);
      setActiveCh(id);
    }
    setShowNewCh(false);setNewChName("");setNewChDesc("");showT("Channel created!","success");
  };
  // ── Channel management ──
  const addMember=(chId:string,agId:string)=>{
    setChannels((p:any[])=>p.map((c:any)=>c.id===chId?{...c,members:[...new Set([...c.members,agId])]}:c));
    const name=(agents as any[]).find((a:any)=>a.id===agId)?.name||agId;
    showT(name+" added","success");
    addMsg("👤 "+name+" was added to the channel",true);
    if(api.isConnected()){
      const ch=(channels as any[]).find((c:any)=>c.id===chId);
      let mems:string[]=ch?.members||[];
      if(!mems.includes(agId))mems=[...mems,agId];
      api.patch(`/chat/channels/${chId}`,{members:mems}).catch(()=>{});
    }
  };
  const removeMember=(chId:string,agId:string)=>{if(agId===myIdRef.current)return showT("Can't remove yourself — use Leave","error");setChannels((p:any[])=>p.map((c:any)=>c.id===chId?{...c,members:c.members.filter((m:string)=>m!==agId)}:c));showT("Member removed","success");
    addMsg("👤 "+agents.find(a=>a.id===agId)?.name+" was removed from the channel",true);
  };
  const leaveCh=(chId:string)=>{
    const myId=myIdRef.current;
    setChannels((p:any[])=>p.map((c:any)=>c.id===chId?{...c,members:c.members.filter((m:string)=>m!==myId)}:c));
    showT("Left channel","info");
    const fallback=(channels as any[]).find((c:any)=>c.id!==chId)?.id||"ch1";
    switchCh(fallback);
  };
  const editChSave=()=>{
    setChannels((p:any[])=>p.map((c:any)=>c.id===activeCh?{...c,name:editChName||c.name,desc:editChDesc||c.desc,topic:editChTopic!==undefined?editChTopic:c.topic,private:editChPrivate,icon:editChPrivate?"🔒":"#"}:c));
    setShowEditCh(false);showT("Channel updated","success");
    if(api.isConnected())api.patch(`/chat/channels/${activeCh}`,{name:editChName,description:editChDesc,topic:editChTopic}).catch(()=>{});
  };
  const deleteCh=(chId:string)=>{
    const ch=(channels as any[]).find((c:any)=>c.id===chId);
    setChannels((p:any[])=>p.filter((c:any)=>c.id!==chId));
    setTcMsgs(p=>{const n={...p};delete n[chId];return n;});
    // Switch to first available channel
    const fallback=(channels as any[]).find((c:any)=>c.id!==chId)?.id||"ch1";
    switchCh(fallback);setShowDeleteCh(false);setShowChInfo(false);
    showT("#"+(ch?.name||"channel")+" deleted","success");
    if(api.isConnected())api.del(`/chat/channels/${chId}`).catch(()=>{});
  };
  const openEditCh=()=>{if(!aCh)return;setEditChName(aCh.name);setEditChDesc(aCh.desc);setEditChTopic(aCh.topic);setEditChPrivate(aCh.private);setShowEditCh(true);};
  const startDm=async(agId:string)=>{
    const existing=tcDms.find((d:any)=>d.agentId===agId);
    if(existing){switchCh(existing.id);setProfilePop(null);return;}
    let dmId="dm"+uid();
    if(api.isConnected()){
      const r=await api.post("/chat/dms",{agentId:agId}).catch(()=>null);
      if(r?.channel)dmId=r.channel.id;
    }
    setTcDms((p:any[])=>[...p,{id:dmId,agentId:agId,unread:0,starred:false}]);
    switchCh(dmId);setProfilePop(null);setShowNewDm(false);
    showT("DM opened with "+agents.find((a:any)=>a.id===agId)?.name,"success");
  };
  const votePoll=async(pid:string,oi:number)=>{
    const myId=myIdRef.current;
    // Optimistic update
    setPolls((p:any)=>({...p,[activeCh]:(p[activeCh]||[]).map((pl:any)=>pl.id!==pid?pl:{...pl,opts:pl.opts.map((o:any,i:number)=>i===oi?{...o,votes:o.votes.includes(myId)?o.votes.filter((v:string)=>v!==myId):[...o.votes,myId]}:o)})}));
    if(api.isConnected())api.post(`/chat/polls/${pid}/vote`,{optionIndex:oi}).catch(()=>{});
  };
  const createPoll=async()=>{
    const opts=pollOpts.filter(o=>o.trim());
    if(!pollQ.trim()||opts.length<2)return showT("Need question + 2 options","error");
    if(api.isConnected()){
      const r=await api.post(`/chat/channels/${activeCh}/polls`,{question:pollQ,options:opts}).catch(()=>null);
      if(!r?.poll){// fallback if API fails
        setPolls((p:any)=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:"poll"+uid(),q:pollQ,opts:opts.map(o=>({text:o,votes:[]})),closed:false}]}));
      }
      // if API ok, poll comes back via WS broadcast tc_poll_new
    }else{
      setPolls((p:any)=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:"poll"+uid(),q:pollQ,opts:opts.map(o=>({text:o,votes:[]})),closed:false}]}));
    }
    setShowPoll(false);setPollQ("");setPollOpts(["","",""]);showT("Poll created!","success");
  };
  // AI
  const aiSum=async()=>{
    setAiSumLoad(true);setAiSummary(null);
    try{
      const d=await api.post('/ai/chat-summary',{channel_id:activeCh});
      setAiSummary(d.summary||"No summary available.");
    }catch(e){
      // Fallback: build context from loaded messages and use generic endpoint
      try{
        const ctx=curMsgs.slice(-15).map((m:any)=>`[${ag[m.uid]?.name||"Agent"}] ${m.text}`).join("\n");
        const d2=await api.post('/ai/chat',{max_tokens:400,system:"Summarize team chat in 3-4 bullet points. Decisions, actions, updates. No markdown.",messages:[{role:"user",content:ctx}]});
        setAiSummary(d2.content?.[0]?.text||"Could not generate summary.");
      }catch{setAiSummary("Could not generate summary — check AI configuration.");}
    }
    setAiSumLoad(false);
  };
  const aiReply=async()=>{
    setAiSugLoad(true);setAiSugs([]);
    try{
      const d=await api.post('/ai/chat-reply-suggestions',{channel_id:activeCh});
      setAiSugs(d.suggestions||["Got it.","Thanks!","On it."]);
    }catch(e){
      try{
        const ctx=curMsgs.slice(-3).map((m:any)=>`[${ag[m.uid]?.name}] ${m.text}`).join("\n");
        const d2=await api.post('/ai/chat',{max_tokens:200,system:"Suggest 3 short team chat replies. Return JSON array of 3 strings only.",messages:[{role:"user",content:ctx}]});
        const p=JSON.parse((d2.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim());
        setAiSugs(Array.isArray(p)?p:["Got it, on it.","Thanks!","Good call."]);
      }catch{setAiSugs(["Got it, I'll handle this.","Thanks for the update!","Makes sense — let's do it."]);}
    }
    setAiSugLoad(false);
  };
  const aiStd=async()=>{
    setAiStdLoad(true);setAiStandup(null);
    try{
      const d=await api.post('/ai/chat-standup',{channel_id:activeCh});
      setAiStandup(d.standup||"No standup generated.");
    }catch(e){
      try{
        const ctx=curMsgs.slice(-20).map((m:any)=>`[${ag[m.uid]?.name}] ${m.text}`).join("\n");
        const d2=await api.post('/ai/chat',{max_tokens:350,system:"Generate standup: DONE, DOING, BLOCKED. 2-3 bullets each. No markdown.",messages:[{role:"user",content:ctx}]});
        setAiStandup(d2.content?.[0]?.text||"");
      }catch{setAiStandup("Could not generate standup — check AI configuration.");}
    }
    setAiStdLoad(false);
  };

  const togSec=id=>setCollapsed(p=>({...p,[id]:!p[id]}));
  const starredChs=channels.filter(c=>c.starred);const starredDms=tcDms.filter(d=>d.starred);

  const renderMsg=(m:any,isThread:boolean)=>{
    const myId=myIdRef.current;
    const a2=m.isBot?{name:"SupportDesk AI",av:"✦",color:C.p,status:"online",role:"Bot"}:ag[m.uid]||{name:m.sender_name||"?",av:(m.sender_name||"?").slice(0,2).toUpperCase(),color:C.t3};
    const isPinned=chPins.includes(m.id);const isBm=bookmarks.includes(m.id);const isEd=editingMsg===m.id;
    const hl=msgSearch&&m.text.toLowerCase().includes(msgSearch.toLowerCase());
    return <div key={m.id} className="msg-row" style={{display:"flex",gap:9,padding:isThread?"6px 0":"10px 22px",position:"relative",background:hl?C.yd+"55":"transparent",borderLeft:isPinned&&!isThread?`3px solid ${C.y}`:"3px solid transparent"}}>
      <div style={{cursor:"pointer",flexShrink:0}} onClick={()=>!isThread&&!m.isBot&&setProfilePop(m.uid)}><Av i={a2.av} c={a2.color} s={isThread?24:36} dot={a2.status==="online"}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:5,marginBottom:1}}>
          <span style={{fontSize:isThread?12:14,fontWeight:700,color:m.isBot?C.p:C.t1,cursor:"pointer"}} onClick={()=>!isThread&&!m.isBot&&setProfilePop(m.uid)}>{a2.name}</span>
          {a2.role&&!isThread&&<span style={{fontSize:9,fontFamily:FM,color:a2.role==="Bot"?C.p:a2.role==="Owner"?C.p:C.t3,background:a2.role==="Bot"?C.pd:C.s3,padding:"1px 4px",borderRadius:3}}>{a2.role}</span>}
          <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{m.t}</span>
          {m.edited&&<span style={{fontSize:9,color:C.t3,fontStyle:"italic"}}>(edited)</span>}
          {isPinned&&<span style={{fontSize:9,color:C.y}}>📌</span>}
        </div>
        {isEd?<div style={{display:"flex",gap:4}}><input value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEd();if(e.key==="Escape")setEditingMsg(null);}} autoFocus style={{flex:1,background:C.bg,border:`1px solid ${C.a}`,borderRadius:5,padding:"4px 7px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/><button onClick={saveEd} style={{padding:"3px 7px",borderRadius:4,fontSize:9,background:C.a,color:"#fff",border:"none",cursor:"pointer"}}>Save</button><button onClick={()=>setEditingMsg(null)} style={{padding:"3px 5px",borderRadius:4,fontSize:9,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Esc</button></div>:
        <div style={{fontSize:14,color:m.isBot?C.p:C.t1,lineHeight:1.65,wordBreak:"break-word"}}>
          {m.text.split("\n").map((line,i)=>{
            const hlText=(txt)=>{if(!msgSearch||!hl)return txt;const re=new RegExp(`(${msgSearch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');const parts=txt.split(re);return parts.map((p,k)=>re.test(p)?<mark key={k} style={{background:C.y+"66",color:C.t1,borderRadius:2,padding:"0 1px"}}>{p}</mark>:p);};
            if(line.startsWith("**")&&line.endsWith("**"))return <strong key={i} style={{color:C.t1,display:"block"}}>{hlText(line.slice(2,-2))}</strong>;
            if(line.startsWith("> "))return <div key={i} style={{borderLeft:`3px solid ${C.b2}`,paddingLeft:8,color:C.t3,fontStyle:"italic",margin:"2px 0"}}>{hlText(line.slice(2))}</div>;
            if(line.startsWith("→ "))return <div key={i} style={{background:C.ad,border:`1px solid ${C.a}33`,borderRadius:7,padding:"4px 9px",margin:"2px 0",fontSize:11}}>{hlText(line.slice(2))}</div>;
            if(line.startsWith("↪️"))return <div key={i} style={{background:C.s3,border:`1px solid ${C.b1}`,borderRadius:7,padding:"5px 9px",margin:"2px 0",fontSize:11}}>{hlText(line)}</div>;
            return <span key={i}>{line.replace(/\*\*(.*?)\*\*/g,"$1").split(/(\*\*.*?\*\*|`.*?`|@\w+)/g).map((p,j)=>{
              if(p.startsWith("`")&&p.endsWith("`"))return <code key={j} style={{background:C.s3,padding:"1px 4px",borderRadius:3,fontSize:12,fontFamily:FM,color:C.cy}}>{p.slice(1,-1)}</code>;
              if(p.startsWith("@"))return <span key={j} style={{color:C.a,fontWeight:700,background:C.ad,padding:"0 2px",borderRadius:3,cursor:"pointer"}}>{p}</span>;
              return <span key={j}>{hlText(p)}</span>;
            })}{i<m.text.split("\n").length-1&&<br/>}</span>;
          })}
        </div>}
        {m.file&&(()=>{
          const f=m.file;const fileUrl=f.url||(f.previewUrl||null);
          const isImg=f.contentType?.startsWith('image/')||/\.(jpe?g|png|gif|webp|svg)$/i.test(f.name||'');
          const isVoice=f.isVoice||f.contentType?.startsWith('audio/')||/\.(mp3|ogg|wav|webm|aac|m4a)$/i.test(f.name||'');
          const isVideo=f.contentType?.startsWith('video/')||/\.(mp4|webm|mov|avi)$/i.test(f.name||'');
          const icon=isVoice?"🎙️":isVideo?"🎬":isImg?"🖼️":f.type==="pdf"?"📄":f.type==="zip"||f.type==="rar"?"🗜️":"📎";
          if(isImg&&fileUrl)return(
            <div style={{marginTop:6,maxWidth:340}}>
              <img src={fileUrl} alt={f.name} style={{maxWidth:"100%",maxHeight:280,borderRadius:10,border:`1px solid ${C.b1}`,display:"block",objectFit:"cover",cursor:"pointer"}} onClick={()=>window.open(fileUrl,'_blank')}/>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:3}}>{f.name} · {f.size}</div>
            </div>
          );
          if(isVoice&&fileUrl)return(
            <div style={{marginTop:6,padding:"10px 14px",background:C.s3,border:`1px solid ${C.b1}`,borderRadius:12,minWidth:220,maxWidth:340}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:16}}>🎙️</span>
                <span style={{fontSize:12,fontWeight:600,color:C.t1}}>Voice message</span>
                {f.duration&&<span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{f.duration}</span>}
              </div>
              <audio controls src={fileUrl} style={{width:"100%",height:32,outline:"none"}}/>
            </div>
          );
          if(isVideo&&fileUrl)return(
            <div style={{marginTop:6,maxWidth:380}}>
              <video controls src={fileUrl} style={{maxWidth:"100%",maxHeight:240,borderRadius:10,border:`1px solid ${C.b1}`,display:"block"}}/>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:3}}>{f.name} · {f.size}</div>
            </div>
          );
          return(
            <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.s3,border:`1px solid ${C.b1}`,borderRadius:10,marginTop:5,maxWidth:340,cursor:fileUrl?"pointer":"default"}}
              onClick={()=>fileUrl&&window.open(fileUrl,'_blank')}>
              <span style={{fontSize:22}}>{icon}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>{f.size}</div></div>
              {fileUrl&&<span style={{color:C.a,fontSize:13,flexShrink:0}}>↓</span>}
            </div>
          );
        })()}
        {m.reactions?.length>0&&<div style={{display:"flex",gap:2,marginTop:3,flexWrap:"wrap"}}>
          {m.reactions.map((r:any)=><button key={r.emoji} onClick={()=>react(m.id,r.emoji)} title={(r.users||[]).map((u:string)=>ag[u]?.name||u).join(", ")} style={{display:"flex",alignItems:"center",gap:3,padding:"2px 7px",borderRadius:10,fontSize:12,background:(r.users||[]).includes(myId)?C.ad:C.s3,border:`1px solid ${(r.users||[]).includes(myId)?C.a+"55":C.b1}`,cursor:"pointer"}}>{r.emoji}<span style={{fontSize:9.5,fontFamily:FM,color:(r.users||[]).includes(myId)?C.a:C.t3}}>{(r.users||[]).length}</span></button>)}
          <button onClick={()=>setShowReactions(showReactions===m.id?null:m.id)} style={{width:18,height:18,borderRadius:9,fontSize:9,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        </div>}
        {showReactions===m.id&&<div style={{display:"flex",gap:1,flexWrap:"wrap",padding:3,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,marginTop:2}}>
          {REACTIONS_SET.map(e=><button key={e} onClick={()=>react(m.id,e)} style={{width:22,height:22,borderRadius:3,fontSize:12,background:"transparent",border:"none",cursor:"pointer"}} className="hov">{e}</button>)}
        </div>}
        {!isThread&&m.thread?.length>0&&<button onClick={()=>setShowThread(m)} style={{display:"flex",alignItems:"center",gap:4,marginTop:3,padding:"3px 8px",borderRadius:6,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:12,color:C.a,fontWeight:600}}>
          <span style={{display:"flex"}}>{m.thread.slice(-3).map((t2,i)=><span key={i} style={{marginLeft:i>0?-3:0}}><Av i={ag[t2.uid]?.av||"?"} c={ag[t2.uid]?.color||C.t3} s={13}/></span>)}</span>
          {m.thread.length} {m.thread.length===1?"reply":"replies"}
        </button>}
        {!isThread&&<div className="msg-actions" style={{position:"absolute",top:-4,right:22,display:"none",gap:1,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:2,boxShadow:"0 4px 16px rgba(0,0,0,.25)"}}>
          {[{i:"😊",fn:()=>setShowReactions(m.id),t:"React"},{i:"💬",fn:()=>setShowThread(m),t:"Thread"},{i:"📌",fn:()=>pin(m.id),t:"Pin"},{i:"🔖",fn:()=>{setBookmarks((p:string[])=>p.includes(m.id)?p.filter(x=>x!==m.id):[...p,m.id]);showT("Saved","success");},t:"Save"},{i:"↪️",fn:()=>setShowFwd(m),t:"Forward"},{i:"⏰",fn:()=>setReminderMsg(m),t:"Remind"},{i:"🔗",fn:()=>copyPermalink(m.id),t:"Link"},...(m.uid===myId?[{i:"✎",fn:()=>{setEditingMsg(m.id);setEditText(m.text);},t:"Edit"},{i:"✕",fn:()=>del(m.id),t:"Del",c:C.r}]:[]),{i:"⎘",fn:()=>{navigator.clipboard?.writeText(m.text);showT("Copied","success");},t:"Copy"}].map(b=>
            <button key={b.t} onClick={b.fn} title={b.t} style={{width:26,height:26,borderRadius:5,fontSize:12,background:"transparent",border:"none",cursor:"pointer",color:b.c||C.t3,display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">{b.i}</button>
          )}
        </div>}
      </div>
    </div>;
  };

  const SideSection=({id,name,children,action})=>(
    <div style={{marginBottom:2}}>
      <div style={{display:"flex",alignItems:"center"}}>
        <button onClick={()=>togSec(id)} style={{flex:1,display:"flex",alignItems:"center",gap:3,padding:"3px 8px",background:"transparent",border:"none",cursor:"pointer",color:C.t3,fontSize:10,fontWeight:700,fontFamily:FM,letterSpacing:"0.5px"}}>
          <span style={{fontSize:8,transition:"transform .15s",transform:collapsed[id]?"rotate(-90deg)":"rotate(0)"}}>{"\u25BC"}</span>{name}
        </button>
        {action&&<button onClick={action.fn} title={action.tip||""} style={{width:20,height:20,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:"transparent",border:"none",cursor:"pointer",color:C.t3,marginRight:6}} className="hov">{action.icon||"+"}</button>}
      </div>
      {!collapsed[id]&&children}
    </div>
  );

  const ChBtn=({ch})=><div style={{display:"flex",alignItems:"center"}} onContextMenu={e=>{e.preventDefault();star(ch.id);}}>
    <button onClick={()=>{switchCh(ch.id);}} onAuxClick={e=>{if(e.button===1){e.preventDefault();openPane(ch.id);}}} className="hov" style={{flex:1,padding:"5px 10px 5px 16px",display:"flex",alignItems:"center",gap:4,background:activeCh===ch.id?C.ad:panes.includes(ch.id)?C.pd+"44":"transparent",border:"none",cursor:"pointer",borderRadius:4,marginBottom:1}}>
      <span style={{fontSize:11,color:ch.private?C.y:C.t3,fontWeight:700,width:14}}>{ch.icon}</span>
      <span style={{fontSize:13,color:activeCh===ch.id?C.t1:C.t2,fontWeight:ch.unread?700:500,flex:1,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</span>
      {ch.muted&&<span style={{fontSize:7}}>🔕</span>}
      {ch.unread>0&&<span style={{background:ch.muted?C.t3:C.r,color:"#fff",borderRadius:6,padding:"0 4px",fontSize:9,fontWeight:700}}>{ch.unread}</span>}
      {drafts[ch.id]&&<span style={{fontSize:9,color:C.y,fontFamily:FM,fontWeight:700}}>Draft</span>}
      {panes.includes(ch.id)&&<span style={{width:6,height:6,borderRadius:"50%",background:C.p,flexShrink:0}}/>}
    </button>
    <button onClick={e=>{e.stopPropagation();openPane(ch.id);}} title="Open in new pane (or middle-click)" style={{width:18,height:18,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,background:"transparent",color:C.t3,border:"none",cursor:"pointer",flexShrink:0,opacity:.4,transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".4"}>⧉</button>
  </div>;

  return <div style={{flex:1,display:"flex",minWidth:0}}>
    {/* ═══ SIDEBAR ═══ */}
    <div style={{width:250,background:C.s1,borderRight:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 14px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:16,fontWeight:700,fontFamily:FD}}>Team Chat</span>
          <div style={{display:"flex",gap:3}}>
            {panes.length>0&&<button onClick={()=>setPanes([])} title="Close all panes" style={{padding:"2px 7px",borderRadius:5,fontSize:9,fontWeight:700,fontFamily:FM,background:C.pd,color:C.p,border:`1px solid ${C.p}44`,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>⧉ {panes.length+1}<span style={{fontSize:8}}>×</span></button>}
            <button onClick={()=>setShowAiPanel(p=>!p)} title="AI" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,background:showAiPanel?C.pd:C.s3,color:showAiPanel?C.p:C.t3,border:`1px solid ${showAiPanel?C.p+"44":C.b1}`,cursor:"pointer"}} className="hov">✦</button>
            <button onClick={()=>setShowNewCh(true)} title="New" style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">+</button>
          </div>
        </div>
        <button onClick={()=>setShowStatusPicker(p=>!p)} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",marginBottom:6}}>
          <span style={{fontSize:12}}>{userStatus.emoji}</span><span style={{fontSize:12,color:C.t2,flex:1,textAlign:"left"}}>{userStatus.text}</span><span style={{fontSize:7,color:C.t3}}>{"\u25BC"}</span>
        </button>
        {showStatusPicker&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:4,marginBottom:6,animation:"fadeUp .1s ease"}}>
          {[{e:"🟢",t:"Available",ws:"online"},{e:"🔴",t:"Busy",ws:"busy"},{e:"🌙",t:"Away",ws:"away"},{e:"🔕",t:"Do Not Disturb",ws:"dnd"},{e:"🍕",t:"Lunch",ws:"lunch"},{e:"🏠",t:"Remote",ws:"remote"},{e:"🎧",t:"In Huddle",ws:"huddle"},{e:"🎯",t:"Focusing",ws:"focus"},{e:"✈️",t:"Vacation",ws:"offline"}].map(s=>(
            <button key={s.t} onClick={()=>{setUserStatus(s);setShowStatusPicker(false);sendWs({type:'tc_status',status:s.ws});}} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:5,padding:"4px 8px",borderRadius:4,background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.t2,textAlign:"left"}}>{s.e} {s.t}</button>
          ))}
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:4,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"5px 8px"}}>
          <NavIcon id="search" s={12} col={C.t3}/><input value={tcSearch} onChange={e=>setTcSearch(e.target.value)} placeholder="Find…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"0 5px"}}>
        {(starredChs.length>0||starredDms.length>0)&&<SideSection id="starred" name="STARRED">
          {starredChs.map(ch=><ChBtn key={ch.id} ch={ch}/>)}
          {starredDms.map(dm=>{const a2=agents.find(x=>x.id===dm.agentId);return a2?<button key={dm.id} onClick={()=>{switchCh(dm.id);}} className="hov" style={{width:"100%",padding:"5px 10px 5px 16px",display:"flex",alignItems:"center",gap:4,background:activeCh===dm.id?C.ad:"transparent",border:"none",cursor:"pointer",borderRadius:4,marginBottom:1}}>
            <Av i={a2.av} c={a2.color} s={15} dot={a2.status==="online"}/><span style={{fontSize:11,color:C.t2,flex:1,textAlign:"left"}}>{a2.name}</span>
          </button>:null;})}
        </SideSection>}
        <SideSection id="channels" name="CHANNELS" action={{fn:()=>setShowNewCh(true),tip:"New Channel",icon:"+"}}>
          {channels.filter(c=>!tcSearch||c.name.includes(tcSearch)).map(ch=><ChBtn key={ch.id} ch={ch}/>)}
        </SideSection>
        <SideSection id="dms" name={"MEMBERS ("+((agents as any[]).filter((a:any)=>a.id!==myIdRef.current).length)+")"} action={{fn:()=>setShowNewDm(true),tip:"New DM",icon:"+"}}>
          {(()=>{
            const filtered=(agents as any[])
              .filter((a:any)=>a.id!==myIdRef.current)
              .filter((a:any)=>!tcSearch||a.name.toLowerCase().includes(tcSearch.toLowerCase()));
            const online=filtered.filter((a:any)=>a.status==="online");
            const offline=filtered.filter((a:any)=>a.status!=="online").sort((a:any,b:any)=>(a.name||"").localeCompare(b.name||""));
            const renderRow=(a:any)=>{
              const dm=(tcDms as any[]).find((d:any)=>d.agentId===a.id);
              const isOn=a.status==="online";
              const isActive=dm&&activeCh===dm.id;
              const isPane=dm&&panes.includes(dm.id);
              return(
                <button key={a.id}
                  onClick={()=>{if(dm)switchCh(dm.id);else startDm(a.id);}}
                  onAuxClick={e=>{if(e.button===1&&dm){e.preventDefault();openPane(dm.id);}}}
                  className="hov"
                  style={{width:"100%",padding:"3px 8px 3px 6px",display:"flex",alignItems:"center",gap:8,
                    background:isActive?C.ad:isPane?C.pd+"22":"transparent",
                    border:"none",cursor:"pointer",borderRadius:6,marginBottom:1,textAlign:"left",minHeight:34}}>
                  {/* Avatar + presence ring */}
                  <div style={{position:"relative",flexShrink:0,width:32,height:32}}>
                    <Av i={a.av} c={a.color} s={32}/>
                    <span style={{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",
                      background:isOn?"#22c55e":"#94a3b8",
                      border:`2px solid ${C.s1}`,display:"block",boxSizing:"border-box"}}/>
                  </div>
                  {/* Name */}
                  <span style={{flex:1,fontSize:13,lineHeight:"18px",
                    color:isActive?C.a:isOn?C.t1:C.t3,
                    fontWeight:dm?.unread?700:isActive?600:400,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {a.name}
                  </span>
                  {/* Unread badge */}
                  {dm&&dm.unread>0&&<span style={{
                    background:"#ef4444",color:"#fff",borderRadius:99,
                    padding:"0 5px",fontSize:10,fontWeight:800,
                    flexShrink:0,minWidth:18,height:18,
                    display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
                    {dm.unread>99?"99+":dm.unread}
                  </span>}
                </button>
              );
            };
            return(<>
              {online.length>0&&<>
                <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,padding:"6px 8px 3px",letterSpacing:"0.05em",userSelect:"none"}}>
                  ONLINE — {online.length}
                </div>
                {online.map(renderRow)}
              </>}
              {offline.length>0&&<>
                <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,padding:"8px 8px 3px",letterSpacing:"0.05em",userSelect:"none"}}>
                  OFFLINE — {offline.length}
                </div>
                {offline.map(renderRow)}
              </>}
            </>);
          })()}
        </SideSection>
      </div>
      <div style={{padding:"7px 12px",borderTop:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:-2}}>
        {agents.filter(a=>a.status==="online").map(a=><div key={a.id} style={{marginLeft:-2}} title={a.name}><Av i={a.av} c={a.color} s={22} dot/></div>)}
        <span style={{fontSize:10,color:C.g,fontFamily:FM,marginLeft:6}}>{agents.filter(a=>a.status==="online").length} online</span>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM,marginLeft:5}}>· {agents.length} total</span>
      </div>
    </div>

    {/* ═══ MAIN ═══ */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
      <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:10}}>
        {aCh?<><span style={{fontSize:16,fontWeight:700}}>{aCh.icon}</span><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16,fontWeight:700,fontFamily:FD}}>{aCh.name}</span>{aCh.muted&&<span style={{fontSize:10,color:C.t3}}>🔕</span>}<span style={{fontSize:11,color:C.t3,fontFamily:FM}}>· {getChMembers(aCh).length}</span></div>{aCh.topic&&<div style={{fontSize:12,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{aCh.topic}</div>}</div></>:
        dmAg?<><Av i={dmAg.av} c={dmAg.color} s={32} dot={dmAg.status==="online"}/><div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,fontFamily:FD}}>{dmAg.name}</div><div style={{fontSize:12,color:C.t3,fontFamily:FM}}>{dmAg.role} · {dmAg.status}</div></div></>:null}
        <div style={{display:"flex",gap:3}}>
          {[{i:"search",fn:()=>setShowMsgSearch(p=>!p),a:showMsgSearch},{e:"📌",fn:()=>setShowPinned(p=>!p),a:showPinned,cnt:chPins.length},{e:"📊",fn:()=>setShowPoll(true)},{e:"📂",fn:()=>setShowFilesPanel(p=>!p),a:showFilesPanel},{e:"🔔",fn:()=>setShowChNotif(true)},{e:"ℹ",fn:()=>setShowChInfo(p=>!p),a:showChInfo},{i:"contacts",fn:()=>setShowMembers(p=>!p),a:showMembers}].map((b,idx)=>
            <button key={idx} onClick={b.fn} style={{width:28,height:28,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:b.a?C.ad:C.s3,border:`1px solid ${b.a?C.a+"44":C.b1}`,cursor:"pointer",position:"relative"}} className="hov">
              {b.i?<NavIcon id={b.i} s={13} col={b.a?C.a:C.t3}/>:<span style={{fontSize:12,color:b.a?C.a:C.t3}}>{b.e}</span>}
              {b.cnt>0&&<span style={{position:"absolute",top:-3,right:-3,width:13,height:13,borderRadius:"50%",background:C.y,color:"#000",fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{b.cnt}</span>}
            </button>
          )}
          {/* ── Call Buttons ── */}
          <div style={{width:1,height:20,background:C.b2,margin:"0 2px",alignSelf:"center"}}/>
          {[
            {e:"📞",label:"Voice",type:"voice" as const,col:C.g,bg:"#dcfce7"},
            {e:"📹",label:"Video",type:"video" as const,col:C.a,bg:C.ad},
            {e:"🖥",label:"Share",type:"screen" as const,col:C.p,bg:C.pd},
          ].map(b=>(
            <button key={b.type} onClick={()=>{if(dmAg){initCall(dmAg.id,b.type);}else{setCallType(b.type);setShowHuddle(true);}}}
              title={b.label+" Call"}
              style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:36,padding:"0 8px",borderRadius:8,fontSize:11,fontWeight:700,fontFamily:FM,background:activeCall&&callType===b.type?b.bg:C.s3,color:activeCall&&callType===b.type?b.col:C.t3,border:`1px solid ${activeCall&&callType===b.type?b.col+"55":C.b1}`,cursor:"pointer",gap:1,transition:"all .15s",position:"relative"}} className="hov">
              <span style={{fontSize:13}}>{b.e}</span>
              <span style={{fontSize:8,lineHeight:1}}>{b.label}</span>
              {activeCall&&callType===b.type&&<span style={{position:"absolute",top:-3,right:-3,width:8,height:8,borderRadius:"50%",background:C.g,border:`1.5px solid ${C.s1}`,animation:"pulse 1.5s infinite"}}/>}
            </button>
          ))}
        </div>
      </div>
      {aCh?.bookmarks?.length>0&&<div style={{padding:"6px 18px",borderBottom:`1px solid ${C.b1}22`,display:"flex",gap:5,overflowX:"auto",alignItems:"center"}}>
        <span style={{fontSize:10,color:C.t3,fontFamily:FM,flexShrink:0}}>📌</span>
        {aCh.bookmarks.map(bm=><button key={bm.id} onClick={()=>showT("Opening "+bm.label,"info")} style={{padding:"4px 10px",borderRadius:6,fontSize:11,background:C.s3,color:C.t1,border:`1px solid ${C.b1}`,cursor:"pointer",whiteSpace:"nowrap",fontFamily:FM,fontWeight:500}} className="hov">🔗 {bm.label}</button>)}
      </div>}
      {showMsgSearch&&<div style={{padding:"7px 18px",borderBottom:`1px solid ${C.b1}`,display:"flex",gap:6,alignItems:"center",background:C.s1}}>
        <NavIcon id="search" s={13} col={C.t3}/><input value={msgSearch} onChange={e=>setMsgSearch(e.target.value)} autoFocus placeholder={"Search "+chLabel+"…"} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:"6px 10px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/><span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{msgSearch?fMsgs.length+" found":""}</span><button onClick={()=>{setShowMsgSearch(false);setMsgSearch("");}} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:13}}>×</button>
      </div>}
      {showPinned&&chPins.length>0&&<div style={{padding:"8px 18px",borderBottom:`1px solid ${C.y}33`,background:C.yd}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.y,marginBottom:6}}>📌 PINNED ({chPins.length})</div>
        {chPins.map(pid=>{const m=curMsgs.find(x=>x.id===pid);return m?<div key={pid} style={{fontSize:12,color:C.t1,padding:"5px 10px",background:C.s1,borderRadius:6,border:`1px solid ${C.b1}`,marginBottom:3,display:"flex",alignItems:"center",gap:6}}>
          <Av i={ag[m.uid]?.av||"?"} c={ag[m.uid]?.color||C.t3} s={16}/><strong style={{fontSize:11}}>{ag[m.uid]?.name}:</strong><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.text.slice(0,80)}</span>
          <button onClick={()=>pin(m.id)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10,flexShrink:0}}>✕</button>
        </div>:null;})}
      </div>}
      {aiSummary&&<div style={{padding:"10px 18px",borderBottom:`1px solid ${C.p}33`,background:C.pd}}>
        <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}><span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.p}}>✦ AI Summary</span><button onClick={()=>setAiSummary(null)} style={{marginLeft:"auto",color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:13}}>×</button></div>
        <div style={{fontSize:13,color:C.t1,lineHeight:1.6,whiteSpace:"pre-line"}}>{aiSummary}</div>
      </div>}
      <div style={{flex:1,overflowY:"auto",position:"relative"}}>
        {tcMsgsLoading?<SkelMsgs n={5}/>:<>{fMsgs.length===0&&<div style={{padding:"60px 30px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>💬</div><div style={{fontSize:16,fontWeight:700,fontFamily:FD,color:C.t1}}>No messages yet</div><div style={{fontSize:13,color:C.t3,marginTop:6}}>{msgSearch?"No messages match \""+msgSearch+"\"":"Send the first message to get the conversation started!"}</div></div>}
        {fMsgs.map((m,i)=><div key={m.id}>
          {/* Date separator */}
          {i>0&&fMsgs[i-1]?.date!==m.date&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 22px"}}><div style={{flex:1,height:1,background:C.b1}}/><span style={{fontSize:11,color:C.t3,fontFamily:FM,fontWeight:600,background:C.bg,padding:"2px 10px",borderRadius:12,border:`1px solid ${C.b1}`}}>{m.date}</span><div style={{flex:1,height:1,background:C.b1}}/></div>}
          {/* New messages divider */}
          {i>0&&fMsgs[i-1]?.id===lastRead[activeCh]&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 22px"}}><div style={{flex:1,height:2,background:C.r}}/><span style={{fontSize:11,color:C.r,fontFamily:FM,fontWeight:700,background:C.rd,padding:"2px 10px",borderRadius:12}}>New messages</span><div style={{flex:1,height:2,background:C.r}}/></div>}
          {renderMsg(m,false)}
          {/* Sent / Seen status on own messages */}
          {m.uid===myIdRef.current&&(()=>{
            const seenBy:string[]=(m.seen_by||[]).filter((id:string)=>id!==myIdRef.current);
            const seenAgents=seenBy.map((id:string)=>agents.find((a:any)=>a.id===id)).filter(Boolean);
            const isSeen=seenBy.length>0;
            return(
              <div style={{padding:"1px 22px 4px",display:"flex",gap:3,alignItems:"center",justifyContent:"flex-end"}}>
                {isSeen?(
                  <>
                    {seenAgents.slice(0,3).map((a:any)=>(
                      <span key={a.id} style={{marginLeft:-3}} title={`Seen by ${a.name}`}>
                        <Av i={a.av||a.avatar||"?"} c={a.color} s={13} dot={false}/>
                      </span>
                    ))}
                    {seenAgents.length>3&&<span style={{fontSize:8,color:C.t3,fontFamily:FM}}>+{seenAgents.length-3}</span>}
                    <span style={{fontSize:11,color:C.a,fontWeight:700,letterSpacing:"-1px"}} title="Seen">✓✓</span>
                  </>
                ):(
                  <span style={{fontSize:11,color:C.t3,letterSpacing:"-1px"}} title="Sent">✓</span>
                )}
              </div>
            );
          })()}
        </div>)}
        {/* Typing indicator */}
        {(typingUsers[activeCh]||[]).length>0&&<div style={{padding:"6px 22px",display:"flex",alignItems:"center",gap:6}}>
          {typingUsers[activeCh].map(u=><Av key={u} i={ag[u]?.av||"?"} c={ag[u]?.color||C.t3} s={20}/>)}
          <span style={{fontSize:12,color:C.t3,fontStyle:"italic"}}>{typingUsers[activeCh].map(u=>ag[u]?.name?.split(" ")[0]).join(", ")} typing</span>
          <span style={{display:"flex",gap:2}}>{[0,1,2].map(i=><span key={i} style={{width:4,height:4,borderRadius:"50%",background:C.a,animation:`blink 1.2s infinite ${i*0.2}s`}}/>)}</span>
        </div>}
        {/* Polls */}
        {(polls[activeCh]||[]).map(pl=>{const tv=pl.opts.reduce((s,o)=>s+o.votes.length,0);return(
          <div key={pl.id} style={{margin:"8px 22px",padding:"14px 16px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:10}}>📊 {pl.q}</div>
            {pl.opts.map((o,oi)=>{const pct=tv?Math.round(o.votes.length/tv*100):0;const v=o.votes.includes(myIdRef.current);return(
              <button key={oi} onClick={()=>votePoll(pl.id,oi)} style={{width:"100%",padding:"8px 12px",borderRadius:8,marginBottom:4,cursor:"pointer",background:v?C.ad:C.s2,border:`1.5px solid ${v?C.a+"55":C.b1}`,textAlign:"left",display:"flex",alignItems:"center",gap:6,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:pct+"%",background:v?C.a+"18":C.b1+"33",transition:"width .3s"}}/>
                <span style={{fontSize:13,color:v?C.a:C.t1,fontWeight:v?700:500,position:"relative",flex:1}}>{o.text}</span>
                <span style={{fontSize:11,fontFamily:FM,color:v?C.a:C.t3,position:"relative",fontWeight:700}}>{pct}%</span>
              </button>
            );})}
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>{tv} vote{tv!==1?"s":""}</div>
          </div>
        );})}
        <div ref={ref}/></>}
      </div>
      {/* AI suggestions */}
      {aiSugs.length>0&&<div style={{padding:"6px 18px",borderTop:`1px solid ${C.p}33`,background:C.pd,display:"flex",gap:4,alignItems:"center",overflowX:"auto"}}>
        <span style={{fontSize:11,color:C.p,fontFamily:FM,fontWeight:700,flexShrink:0}}>✦ AI</span>
        {aiSugs.map((s,i)=><button key={i} onClick={()=>{setTcInp(s);setAiSugs([]);}} className="hov" style={{padding:"5px 12px",borderRadius:16,fontSize:12,background:C.s2,border:`1px solid ${C.p}33`,color:C.t1,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontWeight:500}}>{s.slice(0,50)}{s.length>50?"…":""}</button>)}
        <button onClick={()=>setAiSugs([])} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12,flexShrink:0}}>×</button>
      </div>}
      {/* Slash commands */}
      {showSlash&&<div style={{padding:"8px 18px",borderTop:`1px solid ${C.b1}`,background:C.s2,maxHeight:180,overflowY:"auto"}}>
        <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>COMMANDS</div>
        {SLASH_CMDS.filter(c=>!tcInp||c.cmd.startsWith(tcInp)).map(c=>(
          <button key={c.cmd} onClick={()=>{setTcInp(c.cmd+" ");setShowSlash(false);}} className="hov" style={{width:"100%",display:"flex",gap:10,padding:"7px 10px",background:"transparent",border:"none",cursor:"pointer",borderRadius:6,textAlign:"left",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.cy,fontFamily:FM,width:70}}>{c.cmd}</span><span style={{fontSize:12,color:C.t2}}>{c.desc}</span>
          </button>
        ))}
      </div>}
      <div style={{padding:"10px 18px",borderTop:`1px solid ${C.b1}`,background:C.s1}}>
        {/* Formatting toolbar */}
        <div style={{display:"flex",gap:2,marginBottom:6,alignItems:"center",padding:"4px 6px",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`}}>
          {[{l:"B",fn:()=>insertFmt("**","**"),t:"Bold",w:800,ff:"serif"},{l:"I",fn:()=>insertFmt("_","_"),t:"Italic",w:400,fs:"italic",ff:"serif"},{l:"S",fn:()=>insertFmt("~~","~~"),t:"Strikethrough",w:400,td:"line-through",ff:"serif"},{l:"</>",fn:()=>insertFmt("`","`"),t:"Code"},{l:">",fn:()=>insertFmt("> "),t:"Quote"},{l:"🔗",fn:()=>insertFmt("[link](url)"),t:"Link"}].map(b=>
            <button key={b.l} onClick={b.fn} title={b.t} style={{width:30,height:28,borderRadius:5,fontSize:b.l.length>2?10:13,fontWeight:b.w||500,fontStyle:b.fs||"normal",textDecoration:b.td||"none",background:"transparent",color:C.t2,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:b.ff||FM,transition:"all .1s"}} className="hov">{b.l}</button>
          )}
          <div style={{width:1,height:18,background:C.b2,margin:"0 4px"}}/>
          <button onClick={()=>{setShowEmojiPicker(p=>!p);setMentionSearch(null);}} title="Emoji" style={{width:30,height:28,borderRadius:5,fontSize:14,background:showEmojiPicker?C.yd:"transparent",color:C.t2,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">😊</button>
          <button onClick={()=>insertFmt("@")} title="Mention" style={{width:30,height:28,borderRadius:5,fontSize:14,background:"transparent",color:C.a,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}} className="hov">@</button>
          <div style={{width:1,height:18,background:C.b2,margin:"0 4px"}}/>
          <button onClick={aiReply} style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:C.pd,color:C.p,border:`1px solid ${C.p}44`,cursor:"pointer",fontFamily:FM,display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:10}}>✦</span>{aiSugLoad?"…":"AI"}</button>
          <button onClick={()=>setShowSchedule(p=>!p)} title="Schedule" style={{width:30,height:28,borderRadius:5,fontSize:14,background:"transparent",color:C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">🕐</button>
          <input ref={fileRef} type="file" onChange={handleFileUpload} style={{display:"none"}} accept="*"/>
          <button onClick={()=>fileRef.current?.click()} title="Attach file (max 50 MB)" style={{width:30,height:28,borderRadius:5,fontSize:14,background:"transparent",color:C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">📎</button>
          {isRecording?(
            <button onClick={stopRecording} title="Stop recording" style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:14,fontSize:12,fontWeight:700,background:C.rd,color:C.r,border:`1.5px solid ${C.r}`,cursor:"pointer",animation:"pulse 1s infinite",fontFamily:FM}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:C.r,flexShrink:0}}/>
              {Math.floor(recordingSec/60)}:{String(recordingSec%60).padStart(2,'0')} Stop
            </button>
          ):(
            <button onMouseDown={startRecording} onClick={isRecording?stopRecording:undefined} title="Hold to record voice message" style={{width:30,height:28,borderRadius:5,fontSize:15,background:"transparent",color:C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">🎙️</button>
          )}
          {scheduledMsgs.length>0&&<button onClick={()=>setShowScheduledList(p=>!p)} style={{padding:"3px 8px",borderRadius:5,fontSize:10,color:C.y,background:C.yd,border:`1px solid ${C.y}44`,cursor:"pointer",fontFamily:FM}}>{scheduledMsgs.length} sched</button>}
          <div style={{flex:1}}/>
          {drafts[activeCh]&&<span style={{fontSize:9,color:C.y,fontFamily:FM,background:C.yd,padding:"2px 6px",borderRadius:4}}>Draft</span>}
        </div>
        {/* Emoji picker */}
        {showEmojiPicker&&<div style={{display:"flex",gap:2,flexWrap:"wrap",padding:8,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:6,maxHeight:130,overflowY:"auto",animation:"fadeUp .1s ease"}}>
          {EMOJI_GRID.map(e=><button key={e} onClick={()=>insertEmoji(e)} style={{width:32,height:32,borderRadius:5,fontSize:18,background:"transparent",border:"none",cursor:"pointer"}} className="hov">{e}</button>)}
        </div>}
        {/* @mention autocomplete */}
        {mentionSearch!==null&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:6,marginBottom:6,animation:"fadeUp .1s ease"}}>
          {agents.filter(a=>a.name.toLowerCase().includes(mentionSearch)||mentionSearch==="").map(a=>(
            <button key={a.id} onClick={()=>insertMention(a.name)} className="hov" style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:6,background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
              <Av i={a.av} c={a.color} s={24} dot={a.status==="online"}/><span style={{fontSize:13,color:C.t1,fontWeight:600}}>{a.name}</span><span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{a.role}</span>
            </button>
          ))}
        </div>}
        {/* Schedule form */}
        {showSchedule&&<div style={{display:"flex",gap:3,alignItems:"center",marginBottom:4,padding:"3px 5px",background:C.s2,borderRadius:5,border:`1px solid ${C.b1}`}}>
          <span style={{fontSize:9,color:C.t3}}>At:</span><input type="datetime-local" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:3,padding:"2px 5px",fontSize:9.5,color:C.t1,outline:"none"}}/><Btn ch="Schedule" v="primary" sm onClick={scheduleMsg}/><button onClick={()=>setShowSchedule(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:9}}>×</button>
        </div>}
        {/* Scheduled messages list */}
        {showScheduledList&&<div style={{marginBottom:4,padding:"5px 7px",background:C.s2,borderRadius:6,border:`1px solid ${C.y}44`,animation:"fadeUp .1s ease"}}>
          <div style={{fontSize:8.5,fontWeight:700,fontFamily:FM,color:C.y,marginBottom:4}}>🕐 SCHEDULED ({scheduledMsgs.length})</div>
          {scheduledMsgs.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <span style={{fontSize:10,color:C.t2,flex:1}}>{s.text.slice(0,40)}…</span>
            <span style={{fontSize:8.5,color:C.t3,fontFamily:FM}}>{s.time}</span>
            <button onClick={()=>cancelScheduled(s.id)} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:9}}>✕</button>
          </div>)}
        </div>}
        {/* Textarea */}
        <div style={{display:"flex",gap:5,alignItems:"flex-end"}}>
          <textarea value={tcInp} onChange={handleInp} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}if(e.key==="ArrowUp"&&!tcInp){const myMsgs=curMsgs.filter(m=>m.uid===myIdRef.current);if(myMsgs.length){const last=myMsgs[myMsgs.length-1];setEditingMsg(last.id);setEditText(last.text);}}}} placeholder={"Message "+chLabel+"… (/ for commands, @ for mentions)"} rows={2} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"9px 12px",fontSize:14,color:C.t1,fontFamily:FB,resize:"none",outline:"none",lineHeight:1.55}}/>
          <button onClick={send} style={{width:36,height:36,borderRadius:8,background:tcInp.trim()?C.a:C.s3,color:tcInp.trim()?"#fff":C.t3,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,transition:"all .15s"}}>{"\u2191"}</button>
        </div>
      </div>
    </div>

    {/* ═══ SECONDARY PANES — multi-chat like Cliq ═══ */}
    {panes.map(pId=>{const pCh=channels.find(c=>c.id===pId);const pDm=tcDms.find(d=>d.id===pId);const pDmAg=pDm?agents.find(a=>a.id===pDm.agentId):null;const pMsgs=tcMsgs[pId]||[];const pLabel=pCh?("#"+pCh.name):pDmAg?pDmAg.name:"Chat";const pColor=pCh?.color||pDmAg?.color||C.a;const pMembers=pCh?getChMembers(pCh).length:2;
    return <div key={pId} style={{width:360,minWidth:300,background:C.bg,borderLeft:`2px solid ${pColor}44`,display:"flex",flexDirection:"column",flexShrink:0,position:"relative"}}>
      {/* Pane Header */}
      <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:8}}>
        {pCh?<><span style={{fontSize:13,fontWeight:700}}>{pCh.icon}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,fontFamily:FD,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pCh.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>⧉ {pMembers} members</div></div></>:
        pDmAg?<><Av i={pDmAg.av} c={pDmAg.color} s={24} dot={pDmAg.status==="online"}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,fontFamily:FD}}>{pDmAg.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{pDmAg.status}</div></div></>:null}
        <button onClick={()=>{setActiveCh(pId);closePane(pId);}} title="Focus this chat" style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer"}} className="hov">↙</button>
        <button onClick={()=>closePane(pId)} title="Close pane" style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:C.s3,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}} className="hov">×</button>
      </div>
      {/* Pane Messages */}
      <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:6}}>
        {pMsgs.length===0?<EmptyState icon="💬" title="No messages" desc="Start typing below"/>:
        pMsgs.map((m:any)=>{const isMe=m.uid===myIdRef.current;const a=ag[m.uid];
          return <div key={m.id} style={{display:"flex",gap:6,padding:"4px 0"}}>
            {!isMe&&<Av i={a?.av||"?"} c={a?.color||C.t3} s={22}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:1}}>
                <span style={{fontSize:11,fontWeight:700,color:isMe?C.a:C.t1}}>{a?.name||"Bot"}</span>
                <span style={{fontSize:8.5,color:C.t3,fontFamily:FM}}>{m.t}</span>
              </div>
              <div style={{fontSize:12.5,color:C.t1,lineHeight:1.5,wordBreak:"break-word"}}>{m.text}</div>
              {m.file&&(()=>{const f=m.file;const fileUrl=f.url||null;const isVoice=f.isVoice||f.contentType?.startsWith('audio/')||/\.(mp3|ogg|wav|webm|aac|m4a)$/i.test(f.name||'')||f.name?.startsWith("voice-");if(isVoice&&fileUrl)return(<div style={{marginTop:3}}><audio controls src={fileUrl} style={{width:"100%",maxWidth:260,height:32}}/><div style={{fontSize:8,color:C.t3,marginTop:1}}>🎙️ {f.name}</div></div>);return(<div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 8px",background:C.s3,border:`1px solid ${C.b1}`,borderRadius:6,marginTop:3,fontSize:10}}>{fileUrl?<a href={fileUrl} target="_blank" rel="noreferrer" style={{color:C.a,textDecoration:"none"}}>📎 {f.name}</a>:<>📎 {f.name}</>} <span style={{color:C.t3}}>{f.size}</span></div>);})()}
              {m.reactions?.length>0&&<div style={{display:"flex",gap:2,marginTop:2,flexWrap:"wrap"}}>{m.reactions.map((r,ri)=><span key={ri} style={{padding:"1px 5px",borderRadius:8,background:C.s3,border:`1px solid ${C.b1}`,fontSize:10,cursor:"pointer"}}>{r.emoji} {r.users.length}</span>)}</div>}
              {m.thread?.length>0&&<div style={{fontSize:9,color:C.a,fontFamily:FM,marginTop:2,cursor:"pointer"}} onClick={()=>{setActiveCh(pId);closePane(pId);setShowThread(m);}}>{m.thread.length} {m.thread.length===1?"reply":"replies"}</div>}
            </div>
          </div>;})}
      </div>
      {/* Pane Input */}
      <div style={{padding:"8px 10px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:4}}>
        <input value={paneInputs[pId]||""} onChange={e=>setPaneInputs(p=>({...p,[pId]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();paneSend(pId);}}} placeholder={"Message "+pLabel+"…"} style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"7px 10px",fontSize:12,color:C.t1,fontFamily:FB,outline:"none"}}/>
        <button onClick={()=>paneSend(pId)} style={{width:30,height:30,borderRadius:7,background:(paneInputs[pId]||"").trim()?C.a:C.s3,color:(paneInputs[pId]||"").trim()?"#fff":C.t3,border:"none",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button>
      </div>
    </div>;})}

    {/* ═══ RIGHT PANELS ═══ */}
    {showThread&&<div style={{width:320,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>💬 Thread</span><button onClick={()=>setShowThread(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
        <div style={{padding:12,background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><Av i={ag[showThread.uid]?.av||"?"} c={ag[showThread.uid]?.color||C.t3} s={24}/><span style={{fontSize:13,fontWeight:700}}>{ag[showThread.uid]?.name}</span><span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{showThread.t}</span></div>
          <div style={{fontSize:13,color:C.t1,lineHeight:1.55}}>{showThread.text.slice(0,250)}{showThread.text.length>250?"…":""}</div>
        </div>
        <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginBottom:8,fontWeight:600}}>{showThread.thread.length} {showThread.thread.length===1?"reply":"replies"}</div>
        {showThread.thread.map(t=>renderMsg(t,true))}
      </div>
      <div style={{padding:"10px 12px",borderTop:`1px solid ${C.b1}`}}>
        <div style={{display:"flex",gap:5}}><input value={threadInp} onChange={e=>setThreadInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendTh();}}} placeholder="Reply in thread…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/><button onClick={sendTh} style={{width:32,height:32,borderRadius:8,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2191"}</button></div>
      </div>
    </div>}
    {showMembers&&!showThread&&<div style={{width:300,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      {/* Header */}
      <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.b1}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:15,fontWeight:700,fontFamily:FD,color:C.t1}}>Members</span>
          <button onClick={()=>setShowMembers(false)} style={{width:26,height:26,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:C.t3,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:14,lineHeight:1}}>×</button>
        </div>
        {/* Search */}
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"6px 10px"}}>
          <NavIcon id="search" s={12} col={C.t3}/>
          <input id="mbr-search" placeholder="Find a member…" style={{flex:1,background:"none",border:"none",outline:"none",fontSize:12,color:C.t1,fontFamily:FB}} onChange={e=>{const el=document.getElementById("mbr-search") as HTMLInputElement;el&&el.setAttribute("data-v",e.target.value);}}/>
        </div>
      </div>
      {/* Action buttons */}
      <div style={{padding:"8px 12px 4px",display:"flex",flexDirection:"column",gap:4}}>
        {aCh&&<button onClick={()=>setShowInvite(true)} className="hov" style={{padding:"7px 12px",borderRadius:8,fontSize:12,background:C.ad,color:C.a,border:`1px solid ${C.a}33`,cursor:"pointer",fontWeight:600,textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14}}>+</span> Add to Channel
        </button>}
        {setAgents&&<button onClick={()=>setShowWsInvite(true)} className="hov" style={{padding:"7px 12px",borderRadius:8,fontSize:12,background:C.gd,color:C.g,border:`1px solid ${C.g}33`,cursor:"pointer",fontWeight:600,textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14}}>✉</span> Invite to Workspace
        </button>}
      </div>
      {/* Member list */}
      <div style={{flex:1,overflowY:"auto",padding:"4px 8px 8px"}}>
        {(()=>{
          const pool=aCh?agents.filter((a:any)=>getChMembers(aCh).includes(a.id)):agents;
          const online=pool.filter((a:any)=>a.status==="online");
          const offline=pool.filter((a:any)=>a.status!=="online");
          const roleColor=(r:string)=>r==="Owner"?C.p:r==="Admin"?C.a:r==="Agent"?C.g:C.t3;
          const roleBg=(r:string)=>r==="Owner"?C.pd:r==="Admin"?C.ad:r==="Agent"?C.gd:C.s3;
          const renderMbrRow=(a:any)=>{
            const isOn=a.status==="online";
            const isMe=a.id===myIdRef.current;
            const dm=(tcDms as any[]).find((d:any)=>d.agentId===a.id);
            return(
              <div key={a.id} className="hov" onClick={()=>setProfilePop(a.id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,cursor:"pointer",marginBottom:1}}>
                {/* Avatar + presence */}
                <div style={{position:"relative",flexShrink:0,width:36,height:36}}>
                  <Av i={a.av} c={a.color} s={36}/>
                  <span style={{position:"absolute",bottom:0,right:0,width:11,height:11,borderRadius:"50%",
                    background:isOn?"#22c55e":"#94a3b8",
                    border:`2px solid ${C.s1}`,display:"block"}}/>
                </div>
                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{a.name}{isMe&&<span style={{fontSize:10,color:C.t3,fontWeight:400}}> (you)</span>}</span>
                    {dm&&dm.unread>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:99,padding:"0 5px",fontSize:10,fontWeight:800,minWidth:18,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{dm.unread>99?"99+":dm.unread}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:10,color:isOn?"#22c55e":"#94a3b8",fontWeight:600}}>{isOn?"Active now":"Offline"}</span>
                    <span style={{fontSize:9,color:C.t3}}>·</span>
                    <span style={{fontSize:9,padding:"0 4px",height:14,borderRadius:3,background:roleBg(a.role),color:roleColor(a.role),fontWeight:700,fontFamily:FM,display:"inline-flex",alignItems:"center"}}>{a.role||"Member"}</span>
                  </div>
                </div>
                {/* Channel remove */}
                {aCh&&!isMe&&<button onClick={e=>{e.stopPropagation();removeMember(activeCh,a.id);}} title="Remove from channel" className="hov"
                  style={{width:22,height:22,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.r,background:"none",border:"none",cursor:"pointer",opacity:0.7,flexShrink:0}}>✕</button>}
              </div>
            );
          };
          return(<>
            {online.length>0&&<>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,padding:"8px 8px 4px",letterSpacing:"0.05em"}}>ONLINE — {online.length}</div>
              {online.map(renderMbrRow)}
            </>}
            {offline.length>0&&<>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,padding:"10px 8px 4px",letterSpacing:"0.05em"}}>OFFLINE — {offline.length}</div>
              {offline.map(renderMbrRow)}
            </>}
            {aCh&&agents.filter((a:any)=>!getChMembers(aCh).includes(a.id)).length>0&&<>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,padding:"10px 8px 4px",letterSpacing:"0.05em",marginTop:4}}>NOT IN CHANNEL</div>
              {agents.filter((a:any)=>!getChMembers(aCh).includes(a.id)).map((a:any)=>(
                <div key={a.id} className="hov" style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,opacity:0.55}}>
                  <Av i={a.av} c={a.color} s={32}/>
                  <span style={{flex:1,fontSize:13,color:C.t2}}>{a.name}</span>
                  <button onClick={()=>addMember(activeCh,a.id)} className="hov"
                    style={{padding:"3px 10px",borderRadius:6,fontSize:11,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer",fontWeight:600,fontFamily:FM}}>+ Add</button>
                </div>
              ))}
            </>}
          </>);
        })()}
      </div>
      {/* Footer summary */}
      <div style={{padding:"8px 14px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:10}}>
        <span style={{fontSize:11,color:"#22c55e",fontWeight:600}}>{agents.filter((a:any)=>a.status==="online").length} online</span>
        <span style={{fontSize:11,color:C.t3}}>·</span>
        <span style={{fontSize:11,color:C.t3}}>{agents.length} total</span>
      </div>
    </div>}
    {showChInfo&&!showThread&&!showMembers&&aCh&&<div style={{width:260,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"7px 10px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,fontFamily:FD}}>Channel Info</span><button onClick={()=>setShowChInfo(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:10}}>
        <div style={{fontSize:15,fontWeight:700,fontFamily:FD,marginBottom:3}}>{aCh.icon} {aCh.name}</div>
        <div style={{fontSize:12,color:C.t3,marginBottom:6}}>{aCh.desc}</div>
        {aCh.topic&&<div style={{fontSize:12,color:C.t1,fontStyle:"italic",padding:"6px 10px",background:C.s2,borderRadius:7,marginBottom:10,border:`1px solid ${C.b1}`}}>📌 {aCh.topic}</div>}
        {[{l:"Members",v:getChMembers(aCh).length},{l:"Messages",v:curMsgs.length},{l:"Pinned",v:chPins.length},{l:"Files",v:curMsgs.filter(m=>m.file).length},{l:"Created",v:"Jan 2026"},{l:"Type",v:aCh.private?"🔒 Private":"# Public"}].map(r=><div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.b1}22`}}><span style={{fontSize:11,color:C.t3}}>{r.l}</span><span style={{fontSize:12,fontWeight:600}}>{r.v}</span></div>)}
        <div style={{fontSize:11,fontWeight:700,fontFamily:FM,color:C.t3,marginTop:14,marginBottom:6}}>MEMBERS ({getChMembers(aCh).length})</div>
        {getChMembers(aCh).map(mid=>{const a2=ag[mid];return a2?<div key={mid} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0"}}>
          <Av i={a2.av} c={a2.color} s={24} dot={a2.status==="online"}/>
          <span style={{fontSize:12,flex:1,fontWeight:500}}>{a2.name}</span>
          {mid===myIdRef.current?<span style={{fontSize:9,color:C.p,fontFamily:FM,fontWeight:600}}>You</span>:<button onClick={()=>removeMember(activeCh,mid)} style={{fontSize:10,color:C.r,background:"none",border:"none",cursor:"pointer",fontFamily:FM}}>Remove</button>}
        </div>:null;})}
        <button onClick={()=>setShowInvite(true)} className="hov" style={{width:"100%",padding:"8px",borderRadius:8,fontSize:12,background:C.ad,color:C.a,border:`1px dashed ${C.a}44`,cursor:"pointer",marginTop:8,fontWeight:600}}>+ Add Members</button>
        <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
          <Btn ch="✎ Edit Channel" v="ghost" full sm onClick={openEditCh}/>
          <Btn ch={aCh.muted?"🔔 Unmute":"🔕 Mute"} v="ghost" full sm onClick={()=>{setChannels(p=>p.map(c=>c.id===activeCh?{...c,muted:!c.muted}:c));showT(aCh.muted?"Unmuted":"Muted","info");}}/>
          <Btn ch={aCh.starred?"☆ Unstar":"⭐ Star"} v="ghost" full sm onClick={()=>star(activeCh)}/>
          <Btn ch="↩ Leave Channel" v="ghost" full sm onClick={()=>leaveCh(activeCh)}/>
          <button onClick={()=>setShowDeleteCh(true)} style={{width:"100%",padding:"6px",borderRadius:6,fontSize:10.5,background:C.rd,color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer",fontWeight:600}}>🗑 Delete Channel</button>
        </div>
      </div>
    </div>}
    {showAiPanel&&!showThread&&!showMembers&&!showChInfo&&<div style={{width:300,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>✦ AI Assistant</span><button onClick={()=>setShowAiPanel(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {[{l:"Summarize Channel",fn:aiSum,c:C.p,d:"Key decisions & actions",ld:aiSumLoad},{l:"Smart Reply",fn:aiReply,c:C.a,d:"3 contextual suggestions",ld:aiSugLoad},{l:"Generate Standup",fn:aiStd,c:C.g,d:"DONE / DOING / BLOCKED",ld:aiStdLoad}].map(t=>(
          <button key={t.l} onClick={t.fn} disabled={t.ld} className="hov" style={{padding:12,borderRadius:10,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:13,fontWeight:700,color:t.c}}>✦ {t.l}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:2}}>{t.ld?"Processing…":t.d}</div>
          </button>
        ))}
        {aiStandup&&<div style={{padding:10,background:C.gd,border:`1px solid ${C.g}44`,borderRadius:10}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.g,marginBottom:4}}>STANDUP</div>
          <div style={{fontSize:12,color:C.t1,lineHeight:1.5,whiteSpace:"pre-line"}}>{aiStandup}</div>
          <button onClick={()=>{navigator.clipboard?.writeText(aiStandup);showT("Copied!","success");}} style={{marginTop:6,padding:"4px 10px",borderRadius:5,fontSize:10,background:C.s2,color:C.t2,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Copy</button>
        </div>}
        <div style={{borderTop:`1px solid ${C.b1}`,paddingTop:10}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8}}>QUICK ACTIONS</div>
          {[
            {l:"Detect sentiment",fn:async()=>{
              const ctx=curMsgs.slice(-5).map((m:any)=>m.text).join(" ");
              if(!ctx)return showT("No messages to analyse","info");
              try{const d=await api.post('/ai/sentiment',{text:ctx});showT(`Sentiment: ${d.sentiment} (${d.score}%)`,d.sentiment==="positive"?"success":d.sentiment==="negative"?"error":"info");}
              catch{showT("AI sentiment unavailable","error");}
            }},
            {l:"Extract action items",fn:async()=>{
              const ctx=curMsgs.slice(-15).map((m:any)=>`[${ag[m.uid]?.name||"?"}] ${m.text}`).join("\n");
              if(!ctx)return showT("No messages to analyse","info");
              try{const d=await api.post('/ai/chat',{max_tokens:200,system:"Extract action items from this team chat as a numbered list. Be concise.",messages:[{role:"user",content:ctx}]});
                setAiSummary(d.content?.[0]?.text||"No action items found.");showT("Action items extracted","success");}
              catch{showT("AI unavailable","error");}
            }},
            {l:"Draft announcement",fn:()=>{setTcInp("📢 **Announcement:**\n\n");setShowAiPanel(false);}},
            {l:"Ask AI anything (/ai)",fn:()=>{setTcInp("/ai ");setShowAiPanel(false);}}
          ].map(a=>(
            <button key={a.l} onClick={a.fn} className="hov" style={{width:"100%",padding:"7px 10px",borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",fontSize:12,color:C.t1,textAlign:"left",marginBottom:4,display:"flex",gap:5,alignItems:"center"}}><span style={{color:C.p,fontSize:10}}>✦</span>{a.l}</button>
          ))}
        </div>
      </div>
    </div>}

    {/* Files Panel */}
    {showFilesPanel&&!showThread&&!showMembers&&!showChInfo&&!showAiPanel&&<div style={{width:250,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"7px 10px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,fontFamily:FD}}>Shared Files</span><button onClick={()=>setShowFilesPanel(false)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button></div>
      <div style={{flex:1,overflowY:"auto",padding:6}}>
        {(()=>{const files=curMsgs.filter(m=>m.file);return files.length===0?<div style={{padding:"20px 10px",textAlign:"center",fontSize:10.5,color:C.t3}}>No files shared yet</div>:files.map(m=>(
          <div key={m.id} className="hov" style={{display:"flex",alignItems:"center",gap:6,padding:"7px 8px",borderRadius:6,cursor:"pointer",marginBottom:3}} onClick={()=>showT("Opening "+m.file.name,"info")}>
            <span style={{fontSize:16}}>{m.file.type==="pdf"?"📄":m.file.type==="img"?"🖼":"📁"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10.5,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.file.name}</div>
              <div style={{fontSize:10.5,color:C.t3,fontFamily:FM}}>{m.file.size} · {ag[m.uid]?.name||"Unknown"} · {m.t}</div>
            </div>
            <span style={{color:C.a,fontSize:9}}>↓</span>
          </div>
        ));})()}
      </div>
    </div>}
    {/* Channel Notification Prefs */}
    {showChNotif&&<Mdl title={"Notifications — "+chLabel} onClose={()=>setShowChNotif(false)} w={340}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {[{v:"all",l:"All messages",d:"Get notified for every message"},{v:"mentions",l:"@Mentions only",d:"Only when someone mentions you"},{v:"nothing",l:"Nothing",d:"Mute all notifications"}].map(o=>(
          <button key={o.v} onClick={()=>{setChNotifPrefs(p=>({...p,[activeCh]:o.v}));showT("Notifications: "+o.l,"success");setShowChNotif(false);}} className="hov" style={{padding:"10px 12px",borderRadius:8,background:(chNotifPrefs[activeCh]||"all")===o.v?C.ad:C.s2,border:`1.5px solid ${(chNotifPrefs[activeCh]||"all")===o.v?C.a+"55":C.b1}`,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:12,fontWeight:600,color:(chNotifPrefs[activeCh]||"all")===o.v?C.a:C.t1}}>{o.l}</div>
            <div style={{fontSize:10,color:C.t3}}>{o.d}</div>
          </button>
        ))}
      </div>
    </Mdl>}

    {/* ═══ MODALS ═══ */}
    {showHuddle&&(()=>{
      const durFmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
      const typeIcon=callType==="video"?"📹":callType==="screen"?"🖥":"📞";
      const typeLabel=callType==="video"?"Video Call":callType==="screen"?"Screen Share":"Voice Call";
      const typeColor=callType==="video"?C.a:callType==="screen"?C.p:C.g;
      const onlineAgents=agents.filter((a:any)=>a.id!==myIdRef.current&&a.status==="online");
      const allAgents=agents.filter((a:any)=>a.id!==myIdRef.current);
      const showVideo=(huddleCam||huddleScreen||remoteHasVideo)&&!!activeCall;
      const peer=activeCall?agents.find((a:any)=>a.id===activeCall.targetId):null;
      return <div style={{position:"fixed",inset:0,background:"#0d0d0d",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* ── Full-screen remote video ── */}
        <video ref={remoteVideoRef} autoPlay playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:showVideo?"block":"none"}}/>
        <audio ref={remoteAudioRef} autoPlay style={{display:"none"}}/>

        {/* ── Active voice call — big avatar + waveform ── */}
        {!showVideo&&activeCall&&peer&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)"}}>
          <Av i={peer.av} c={peer.color} s={96} dot={peer.status==="online"}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:26,fontWeight:800,color:"#fff",fontFamily:FD}}>{peer.name}</div>
            <div style={{fontSize:13,color:typeColor,fontFamily:FM,fontWeight:600,marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:typeColor,display:"inline-block",animation:"pulse 1.5s infinite"}}/>
              Connected · {durFmt(callDuration)}
            </div>
          </div>
          <div style={{display:"flex",gap:3,alignItems:"flex-end",height:48}}>
            {[3,6,9,12,8,5,11,7,4,10,6,8,9,5,7].map((h,i)=>(
              <div key={i} style={{width:4,height:h*3,borderRadius:2,background:typeColor,opacity:0.7,animation:`blink 1s infinite ${i*0.08}s`}}/>
            ))}
          </div>
        </div>}

        {/* ── Pre-call: member selector panel ── */}
        {!activeCall&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0,background:"linear-gradient(135deg,#0d0d0d 0%,#1a1a1a 100%)"}}>
          {/* Local camera preview (video type only) */}
          {callType==="video"&&<div style={{width:"min(480px,90vw)",marginBottom:16,borderRadius:12,overflow:"hidden",height:160,background:"#111",position:"relative",border:"1.5px solid #2a2a2a"}}>
            <video ref={localVideoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",bottom:8,left:10,fontSize:10,color:"#aaa",fontFamily:FM,fontWeight:600,background:"rgba(0,0,0,.6)",padding:"2px 8px",borderRadius:4}}>Preview</div>
          </div>}
          {/* Call type + title */}
          <div style={{marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:30,marginBottom:6}}>{typeIcon}</div>
            <div style={{fontSize:20,fontWeight:800,color:"#fff",fontFamily:FD}}>{typeLabel}</div>
            <div style={{fontSize:12,color:"#777",fontFamily:FM,marginTop:4}}>Select a teammate to call</div>
          </div>
          {/* Call type switcher */}
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {([["voice","📞","Voice",C.g],["video","📹","Video",C.a],["screen","🖥","Screen",C.p]] as const).map(([t,ic,lb,cl])=>(
              <button key={t} onClick={()=>setCallType(t)} style={{padding:"7px 16px",borderRadius:10,fontSize:12,fontWeight:700,fontFamily:FM,background:callType===t?cl+"28":"#1e1e1e",border:`1.5px solid ${callType===t?cl:cl+"28"}`,color:callType===t?cl:"#666",cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}><span>{ic}</span>{lb}</button>
            ))}
          </div>
          {/* Teammate list */}
          <div style={{width:"min(480px,90vw)",background:"#161616",borderRadius:14,border:"1px solid #262626",overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #262626",fontSize:10,fontWeight:700,color:"#555",fontFamily:FM,letterSpacing:"0.6px"}}>
              {onlineAgents.length>0?`${onlineAgents.length} ONLINE NOW`:"ALL TEAMMATES"}
            </div>
            <div style={{maxHeight:260,overflowY:"auto"}}>
              {(onlineAgents.length>0?onlineAgents:allAgents).map((a:any)=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:"1px solid #1c1c1c"}}>
                  <Av i={a.av} c={a.color} s={36} dot={a.status==="online"}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#e8e8e8"}}>{a.name}</div>
                    <div style={{fontSize:10,color:a.status==="online"?C.g:"#555",fontFamily:FM,fontWeight:600}}>{a.status}</div>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>initCall(a.id,"voice")} title="Voice" style={{width:32,height:32,borderRadius:8,background:"#1c2b1c",border:`1px solid ${C.g}44`,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">📞</button>
                    <button onClick={()=>initCall(a.id,"video")} title="Video" style={{width:32,height:32,borderRadius:8,background:"#1a1f2e",border:`1px solid ${C.a}44`,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">📹</button>
                    <button onClick={()=>initCall(a.id,"screen")} title="Screen" style={{width:32,height:32,borderRadius:8,background:"#221828",border:`1px solid ${C.p}44`,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}} className="hov">🖥</button>
                  </div>
                </div>
              ))}
              {onlineAgents.length===0&&allAgents.length===0&&<div style={{textAlign:"center",padding:"28px",fontSize:12,color:"#555"}}>No teammates to call</div>}
            </div>
          </div>
        </div>}

        {/* ── Local video PiP (active call) ── */}
        {showVideo&&<video ref={localVideoRef} autoPlay playsInline muted style={{position:"absolute",bottom:100,right:20,width:180,height:120,borderRadius:12,objectFit:"cover",border:`2px solid ${typeColor}`,boxShadow:"0 8px 32px rgba(0,0,0,.8)",zIndex:10}}/>}

        {/* ── Floating top bar ── */}
        <div style={{position:"absolute",top:0,left:0,right:0,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(to bottom,rgba(0,0,0,.85),transparent)",zIndex:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:typeColor+"22",border:`1.5px solid ${typeColor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{typeIcon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:FD}}>{typeLabel}</div>
              <div style={{fontSize:11,color:typeColor,fontFamily:FM,fontWeight:600}}>{activeCall?<>● Live · {durFmt(callDuration)}</>:chLabel?`in ${chLabel}`:"Select teammate"}</div>
            </div>
          </div>
          {huddleScreen&&<div style={{background:"rgba(0,0,0,.7)",borderRadius:6,padding:"4px 12px",fontSize:11,color:"#fff",fontFamily:FM,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.g,animation:"pulse 1.5s infinite",display:"inline-block"}}/>Sharing screen
          </div>}
          <button onClick={()=>endCall(true)} style={{width:36,height:36,borderRadius:10,background:"rgba(220,38,38,.85)",border:"1.5px solid #f87171",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:700}}>✕</button>
        </div>

        {/* ── Floating bottom controls ── */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"24px 0 28px",display:"flex",alignItems:"center",justifyContent:"center",gap:14,background:"linear-gradient(to top,rgba(0,0,0,.9) 60%,transparent)",zIndex:20}}>
          {/* Mic */}
          <button onClick={()=>{setHuddleMic(p=>!p);const track=localStreamRef.current?.getAudioTracks()[0];if(track)track.enabled=!huddleMic;}} title={huddleMic?"Mute mic":"Unmute mic"} style={{width:56,height:56,borderRadius:"50%",background:huddleMic?"rgba(34,197,94,.18)":"rgba(239,68,68,.18)",border:`2px solid ${huddleMic?C.g:C.r}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0}}>
            <span style={{fontSize:22}}>{huddleMic?"🎤":"🔇"}</span>
          </button>
          {/* Camera */}
          <button onClick={async()=>{
            if(!huddleCam){
              try{const s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});const vt=s.getVideoTracks()[0];if(peerRef.current){const sender=peerRef.current.getSenders().find((s2:any)=>s2.track?.kind==="video");if(sender)sender.replaceTrack(vt);else peerRef.current.addTrack(vt,localStreamRef.current||s);}if(localVideoRef.current){const combined=new MediaStream([...(localStreamRef.current?.getAudioTracks()||[]),vt]);localStreamRef.current=combined;localVideoRef.current.srcObject=combined;}setHuddleCam(true);}catch{showT("Camera access denied","error");}
            }else{localStreamRef.current?.getVideoTracks().forEach(t=>{t.stop();});setHuddleCam(false);}
          }} title={huddleCam?"Turn off camera":"Turn on camera"} style={{width:56,height:56,borderRadius:"50%",background:huddleCam?"rgba(59,130,246,.18)":"rgba(40,40,40,.8)",border:`2px solid ${huddleCam?C.a:"#444"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0}}>
            <span style={{fontSize:22}}>{huddleCam?"📹":"📷"}</span>
          </button>
          {/* Screen Share */}
          <button onClick={async()=>{
            if(!huddleScreen){
              try{const s=await(navigator.mediaDevices as any).getDisplayMedia({video:{cursor:"always"},audio:true});const vt=s.getVideoTracks()[0];if(peerRef.current){const sender=peerRef.current.getSenders().find((s2:any)=>s2.track?.kind==="video");if(sender)sender.replaceTrack(vt);else peerRef.current.addTrack(vt,localStreamRef.current||s);}if(localVideoRef.current){const combined=new MediaStream([...(localStreamRef.current?.getAudioTracks()||[]),vt]);localStreamRef.current=combined;localVideoRef.current.srcObject=combined;}setHuddleScreen(true);setHuddleCam(false);vt.addEventListener("ended",()=>{setHuddleScreen(false);});showT("Screen sharing started","success");}catch{showT("Screen share cancelled","info");}
            }else{localStreamRef.current?.getVideoTracks().forEach(t=>t.stop());setHuddleScreen(false);showT("Screen share stopped","info");}
          }} title={huddleScreen?"Stop screen share":"Share screen"} style={{width:56,height:56,borderRadius:"50%",background:huddleScreen?"rgba(168,85,247,.18)":"rgba(40,40,40,.8)",border:`2px solid ${huddleScreen?C.p:"#444"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0}}>
            <span style={{fontSize:22}}>🖥</span>
          </button>
          {/* End Call */}
          <button onClick={()=>endCall(true)} title="End call" style={{width:64,height:64,borderRadius:"50%",background:"#ef4444",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 24px rgba(239,68,68,.55)",transition:"all .15s",flexShrink:0}}>
            <span style={{fontSize:26,color:"#fff"}}>✕</span>
          </button>
        </div>
      </div>;
    })()}
    {showNewCh&&<Mdl title="Create Channel" onClose={()=>setShowNewCh(false)} w={360}><Fld label="Name"><Inp val={newChName} set={setNewChName} ph="e.g. design-feedback"/></Fld><Fld label="Description"><Inp val={newChDesc} set={setNewChDesc} ph="About this channel"/></Fld><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10}}><Toggle val={newChPrivate} set={setNewChPrivate}/><span style={{fontSize:11,color:C.t2}}>Private</span></div><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowNewCh(false)}/><Btn ch="Create" v="primary" onClick={createCh}/></div></Mdl>}
    {/* Invite Members */}
    {showInvite&&aCh&&<Mdl title={"Add Members to #"+aCh.name} onClose={()=>setShowInvite(false)} w={380}>
      <p style={{fontSize:11.5,color:C.t3,marginBottom:10}}>Select team members to add to this channel:</p>
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:250,overflowY:"auto"}}>
        {agents.filter(a=>!getChMembers(aCh).includes(a.id)).length===0&&<div style={{padding:"16px",textAlign:"center",color:C.t3,fontSize:11}}>All team members are already in this channel</div>}
        {agents.filter(a=>!getChMembers(aCh).includes(a.id)).map(a=>(
          <button key={a.id} onClick={()=>{addMember(activeCh,a.id);}} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",transition:"all .1s"}}>
            <Av i={a.av} c={a.color} s={28} dot={a.status==="online"}/>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{a.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{a.role} · {a.status}</div></div>
            <span style={{fontSize:10,color:C.a,fontWeight:700}}>+ Add</span>
          </button>
        ))}
      </div>
      {getChMembers(aCh).length>0&&<div style={{marginTop:10}}>
        <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:5}}>ALREADY IN CHANNEL ({getChMembers(aCh).length})</div>
        <div style={{display:"flex",gap:-2,flexWrap:"wrap"}}>{getChMembers(aCh).map(mid=>{const a2=ag[mid];return a2?<div key={mid} title={a2.name} style={{marginLeft:-2}}><Av i={a2.av} c={a2.color} s={22}/></div>:null;})}</div>
      </div>}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn ch="Done" v="primary" onClick={()=>setShowInvite(false)}/></div>
    </Mdl>}
    {/* Edit Channel */}
    {showEditCh&&aCh&&<Mdl title={"Edit #"+aCh.name} onClose={()=>setShowEditCh(false)} w={400}>
      <Fld label="Channel Name"><Inp val={editChName} set={setEditChName} ph="channel-name"/></Fld>
      <Fld label="Description"><Inp val={editChDesc} set={setEditChDesc} ph="What's this channel about?"/></Fld>
      <Fld label="Topic"><Inp val={editChTopic} set={setEditChTopic} ph="Set a topic (shown in header)"/></Fld>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}><Toggle val={editChPrivate} set={setEditChPrivate}/><span style={{fontSize:11,color:C.t2}}>{editChPrivate?"🔒 Private — invite only":"# Public — anyone can join"}</span></div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowEditCh(false)}/><Btn ch="Save Changes" v="primary" onClick={editChSave}/></div>
    </Mdl>}
    {/* Delete Channel Confirmation */}
    {showDeleteCh&&aCh&&<Mdl title="Delete Channel" onClose={()=>setShowDeleteCh(false)} w={380}>
      <div style={{padding:"12px",background:C.rd,border:`1px solid ${C.r}44`,borderRadius:10,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:C.r,marginBottom:4}}>⚠ This action cannot be undone</div>
        <div style={{fontSize:11.5,color:C.t2,lineHeight:1.5}}>Deleting <strong>#{aCh.name}</strong> will permanently remove all {curMsgs.length} messages, {chPins.length} pins, and {getChMembers(aCh).length} member associations.</div>
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowDeleteCh(false)}/><button onClick={()=>deleteCh(activeCh)} style={{padding:"7px 16px",borderRadius:7,fontSize:12,fontWeight:700,background:C.r,color:"#fff",border:"none",cursor:"pointer"}}>Delete Forever</button></div>
    </Mdl>}
    {/* New DM */}
    {showNewDm&&<Mdl title="New Direct Message" onClose={()=>setShowNewDm(false)} w={380}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:11.5,color:C.t3}}>All workspace members ({agents.length-1}):</span>{setAgents&&<button onClick={()=>{setShowNewDm(false);setShowWsInvite(true);}} style={{fontSize:10,color:C.g,background:C.gd,border:`1px solid ${C.g}44`,borderRadius:5,padding:"2px 8px",cursor:"pointer",fontFamily:FM}}>+ Invite New</button>}</div>
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:280,overflowY:"auto"}}>
        {(agents as any[]).filter((a:any)=>a.id!==myIdRef.current).map((a:any)=>{const existing=(tcDms as any[]).find((d:any)=>d.agentId===a.id);return(
          <button key={a.id} onClick={()=>startDm(a.id)} className="hov" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,background:existing?C.ad:C.s2,border:`1.5px solid ${existing?C.a+"44":C.b1}`,cursor:"pointer",transition:"all .1s"}}>
            <Av i={a.av} c={a.color} s={32} dot={a.status==="online"}/>
            <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:12.5,fontWeight:600,color:C.t1,display:"flex",alignItems:"center",gap:4}}>{a.name}<span style={{fontSize:7.5,padding:"1px 4px",borderRadius:3,background:a.role==="Owner"?C.pd:a.role==="Admin"?C.ad:a.role==="Agent"?C.gd:C.s3,color:a.role==="Owner"?C.p:a.role==="Admin"?C.a:a.role==="Agent"?C.g:C.t3,fontWeight:700,fontFamily:FM}}>{a.role}</span></div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{a.email||"No email"} · {a.status}</div></div>
            {existing?<span style={{fontSize:9,color:C.a,fontFamily:FM,fontWeight:700}}>Open →</span>:<span style={{fontSize:9,color:C.g,fontFamily:FM,fontWeight:700}}>+ New</span>}
          </button>
        );})}
      </div>
    </Mdl>}
    {/* Workspace Invite (shared with Settings) */}
    {showWsInvite&&<Mdl title="Invite to Workspace" onClose={()=>setShowWsInvite(false)} w={400}>
      <div style={{background:C.ad,border:`1px solid ${C.a}33`,borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:11.5,color:C.t2}}>New members appear <strong>everywhere</strong> — Settings, Team Chat, Channels, DMs. They start as <strong>Member</strong> role. Promote to <strong>Agent</strong> in Settings → Agents & Teams.</div>
      <Fld label="Full Name"><Inp val={wsInvName} set={setWsInvName} ph="e.g. Rahul Kumar"/></Fld>
      <Fld label="Email"><Inp val={wsInvEmail} set={setWsInvEmail} ph="member@company.com" type="email"/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowWsInvite(false)}/><Btn ch="Invite Member" v="primary" onClick={inviteToWorkspace}/></div>
    </Mdl>}
    {showPoll&&<Mdl title="Create Poll" onClose={()=>setShowPoll(false)} w={380}><Fld label="Question"><Inp val={pollQ} set={setPollQ} ph="Ask something"/></Fld><Fld label="Options">{pollOpts.map((o,i)=><div key={i} style={{display:"flex",gap:3,marginBottom:3}}><Inp val={o} set={v=>setPollOpts(p=>p.map((x,j)=>j===i?v:x))} ph={"Option "+(i+1)}/>{i>1&&<button onClick={()=>setPollOpts(p=>p.filter((_,j)=>j!==i))} style={{color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>}</div>)}{pollOpts.length<6&&<button onClick={()=>setPollOpts(p=>[...p,""])} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer"}}>+ Add</button>}</Fld><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowPoll(false)}/><Btn ch="Create" v="primary" onClick={createPoll}/></div></Mdl>}
    {showFwd&&<Mdl title="Forward" onClose={()=>setShowFwd(null)} w={360}><p style={{fontSize:11,color:C.t2,marginBottom:8}}>Forward to:</p>{channels.filter(c=>c.id!==activeCh).map(ch=><button key={ch.id} onClick={()=>fwd(showFwd,ch.id)} className="hov" style={{width:"100%",padding:"6px 9px",borderRadius:6,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"left",marginBottom:3,fontSize:11,color:C.t2,display:"flex",gap:4}}><span style={{fontWeight:700,color:C.t3}}>#</span>{ch.name}</button>)}</Mdl>}
    {reminderMsg&&<Mdl title="Remind Me" onClose={()=>setReminderMsg(null)} w={340}><div style={{padding:"6px 8px",background:C.s3,borderRadius:6,marginBottom:10,fontSize:10.5,color:C.t2}}>{reminderMsg.text.slice(0,80)}…</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>{[{v:"15",l:"15m"},{v:"30",l:"30m"},{v:"60",l:"1h"},{v:"180",l:"3h"},{v:"1440",l:"Tomorrow"}].map(o=><button key={o.v} onClick={()=>setReminderTime(o.v)} style={{padding:"4px 10px",borderRadius:5,fontSize:10.5,background:reminderTime===o.v?C.ad:C.s2,color:reminderTime===o.v?C.a:C.t2,border:`1.5px solid ${reminderTime===o.v?C.a+"55":C.b1}`,cursor:"pointer",fontWeight:reminderTime===o.v?700:400}}>{o.l}</button>)}</div><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setReminderMsg(null)}/><Btn ch="Set" v="primary" onClick={()=>{showT("Reminder set","success");setReminderMsg(null);}}/></div></Mdl>}
    {profilePop&&ag[profilePop]&&(()=>{const a=ag[profilePop];return <div onClick={()=>setProfilePop(null)} style={{position:"fixed",inset:0,zIndex:100}}><div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"20%",left:"35%",width:300,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:14,padding:18,boxShadow:"0 16px 50px rgba(0,0,0,.5)",animation:"fadeUp .15s ease"}}>
      <button onClick={()=>setProfilePop(null)} style={{position:"absolute",top:8,right:10,background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:14}}>×</button>
      <div style={{textAlign:"center",marginBottom:12}}><Av i={a.av} c={a.color} s={56} dot={a.status==="online"}/><div style={{fontSize:16,fontWeight:700,fontFamily:FD,marginTop:8}}>{a.name}</div><div style={{display:"flex",justifyContent:"center",gap:4,marginTop:4}}><Tag text={a.role} color={a.role==="Owner"?C.p:a.role==="Admin"?C.a:C.g}/><Tag text={a.status} color={a.status==="online"?C.g:a.status==="busy"?C.r:C.t3}/></div></div>
      <div style={{background:C.s3,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
        {[{l:"Email",v:a.email||"—"},{l:"Role",v:a.role},{l:"Status",v:a.status},{l:"Timezone",v:"Asia/Kolkata"},{l:"Local Time",v:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}].map(r=>(
          <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.b1}22`}}>
            <span style={{fontSize:11,color:C.t3}}>{r.l}</span>
            <span style={{fontSize:11,fontWeight:600,color:C.t1}}>{r.v}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:4}}>
        <Btn ch="💬 DM" v="primary" full sm onClick={()=>startDm(profilePop)}/>
        <button onClick={()=>{const id=profilePop;setProfilePop(null);initCall(id,"voice");setShowHuddle(true);}} style={{flex:1,padding:"6px",borderRadius:7,fontSize:11,fontWeight:700,background:"#dcfce7",color:C.g,border:`1px solid ${C.g}44`,cursor:"pointer",fontFamily:FM}}>📞 Voice</button>
        <button onClick={()=>{const id=profilePop;setProfilePop(null);initCall(id,"video");setShowHuddle(true);}} style={{flex:1,padding:"6px",borderRadius:7,fontSize:11,fontWeight:700,background:C.ad,color:C.a,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>📹 Video</button>
      </div>
    </div></div>;})()}

    {/* ── Incoming Call Notification ── */}
    {incomingCall&&(()=>{
      const ic=incomingCall;
      const ctIcon=ic.callType==="video"?"📹":ic.callType==="screen"?"🖥":"📞";
      const ctLabel=ic.callType==="video"?"Video Call":ic.callType==="screen"?"Screen Share":"Voice Call";
      const ctColor=ic.callType==="video"?C.a:ic.callType==="screen"?C.p:C.g;
      return <div style={{position:"fixed",top:20,right:20,zIndex:200,width:340,background:C.s2,border:`2px solid ${ctColor}44`,borderRadius:16,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.7)",animation:"fadeUp .2s ease"}}>
        {/* Animated top bar */}
        <div style={{height:3,background:`linear-gradient(90deg,${ctColor},${ctColor}88)`,animation:"pulse 1.2s ease-in-out infinite"}}/>
        <div style={{padding:"16px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:ctColor+"22",border:`2px solid ${ctColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,animation:"pulse 1.2s infinite",flexShrink:0}}>{ctIcon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.t1}}>{ic.callerName}</div>
              <div style={{fontSize:11,color:ctColor,fontWeight:700,fontFamily:FM}}>{ctLabel}</div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>Incoming…</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={acceptCall} style={{flex:1,padding:"11px",borderRadius:10,background:ctColor,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:`0 4px 16px ${ctColor}44`}}>{ctIcon} Answer</button>
            <button onClick={()=>{sendWs({type:'tc_call_end',targetId:ic.from,callId:ic.callId});setIncomingCall(null);}} style={{flex:1,padding:"11px",borderRadius:10,background:C.r,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>✕ Decline</button>
          </div>
        </div>
      </div>;
    })()}
  </div>;
}

export function MiniChatPanel({agents,onClose,onExpand}){
  const [channels,setChannels]=useState<any[]>([]);
  const [activeCh,setActiveCh]=useState("");
  const [msgs,setMsgs]=useState<Record<string,any[]>>({});
  const [inp,setInp]=useState("");
  const myIdRef=useRef<string>("");
  const ag=agents.reduce((m:any,a:any)=>{m[a.id]=a;return m;},{});

  // Decode JWT for user id
  useEffect(()=>{
    const token=api.getToken?.();
    if(token){try{const p=JSON.parse(atob(token.split('.')[1]));if(p.id)myIdRef.current=p.id;}catch{}}
  },[]);

  // Load channels from API
  useEffect(()=>{
    if(!api.isConnected())return;
    api.get("/chat/channels").then((r:any)=>{
      if(r?.channels?.length){
        const mapped=r.channels.map((c:any)=>({...c,name:c.name}));
        setChannels(mapped);
        setActiveCh(mapped[0]?.id||'');
      }
    }).catch(()=>{});
  },[]);

  // Load messages when active channel changes
  useEffect(()=>{
    if(!activeCh||!api.isConnected())return;
    if(msgs[activeCh])return;
    api.get(`/chat/channels/${activeCh}/messages`).then((r:any)=>{
      if(r?.messages){
        setMsgs(p=>({...p,[activeCh]:r.messages.map((m:any)=>{
          let rxArr:any[]=[];
          try{const raw=typeof m.reactions==='string'?JSON.parse(m.reactions||'{}'):(m.reactions||{});rxArr=Object.entries(raw).map(([e,u])=>({emoji:e,users:u}));}catch{}
          const atts=typeof m.attachments==='string'?JSON.parse(m.attachments||'[]'):(m.attachments||[]);
          const file=atts.length>0?{name:atts[0].name}:null;
          return{id:m.id,uid:m.sender_id,text:m.text||'',t:new Date(m.created_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}),reactions:rxArr,file};
        })}));
      }
    }).catch(()=>{});
  },[activeCh]);

  const cur=(msgs[activeCh]||[]).slice(-8);

  const sendMsg=()=>{
    const t=inp.trim();if(!t||!activeCh)return;
    const myId=myIdRef.current;
    setMsgs(p=>({...p,[activeCh]:[...(p[activeCh]||[]),{id:'mm'+Date.now(),uid:myId,text:t,t:new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}),reactions:[],file:null}]}));
    setInp('');
    if(api.isConnected())api.post(`/chat/channels/${activeCh}/messages`,{text:t}).catch(()=>{});
  };

  return <div style={{position:"fixed",bottom:78,right:20,width:350,height:450,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:13,overflow:"hidden",boxShadow:"0 16px 50px rgba(0,0,0,.5)",zIndex:79,display:"flex",flexDirection:"column",animation:"fadeUp .2s ease"}}>
    <div style={{padding:"6px 9px",background:C.s1,borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:5}}>
      <NavIcon id="teamchat" s={13} col={C.a}/><span style={{fontSize:12,fontWeight:700,fontFamily:FD,flex:1}}>Team Chat</span>
      <button onClick={onExpand} style={{width:18,height:18,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">{"\u2197"}</button>
      <button onClick={onClose} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:12}}>×</button>
    </div>
    <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,overflowX:"auto",flexShrink:0}}>
      {channels.slice(0,5).map((ch:any)=><button key={ch.id} onClick={()=>setActiveCh(ch.id)} style={{padding:"3px 7px",fontSize:9,fontWeight:600,fontFamily:FM,color:activeCh===ch.id?C.a:C.t3,borderBottom:`2px solid ${activeCh===ch.id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>#{ch.name.slice(0,10)}</button>)}
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"3px 5px"}}>
      {cur.length===0&&<div style={{padding:"20px",textAlign:"center",color:C.t3,fontSize:10}}>No messages yet</div>}
      {cur.map((m:any)=>{const a2=ag[m.uid]||{name:"?",av:"?",color:C.t3};return(
        <div key={m.id} style={{display:"flex",gap:3,marginBottom:4}}>
          <Av i={a2.av||a2.avatar||"?"} c={a2.color} s={16} dot={a2.status==="online"}/>
          <div style={{flex:1}}>
            <div style={{fontSize:9}}><strong style={{color:m.uid===myIdRef.current?C.a:C.t1}}>{a2.name||"?"}</strong> <span style={{color:C.t3,fontFamily:FM}}>{m.t}</span></div>
            <div style={{fontSize:10,color:C.t2,lineHeight:1.3}}>{m.text.slice(0,80)}{m.text.length>80?"…":""}</div>
            {m.file&&(()=>{const f=m.file;const isVoice=f.isVoice||f.contentType?.startsWith('audio/')||/\.(mp3|ogg|wav|webm|aac|m4a)$/i.test(f.name||'')||f.name?.startsWith("voice-");if(isVoice&&f.url)return(<div style={{marginTop:1}}><audio controls src={f.url} style={{height:24,maxWidth:180}}/></div>);return(<div style={{fontSize:8,color:C.a,marginTop:1}}>📎 {f.name}</div>);})()}
            {m.reactions?.length>0&&<div style={{display:"flex",gap:1,marginTop:1}}>{m.reactions.map((r:any)=><span key={r.emoji} style={{fontSize:8,background:C.s3,borderRadius:5,padding:"0 2px"}}>{r.emoji}{r.users.length}</span>)}</div>}
          </div>
        </div>
      );})}
    </div>
    <div style={{padding:"4px 5px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:3}}>
      <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendMsg();}}} placeholder="Message…" style={{flex:1,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:5,padding:"3px 6px",fontSize:10,color:C.t1,fontFamily:FB,outline:"none"}}/>
      <button onClick={onExpand} style={{padding:"3px 6px",borderRadius:4,fontSize:8.5,fontWeight:700,background:C.a,color:"#fff",border:"none",cursor:"pointer"}}>Open</button>
    </div>
  </div>;
}

