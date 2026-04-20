import { useState, useEffect, useCallback } from "react";
import { C, FD, FB, FM, API_BASE, api, uid, showT, now, Fld, Spin, AiInsight } from "../shared";

// Local lightweight components to avoid shared.tsx strict prop requirements
const VTag=({text,color}:{text:string,color:string})=><span style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:700,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase",background:color+"22",color,border:`1px solid ${color}44`,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>{text}</span>;
const VEmpty=({icon="👁",title="",desc=""}:{icon?:string,title?:string,desc?:string})=><div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:14,opacity:.7}}>{icon}</div><div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:6,fontFamily:FD}}>{title}</div>{desc&&<div style={{fontSize:12.5,color:C.t3,maxWidth:320,lineHeight:1.6}}>{desc}</div>}</div>;

// ─── MONITOR SCREEN ───────────────────────────────────────────────────────

function fmtTime(s: any) {
  const n = parseInt(s);
  if (isNaN(n) || n < 0) return "0s";
  if (n < 60) return n + "s";
  if (n < 3600) return Math.floor(n / 60) + "m " + (n % 60) + "s";
  return Math.floor(n / 3600) + "h " + Math.floor((n % 3600) / 60) + "m";
}

const VISITOR_COLORS=["#4c82fb","#1fd07a","#9b6dff","#f5a623","#22d4e8","#e91e63","#ff6b35"];
function visitorColor(id:string){return VISITOR_COLORS[id.split('').reduce((s,c)=>s+c.charCodeAt(0),0)%VISITOR_COLORS.length];}

function parseReferrerDomain(ref:string):string{
  if(!ref)return'';
  try{const u=new URL(ref);return u.hostname.replace(/^www\./,'');}catch{return ref.slice(0,50);}
}
function mapApiVisitor(v:any){
  const referrerDomain=parseReferrerDomain(v.referrer||'');
  return {
    id: v.id,
    name: v.visitor_name||null,
    email: v.visitor_email||null,
    phone: v.visitor_phone||null,
    avatar: v.visitor_avatar||null,
    googleId: v.visitor_google_id||null,
    country: v.country||'Unknown',
    flag: v.flag||'🌍',
    lat: parseFloat(v.lat)||0,
    lng: parseFloat(v.lng)||0,
    page: v.page||'/',
    pageHost: (() => { try { return new URL(v.page||'').hostname.replace(/^www\./,''); } catch { return ''; } })(),
    prevPages: v.pages_visited||1,
    pageHistory: (() => { try { return JSON.parse(v.page_history || '[]'); } catch { return [v.page || '/']; } })(),
    timeOnSite: (() => {
      // Time on the CURRENT page only — anchored on page_entered_at (reset every navigation).
      const enteredRaw = v.page_entered_at || v.last_seen || v.created_at;
      const enteredAt = enteredRaw ? new Date(String(enteredRaw).replace(' ', 'T')).getTime() : Date.now();
      // Online: live tick from page entry to now
      if (!!v.is_active) return Math.max(0, Math.floor((Date.now() - enteredAt) / 1000));
      // Ended: time on last page = last_seen - page_entered_at (frozen)
      const lastSeen = v.last_seen ? new Date(String(v.last_seen).replace(' ', 'T')).getTime() : enteredAt;
      return Math.max(0, Math.floor((lastSeen - enteredAt) / 1000));
    })(),
    visitedAt: v.created_at || '',
    joined: (() => {
      const enteredRaw = v.page_entered_at || v.created_at;
      return enteredRaw ? new Date(String(enteredRaw).replace(' ', 'T')).getTime() : Date.now();
    })(),
    ipVersion: v.ip ? (v.ip.includes(':') ? 'IPv6' : 'IPv4') : '',
    browser: v.browser||'Unknown',
    os: v.os||'Unknown',
    device: v.device||'Desktop',
    source: v.source||'Direct',
    referrer: v.referrer||'',
    referrerDomain,
    chatStatus: v.status||'browsing',
    ip: v.ip||'—',
    color: visitorColor(v.id),
    typing: false,
    city: v.city||'',
    region: v.region||'',
    language: v.language||'en',
    screenSize: v.screen_width&&v.screen_height?`${v.screen_width}×${v.screen_height}`:'',
    isActive: !!v.is_active,
    entryPage: v.entry_page||'',
    exitPage: v.exit_page||'',
    utmSource: v.utm_source||'',
  };
}

export default function MonitorScr({contacts,inboxes,setConvs,setMsgs,setScr,setAid,liveVisitors,setLiveVisitors}:any){
  const [visitors,setVisitors]=useState<any[]>([]);
  const [sel,setSel]=useState<any>(null);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [showInvite,setShowInvite]=useState<any>(null);
  const [invMsg,setInvMsg]=useState("Hi there! I noticed you've been on our page. Can I help you with anything?");
  const [tab,setTab]=useState("list");
  const [mapSel,setMapSel]=useState<any>(null);
  const [lastRefresh,setLastRefresh]=useState(0);
  const [loading,setLoading]=useState(true);
  const [showSnippet,setShowSnippet]=useState(false);
  const [snippet,setSnippet]=useState('');
  const [copied,setCopied]=useState(false);
  const [clearing,setClearing]=useState(false);
  // AI Visitor Intent
  const [monAi,setMonAi]=useState<string|null>(null);
  const [monAiLoad,setMonAiLoad]=useState(false);
  // Sites tab state
  const [sites,setSites]=useState<any[]>([]);
  const [sitesLoading,setSitesLoading]=useState(false);
  const [siteForm,setSiteForm]=useState<{id?:string,name:string,url:string}|null>(null);
  const [siteSaving,setSiteSaving]=useState(false);
  const [siteDeleting,setSiteDeleting]=useState<string|null>(null);
  const [selectedSite,setSelectedSite]=useState("all");

  // ── Fetch real visitors from API ─────────────────────────────────────────
  const fetchVisitors=useCallback(async()=>{
    try{
      const d=await api.get('/monitor/visitors');
      if(d?.visitors){
        const mapped=d.visitors.map(mapApiVisitor);
        // Merge: for active visitors, preserve the existing 'joined' anchor so timeOnSite doesn't jump
        setVisitors(prev=>{
          if(!prev.length)return mapped;
          const prevMap=new Map(prev.map(v=>[v.id,v]));
          return mapped.map(v=>{
            const old=prevMap.get(v.id);
            // Preserve the stable joined anchor only when the visitor is still on the same page
            if(old&&v.isActive&&old.isActive&&old.page===v.page){
              return {...v,joined:old.joined,timeOnSite:Math.max(0,Math.floor((Date.now()-old.joined)/1000))};
            }
            return v;
          });
        });
        if(setLiveVisitors)setLiveVisitors(d.visitors);
        setLastRefresh(Date.now());
      }
    }catch(e){ console.error('❌ fetchVisitors error:', e); }
    setLoading(false);
  },[setLiveVisitors]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (sel) {
      const sid = sel.sessionId || sel.id;
      api.get(`/monitor/events/${sid}`).then(r => setEvents(r.events || [])).catch(() => setEvents([]));
    } else {
      setEvents([]);
    }
  }, [sel]);

  // Initial fetch + 5-second polling
  useEffect(()=>{
    fetchVisitors();
    const poll=setInterval(fetchVisitors,5000);
    return ()=>clearInterval(poll);
  },[fetchVisitors]);

  // Fetch sites on mount for the site selector
  useEffect(()=>{api.get('/monitor/sites').then((d:any)=>{if(d?.sites)setSites(d.sites);}).catch(()=>{});},[]);

  // Sync when App.tsx pushes WS updates (liveVisitors changes)
  useEffect(()=>{
    if(!liveVisitors?.length)return;
    setVisitors(liveVisitors.map(mapApiVisitor));
  },[liveVisitors]);

  // Tick active visitors' timeOnSite every 3s using joined anchor — single source of truth
  useEffect(()=>{
    const hasActive=visitors.some(v=>v.isActive);
    if(!hasActive)return;
    const t=setInterval(()=>{
      setVisitors(prev=>{
        let changed=false;
        const next=prev.map(v=>{
          if(!v.isActive)return v;
          const t2=Math.floor((Date.now()-v.joined)/1000);
          if(t2!==v.timeOnSite){changed=true;return{...v,timeOnSite:t2};}
          return v;
        });
        return changed?next:prev;
      });
    },1000);
    return ()=>clearInterval(t);
  },[visitors.length]);

  // ── AI Visitor Intent ────────────────────────────────────────────────────
  const genMonAi=async()=>{
    setMonAiLoad(true);
    try{
      const vis=visitors.slice(0,5).map(v=>(v.name||'Visitor')+" on "+v.page+" ("+fmtTime(v.timeOnSite)+")").join(", ");
      const d=await api.post('/ai/chat',{max_tokens:250,system:"You are a visitor intent AI. Predict visitor intent: likely buyer, support seeker, competitor, browsing. 4-5 insights with names. No markdown.",messages:[{role:"user",content:visitors.length+" visitors. "+vis}]});
      setMonAi(d.content?.[0]?.text);
    }catch{
      setMonAi("Click Refresh to predict visitor intent: likely buyers, support seekers, and proactive chat triggers.");
    }
    setMonAiLoad(false);
  };

  // ── Sites CRUD ───────────────────────────────────────────────────────────
  const fetchSites=useCallback(async()=>{
    setSitesLoading(true);
    try{const d=await api.get('/monitor/sites');if(d?.sites)setSites(d.sites);}catch{}
    setSitesLoading(false);
  },[]);

  useEffect(()=>{if(tab==="sites"){fetchSites();}},[tab,fetchSites]);

  const saveSite=async()=>{
    if(!siteForm)return;
    const {id,name,url}=siteForm;
    if(!name.trim()||!url.trim()){showT("Name and URL are required","error");return;}
    setSiteSaving(true);
    try{
      if(id){
        await api.patch('/monitor/sites/'+id,{name:name.trim(),url:url.trim()});
        showT("Site updated","success");
      }else{
        await api.post('/monitor/sites',{name:name.trim(),url:url.trim()});
        showT("Site added","success");
      }
      setSiteForm(null);fetchSites();
    }catch(e:any){showT(e?.message||"Failed to save site","error");}
    setSiteSaving(false);
  };

  const deleteSite=async(id:string)=>{
    if(!window.confirm('Delete this site? This cannot be undone.'))return;
    setSiteDeleting(id);
    try{await api.del('/monitor/sites/'+id);showT("Site removed","success");fetchSites();}catch(e:any){showT(e?.message||"Failed to delete","error");}
    setSiteDeleting(null);
  };

  const toggleSiteStatus=async(site:any)=>{
    const newStatus=site.status==='active'?'paused':'active';
    try{await api.patch('/monitor/sites/'+site.id,{status:newStatus});fetchSites();}catch{}
  };

  // ── Snippet — fetch from backend so it uses PUBLIC_URL (ngrok/domain) not localhost ───
  const loadSnippet=async()=>{
    try{
      const d=await api.get('/monitor/snippet');
      setSnippet(`<!-- SupportDesk Live Visitor Tracking -->\n<script src="${d.trackerUrl}" async></script>`);
    }catch{
      const backendUrl=API_BASE.replace(/\/api$/,'');
      setSnippet(`<!-- SupportDesk Live Visitor Tracking -->\n<script src="${backendUrl}/tracker.js" async></script>`);
    }
    setShowSnippet(true);
  };

  const copySnippet=()=>{
    const fallback=()=>{
      const ta=document.createElement('textarea');
      ta.value=snippet;ta.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);ta.focus();ta.select();
      try{document.execCommand('copy');}catch{}
      document.body.removeChild(ta);
      setCopied(true);setTimeout(()=>setCopied(false),2500);
    };
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(snippet)
        .then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);})
        .catch(fallback);
    }else{fallback();}
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const clearSessions=async()=>{
    if(!window.confirm('Clear all active visitor sessions? This cannot be undone.'))return;
    setClearing(true);
    try{await api.del('/monitor/sessions');setVisitors([]);showT("All visitor sessions cleared","success");}catch(e:any){showT(e?.message||"Failed to clear sessions","error");}
    setClearing(false);
  };

  const startChat=(vis:any)=>{
    const id="cv"+uid();
    setConvs((p:any)=>[{id,cid:"ct1",iid:"ib1",ch:"live",status:"open",priority:"normal",subject:"Live chat from "+vis.country,agent:"a1",team:null,labels:[],unread:0,time:"now",color:vis.color},...p]);
    setMsgs((p:any)=>({...p,[id]:[{id:uid(),role:"contact",text:"Hi, I need help with "+vis.page,t:now()},{id:uid(),role:"sys",text:"Visitor from "+vis.flag+" "+vis.country+" · "+vis.browser+" · "+vis.device}]}));
    setVisitors(p=>p.map((v:any)=>v.id===vis.id?{...v,chatStatus:"chatting"}:v));
    api.patch('/monitor/visitors/'+vis.id+'/status',{status:'chatting'}).catch(()=>{});
    setShowInvite(null);setScr("inbox");setAid(id);
    showT("Chat started with visitor from "+vis.country,"success");
  };

  const sendInvite=(vis:any)=>{
    setVisitors(p=>p.map((v:any)=>v.id===vis.id?{...v,chatStatus:"invited"}:v));
    api.patch('/monitor/visitors/'+vis.id+'/status',{status:'invited'}).catch(()=>{});
    setShowInvite(null);
    showT("Invitation sent to visitor from "+vis.country,"success");
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const siteFiltered=selectedSite==="all"?visitors:visitors.filter((vis:any)=>{
    try{return new URL(vis.page).hostname.replace(/^www\./,'').includes(selectedSite);}catch{return vis.page.includes(selectedSite);}
  });
  const filtered=siteFiltered.filter((vis:any)=>{
    if(filter==="chatting")return vis.chatStatus==="chatting";
    if(filter==="invited")return vis.chatStatus==="invited";
    if(search)return (vis.name||"").toLowerCase().includes(search.toLowerCase())||vis.country.toLowerCase().includes(search.toLowerCase())||vis.page.toLowerCase().includes(search.toLowerCase())||vis.ip.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const ctrMap:any={};siteFiltered.forEach((v:any)=>{ctrMap[v.country]=(ctrMap[v.country]||0)+1;});
  const topCountries=Object.entries(ctrMap).sort((a:any,b:any)=>b[1]-a[1]).slice(0,6);
  const pageMap:any={};siteFiltered.forEach((v:any)=>{pageMap[v.page]=(pageMap[v.page]||0)+1;});
  const topPages=Object.entries(pageMap).sort((a:any,b:any)=>b[1]-a[1]).slice(0,5);
  const chatting=siteFiltered.filter((v:any)=>v.chatStatus==="chatting").length;
  const invited=siteFiltered.filter((v:any)=>v.chatStatus==="invited").length;
  const secAgo=lastRefresh?Math.floor((Date.now()-lastRefresh)/1000):0;

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:C.bg}}>
    {/* Header */}
    <div style={{padding:"14px 24px",borderBottom:"1px solid "+C.b1,background:C.s1,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:2}}>
          <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Live Visitor Monitoring</h2>
          <span style={{display:"flex",alignItems:"center",gap:5,background:C.gd,border:"1px solid "+C.g+"44",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,fontFamily:FM,color:C.g}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.g,animation:"pulse 1.5s infinite"}}/>LIVE
          </span>
        </div>
        <div style={{fontSize:11.5,color:C.t3}}>Real-time visitors on your website right now</div>
      </div>
      <div style={{display:"flex",gap:10,marginLeft:"auto",flexWrap:"wrap",alignItems:"center"}}>
        {[{l:"Total Visitors",v:siteFiltered.length,c:C.a},{l:"Online Now",v:siteFiltered.filter((v:any)=>v.isActive).length,c:C.g},{l:"Chatting",v:chatting,c:C.p},{l:"Invited",v:invited,c:C.y},{l:"Avg Time",v:fmtTime(Math.round(siteFiltered.reduce((s:number,v:any)=>s+v.timeOnSite,0)/Math.max(siteFiltered.length,1))),c:C.t2}].map((stat:any)=>(
          <div key={stat.l} style={{background:C.s2,border:"1px solid "+C.b1,borderRadius:10,padding:"8px 14px",textAlign:"center",minWidth:80}}>
            <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:stat.c}}>{stat.v}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:1}}>{stat.l}</div>
          </div>
        ))}
        <button onClick={loadSnippet} style={{padding:"8px 14px",borderRadius:8,fontSize:11.5,fontWeight:700,fontFamily:FM,background:C.pd,color:C.p,border:"1px solid "+C.p+"44",cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
          <span>{"</>"}</span> Get Snippet
        </button>
        <button onClick={clearSessions} disabled={clearing} style={{padding:"8px 14px",borderRadius:8,fontSize:11.5,fontWeight:700,fontFamily:FM,background:"#ff444416",color:"#ff4444",border:"1px solid #ff444444",cursor:clearing?"not-allowed":"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,opacity:clearing?0.6:1}}>
          {clearing?<Spin/>:<span>✕</span>} {clearing?"Clearing…":"Clear Sessions"}
        </button>
      </div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:0,padding:"0 24px",borderBottom:"1px solid "+C.b1,background:C.s1}}>
      {[["list","Visitor List"],["map","World Map"],["analytics","Analytics"],["sites","Sites"]].map(([id,lbl])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:"11px 18px",fontSize:11.5,fontWeight:700,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase",color:tab===id?C.a:C.t3,borderTop:"none",borderLeft:"none",borderRight:"none",borderBottom:"2px solid "+(tab===id?C.a:"transparent"),background:"transparent",cursor:"pointer"}}>{lbl}</button>
      ))}
      <div style={{flex:1}}/>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0"}}>
        {/* Site Selector */}
        <select value={selectedSite} onChange={e=>setSelectedSite(e.target.value)} style={{background:C.bg,border:"1px solid "+C.b1,borderRadius:7,padding:"5px 10px",fontSize:11.5,color:C.t1,fontFamily:FM,outline:"none",cursor:"pointer"}}>
          <option value="all">All Sites</option>
          {sites.map((s:any)=>{let host='';try{host=new URL(s.url).hostname.replace(/^www\./,'');}catch{host=s.url;}return <option key={s.id} value={host}>{s.name}</option>;})}
        </select>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:"1px solid "+C.b1,borderRadius:7,padding:"5px 10px"}}>
          <span style={{color:C.t3,fontSize:12}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search visitors, IP, country..." style={{background:"none",border:"none",fontSize:12,color:C.t1,fontFamily:FB,outline:"none",width:180}}/>
        </div>
        {["all","chatting","invited"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 10px",borderRadius:6,fontSize:10.5,fontWeight:700,fontFamily:FM,cursor:"pointer",background:filter===f?C.ad:"transparent",color:filter===f?C.a:C.t3,border:"1px solid "+(filter===f?C.a+"44":C.b1),textTransform:"capitalize"}}>{f}</button>
        ))}
      </div>
    </div>

    <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
      {/* AI Visitor Intelligence */}
      <div style={{padding:"8px 20px 0"}}><AiInsight title="VISITOR INTENT PREDICTION" loading={monAiLoad} onRefresh={genMonAi} compact items={monAi?monAi.split("\n").filter((l:string)=>l.trim()).map((l:string)=>({text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh to predict visitor intent: likely buyers, support seekers, and proactive chat triggers."}]}/></div>
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>

      {/* VISITOR LIST TAB */}
      {tab==="list"&&<div style={{flex:1,display:"flex",minWidth:0}}>
        <div style={{flex:1,overflow:"auto"}}>
          {/* Header row */}
          <div style={{display:"grid",gridTemplateColumns:"220px 1.5fr 1.2fr 130px 1.2fr 130px 110px 100px 100px 120px",padding:"8px 20px",borderBottom:"1px solid "+C.b1,position:"sticky",top:0,background:C.s1,zIndex:5,minWidth:1400}}>
            {["Visitor", "Current Page", "Source", "Location", "Device/OS", "Browser", "IP Address", "Time on Site", "Status", "Actions"].map((h, i) => (
              <span key={i} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>{h}</span>
            ))}
          </div>

          {loading&&<div style={{padding:"40px",textAlign:"center"}}><Spin/></div>}
          {!loading&&filtered.length===0&&<VEmpty icon="👁" title="No live visitors" desc={visitors.length===0?"Add the tracking snippet to your website to start seeing real visitors.":"No visitors match your filter."}/>}

          {filtered.map((vis:any)=>(
            <div key={vis.id} className="hov" onClick={()=>setSel(sel?.id===vis.id?null:vis)}
              style={{display:"grid",gridTemplateColumns:"220px 1.5fr 1.2fr 130px 1.2fr 130px 110px 100px 100px 120px",padding:"10px 20px",borderBottom:"1px solid "+C.b1,cursor:"pointer",background:sel?.id===vis.id?C.ad:"transparent",transition:"background .12s",borderLeft:"2.5px solid "+(sel?.id===vis.id?C.a:"transparent"),animation:"fadeUp .2s ease",minWidth:1400,alignItems:"center"}}>
              {/* Visitor */}
              <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:vis.color+"22",border:"2px solid "+vis.color+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontFamily:FM,color:vis.color,fontWeight:700,flexShrink:0}}>
                  {vis.name?vis.name.split(" ").map((n:string)=>n[0]).join(""):vis.id.slice(-2).toUpperCase()}
                </div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.name||<span style={{color:C.t3,fontStyle:"italic"}}>Anonymous</span>}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>{vis.id.slice(-8)}</div>
                </div>
              </div>
              {/* Page */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0,paddingRight:10}}>
                {vis.pageHost&&<div style={{fontSize:9.5,color:C.t3,fontFamily:FM,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🌐 {vis.pageHost}</div>}
                <div style={{fontSize:12,color:C.a,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(() => { try { return new URL(vis.page).pathname||'/'; } catch { return vis.page; } })()}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:1}}>{vis.prevPages} page{vis.prevPages!==1?"s":""} visited</div>
              </div>
              {/* Source */}
              <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
                <span style={{fontSize:10,fontWeight:700,fontFamily:FM,padding:"2px 8px",borderRadius:4,background:vis.source==="Direct"?C.s3:C.ad,color:vis.source==="Direct"?C.t3:C.a,border:"1px solid "+(vis.source==="Direct"?C.b1:C.a+"44"),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {vis.source==="Direct"?"⊕ Direct":"↩ "+vis.source}
                </span>
              </div>
              {/* Location */}
              <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                <span style={{fontSize:16}}>{vis.flag}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:11.5,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.country&&vis.country!=="Unknown"?vis.country:<span style={{color:C.t3,fontStyle:"italic"}}>Resolving…</span>}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.city || vis.region || ''}</div>
                </div>
              </div>
              {/* Device/OS */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
                <div style={{fontSize:12,color:C.t1}}>{vis.device}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.os}</div>
              </div>
              {/* Browser */}
              <div style={{display:"flex",alignItems:"center",minWidth:0}}>
                <div style={{fontSize:11.5,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vis.browser}</div>
              </div>
              {/* IP Address */}
              <div style={{display:"flex",alignItems:"center",minWidth:0}}>
                <div style={{fontSize:11,color:C.t3,fontFamily:FM}}>{vis.ip}</div>
              </div>
              {/* Time */}
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.t1,fontFamily:FM}}>{fmtTime(vis.timeOnSite)}</div>
              </div>
              {/* Status */}
              <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",minWidth:0}}>
                {vis.isActive?<VTag text="● Online" color={C.g}/>:<VTag text="Ended" color={C.t3}/>}
                {vis.chatStatus==="chatting"?<VTag text={vis.typing?"Typing…":"Chatting"} color={vis.typing?C.p:C.g}/>:vis.chatStatus==="invited"?<VTag text="Invited" color={C.y}/>:null}
              </div>
              {/* Actions */}
              <div style={{display:"flex",alignItems:"center",gap:5}} onClick={(e:any)=>e.stopPropagation()}>
                {vis.chatStatus!=="chatting"&&<button onClick={()=>setShowInvite(vis)} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:C.ad,color:C.a,border:"1px solid "+C.a+"44",cursor:"pointer",whiteSpace:"nowrap"}}>Invite</button>}
                {vis.chatStatus==="chatting"&&<button onClick={()=>startChat(vis)} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:C.gd,color:C.g,border:"1px solid "+C.g+"44",cursor:"pointer"}}>Join</button>}
                <button onClick={()=>startChat(vis)} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:C.s3,color:C.t2,border:"1px solid "+C.b1,cursor:"pointer"}}>Chat</button>
              </div>
            </div>
          ))}
        </div>

        {/* Visitor Detail Panel */}
        {sel&&<aside style={{width:300,background:C.s1,borderLeft:"1px solid "+C.b1,overflowY:"auto",animation:"fadeUp .2s ease",flexShrink:0}}>
          <div style={{padding:"16px 18px",borderBottom:"1px solid "+C.b1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Visitor Details</span>
              <button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18}}>×</button>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14,padding:"12px",background:C.s2,borderRadius:10,border:"1px solid "+sel.color+"33"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:sel.color+"22",border:"2px solid "+sel.color+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontFamily:FM,color:sel.color,fontWeight:700,flexShrink:0}}>
                {sel.name?sel.name.split(" ").map((n:string)=>n[0]).join(""):sel.id.slice(-2).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{sel.name||"Anonymous Visitor"}</div>
                <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>ID: {sel.id.slice(-8)}</div>
                <div style={{marginTop:5}}><VTag text={sel.chatStatus} color={sel.chatStatus==="chatting"?C.g:sel.chatStatus==="invited"?C.y:C.t3}/></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>setShowInvite(sel)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:FM,background:C.pd,color:C.p,border:"1px solid "+C.p+"44",cursor:"pointer"}}>✉ Invite</button>
              <button onClick={()=>startChat(sel)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:FM,background:C.gd,color:C.g,border:"1px solid "+C.g+"44",cursor:"pointer"}}>💬 Start Chat</button>
            </div>
          </div>
          <div style={{padding:"14px 18px"}}>
            {[
              ["Status",null],
              ["Status",sel.isActive?"● Online":"Ended"],
              ["Visited At",sel.visitedAt?new Date(sel.visitedAt).toLocaleString():"—"],
              ["Time Spent",fmtTime(sel.timeOnSite)],
              ["",""],
              ["Visitor Info",null],
              ["Name",sel.name||"Anonymous"],
              sel.email?["Email",sel.email]:null,
              sel.phone?["Phone",sel.phone]:null,
              sel.googleId?["Google ID",sel.googleId]:null,
              ["",""],
              ["Location",null],
              ["Geo IP",sel.ip+(sel.ipVersion?" ("+sel.ipVersion+")":"")],
              ["Country",(sel.country&&sel.country!=="Unknown")?sel.flag+" "+sel.country:"Resolving..."],
              sel.city?["City",sel.city]:null,
              sel.region?["State/Region",sel.region]:null,
              ["",""],
              ["Device & Browser",null],
              ["OS",sel.os],
              ["Device",sel.device],
              ["Browser",sel.browser],
              sel.screenSize?["Resolution",sel.screenSize]:null,
              sel.language?["Language",sel.language]:null,
              ["",""],
              ["Pages & Traffic",null],
              ["Entry Page",sel.entryPage||sel.page],
              ["Exit Page",sel.exitPage||sel.page],
              ["Pages",String(sel.prevPages)],
              ["Source",sel.source+(sel.referrerDomain&&sel.referrerDomain!==sel.source?" ("+sel.referrerDomain+")":"")],
              sel.referrer?["Referrer",sel.referrerDomain||sel.referrer]:null,
              sel.utmSource?["UTM Source",sel.utmSource]:null,
            ].filter(Boolean).map(([l,v]:any,i:number)=>{
              if(!l&&!v)return <div key={i} style={{height:8}}/>;
              if(!v)return <div key={i} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:6,marginTop:6,paddingBottom:5,borderBottom:"1px solid "+C.b1+"55"}}>{l}</div>;
              return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.b1+"22"}}>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{l}</span>
                <span style={{fontSize:12,color:l==="Status"&&sel.isActive?C.g:C.t1,maxWidth:160,textAlign:"right",wordBreak:"break-all"}}>{v}</span>
              </div>;
            })}
            <div style={{marginTop:14}}>
              <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:8}}>Page Journey</div>
              {[...sel.pageHistory].reverse().slice(0,5).map((pg:string,i:number)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0"}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:i===0?C.g:C.t3,flexShrink:0}}/>
                  <span style={{fontSize:11.5,color:i===0?C.a:C.t3,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{pg}</span>
                  {i===0&&<VTag text="NOW" color={C.g}/>}
                </div>
              ))}
            </div>

            {events.length > 0 && (
              <div style={{marginTop:20}}>
                <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:10,paddingBottom:5,borderBottom:"1px solid "+C.b1+"55"}}>Events Captured</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {events.slice(-10).reverse().map((e:any, i:number) => (
                    <div key={i} style={{fontSize:11,color:C.t1,padding:8,background:C.s3,borderRadius:6,border:"1px solid "+C.b1+"55"}}>
                      <div style={{fontWeight:700,color:C.a,display:"flex",justifyContent:"space-between"}}>
                        <span>{e.event_name}</span>
                        <span style={{fontSize:9,color:C.t3}}>{new Date(e.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      {e.event_data && e.event_data !== '""' && (
                        <div style={{fontSize:10,color:C.t3,marginTop:3,wordBreak:"break-all"}}>
                          {e.event_data.startsWith('{') ? 'Data: ' + e.event_data : e.event_data}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>}
      </div>}

      {/* WORLD MAP TAB */}
      {tab==="map"&&<div style={{flex:1,position:"relative",overflow:"hidden",background:"#07090f"}}>
        <div style={{position:"absolute",top:16,left:16,zIndex:10,display:"flex",gap:8}}>
          <div style={{background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:10,padding:"10px 14px"}}>
            <div style={{fontSize:10,color:"#6b7fa0",fontFamily:FM,letterSpacing:"0.5px",marginBottom:6}}>VISITORS BY COUNTRY</div>
            {topCountries.map(([country,count]:any)=>{
              const vis=visitors.find((v:any)=>v.country===country);
              const pct=Math.round((count/visitors.length)*100);
              return <div key={country} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                <span style={{fontSize:14}}>{vis?.flag||"🌍"}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#e8eeff"}}>{country}</span><span style={{fontSize:10,color:"#4c82fb",fontFamily:FM,fontWeight:700}}>{count}</span></div>
                  <div style={{height:4,background:"#151b2e",borderRadius:2,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#4c82fb,#9b6dff)",borderRadius:2}}/></div>
                </div>
              </div>;
            })}
          </div>
          <div style={{background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:10,padding:"10px 14px",height:"fit-content"}}>
            <div style={{fontSize:10,color:"#6b7fa0",fontFamily:FM,letterSpacing:"0.5px",marginBottom:8}}>LIVE</div>
            <div style={{fontSize:36,fontWeight:800,fontFamily:FD,color:"#27c93f",lineHeight:1}}>{visitors.length}</div>
            <div style={{fontSize:10,color:"#6b7fa0",marginTop:4}}>{Object.keys(ctrMap).length} countries</div>
          </div>
        </div>
        {/* Proper SVG World Map — Mercator projection */}
        {(() => {
          const MAP_W = 1200;
          const MAP_H = 600;
          
          // Mercator Projection Helper
          const getMapCoords = (lat: number, lng: number) => {
            // Standard Mercator projection
            const x = ((lng + 180) * (MAP_W / 360));
            // Clamp lat to avoid Infinity at poles
            const latClamped = Math.max(-85, Math.min(85, lat));
            const latRad = (latClamped * Math.PI) / 180;
            const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
            const y = (MAP_H / 2) - (MAP_W * mercN / (2 * Math.PI));
            // Adjust for visual centering (standard map offset)
            return { x, y: y + 40 }; 
          };

          return (
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{width:"100%",height:"100%",display:"block"}} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="mapBg" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#0d1220"/>
                  <stop offset="100%" stopColor="#060810"/>
                </radialGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <rect width={MAP_W} height={MAP_H} fill="url(#mapBg)"/>
              
              {/* Grid Lines */}
              {[-60,-30,0,30,60].map(lat => {
                const { y } = getMapCoords(lat, 0);
                return <line key={"lat"+lat} x1="0" y1={y} x2={MAP_W} y2={y} stroke="#141e35" strokeWidth="0.6"/>;
              })}
              {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(lng => {
                const { x } = getMapCoords(0, lng);
                return <line key={"lng"+lng} x1={x} y1="0" x2={x} y2={MAP_H} stroke="#141e35" strokeWidth="0.6"/>;
              })}

              {/* Detailed World Map Paths (Mercator Optimized) */}
              <g fill="#141e35" stroke="#1e2d50" strokeWidth="0.5" style={{transition: 'all 0.3s'}}>
                {/* North America */}
                <path d="M196.4,122.9 L204.3,122.9 L213.1,130.4 L216.2,143.2 L223.7,144.1 L234.3,138.8 L238.2,140.1 L237.8,148.1 L244.4,155.6 L253.7,155.6 L259,161.7 L259.9,167.9 L253.7,174.5 L243.5,174.5 L233,182.9 L227.2,192.6 L224.6,206.3 L233,212 L242.3,213.8 L252,207.2 L260,208.5 L263.1,216.9 L269.7,220 L271.9,229.7 L276.7,235 L283.4,233.2 L289.1,224.4 L293.1,213.3 L298,206.3 L304.6,206.3 L312.1,213.8 L320.1,208.1 L320.5,199.2 L326.7,196.6 L332.9,201.9 L337.3,198.8 L334.6,189.9 L329.8,185.1 L332.9,179.3 L340,178.9 L345.3,174.9 L351,168.3 L359,163 L369.6,155.1 L377.1,155.1 L384.6,158.6 L388.5,165.7 L398.7,166.5 L405.3,161.3 L415,161.3 L423.8,154.6 L426.9,145.8 L422.5,135.2 L415,129 L410.6,117.1 L403.5,108.7 L394.7,100.3 L382.4,94.6 L370.4,89.7 L359.4,89.7 L349.3,95 L339.1,104.7 L328.5,110.5 L320.5,103.8 L309.5,101.2 L301.6,92.8 L293.2,85.3 L281.7,82.2 L268.5,80 L254,80 L239.9,80.4 L224.9,82.2 L211.7,85.3 L199.3,91 L189.6,98.5 L184.8,109.1 L187.9,118.8 Z" />
                {/* South America */}
                <path d="M312,285 L325,278 L345,275 L365,285 L385,305 L400,335 L415,375 L425,415 L425,465 L415,505 L395,535 L375,555 L355,565 L335,565 L315,555 L295,535 L285,505 L275,465 L275,415 L285,375 L295,335 L305,305 Z" />
                {/* Europe */}
                <path d="M510,120 L525,110 L550,105 L575,110 L595,125 L610,150 L615,180 L610,210 L595,235 L575,250 L550,255 L525,250 L505,235 L495,210 L490,180 L495,150 Z" />
                {/* Africa */}
                <path d="M545,260 L575,255 L605,265 L635,285 L655,325 L665,375 L655,425 L635,475 L605,505 L575,525 L545,535 L515,525 L485,505 L465,475 L455,425 L465,375 L485,325 L515,285 Z" />
                {/* Asia */}
                <path d="M660,110 L700,95 L750,90 L810,95 L860,110 L910,140 L940,180 L960,230 L960,290 L940,350 L910,400 L860,440 L800,465 L730,475 L670,465 L630,440 L610,400 L600,350 L610,290 L630,230 L650,180 Z" />
                {/* Australia */}
                <path d="M960,430 L985,415 L1020,410 L1050,420 L1070,445 L1075,480 L1065,515 L1040,540 L1005,550 L975,540 L950,515 L940,480 L945,445 Z" />
                
                {/* Detailed island groups */}
                <path d="M350,60 L370,55 L395,60 L410,75 L415,95 L405,115 L385,125 L360,120 L345,100 L340,80 Z" /> {/* Greenland */}
                <path d="M920,170 L935,165 L950,175 L955,195 L945,215 L925,220 L910,205 L910,185 Z" /> {/* Japan */}
                <path d="M830,285 L850,280 L870,290 L875,310 L865,330 L840,335 L825,320 L825,300 Z" /> {/* SE Asia Islands */}
              </g>

              {/* Connection lines */}
              {visitors.filter((v:any)=>v.chatStatus==="chatting").map((vis:any,i:number,arr:any[])=>{
                if(i===0||!vis.lat||!vis.lng)return null;
                const prev=arr[i-1];
                if(!prev.lat||!prev.lng)return null;
                const p1 = getMapCoords(prev.lat, prev.lng);
                const p2 = getMapCoords(vis.lat, vis.lng);
                return <line key={"conn"+i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#4c82fb" strokeWidth="0.5" opacity="0.15" strokeDasharray="4,6"/>;
              })}

              {/* Visitor dots */}
              {visitors.filter((v:any)=>v.lat&&v.lng).map((vis:any)=>{
                const { x, y } = getMapCoords(vis.lat, vis.lng);
                const isChatting = vis.chatStatus === "chatting";
                return (
                  <g key={vis.id} style={{cursor:"pointer"}} onClick={() => setMapSel(mapSel?.id === vis.id ? null : vis)}>
                    <circle cx={x} cy={y} r={isChatting ? 14 : 8} fill={vis.color} opacity="0.08"/>
                    <circle cx={x} cy={y} r={isChatting ? 10 : 6} fill={vis.color} opacity="0.15" style={{animation:"pulse 2.5s infinite"}}/>
                    <circle cx={x} cy={y} r={isChatting ? 5 : 3.5} fill={vis.color} opacity="0.95"/>
                    {isChatting && <circle cx={x} cy={y} r={8} fill="none" stroke={vis.color} strokeWidth="1.2" opacity="0.5" style={{animation:"pulse 1.5s infinite"}}/>}
                    {isChatting && <text x={x} y={y-12} textAnchor="middle" fill={vis.color} fontSize="8" fontWeight="700" fontFamily="monospace" opacity="0.8">{vis.name?.split(" ")[0] || "Chat"}</text>}
                  </g>
                );
              })}

              {/* Selected tooltip */}
              {mapSel && mapSel.lat && mapSel.lng && (() => {
                const { x: rawX, y: rawY } = getMapCoords(mapSel.lat, mapSel.lng);
                const x = Math.min(Math.max(rawX, 130), MAP_W - 130);
                const y = Math.min(Math.max(rawY, 90), MAP_H - 90);
                const w = 220, h = 82;
                return (
                  <g style={{animation:"fadeUp .15s ease"}}>
                    <rect x={x-w/2+2} y={y-h-6} width={w} height={h} rx="10" fill="#000" opacity="0.4"/>
                    <rect x={x-w/2} y={y-h-8} width={w} height={h} rx="10" fill="#111827" stroke={mapSel.color} strokeWidth="1.5"/>
                    <rect x={x-w/2} y={y-h-8} width={w} height="4" rx="10" fill={mapSel.color}/>
                    <text x={x} y={y-h+16} textAnchor="middle" fill="#f1f5f9" fontSize="13" fontWeight="700">{mapSel.flag} {mapSel.name || "Anonymous"}</text>
                    <text x={x} y={y-h+32} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">{mapSel.page}</text>
                    <text x={x} y={y-h+48} textAnchor="middle" fill="#64748b" fontSize="10">{mapSel.country} · {mapSel.device} · {fmtTime(mapSel.timeOnSite)}</text>
                    <text x={x} y={y-h+64} textAnchor="middle" fill={mapSel.chatStatus === "chatting" ? "#4c82fb" : "#22c55e"} fontSize="10" fontWeight="700">{mapSel.chatStatus === "chatting" ? "💬 In Conversation" : "👁 Browsing"}</text>
                  </g>
                );
              })()}
            </svg>
          );
        })()}

        {/* Legend */}
        <div style={{position:"absolute",bottom:16,right:16,display:"flex",gap:8}}>
          {[{c:"#22c55e",l:"Browsing",n:visitors.filter((v:any)=>v.chatStatus==="browsing").length},{c:"#f5a623",l:"Invited",n:invited},{c:"#9b6dff",l:"Chatting",n:chatting}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:8,padding:"5px 12px"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:x.c,boxShadow:`0 0 6px ${x.c}88`}}/>
              <span style={{fontSize:10,color:"#94a3b8",fontFamily:FM}}>{x.l}</span>
              <span style={{fontSize:10,color:x.c,fontWeight:700,fontFamily:FM}}>{x.n}</span>
            </div>
          ))}
        </div>
        <div style={{position:"absolute",bottom:16,left:16,background:"#111520ee",backdropFilter:"blur(8px)",border:"1px solid #1e2740",borderRadius:8,padding:"5px 12px",display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#f04f5a",animation:"pulse 1s infinite"}}/>
          <span style={{fontSize:10,color:"#94a3b8",fontFamily:FM}}>LIVE</span>
          <span style={{fontSize:10,color:"#64748b",fontFamily:FM}}>Refreshed {secAgo}s ago</span>
        </div>
      </div>}

      {/* ANALYTICS TAB */}
      {tab==="analytics"&&<div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[{l:"Online Now",v:visitors.length,c:C.g,delta:visitors.length+" active sessions"},{l:"Chatting",v:chatting,c:C.a,delta:chatting+" active chats"},{l:"Avg Session",v:fmtTime(Math.round(visitors.reduce((s:number,v:any)=>s+v.timeOnSite,0)/Math.max(visitors.length,1))),c:C.p,delta:"time on site"},{l:"Bounce Risk",v:visitors.filter((v:any)=>v.timeOnSite<30).length,c:C.r,delta:"< 30s on site"}].map((s:any)=>(
            <div key={s.l} style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"16px"}}>
              <div style={{fontSize:11,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",textTransform:"uppercase",marginBottom:8}}>{s.l}</div>
              <div style={{fontSize:26,fontWeight:800,fontFamily:FD,color:s.c,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:C.t3}}>{s.delta}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Top Pages Right Now</div>
            {topPages.length===0&&<div style={{color:C.t3,fontSize:12}}>No data yet</div>}
            {topPages.map(([page,cnt]:any)=>(
              <div key={page} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:11.5,color:C.a,fontFamily:FM,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{page}</span>
                <div style={{width:100,height:7,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:(cnt/visitors.length*100)+"%",height:"100%",background:C.a,borderRadius:3}}/></div>
                <span style={{fontSize:11,color:C.t2,fontFamily:FM,width:24,textAlign:"right"}}>{cnt}</span>
              </div>
            ))}
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Traffic Sources</div>
            {Object.entries(visitors.reduce((m:any,v:any)=>{m[v.source]=(m[v.source]||0)+1;return m;},{})).sort((a:any,b:any)=>b[1]-a[1]).slice(0,6).map(([src,cnt]:any)=>(
              <div key={src} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <span style={{fontSize:12,color:C.t2,flex:1}}>{src}</span>
                <div style={{width:80,height:7,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:(cnt/Math.max(visitors.length,1)*100)+"%",height:"100%",background:C.p,borderRadius:3}}/></div>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:20,textAlign:"right"}}>{cnt}</span>
              </div>
            ))}
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Devices</div>
            {["Desktop","Mobile","Tablet"].map((d:string)=>{const cnt=visitors.filter((v:any)=>v.device===d).length;return(
              <div key={d} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:16}}>{d==="Desktop"?"🖥️":d==="Mobile"?"📱":"📟"}</span>
                <span style={{fontSize:12,color:C.t2,flex:1}}>{d}</span>
                <div style={{width:80,height:7,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{width:(cnt/Math.max(visitors.length,1)*100)+"%",height:"100%",background:C.cy,borderRadius:3}}/></div>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:24,textAlign:"right"}}>{cnt}</span>
              </div>
            );})}
          </div>
          <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Session Duration</div>
            {[["< 30s","Bouncing",C.r],["30s–2m","New",C.y],["2–10m","Engaged",C.a],["> 10m","Loyal",C.g]].map(([range,label,c]:any)=>{
              const cnt=visitors.filter((v:any)=>range==="< 30s"?v.timeOnSite<30:range==="30s–2m"?v.timeOnSite>=30&&v.timeOnSite<120:range==="2–10m"?v.timeOnSite>=120&&v.timeOnSite<600:v.timeOnSite>=600).length;
              return <div key={range} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <div style={{minWidth:16,height:16,borderRadius:4,background:c+"33",border:"1px solid "+c+"55"}}/>
                <span style={{fontSize:12,color:C.t2,flex:1}}>{range} <span style={{color:C.t3}}>({label})</span></span>
                <span style={{fontSize:13,fontWeight:700,color:c,fontFamily:FM}}>{cnt}</span>
              </div>;
            })}
          </div>
        </div>
      </div>}

      {/* SITES TAB */}
      {tab==="sites"&&<div style={{flex:1,overflowY:"auto",padding:"22px 28px"}}>
        {/* Add / Edit Site Form */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,padding:"20px",marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>{siteForm?.id?"Edit Site":"Add New Site"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr auto",gap:12,alignItems:"end"}}>
            <Fld label="Site Name">
              <input value={siteForm?.name||""} onChange={e=>setSiteForm(f=>({...f||{name:"",url:""},name:e.target.value}))} placeholder="My Website" style={{width:"100%",background:C.bg,border:"1px solid "+C.b1,borderRadius:8,padding:"9px 12px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
            </Fld>
            <Fld label="Site URL">
              <input value={siteForm?.url||""} onChange={e=>setSiteForm(f=>({...f||{name:"",url:""},url:e.target.value}))} placeholder="https://example.com" style={{width:"100%",background:C.bg,border:"1px solid "+C.b1,borderRadius:8,padding:"9px 12px",fontSize:13,color:C.t1,fontFamily:FB,outline:"none"}}/>
            </Fld>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveSite} disabled={siteSaving} style={{padding:"9px 18px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:FM,background:C.a,color:"#fff",border:"none",cursor:siteSaving?"not-allowed":"pointer",opacity:siteSaving?0.6:1,whiteSpace:"nowrap"}}>
                {siteSaving?<Spin/>:siteForm?.id?"Update":"Add Site"}
              </button>
              {siteForm?.id&&<button onClick={()=>setSiteForm(null)} style={{padding:"9px 14px",borderRadius:8,fontSize:12,fontWeight:600,color:C.t3,background:"transparent",border:"1px solid "+C.b1,cursor:"pointer"}}>Cancel</button>}
            </div>
          </div>
        </div>

        {/* Sites List */}
        <div style={{background:C.s1,border:"1px solid "+C.b1,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 3fr 1fr 1fr 120px",padding:"10px 20px",borderBottom:"1px solid "+C.b1,background:C.s2}}>
            {["Site Name","URL","Status","Visitors","Actions"].map(h=>(
              <span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",textTransform:"uppercase"}}>{h}</span>
            ))}
          </div>

          {sitesLoading&&<div style={{padding:"40px",textAlign:"center"}}><Spin/></div>}
          {!sitesLoading&&sites.length===0&&<VEmpty icon="🌐" title="No sites added yet" desc="Add your website to start tracking visitors. You'll get the tracking snippet to embed on each site."/>}

          {sites.map((site:any)=>{
            const siteVisitors=visitors.filter(v=>{try{return new URL(v.page).hostname.replace(/^www\./,'')===new URL(site.url).hostname.replace(/^www\./,'');}catch{return false;}});
            return <div key={site.id} style={{display:"grid",gridTemplateColumns:"2fr 3fr 1fr 1fr 120px",padding:"12px 20px",borderBottom:"1px solid "+C.b1,alignItems:"center",animation:"fadeUp .2s ease"}}>
              {/* Name */}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:8,background:C.ad,border:"1px solid "+C.a+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🌐</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{site.name}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>Added {new Date(site.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              {/* URL */}
              <div style={{fontSize:12,color:C.a,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                <a href={site.url} target="_blank" rel="noreferrer" style={{color:C.a,textDecoration:"none"}}>{site.url}</a>
              </div>
              {/* Status */}
              <div>
                <button onClick={()=>toggleSiteStatus(site)} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
                  <VTag text={site.status==='active'?"Active":"Paused"} color={site.status==='active'?C.g:C.t3}/>
                </button>
              </div>
              {/* Visitors count */}
              <div style={{fontSize:14,fontWeight:700,color:siteVisitors.length>0?C.g:C.t3,fontFamily:FM}}>
                {siteVisitors.length} <span style={{fontSize:10,fontWeight:400,color:C.t3}}>live</span>
              </div>
              {/* Actions */}
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setSiteForm({id:site.id,name:site.name,url:site.url})} style={{padding:"5px 10px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:C.ad,color:C.a,border:"1px solid "+C.a+"44",cursor:"pointer"}}>Edit</button>
                <button onClick={()=>deleteSite(site.id)} disabled={siteDeleting===site.id} style={{padding:"5px 10px",borderRadius:6,fontSize:10,fontWeight:700,fontFamily:FM,background:"#ff444416",color:"#ff4444",border:"1px solid #ff444444",cursor:siteDeleting===site.id?"not-allowed":"pointer",opacity:siteDeleting===site.id?0.6:1}}>
                  {siteDeleting===site.id?"...":"Delete"}
                </button>
              </div>
            </div>;
          })}
        </div>

        {/* Snippet info card */}
        {sites.length>0&&<div style={{background:C.ad,border:"1px solid "+C.a+"33",borderRadius:12,padding:"16px 20px",marginTop:16}}>
          <div style={{fontSize:12,fontWeight:700,color:C.a,marginBottom:6}}>Tracking Setup</div>
          <div style={{fontSize:12,color:C.t3,lineHeight:1.7}}>
            For each site above, embed the tracking snippet in your website's <code style={{background:C.bg,padding:"1px 5px",borderRadius:4,fontSize:11}}>&lt;head&gt;</code> tag.
            <button onClick={loadSnippet} style={{marginLeft:8,padding:"3px 10px",borderRadius:5,fontSize:11,fontWeight:700,fontFamily:FM,background:C.pd,color:C.p,border:"1px solid "+C.p+"44",cursor:"pointer"}}>{"</>"} Get Snippet</button>
          </div>
        </div>}
      </div>}
    </div>

    {/* Invite Modal */}
    {showInvite&&<div onClick={()=>setShowInvite(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={(e:any)=>e.stopPropagation()} style={{background:C.s2,border:"1px solid "+C.b1,borderRadius:16,width:460,padding:"22px",animation:"fadeUp .2s ease",boxShadow:"0 20px 60px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Invite to Chat</span>
          <button onClick={()=>setShowInvite(null)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:22}}>×</button>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",padding:"11px 14px",background:C.s1,borderRadius:10,border:"1px solid "+showInvite.color+"33",marginBottom:16}}>
          <span style={{fontSize:20}}>{showInvite.flag}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{showInvite.name||"Anonymous Visitor"}</div>
            <div style={{fontSize:11,color:C.t3,fontFamily:FM}}>On {showInvite.page} · {fmtTime(showInvite.timeOnSite)} on site · {showInvite.country}</div>
          </div>
        </div>
        <Fld label="Invitation Message">
          <textarea value={invMsg} onChange={(e:any)=>setInvMsg(e.target.value)} rows={3} style={{width:"100%",background:C.bg,border:"1px solid "+C.b1,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none",lineHeight:1.6}}/>
        </Fld>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
          {["Hi! I noticed you're on our pricing page. Can I help?","Need help getting started? I'm here!","Looking for a specific feature? Let me help you find it.","Hi! Any questions about our plans?"].map((tmpl:string)=>(
            <button key={tmpl} onClick={()=>setInvMsg(tmpl)} style={{padding:"7px 10px",borderRadius:7,fontSize:11,color:C.t2,background:C.s1,border:"1px solid "+C.b1,cursor:"pointer",textAlign:"left",lineHeight:1.4,fontFamily:FB}}>{tmpl.slice(0,55)}...</button>
          ))}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={()=>setShowInvite(null)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,color:C.t2,background:"transparent",border:"1px solid "+C.b1,cursor:"pointer",fontFamily:FB}}>Cancel</button>
          <button onClick={()=>sendInvite(showInvite)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,color:"#fff",background:C.a,border:"none",cursor:"pointer",fontFamily:FB}}>Send Invitation</button>
          <button onClick={()=>startChat(showInvite)} style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,color:C.g,background:C.gd,border:"1px solid "+C.g+"44",cursor:"pointer",fontFamily:FB}}>Start Chat Now</button>
        </div>
      </div>
    </div>}

    {/* Get Snippet Modal */}
    {showSnippet&&<div onClick={()=>setShowSnippet(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={(e:any)=>e.stopPropagation()} style={{background:C.s2,border:"1px solid "+C.b1,borderRadius:16,width:560,padding:"24px",animation:"fadeUp .2s ease",boxShadow:"0 20px 60px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Website Tracking Snippet</span>
          <button onClick={()=>setShowSnippet(false)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:22}}>×</button>
        </div>
        <div style={{fontSize:12,color:C.t3,marginBottom:16}}>Paste this snippet inside the <code style={{background:C.bg,padding:"1px 5px",borderRadius:4,fontSize:11}}>&lt;head&gt;</code> tag of every page you want to track.</div>
        <div style={{position:"relative",background:C.bg,border:"1px solid "+C.b1,borderRadius:10,padding:"14px 16px",marginBottom:14}}>
          <pre style={{fontSize:12,color:C.a,fontFamily:"monospace",margin:0,overflowX:"auto",whiteSpace:"pre-wrap",wordBreak:"break-all",lineHeight:1.7}}>{snippet}</pre>
          <button onClick={copySnippet} style={{position:"absolute",top:10,right:10,padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,fontFamily:FM,background:copied?C.gd:C.ad,color:copied?C.g:C.a,border:"1px solid "+(copied?C.g:C.a)+"44",cursor:"pointer",transition:"all .2s"}}>
            {copied?"✓ Copied!":"Copy"}
          </button>
        </div>
        <div style={{background:C.ad,border:"1px solid "+C.a+"33",borderRadius:10,padding:"12px 14px"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.a,marginBottom:6}}>How it works</div>
          <ul style={{margin:0,paddingLeft:16,fontSize:11.5,color:C.t3,lineHeight:2}}>
            <li>Visitor sessions are tracked in real-time as people browse your site</li>
            <li>Location, device, browser, and referral source are detected automatically</li>
            <li>Sessions refresh every 30 seconds — inactive visitors drop off after 3 minutes</li>
            <li>Click <strong style={{color:C.t2}}>Invite</strong> or <strong style={{color:C.t2}}>Chat</strong> to engage any live visitor</li>
          </ul>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button onClick={()=>setShowSnippet(false)} style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:700,fontFamily:FM,background:C.a,color:"#fff",border:"none",cursor:"pointer"}}>Done</button>
        </div>
      </div>
    </div>}
    </div>
  </div>;
}
