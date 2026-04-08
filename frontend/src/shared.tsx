import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from "react";

export const API_BASE = "http://localhost:3001/api";
export const _token = { current: (typeof localStorage!=="undefined"?localStorage.getItem("sd_token"):null) as string|null };
export const _connected = { current: false };

export async function api(path, opts = {}) {
  const { method = "GET", body, raw } = opts;
  const headers = { "Content-Type": "application/json" };
  if (_token.current) headers["Authorization"] = "Bearer " + _token.current;
  try {
    const res = await fetch(API_BASE + path, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    _connected.current = true;
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    if (raw) return res;
    return await res.json();
  } catch (e) {
    if (e.message === "Failed to fetch" || e.name === "TypeError") {
      _connected.current = false;
    }
    throw e;
  }
}
// Convenience helpers
api.get = (p) => api(p);
api.post = (p, body) => api(p, { method: "POST", body });
api.patch = (p, body) => api(p, { method: "PATCH", body });
api.del = (p) => api(p, { method: "DELETE" });
api.isConnected = () => _connected.current;
api.setToken = (t) => { _token.current = t; if(t)localStorage.setItem("sd_token",t); else localStorage.removeItem("sd_token"); };
api.getToken = () => _token.current;

/* ═══ LAZY MOUNT — defers rendering until first activation, stays mounted after ═══ */
export function LazyMount({active,children}){
  const[was,set]=useState(active);
  useEffect(()=>{if(active&&!was)set(true);},[active,was]);
  if(!was)return null;
  return <div style={{display:active?"contents":"none"}}>{children}</div>;
}

export const THEMES={
  midnight:{name:"Midnight Dark",emoji:"🌙",desc:"Deep dark mode — the original",bg:"#07090f",s1:"#0d1017",s2:"#111520",s3:"#161c2a",b1:"#1c2238",b2:"#252d45",a:"#4c82fb",ag:"rgba(76,130,251,.15)",ad:"rgba(76,130,251,.08)",g:"#1fd07a",gd:"rgba(31,208,122,.1)",y:"#f5a623",yd:"rgba(245,166,35,.1)",r:"#f04f5a",rd:"rgba(240,79,90,.1)",p:"#9b6dff",pd:"rgba(155,109,255,.1)",cy:"#22d4e8",t1:"#e8eeff",t2:"#8496bc",t3:"#4c5878",t4:"#272f48"},
  light:{name:"Clean Light",emoji:"☀️",desc:"Crisp white, professional",bg:"#f4f6f9",s1:"#ffffff",s2:"#f0f2f5",s3:"#e8ebef",b1:"#d8dce3",b2:"#c8cdd6",a:"#2563eb",ag:"rgba(37,99,235,.12)",ad:"rgba(37,99,235,.06)",g:"#16a34a",gd:"rgba(22,163,74,.08)",y:"#d97706",yd:"rgba(217,119,6,.08)",r:"#dc2626",rd:"rgba(220,38,38,.06)",p:"#7c3aed",pd:"rgba(124,58,237,.06)",cy:"#0891b2",t1:"#111827",t2:"#4b5563",t3:"#9ca3af",t4:"#d1d5db"},
  emerald:{name:"Emerald Dark",emoji:"🌿",desc:"Black with emerald & gold accents",bg:"#050a06",s1:"#0a120b",s2:"#0e1810",s3:"#142016",b1:"#1a2e1e",b2:"#243828",a:"#10b981",ag:"rgba(16,185,129,.15)",ad:"rgba(16,185,129,.08)",g:"#34d399",gd:"rgba(52,211,153,.1)",y:"#fbbf24",yd:"rgba(251,191,36,.1)",r:"#f87171",rd:"rgba(248,113,113,.08)",p:"#a78bfa",pd:"rgba(167,139,250,.08)",cy:"#22d3ee",t1:"#ecfdf5",t2:"#86b89a",t3:"#4a7058",t4:"#263530"},
  sunset:{name:"Sunset Warm",emoji:"🌅",desc:"Coral, orange & pink on dark",bg:"#0f0708",s1:"#170c0e",s2:"#1c1012",s3:"#251518",b1:"#3a1f24",b2:"#4a2a30",a:"#f97316",ag:"rgba(249,115,22,.15)",ad:"rgba(249,115,22,.08)",g:"#4ade80",gd:"rgba(74,222,128,.08)",y:"#fbbf24",yd:"rgba(251,191,36,.08)",r:"#fb7185",rd:"rgba(251,113,133,.08)",p:"#f472b6",pd:"rgba(244,114,182,.08)",cy:"#38bdf8",t1:"#fff1f2",t2:"#c9878e",t3:"#7a4a52",t4:"#3f2428"},
  ocean:{name:"Ocean Depth",emoji:"🌊",desc:"Deep sea blues & teals",bg:"#040a10",s1:"#081018",s2:"#0c1620",s3:"#111e2c",b1:"#182d40",b2:"#203a52",a:"#38bdf8",ag:"rgba(56,189,248,.15)",ad:"rgba(56,189,248,.08)",g:"#2dd4bf",gd:"rgba(45,212,191,.1)",y:"#fbbf24",yd:"rgba(251,191,36,.08)",r:"#fb7185",rd:"rgba(251,113,133,.08)",p:"#818cf8",pd:"rgba(129,140,248,.08)",cy:"#22d3ee",t1:"#e0f2fe",t2:"#7eb8d8",t3:"#3d6d88",t4:"#1c3a52"},
  mono:{name:"Monochrome Pro",emoji:"⬛",desc:"Pure black & white + red accent",bg:"#000000",s1:"#0a0a0a",s2:"#111111",s3:"#1a1a1a",b1:"#2a2a2a",b2:"#333333",a:"#ffffff",ag:"rgba(255,255,255,.1)",ad:"rgba(255,255,255,.05)",g:"#4ade80",gd:"rgba(74,222,128,.08)",y:"#fbbf24",yd:"rgba(251,191,36,.08)",r:"#ef4444",rd:"rgba(239,68,68,.08)",p:"#e5e5e5",pd:"rgba(229,229,229,.06)",cy:"#a3a3a3",t1:"#ffffff",t2:"#a3a3a3",t3:"#525252",t4:"#262626"},
  purple:{name:"Deep Purple",emoji:"🟣",desc:"Rich violet gradients",bg:"#0a0612",s1:"#100b1a",s2:"#150f22",s3:"#1c152e",b1:"#2a1f44",b2:"#342a55",a:"#a855f7",ag:"rgba(168,85,247,.15)",ad:"rgba(168,85,247,.08)",g:"#22d3ee",gd:"rgba(34,211,238,.08)",y:"#fbbf24",yd:"rgba(251,191,36,.08)",r:"#fb7185",rd:"rgba(251,113,133,.08)",p:"#c084fc",pd:"rgba(192,132,252,.08)",cy:"#67e8f9",t1:"#f3e8ff",t2:"#a78bcc",t3:"#5e4880",t4:"#2e1f50"},
  slate:{name:"Slate Pro",emoji:"🩶",desc:"Corporate grey & blue",bg:"#0f1114",s1:"#151820",s2:"#1a1e28",s3:"#1f2432",b1:"#2c3344",b2:"#374050",a:"#6366f1",ag:"rgba(99,102,241,.15)",ad:"rgba(99,102,241,.08)",g:"#34d399",gd:"rgba(52,211,153,.08)",y:"#fbbf24",yd:"rgba(251,191,36,.08)",r:"#f87171",rd:"rgba(248,113,113,.08)",p:"#a5b4fc",pd:"rgba(165,180,252,.08)",cy:"#67e8f9",t1:"#e2e8f0",t2:"#94a3b8",t3:"#64748b",t4:"#334155"}
};
export let C={...THEMES.light};
export const applyThemeColors=key=>{const t=THEMES[key];if(!t)return;Object.keys(t).forEach(k=>{if(k!=="name"&&k!=="emoji"&&k!=="desc")C[k]=t[k];});};
export const FONTS={
  syne:{name:"Syne & DM Sans",vibe:"Default — modern geometric",display:"Syne",body:"DM Sans",mono:"JetBrains Mono",
    import:"family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600"},
  inter:{name:"Inter",vibe:"Clean Apple/Figma clarity",display:"Inter",body:"Inter",mono:"JetBrains Mono",
    import:"family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600"},
  outfit:{name:"Outfit & Nunito",vibe:"Friendly rounded SaaS",display:"Outfit",body:"Nunito",mono:"Fira Code",
    import:"family=Outfit:wght@500;600;700;800&family=Nunito:wght@400;500;600;700&family=Fira+Code:wght@400;500;600"},
  jakarta:{name:"Plus Jakarta Sans",vibe:"Corporate professional",display:"Plus Jakarta Sans",body:"Plus Jakarta Sans",mono:"IBM Plex Mono",
    import:"family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600"},
  space:{name:"Space Grotesk",vibe:"Tech dev-forward",display:"Space Grotesk",body:"Space Grotesk",mono:"Space Mono",
    import:"family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700"},
  manrope:{name:"Manrope",vibe:"Elegant enterprise",display:"Manrope",body:"Manrope",mono:"Source Code Pro",
    import:"family=Manrope:wght@400;500;600;700;800&family=Source+Code+Pro:wght@400;500;600"},
  raleway:{name:"Raleway & Lato",vibe:"Classic editorial",display:"Raleway",body:"Lato",mono:"JetBrains Mono",
    import:"family=Raleway:wght@500;600;700;800&family=Lato:wght@400;700&family=JetBrains+Mono:wght@400;500;600"},
  bricolage:{name:"Bricolage & DM Sans",vibe:"Bold expressive",display:"Bricolage Grotesque",body:"DM Sans",mono:"JetBrains Mono",
    import:"family=Bricolage+Grotesque:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600"}
};
export let FDN="'Outfit',sans-serif",FBN="'Nunito',sans-serif",FMN="'Fira Code',monospace";
export const FD="var(--fd)",FB="var(--fb)",FM="var(--fm)";
export const applyFontPair=key=>{const f=FONTS[key];if(!f)return;FDN=`'${f.display}',sans-serif`;FBN=`'${f.body}',sans-serif`;FMN=`'${f.mono}',monospace`;};
export const getFontImport=key=>(FONTS[key]||FONTS.outfit).import;
export const FONT_SIZES={xs:{label:"Extra Small",scale:0.82,desc:"Compact — fits more content"},sm:{label:"Small",scale:0.9,desc:"Slightly reduced"},md:{label:"Default",scale:1,desc:"Standard size"},lg:{label:"Large",scale:1.1,desc:"Easier to read"},xl:{label:"Extra Large",scale:1.2,desc:"Maximum readability"}};
export let FS=1;
export function setFS(v){FS=v;}
export const uid=()=>Math.random().toString(36).slice(2,8);
// ── Notification sound ──
export const playNotifSound=()=>{try{const a=new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZaQg3VjWFpne4uVmZKEcmBVWmB4jJeaj4J1");a.volume=0.3;a.play().catch(()=>{});}catch(e){}};
// ── CSV Export ──
export const exportCSV=(rows,filename)=>{const csv=rows.map(r=>r.map(c=>'"'+String(c||"").replace(/"/g,'""')+'"').join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);};
// ── i18n basic ──
export const LANGS={en:{name:"English",home:"Home",inbox:"Inbox",contacts:"Contacts",reports:"Reports",settings:"Settings",send:"Send",resolve:"Resolve",search:"Search",newConv:"New Conversation",welcome:"Welcome to SupportDesk"},hi:{name:"हिन्दी",home:"होम",inbox:"इनबॉक्स",contacts:"संपर्क",reports:"रिपोर्ट",settings:"सेटिंग्स",send:"भेजें",resolve:"हल करें",search:"खोजें",newConv:"नई बातचीत",welcome:"SupportDesk में आपका स्वागत है"},es:{name:"Español",home:"Inicio",inbox:"Bandeja",contacts:"Contactos",reports:"Informes",settings:"Ajustes",send:"Enviar",resolve:"Resolver",search:"Buscar",newConv:"Nueva conversación",welcome:"Bienvenido a SupportDesk"}};
export let LANG="en";export const t=k=>LANGS[LANG]?.[k]||LANGS.en[k]||k;
export function setLANG(v){LANG=v;}
// ── Audit Log ──
export const AUDIT_LOG=[
  {id:"au1",user:"Priya Sharma",action:"Changed SLA first reply target",detail:"5 min → 3 min on Website Chat inbox",time:"2m ago",type:"settings"},
  {id:"au2",user:"Dev Kumar",action:"Resolved conversation #cv5",detail:"Takeshi Yama · WhatsApp",time:"18m ago",type:"conversation"},
  {id:"au3",user:"Priya Sharma",action:"Connected Slack integration",detail:"Workspace: acme-team.slack.com",time:"1h ago",type:"integration"},
  {id:"au4",user:"Meena Rao",action:"Created label",detail:"Label: escalated (red)",time:"2h ago",type:"settings"},
  {id:"au5",user:"System",action:"AI auto-replied to Sarah Chen",detail:"Conv #cv2 · Email channel",time:"3h ago",type:"ai"},
  {id:"au6",user:"Aryan Shah",action:"Invited agent",detail:"ravi@acme.com as Agent role",time:"4h ago",type:"agent"},
  {id:"au7",user:"Priya Sharma",action:"Updated billing plan",detail:"Upgraded from Starter to Pro",time:"1d ago",type:"billing"},
  {id:"au8",user:"Dev Kumar",action:"Deleted canned response",detail:"/old_greeting removed",time:"1d ago",type:"settings"},
  {id:"au9",user:"System",action:"Webhook delivery failed",detail:"https://api.acme.com/webhooks — 502",time:"2d ago",type:"system"},
  {id:"au10",user:"Meena Rao",action:"Transferred conversation",detail:"#cv3 → Sales Team",time:"2d ago",type:"conversation"}
];
// ── Custom Fields ──
export const CUSTOM_FIELDS_INIT=[
  // Contact fields
  {id:"cf1",name:"License Key",type:"text",entity:"contact",required:false,desc:"Product license key",group:"Account",validation:"",placeholder:"XXXX-XXXX-XXXX"},
  {id:"cf2",name:"Account Manager",type:"agent_select",entity:"contact",required:false,desc:"Assigned account manager",group:"Account"},
  {id:"cf3",name:"Renewal Date",type:"date",entity:"contact",required:false,desc:"Contract renewal date",group:"Account"},
  {id:"cf4",name:"MRR",type:"currency",entity:"contact",required:false,desc:"Monthly recurring revenue",group:"Billing",default:"0"},
  {id:"cf5",name:"NPS Score",type:"rating",entity:"contact",required:false,desc:"Net Promoter Score (0-10)",group:"Satisfaction"},
  {id:"cf6",name:"LinkedIn",type:"url",entity:"contact",required:false,desc:"LinkedIn profile URL",group:"Social",placeholder:"https://linkedin.com/in/..."},
  // Conversation fields
  {id:"cf7",name:"Product Area",type:"select",entity:"conversation",required:false,desc:"Which product area",group:"Classification",options:["Billing","API","Dashboard","Mobile","Integrations","Onboarding"]},
  {id:"cf8",name:"Bug ID",type:"text",entity:"conversation",required:false,desc:"Jira/Linear bug ID",group:"Engineering",placeholder:"BUG-1234",validation:"^[A-Z]+-\\d+$"},
  {id:"cf9",name:"Severity",type:"select",entity:"conversation",required:true,desc:"Issue severity level",group:"Classification",options:["P0 - Critical","P1 - High","P2 - Medium","P3 - Low"]},
  {id:"cf10",name:"Root Cause",type:"multi_select",entity:"conversation",required:false,desc:"Root cause categories",group:"Classification",options:["Bug","UX Confusion","Missing Feature","Docs Gap","Infra Issue","User Error"]},
  {id:"cf11",name:"Revenue Impact",type:"currency",entity:"conversation",required:false,desc:"Estimated revenue at risk",group:"Business"},
  // Deal fields
  {id:"cf12",name:"Contract Length",type:"select",entity:"deal",required:false,desc:"Contract term",group:"Terms",options:["Monthly","Quarterly","Annual","2-Year","3-Year"]},
  {id:"cf13",name:"Discount %",type:"percentage",entity:"deal",required:false,desc:"Discount offered",group:"Terms"},
  {id:"cf14",name:"Competitor",type:"multi_select",entity:"deal",required:false,desc:"Competing products",group:"Intelligence",options:["Zendesk","Freshdesk","Intercom","HubSpot","Salesforce","Crisp","Tawk.to","None"]},
  {id:"cf15",name:"Decision Date",type:"date",entity:"deal",required:false,desc:"Expected decision date",group:"Timeline"},
  {id:"cf16",name:"Champion",type:"text",entity:"deal",required:false,desc:"Internal champion name",group:"Contacts"},
  // Lead fields
  {id:"cf17",name:"Lead Source Detail",type:"text",entity:"lead",required:false,desc:"Specific campaign/referrer",group:"Attribution"},
  {id:"cf18",name:"Intent Score",type:"number",entity:"lead",required:false,desc:"AI-calculated intent (0-100)",group:"Scoring"},
  {id:"cf19",name:"First Touch",type:"select",entity:"lead",required:false,desc:"First interaction channel",group:"Attribution",options:["Website","Google Ad","LinkedIn","Referral","Webinar","Cold Email","Event","Organic"]},
  // Company fields
  {id:"cf20",name:"Annual Revenue",type:"currency",entity:"company",required:false,desc:"Company annual revenue",group:"Firmographic"},
  {id:"cf21",name:"Tech Stack",type:"multi_select",entity:"company",required:false,desc:"Current tools in use",group:"Intelligence",options:["Slack","Jira","Salesforce","HubSpot","Stripe","Shopify","AWS","GCP","Azure"]},
  {id:"cf22",name:"Logo",type:"file",entity:"company",required:false,desc:"Company logo upload",group:"Branding"},
  // Task fields
  {id:"cf23",name:"Estimated Hours",type:"number",entity:"task",required:false,desc:"Time estimate",group:"Planning"},
  {id:"cf24",name:"Billable",type:"checkbox",entity:"task",required:false,desc:"Is this billable work?",group:"Billing"},
  // Meeting fields
  {id:"cf25",name:"Meeting Link",type:"url",entity:"meeting",required:false,desc:"Zoom/Meet/Teams link",group:"Logistics",placeholder:"https://zoom.us/j/..."},
  {id:"cf26",name:"Recording URL",type:"url",entity:"meeting",required:false,desc:"Post-meeting recording",group:"Follow-up"},
  // Booking fields
  {id:"cf27",name:"Referral Source",type:"text",entity:"booking",required:false,desc:"How did they find us?",group:"Attribution"},
  {id:"cf28",name:"Special Requirements",type:"textarea",entity:"booking",required:false,desc:"Any accessibility or special needs",group:"Logistics"}
];
// ── Email Signatures ──
export const EMAIL_SIGS_INIT=[
  {id:"es1",agentId:"a1",name:"Priya — Default",isDefault:true,body:"Best regards,\n**Priya Sharma**\nHead of Support · SupportDesk\npriya@supportdesk.app | +91 98765 43210",socials:{linkedin:"priya-sharma",twitter:"priyasharma",website:"supportdesk.app"},logo:true,active:true},
  {id:"es2",agentId:"a2",name:"Dev — Formal",isDefault:false,body:"Thanks,\n**Dev Kumar**\nSupport Engineer · SupportDesk\ndev@supportdesk.app",socials:{linkedin:"devkumar"},logo:false,active:true},
  {id:"es3",agentId:"all",name:"Team — Minimal",isDefault:false,body:"—\n**{{name}}** · {{title}}\n{{company}} | {{email}}",socials:{website:"supportdesk.app"},logo:true,active:true}
];
// ── Brands ──
export const BRANDS_INIT=[
  {id:"br1",name:"SupportDesk",domain:"supportdesk.app",color:C.a,logo:"S",active:true},
  {id:"br2",name:"AcmeCorp Help",domain:"help.acmecorp.com",color:"#ff6b35",logo:"A",active:false}
];
export const now=()=>new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
export function SDLogo({s=32}){return <svg width={s} height={s} viewBox="0 0 40 40" fill="none"><defs><linearGradient id="sdg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#4c82fb"/><stop offset="1" stopColor="#9b6dff"/></linearGradient></defs><rect width="40" height="40" rx="10" fill="url(#sdg)"/><path d="M12 14.5C12 12.567 13.567 11 15.5 11H24.5C26.433 11 28 12.567 28 14.5V20.5C28 22.433 26.433 24 24.5 24H18L14 28V24H15.5C13.567 24 12 22.433 12 20.5V14.5Z" fill="rgba(255,255,255,.2)"/><path d="M15 16.5C15 15.119 16.119 14 17.5 14H25.5C26.881 14 28 15.119 28 16.5V22.5C28 23.881 26.881 25 25.5 25H21L17 29V25H17.5C16.119 25 15 23.881 15 22.5V16.5Z" fill="#fff"/><circle cx="19.5" cy="19.5" r="1.3" fill="#4c82fb"/><circle cx="23.5" cy="19.5" r="1.3" fill="#9b6dff"/></svg>;}
export function ChIcon({t,s=14,col}){
  const c=col||chC(t);const st={width:s,height:s,display:"inline-block",verticalAlign:"middle",flexShrink:0};
  const svgs={
    whatsapp:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.36 2 11.65c0 1.7.45 3.3 1.24 4.72L2 22l5.8-1.52A9.87 9.87 0 0012 21.3c5.52 0 10-4.36 10-9.65S17.52 2 12 2z" fill={c}/><path d="M16.5 14.38c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.02-.36.1-.48.12-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.46-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.24 1.02.4 1.38.5.58.18 1.1.16 1.52.1.46-.08 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" fill="#fff"/></svg>,
    telegram:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={c}/><path d="M6.5 11.5l3.5 1.5 1.5 4 2-2.5 3.5 2.5 2.5-10.5-13 5z" fill="#fff"/><path d="M10 13l.5 3 1.5-2" fill={c} opacity=".3"/></svg>,
    facebook:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={c}/><path d="M13.5 7.5h1.5V5h-1.5c-1.66 0-3 1.34-3 3v1.5H9V12h1.5v7h3v-7h1.5L15.5 9.5H13.5V8c0-.28.22-.5.5-.5h-.5z" fill="#fff"/></svg>,
    instagram:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" fill={c}/><circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="1.8" fill="none"/><circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/></svg>,
    x:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill={c==="##e7e9ea"||c==="#e7e9ea"?"#000":c}/><path d="M6.5 6.5l4.3 5.7L6.5 17.5h1.2l3.5-4.3 2.8 4.3h3.5l-4.5-6.2 4-4.8h-1.2l-3.3 4-2.5-4H6.5z" fill="#fff"/></svg>,
    viber:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" fill={c}/><path d="M12 6c-3.3 0-6 2.2-6 5 0 1.5.7 2.8 1.8 3.8L7 17l2.5-1c.8.3 1.6.5 2.5.5 3.3 0 6-2.2 6-5s-2.7-5-6-5z" fill="#fff"/><path d="M13.5 8c2 .3 3 1.7 3.2 3.5" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" fill="none"/></svg>,
    apple:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#333"/><path d="M15.5 12.5c0-2-1.6-2.8-1.7-2.8.9-1.4.5-2.3.4-2.4-.9-.1-2 .5-2.2.7-.5-.1-.9-.1-1.4 0-.6-.4-1.6-.8-2.2-.7 0 .1-.6 1 .3 2.4-.1 0-1.7.8-1.7 2.8 0 3 2.2 4.5 4.3 4.5h.1c2-.1 4.1-1.6 4.1-4.5z" fill="#fff"/></svg>,
    line:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill={c}/><path d="M12 6C8.13 6 5 8.58 5 11.73c0 2.37 1.82 4.36 4.4 5.14l-.3 1.63c0 .1.08.18.18.14l1.98-1.18c.24.02.48.04.74.04 3.87 0 7-2.58 7-5.77C19 8.58 15.87 6 12 6z" fill="#fff"/></svg>,
    tiktok:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" fill="#000"/><path d="M16.5 8.5c-.8-.5-1.3-1.3-1.5-2.2h-2v9.2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.2 0 .3 0 .5.1V11c-.2 0-.3-.1-.5-.1-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4V11c.8.6 1.8 1 2.8 1V9.5c-.3 0-.6 0-.8-.1-.2-.3-.4-.6-.5-.9z" fill="#fff"/></svg>,
    email:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" fill={c}/><path d="M3 7l9 6 9-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>,
    sms:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H7l-4 3V6c0-1.1.9-2 2-2z" fill={c}/><circle cx="8.5" cy="11" r="1" fill="#fff"/><circle cx="12" cy="11" r="1" fill="#fff"/><circle cx="15.5" cy="11" r="1" fill="#fff"/></svg>,
    live:<svg style={st} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="5" stroke={c} strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="2" fill={c}/></svg>,
    voice:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill={c}/></svg>,
    video:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="14" height="12" rx="2" fill={c}/><path d="M16 10l5-3v10l-5-3V10z" fill={c}/></svg>,
    api:<svg style={st} viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill={c}/><path d="M8 8l-3 4 3 4M16 8l3 4-3 4M13 7l-2 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
    push:<svg style={st} viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9v5l-2 2v1h18v-1l-2-2V9c0-3.87-3.13-7-7-7z" fill={c}/><path d="M10 20c0 1.1.9 2 2 2s2-.9 2-2h-4z" fill={c}/></svg>
  };
  return svgs[t]||<svg style={st} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill={c}/></svg>;
}
export const chI=t=><ChIcon t={t} s={14}/>;
export const chC=t=>({live:C.g,email:C.a,whatsapp:"#25d366",telegram:"#0088cc",facebook:"#1877f2",instagram:"#e1306c",viber:"#7360f2",apple:"#555555",line:"#06c755",tiktok:"#ff0050",x:"#e7e9ea",sms:"#f5a623",voice:"#1fd07a",video:"#9b6dff",api:"#22d4e8"}[t]||C.t2);
export const prC=p=>({urgent:C.r,high:C.y}[p]||C.t3);

export function NavIcon({id,s=20,col}){
  const c=col||"currentColor";const st={width:s,height:s,display:"block"};
  const icons={
    home:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V19a1 1 0 001 1h3.5v-5a1 1 0 011-1h3a1 1 0 011 1v5H18a1 1 0 001-1V9.5"/></svg>,
    inbox:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 14h4.5a1 1 0 011 1v0a2.5 2.5 0 005 0v0a1 1 0 011-1H21"/></svg>,
    monitor:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>,
    contacts:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>,
    crm:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    reports:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="17" y="9" width="4" height="11" rx="1"/></svg>,
    marketing:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 4v12a2 2 0 01-2 2H4"/><path d="M19 4l-7 4-7-2v12l7 2 7-4V4z"/><circle cx="12" cy="12" r="2"/></svg>,
    integrations:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="8" height="8" rx="2"/><rect x="14" y="10" width="8" height="8" rx="2"/><path d="M10 10h4M14 14h-4"/></svg>,
    knowledgebase:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"/><path d="M12 4v16"/><path d="M7 8h2M7 11h2M15 8h2M15 11h2"/></svg>,
    widget:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><circle cx="17" cy="17" r="4"/></svg>,
    settings:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>,
    billing:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4M14 15h4"/></svg>,
    bell:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    labels:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h10l5 6-5 6H3V6z"/><circle cx="8" cy="12" r="1.5" fill={c}/></svg>,
    canned:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    automations:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4"/><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
    aibot:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="11" r="1.5" fill={c}/><circle cx="15" cy="11" r="1.5" fill={c}/><path d="M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5"/><path d="M12 1v3"/></svg>,
    theme:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18V3z" fill={c} opacity="0.2"/><circle cx="12" cy="12" r="3"/></svg>,
    fonts:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20l6-16 6 16"/><path d="M8 14h8"/></svg>,
    send:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
    resolve:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
    newconv:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
    download:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>,
    keyboard:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h8"/></svg>,
    search:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>,
    export:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>,
    merge:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 21V8a2 2 0 00-2-2H8a2 2 0 00-2 2v13"/><path d="M12 3v5"/><path d="M6 13l6-5 6 5"/></svg>,
    spam:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>,
    block:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/></svg>,
    teamchat:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 01-9 9H3V12a9 9 0 0118 0z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>,
    calendar:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M7 13h2v2H7zM11 13h2v2h-2zM15 13h2v2h-2zM7 17h2v1H7zM11 17h2v1h-2z"/></svg>,
    bookings:<svg style={st} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><circle cx="12" cy="15" r="3"/><path d="M12 14v1.5l1 .5"/></svg>
  };
  return icons[id]||<svg style={st} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.8" fill="none"/></svg>;
}

// -- Data defaults (loaded from API) --
export const A0=[];export const L0=[];export const IB0=[];export const TM0=[];export const CR0=[];export const AU0=[];export const CT0=[];export const CV0=[];export const MG0={};export const AI_S={};export const BOT=[];export const REPLY_POOL={};

// ─── ATOMS ───────────────────────────────────────────────────────────────
export function Av({i,c,s=34,dot}){
  return <div style={{position:"relative",flexShrink:0}}>
    <div style={{width:s,height:s,borderRadius:s*.28,background:c+"28",color:c,border:`1.5px solid ${c}44`,
      display:"flex",alignItems:"center",justifyContent:"center",fontSize:s*.32,fontWeight:700,fontFamily:FM}}>{i}</div>
    {dot!==undefined&&<span style={{position:"absolute",bottom:-1,right:-1,width:s*.28,height:s*.28,
      borderRadius:"50%",background:dot?C.g:C.t3,border:`2px solid ${C.s1}`}}/>}
  </div>;
}
export function Tag({text,color,onRemove}){
  return <span style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:700,fontFamily:FM,letterSpacing:"0.4px",
    textTransform:"uppercase",background:color+"22",color,border:`1px solid ${color}44`,
    display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
    {text}{onRemove&&<span onClick={e=>{e.stopPropagation();onRemove();}} style={{cursor:"pointer",fontSize:11}}>×</span>}
  </span>;
}
export function Btn({ch,onClick,v="ghost",full,sm,disabled}){
  const vs={ghost:{bg:"transparent",fg:C.t2,br:`1px solid ${C.b1}`},primary:{bg:C.a,fg:"#fff",br:"none"},
    success:{bg:C.gd,fg:C.g,br:`1px solid ${C.g}44`},danger:{bg:C.rd,fg:C.r,br:`1px solid ${C.r}44`},
    ai:{bg:C.pd,fg:C.p,br:`1px solid ${C.p}44`},warn:{bg:C.yd,fg:C.y,br:`1px solid ${C.y}44`}};
  const s=vs[v]||vs.ghost;
  return <button className="btn-press" onClick={onClick} disabled={disabled} style={{padding:sm?"4px 10px":"7px 14px",
    fontSize:sm?11:12.5,fontWeight:600,fontFamily:FB,borderRadius:8,
    cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:6,
    transition:"all .15s",width:full?"100%":"auto",justifyContent:"center",opacity:disabled?0.5:1,
    background:s.bg,color:s.fg,border:s.br}}>{ch}</button>;
}
export function Inp({val,set,ph,type="text",sx={}}){
  return <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
    style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",
      fontSize:13,color:C.t1,fontFamily:FB,width:"100%",outline:"none",transition:"border-color .15s,box-shadow .15s",...sx}}/>;
}
export function Sel({val,set,opts,sx={}}){
  return <select value={val} onChange={e=>set(e.target.value)}
    style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",
      fontSize:12.5,color:C.t1,fontFamily:FB,cursor:"pointer",outline:"none",transition:"border-color .15s",...sx}}>
    {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
  </select>;
}
export function CompanyPicker({val,set,comps,setComps}){
  const [adding,setAdding]=useState(false);const [newName,setNewName]=useState("");
  const create=()=>{if(!newName.trim())return;const name=newName.trim();if(comps.some(c=>c.name.toLowerCase()===name.toLowerCase())){set(comps.find(c=>c.name.toLowerCase()===name.toLowerCase()).name);setAdding(false);setNewName("");return;}setComps(p=>[{id:"co"+uid(),name,domain:"",industry:"Other",size:"1-10",phone:"",email:"",website:"",address:"",country:"India",color:[C.a,C.g,C.p,C.y,C.cy,"#ff6b35"][p.length%6],notes:"",tags:[],created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"})},...p]);set(name);setAdding(false);setNewName("");showT("Company '"+name+"' created","success");};
  if(adding)return <div style={{display:"flex",gap:4}}>
    <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")create();if(e.key==="Escape"){setAdding(false);setNewName("");}}} autoFocus placeholder="New company name…" style={{flex:1,background:C.s2,border:`1px solid ${C.a}`,borderRadius:8,padding:"8px 12px",fontSize:12.5,color:C.t1,fontFamily:FB,outline:"none"}}/>
    <button onClick={create} style={{padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,background:C.a,color:"#fff",border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
    <button onClick={()=>{setAdding(false);setNewName("");}} style={{padding:"6px 8px",borderRadius:8,fontSize:11,background:C.s2,color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>✕</button>
  </div>;
  return <div style={{display:"flex",gap:4}}>
    <select value={val} onChange={e=>{if(e.target.value==="__NEW__")setAdding(true);else set(e.target.value);}} style={{flex:1,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12.5,color:C.t1,fontFamily:FB,cursor:"pointer",outline:"none"}}>
      <option value="">Select company…</option>
      {comps.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
      <option value="__NEW__">＋ Create new company…</option>
    </select>
  </div>;
}
export function Toggle({val,set}){
  return <div onClick={()=>set(!val)} style={{width:40,height:22,borderRadius:11,background:val?C.a:C.b2,
    position:"relative",cursor:"pointer",transition:"background .25s",flexShrink:0,boxShadow:val?`0 0 8px ${C.a}44`:"none"}}>
    <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",
      top:2,left:val?20:2,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
  </div>;
}
export function Mdl({title,onClose,children,w=480}){
  return <div onClick={e=>e.target===e.currentTarget&&onClose()} role="dialog" aria-modal="true" aria-label={title}
    style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:900,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,animation:"fadeIn .15s ease"}}>
    <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:16,width:w,
      maxWidth:"95vw",maxHeight:"85vh",overflow:"auto",animation:"fadeUp .2s ease",boxShadow:"0 30px 80px rgba(0,0,0,.5)"}}
      onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"16px 20px",borderBottom:`1px solid ${C.b1}`}}>
        <span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>{title}</span>
        <button onClick={onClose} className="btn-press" style={{background:"none",border:"none",color:C.t3,fontSize:22,cursor:"pointer",transition:"color .15s"}}>×</button>
      </div><div style={{padding:20}}>{children}</div></div></div>;
}
// ── Animated counter ──
export function CountUp({value,color,size=24}){
  const [show,setShow]=useState(false);
  useEffect(()=>{setShow(false);const t=setTimeout(()=>setShow(true),50);return()=>clearTimeout(t);},[value]);
  return <span style={{fontSize:size,fontWeight:800,fontFamily:FD,color,display:"inline-block",animation:show?"countUp .4s ease":"none"}}>{value}</span>;
}
// ── Confetti burst ──
export function Confetti(){
  const cols=[C.a,C.g,C.p,C.y,C.r,C.cy,"#ff6b35","#e91e63"];
  return <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999}}>
    {Array.from({length:30}).map((_,i)=><div key={i} style={{position:"absolute",left:40+Math.random()*20+"%",top:-10,width:6+Math.random()*6,height:6+Math.random()*6,borderRadius:Math.random()>.5?"50%":"2px",background:cols[i%cols.length],animation:`confetti ${1+Math.random()*1.5}s ease-out ${Math.random()*.5}s forwards`}}/>)}
  </div>;
}
// ── Deterministic color from string ──
export const nameColor=name=>{let h=0;for(let i=0;i<(name||"").length;i++)h=name.charCodeAt(i)+((h<<5)-h);const hue=Math.abs(h)%360;return `hsl(${hue},65%,55%)`;};
// ── Conversation preview tooltip ──
export function ConvPreview({cv,msgs,contacts}){
  const ct=contacts.find(c=>c.id===cv.cid);
  const lastMsg=(msgs[cv.id]||[]).filter(m=>m.role!=="sys").slice(-1)[0];
  return <div style={{position:"absolute",left:"100%",top:0,marginLeft:8,width:280,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:12,padding:"12px 14px",boxShadow:"0 12px 40px rgba(0,0,0,.6)",zIndex:80,animation:"fadeUp .15s ease",pointerEvents:"none"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
      <Av i={ct?.av||"?"} c={cv.color} s={24}/><span style={{fontSize:12,fontWeight:600}}>{ct?.name}</span>
      <div style={{flex:1}}/><Tag text={cv.status} color={cv.status==="resolved"?C.g:cv.status==="snoozed"?C.y:C.a}/>
    </div>
    <div style={{fontSize:11,fontWeight:600,color:C.t2,marginBottom:4}}>{cv.subject}</div>
    {lastMsg&&<div style={{fontSize:10.5,color:C.t3,lineHeight:1.4,padding:"6px 8px",background:C.s1,borderRadius:8,border:`1px solid ${C.b1}`}}>
      <span style={{fontSize:9,color:lastMsg.role==="agent"?C.a:C.cy,fontFamily:FM,fontWeight:700}}>{lastMsg.role==="agent"?"You":"Customer"}: </span>
      {lastMsg.text?.slice(0,100)}{lastMsg.text?.length>100?"…":""}
    </div>}
    <div style={{display:"flex",gap:6,marginTop:6}}>
      {cv.labels.slice(0,3).map(l=><Tag key={l} text={l} color={C.t3}/>)}
    </div>
  </div>;
}
export function Fld({label,children}){
  return <div style={{marginBottom:14}}>
    <div style={{fontSize:10.5,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",
      textTransform:"uppercase",marginBottom:6}}>{label}</div>
    {children}
  </div>;
}
export function Spin(){return <div style={{width:15,height:15,border:`2px solid ${C.p}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>;} 

// ═══ PRODUCTION UI — Skeletons, Empty States, Error Boundaries ═══
export function Skel({w="100%",h=14,r=6,mb=0}){return <div className="skel" style={{width:w,height:h,borderRadius:r,marginBottom:mb,flexShrink:0}}/>;}
export function SkelRow({n=5,gap=10}){return <div style={{display:"flex",flexDirection:"column",gap}}>{Array.from({length:n}).map((_,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}><Skel w={34} h={34} r={17}/><div style={{flex:1}}><Skel w="60%" h={12} mb={6}/><Skel w="40%" h={10}/></div><Skel w={50} h={10}/></div>)}</div>;}
export function SkelCards({n=4}){return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>{Array.from({length:n}).map((_,i)=><div key={i} style={{padding:16,borderRadius:12,border:`1px solid ${C.b1}`,background:C.s1}}><Skel w="40%" h={11} mb={10}/><Skel w="70%" h={22} mb={8}/><Skel w="55%" h={10}/></div>)}</div>;}
export function SkelMsgs({n=4}){return <div style={{display:"flex",flexDirection:"column",gap:14,padding:"16px 20px"}}>{Array.from({length:n}).map((_,i)=><div key={i} style={{display:"flex",justifyContent:i%2?"flex-end":"flex-start"}}><div style={{maxWidth:"60%"}}><Skel w={80} h={10} mb={6}/><Skel w={i%2?200:260} h={50} r={12}/></div></div>)}</div>;}
export function SkelTable({rows=5,cols=4}){return <div style={{border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden"}}><div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:0,padding:"10px 14px",background:C.s2,borderBottom:`1px solid ${C.b1}`}}>{Array.from({length:cols}).map((_,i)=><Skel key={i} w="70%" h={10}/>)}</div>{Array.from({length:rows}).map((_,r)=><div key={r} style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:0,padding:"12px 14px",borderBottom:`1px solid ${C.b1}22`}}>{Array.from({length:cols}).map((_,i)=><Skel key={i} w={`${50+Math.random()*30}%`} h={12}/>)}</div>)}</div>;}
export function EmptyState({icon="📭",title="Nothing here yet",desc,action,onAction}){return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:14,opacity:.7}}>{icon}</div><div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:6,fontFamily:FD}}>{title}</div>{desc&&<div style={{fontSize:12.5,color:C.t3,maxWidth:320,lineHeight:1.6,marginBottom:16}}>{desc}</div>}{action&&<button onClick={onAction} style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontFamily:FM}}>{action}</button>}</div>;}
export function ErrorBanner({msg="Something went wrong",onRetry,compact}){return <div style={{display:"flex",alignItems:"center",gap:10,padding:compact?"8px 12px":"14px 18px",background:C.rd,border:`1px solid ${C.r}33`,borderRadius:10,marginBottom:compact?8:16}}><span style={{fontSize:compact?14:18}}>⚠️</span><div style={{flex:1,fontSize:compact?11:12.5,color:C.r,fontWeight:500}}>{msg}</div>{onRetry&&<button onClick={onRetry} style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,background:C.r+"18",color:C.r,border:`1px solid ${C.r}44`,cursor:"pointer",fontFamily:FM,whiteSpace:"nowrap"}}>Retry</button>}</div>;}
export function ConnBadge({ok}){return <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:6,fontSize:9.5,fontWeight:600,fontFamily:FM,color:ok?C.g:C.y,background:ok?C.gd:C.yd,border:`1px solid ${ok?C.g:C.y}33`}}><span style={{width:6,height:6,borderRadius:"50%",background:ok?C.g:C.y,animation:ok?"none":"pulse 2s infinite"}}/>{ok?"API Connected":"Offline Mode"}</div>;}

// ═══ REUSABLE AI INSIGHT PANEL ═══
export function AiInsight({title="AI Insight",items=[],loading,onRefresh,compact}){
  return <div style={{background:`linear-gradient(135deg,${C.p}08,${C.a}08)`,border:`1px solid ${C.p}33`,borderRadius:compact?8:12,padding:compact?"8px 12px":"14px 16px",marginBottom:compact?8:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:items.length?8:0}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:compact?10:11,fontWeight:700,color:C.p,fontFamily:FM,letterSpacing:"0.4px"}}>✦ {title}</span>
      </div>
      {onRefresh&&<button onClick={onRefresh} style={{padding:"2px 8px",borderRadius:5,fontSize:9,fontWeight:700,background:C.pd,color:C.p,border:`1px solid ${C.p}44`,cursor:"pointer",fontFamily:FM}}>{loading?"Thinking…":"Refresh"}</button>}
    </div>
    {loading?<div style={{display:"flex",gap:6,alignItems:"center",padding:"4px 0"}}><Spin/><span style={{fontSize:11,color:C.t3}}>Analyzing…</span></div>:
    items.map((it,i)=><div key={i} style={{fontSize:compact?11:12,color:C.t2,lineHeight:1.6,padding:"3px 0",display:"flex",gap:6}}>
      {it.icon&&<span style={{flexShrink:0}}>{it.icon}</span>}
      <span>{it.text}</span>
    </div>)}
  </div>;
}
export function LoadingOverlay({msg="Loading your workspace…"}){return <div style={{position:"fixed",inset:0,background:C.bg,zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}><div style={{width:48,height:48,border:`3px solid ${C.b1}`,borderTopColor:C.a,borderRadius:"50%",animation:"spin .8s linear infinite"}}/><div style={{fontSize:14,fontWeight:600,color:C.t2,fontFamily:FM}}>{msg}</div><div style={{display:"flex",gap:4,marginTop:8}}>{[0,1,2,3].map(i=><div key={i} className="skel" style={{width:60,height:4,borderRadius:2,animationDelay:i*0.2+"s"}}/>)}</div></div>;}

// ═══ UNDO TOAST — shows undo option for destructive actions ═══
export function UndoToast({msg,onUndo,duration=5000}){
  const [left,setLeft]=useState(100);const [gone,setGone]=useState(false);
  useEffect(()=>{const start=Date.now();const iv=setInterval(()=>{const p=Math.max(0,100-((Date.now()-start)/duration)*100);setLeft(p);if(p<=0){setGone(true);clearInterval(iv);}},50);return()=>clearInterval(iv);},[duration]);
  if(gone)return null;
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1e293b",color:"#f1f5f9",borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,zIndex:9999,boxShadow:"0 12px 40px rgba(0,0,0,.5)",animation:"fadeUp .2s ease",minWidth:280}}>
    <span style={{fontSize:13}}>{msg}</span>
    <button onClick={()=>{onUndo();setGone(true);}} style={{padding:"4px 14px",borderRadius:6,fontSize:12,fontWeight:700,background:C.a,color:"#fff",border:"none",cursor:"pointer",fontFamily:FM,whiteSpace:"nowrap"}}>Undo</button>
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,borderRadius:"0 0 12px 12px",overflow:"hidden"}}><div style={{height:"100%",background:C.a,width:left+"%",transition:"width .05s linear"}}/></div>
  </div>;
}

// ═══ ONBOARDING WIZARD — first-run setup guide ═══
export function OnboardingWizard({onComplete}){
  const [step,setStep]=useState(0);
  const steps=[
    {icon:"👋",title:"Welcome to SupportDesk",desc:"Your AI-powered customer support platform. Let's get you set up in 3 quick steps.",action:"Let's Go"},
    {icon:"📬",title:"Connect Your First Channel",desc:"SupportDesk supports 15+ channels: Live Chat, WhatsApp, Email, Instagram, Telegram, and more. Head to Settings → Inboxes to connect.",action:"Next"},
    {icon:"🤖",title:"Enable AI Auto-Reply",desc:"Our AI bot (Aria) can handle routine questions instantly. Enable it in Settings → AI Bot, or toggle per channel in the Inbox toolbar.",action:"Next"},
    {icon:"👥",title:"Invite Your Team",desc:"Add agents in Settings → Agents & Teams. Assign roles, set permissions, and create teams for auto-assignment.",action:"Start Using SupportDesk"}
  ];
  const s=steps[step];
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .2s ease"}}>
    <div style={{background:C.bg,borderRadius:20,padding:"40px 36px",maxWidth:440,width:"90%",textAlign:"center",boxShadow:"0 30px 80px rgba(0,0,0,.6)",border:`1px solid ${C.b1}`,animation:"fadeUp .3s ease"}}>
      <div style={{fontSize:48,marginBottom:16}}>{s.icon}</div>
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>{steps.map((_,i)=><div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?C.a:i<step?C.g:C.b2,transition:"all .2s"}}/>)}</div>
      <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD,marginBottom:8,color:C.t1}}>{s.title}</h2>
      <p style={{fontSize:13,color:C.t3,lineHeight:1.7,marginBottom:24}}>{s.desc}</p>
      <div style={{display:"flex",gap:8,justifyContent:"center"}}>
        {step>0&&<button onClick={()=>setStep(p=>p-1)} style={{padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:600,background:"transparent",color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FB}}>Back</button>}
        <button onClick={()=>{if(step<steps.length-1)setStep(p=>p+1);else onComplete();}} style={{padding:"10px 28px",borderRadius:10,fontSize:13,fontWeight:700,background:`linear-gradient(135deg,${C.a},#4f46e5)`,color:"#fff",border:"none",cursor:"pointer",fontFamily:FB}}>{s.action}</button>
      </div>
      {step===0&&<button onClick={onComplete} style={{marginTop:16,background:"none",border:"none",color:C.t3,fontSize:11,cursor:"pointer",fontFamily:FM}}>Skip setup →</button>}
    </div>
  </div>;
}

// ═══ CSV EXPORT UTILITY — reusable across all screens ═══
export function exportTableCSV(headers,rows,filename){const csv=[headers.join(","),...rows.map(r=>r.map(c=>'"'+(c??"").toString().replace(/"/g,'""')+'"').join(","))].join("\n");const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

// ═══ CUSTOM FIELDS PANEL — renders custom fields for any entity record ═══
// ═══ CSAT SURVEY WIDGET (#3) ═══
export function CsatSurvey({convId,onSubmit,onClose}){
  const [score,setScore]=useState(0);const [comment,setComment]=useState("");const [step,setStep]=useState(1);
  const labels=["","Terrible","Poor","Okay","Good","Excellent"];
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn .2s ease"}}>
    <div style={{background:C.bg,borderRadius:20,padding:"32px 28px",maxWidth:400,width:"90%",border:`1px solid ${C.b1}`,boxShadow:"0 30px 60px rgba(0,0,0,.5)",textAlign:"center"}}>
      {step===1&&<><div style={{fontSize:36,marginBottom:12}}>💬</div>
        <div style={{fontSize:18,fontWeight:800,fontFamily:FD,marginBottom:6}}>How was your experience?</div>
        <div style={{fontSize:13,color:C.t3,marginBottom:20}}>Your feedback helps us improve</div>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
          {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setScore(n)} style={{width:48,height:48,borderRadius:12,fontSize:24,border:`2px solid ${score===n?C.a:C.b1}`,background:score===n?C.ad:"transparent",cursor:"pointer",transition:"all .15s",transform:score===n?"scale(1.15)":"scale(1)"}}>{["","😠","😟","😐","😊","🤩"][n]}</button>)}
        </div>
        <div style={{fontSize:14,fontWeight:700,color:score?C.a:C.t3,height:20,fontFamily:FD}}>{labels[score]||"Select a rating"}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:16}}>
          <button onClick={onClose} style={{padding:"8px 20px",borderRadius:10,fontSize:13,background:"transparent",color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Skip</button>
          <button onClick={()=>{if(score)setStep(2);}} disabled={!score} style={{padding:"8px 24px",borderRadius:10,fontSize:13,fontWeight:700,background:score?`linear-gradient(135deg,${C.a},#6366f1)`:`${C.s3}`,color:score?"#fff":C.t3,border:"none",cursor:score?"pointer":"default"}}>Next</button>
        </div></>}
      {step===2&&<><div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:12}}>Any additional comments?</div>
        <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Tell us more about your experience..." style={{width:"100%",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none",boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:14}}>
          <button onClick={()=>setStep(1)} style={{padding:"8px 20px",borderRadius:10,fontSize:13,background:"transparent",color:C.t3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>Back</button>
          <button onClick={()=>onSubmit(convId,score,comment)} style={{padding:"8px 24px",borderRadius:10,fontSize:13,fontWeight:700,background:`linear-gradient(135deg,${C.a},#6366f1)`,color:"#fff",border:"none",cursor:"pointer"}}>Submit {score}★</button>
        </div></>}
    </div>
  </div>;
}

// ═══ SLA COUNTDOWN TIMER (#10) ═══
export function SlaTimer({createdAt,priority,firstReplyAt}){
  const slaMinutes=priority==="urgent"?15:priority==="high"?30:60;
  const created=new Date(createdAt||Date.now()).getTime();
  const deadline=created+slaMinutes*60000;
  const now=Date.now();
  const remaining=Math.max(0,deadline-now);
  const mins=Math.floor(remaining/60000);const secs=Math.floor((remaining%60000)/1000);
  const pct=Math.min(100,((now-created)/(deadline-created))*100);
  const breached=remaining<=0;const warning=pct>75;
  if(firstReplyAt)return <span style={{fontSize:9,color:C.g,fontFamily:FM}}>✓ Replied</span>;
  return <div style={{display:"flex",alignItems:"center",gap:4}} title={`SLA: ${slaMinutes}min first reply`}>
    <div style={{width:32,height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",borderRadius:2,background:breached?C.r:warning?C.y:C.g,transition:"width 1s"}}/></div>
    <span style={{fontSize:9,fontWeight:700,fontFamily:FM,color:breached?C.r:warning?C.y:C.t3}}>{breached?"BREACH":mins+"m "+secs+"s"}</span>
  </div>;
}

// ═══ COLLISION BADGE (#5) ═══
export function CollisionBadge({viewers,agents,currentUser}){
  const others=(viewers||[]).filter(id=>id!==currentUser);
  if(!others.length)return null;
  return <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,background:C.yd,border:`1px solid ${C.y}33`,fontSize:10,fontWeight:600,color:"#8b6914",animation:"fadeIn .2s ease"}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:C.y,animation:"pulse 1.5s infinite"}}/>
    {others.map(id=>{const a=agents.find(x=>x.id===id);return a?.name?.split(" ")[0]||"Agent";}).join(", ")} also viewing
  </div>;
}

export function CfPanel({entity,recordId,fields,getCfVal,setCfVal,compact}){
  const entityFields=fields.filter(f=>f.entity===entity);
  const [expanded,setExpanded]=useState(!compact);
  if(entityFields.length===0)return null;
  const groups=[...new Set(entityFields.map(f=>f.group||"Custom"))];
  return <div style={{marginTop:compact?6:12}}>
    <button onClick={()=>setExpanded(p=>!p)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"4px 0",marginBottom:expanded?6:0}}>
      <span style={{fontSize:8,color:C.t3,transition:"transform .15s",transform:expanded?"rotate(90deg)":"rotate(0)"}}>▶</span>
      <span style={{fontSize:10,fontWeight:700,color:C.p,fontFamily:FM,letterSpacing:"0.5px"}}>✦ CUSTOM FIELDS ({entityFields.length})</span>
    </button>
    {expanded&&<div style={{display:"flex",flexDirection:"column",gap:compact?4:8}}>
      {groups.map(g=>{const gf=entityFields.filter(f=>(f.group||"Custom")===g);return <div key={g}>
        {groups.length>1&&<div style={{fontSize:8,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:3,marginTop:4}}>{g.toUpperCase()}</div>}
        {gf.map(f=><CfInput key={f.id} field={f} value={getCfVal(recordId,f.id)} onChange={v=>setCfVal(recordId,f.id,v)} compact={compact}/>)}
      </div>;})}
    </div>}
  </div>;
}
export function CfInput({field:f,value,onChange,compact}){
  const v=value||"";const s=compact?{fontSize:11}:{fontSize:12};
  const inputS={width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:6,padding:compact?"4px 7px":"5px 9px",fontSize:compact?11:12,color:C.t1,fontFamily:FB,outline:"none"};
  return <div style={{display:"flex",alignItems:compact?"center":"flex-start",gap:compact?6:8,marginBottom:compact?3:6}}>
    <div style={{width:compact?90:100,flexShrink:0,paddingTop:compact?0:4}}>
      <div style={{fontSize:compact?10:11,fontWeight:600,color:C.t2,lineHeight:1.3}}>{f.name}{f.required&&<span style={{color:C.r}}>*</span>}</div>
      {!compact&&f.desc&&<div style={{fontSize:9,color:C.t3,marginTop:1}}>{f.desc}</div>}
    </div>
    <div style={{flex:1,minWidth:0}}>
      {(f.type==="text"||f.type==="email"||f.type==="phone"||f.type==="url")&&
        <input value={v} onChange={e=>onChange(e.target.value)} placeholder={f.placeholder||""} style={inputS}/>}
      {f.type==="textarea"&&
        <textarea value={v} onChange={e=>onChange(e.target.value)} rows={2} placeholder={f.placeholder||""} style={{...inputS,resize:"vertical"}}/>}
      {f.type==="number"&&
        <input type="number" value={v} onChange={e=>onChange(e.target.value)} min={f.min} max={f.max} placeholder={f.placeholder||"0"} style={inputS}/>}
      {f.type==="currency"&&
        <div style={{display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:compact?10:11,color:C.t3}}>$</span><input type="number" value={v} onChange={e=>onChange(e.target.value)} placeholder="0.00" style={{...inputS,flex:1}}/></div>}
      {f.type==="percentage"&&
        <div style={{display:"flex",alignItems:"center",gap:2}}><input type="number" value={v} onChange={e=>onChange(e.target.value)} min={0} max={100} placeholder="0" style={{...inputS,flex:1}}/><span style={{fontSize:compact?10:11,color:C.t3}}>%</span></div>}
      {f.type==="date"&&
        <input type="date" value={v} onChange={e=>onChange(e.target.value)} style={inputS}/>}
      {f.type==="select"&&
        <select value={v} onChange={e=>onChange(e.target.value)} style={{...inputS,cursor:"pointer"}}>
          <option value="">Select…</option>
          {(f.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
        </select>}
      {f.type==="multi_select"&&
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {(f.options||[]).map(o=>{const sel=(v||"").split(",").map(s=>s.trim()).filter(Boolean);const active=sel.includes(o);return <button key={o} onClick={()=>{const next=active?sel.filter(x=>x!==o):[...sel,o];onChange(next.join(","));}} style={{padding:"2px 8px",borderRadius:5,fontSize:compact?9:10,fontWeight:active?700:400,background:active?C.a+"18":"transparent",color:active?C.a:C.t3,border:`1px solid ${active?C.a+"44":C.b1}`,cursor:"pointer"}}>{o}</button>;})}
        </div>}
      {f.type==="checkbox"&&
        <div style={{display:"flex",alignItems:"center",gap:5}}><input type="checkbox" checked={v==="true"||v===true} onChange={e=>onChange(e.target.checked?"true":"false")} style={{accentColor:C.a,width:14,height:14}}/><span style={{fontSize:compact?10:11,color:C.t3}}>{v==="true"?"Yes":"No"}</span></div>}
      {f.type==="rating"&&
        <div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>onChange(String(n))} style={{background:"none",border:"none",cursor:"pointer",fontSize:compact?14:16,opacity:n<=Number(v||0)?1:.25}}>⭐</button>)}</div>}
      {f.type==="color"&&
        <div style={{display:"flex",gap:3}}>{["#4c82fb","#22c55e","#f5a623","#f04f5a","#9b6dff","#0ea5e9","#ff6b35","#e91e63"].map(c=><button key={c} onClick={()=>onChange(c)} style={{width:compact?18:22,height:compact?18:22,borderRadius:5,background:c,border:`2.5px solid ${v===c?"#fff":"transparent"}`,outline:v===c?`2px solid ${c}`:"none",cursor:"pointer"}}/>)}</div>}
      {f.type==="file"&&
        <div style={{padding:compact?"4px 8px":"6px 10px",borderRadius:6,border:`1.5px dashed ${C.b2}`,background:C.bg,fontSize:compact?9:10,color:C.t3,textAlign:"center",cursor:"pointer"}} onClick={()=>showT("File upload placeholder","info")}>{v?("📎 "+v):"Click to upload"}</div>}
      {f.type==="agent_select"&&
        <select value={v} onChange={e=>onChange(e.target.value)} style={{...inputS,cursor:"pointer"}}>
          <option value="">Select agent…</option>
          <option value="Priya">Priya Sharma</option><option value="Dev">Dev Kumar</option><option value="Meena">Meena Rao</option><option value="Aryan">Aryan Shah</option>
        </select>}
    </div>
  </div>;
}

export function Sparkline({data=[],color=C.a,w=80,h=24}){
  if(!data.length)return null;const max=Math.max(...data,1);const min=Math.min(...data,0);const range=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-(((v-min)/range)*h)}`).join(" ");
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:"block"}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function DonutChart({value=75,size=60,strokeW=6,color=C.a,label}){
  const r=(size-strokeW)/2;const circ=2*Math.PI*r;const offset=circ-(value/100)*circ;
  return <div style={{position:"relative",width:size,height:size}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.s3} strokeWidth={strokeW}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/></svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:size/4.5,fontWeight:800,fontFamily:FD,color:C.t1}}>{value}%</span>{label&&<span style={{fontSize:7,color:C.t3,fontFamily:FM}}>{label}</span>}</div>
  </div>;
}

// Global toast
export let _setToast=null;
export function showT(msg,type="info"){_setToast&&_setToast({id:uid(),msg,type});}
export function ToastHost(){
  const [t,setT]=useState(null);_setToast=setT;
  useEffect(()=>{if(t){const x=setTimeout(()=>setT(null),3000);return()=>clearTimeout(x);}},[t]);
  if(!t)return null;
  const c={info:C.a,success:C.g,error:C.r,warn:C.y}[t.type];
  return <div style={{position:"fixed",bottom:24,right:72,background:C.s2,border:`1px solid ${c}55`,
    borderRadius:12,padding:"11px 16px",color:C.t1,fontSize:13,fontFamily:FB,zIndex:9999,
    animation:"fadeUp .2s ease",boxShadow:"0 8px 32px rgba(0,0,0,.5)",display:"flex",alignItems:"center",gap:10}}>
    <span style={{color:c,fontSize:16}}>{t.type==="success"?"✓":t.type==="error"?"✕":t.type==="warn"?"⚠":"ℹ"}</span>{t.msg}
  </div>;
}

// ─── ROOT ────────────────────────────────────────────────────────────────
export const ROUTES={home:{path:"",label:"Home",icon:"home"},inbox:{path:"inbox",label:"Inbox",icon:"inbox"},teamchat:{path:"teamchat",label:"Team Chat",icon:"teamchat"},monitor:{path:"monitor",label:"Live Monitor",icon:"monitor"},contacts:{path:"contacts",label:"Contacts",icon:"contacts"},crm:{path:"crm",label:"CRM",icon:"crm"},calendar:{path:"calendar",label:"Schedule",icon:"calendar"},reports:{path:"reports",label:"Reports",icon:"reports"},marketing:{path:"marketing",label:"Marketing",icon:"marketing"},integrations:{path:"integrations",label:"Integrations & API",icon:"integrations"},knowledgebase:{path:"kb",label:"Knowledge Base",icon:"knowledgebase"},settings:{path:"settings",label:"Settings",icon:"settings"}};
export const hashToScr=()=>{const h=(window.location.hash||"").replace(/^#\/?/,"").split("/")[0]||"";return Object.keys(ROUTES).find(k=>ROUTES[k].path===h)||"home";};

// ─── NOTIF PANEL ─────────────────────────────────────────────────────────
export function NotifPanel({notifs,setNotifs,onClose}){
  const [nFilter,setNFilter]=useState("all");
  const [showNPrefs,setShowNPrefs]=useState(false);
  const filtered=nFilter==="all"?notifs:nFilter==="unread"?notifs.filter(n=>!n.read):notifs.filter(n=>n.type===nFilter);
  return <div style={{position:"absolute",left:48,bottom:-10,width:340,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden",animation:"fadeUp .2s ease",boxShadow:"0 20px 60px rgba(0,0,0,.25)",zIndex:100}} role="dialog" aria-label="Notifications">
    <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:13,fontWeight:700,fontFamily:FD}}>Notifications</span>
      <div style={{display:"flex",gap:4}}>
        <button onClick={()=>setShowNPrefs(p=>!p)} style={{fontSize:10,color:showNPrefs?C.a:C.t3,background:"none",border:"none",cursor:"pointer"}} title="Preferences">⚙</button>
        <button onClick={()=>{setNotifs(p=>p.map(n=>({...n,read:true})));}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Mark all read</button>
      </div>
    </div>
    {/* Filter tabs */}
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.b1}`,padding:"0 8px"}}>
      {[["all","All"],["unread","Unread"],["message","Messages"],["warn","Alerts"],["error","Errors"]].map(([v,l])=>(
        <button key={v} onClick={()=>setNFilter(v)} style={{padding:"6px 8px",fontSize:9,fontWeight:700,fontFamily:FM,color:nFilter===v?C.a:C.t3,borderBottom:`2px solid ${nFilter===v?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{l}</button>
      ))}
    </div>
    {showNPrefs&&<div style={{padding:"8px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s1}}>
      <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>NOTIFY ME FOR</div>
      {[{k:"message",l:"New messages"},{k:"assignment",l:"Assignments"},{k:"sla",l:"SLA breaches"},{k:"mention",l:"@Mentions"},{k:"resolve",l:"Resolutions"}].map(p=>(
        <div key={p.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"3px 0"}}>
          <span style={{fontSize:11,color:C.t2}}>{p.l}</span>
          <Toggle val={true} set={()=>showT(p.l+" toggled","info")}/>
        </div>
      ))}
    </div>}
    <div style={{maxHeight:280,overflowY:"auto"}}>
      {filtered.length===0&&<div style={{padding:"20px",textAlign:"center",fontSize:11,color:C.t3}}>No notifications</div>}
      {filtered.map(n=>(
        <div key={n.id} className="hov" onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))}
          style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`,background:n.read?"transparent":C.ad,cursor:"pointer",transition:"background .12s"}} role="button" aria-label={n.text}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>{n.type==="message"?"💬":n.type==="warn"?"⚠":n.type==="error"?"🔴":"✅"}</span>
            <div style={{flex:1}}><div style={{fontSize:12,color:C.t1,marginBottom:2}}>{n.text}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{n.time} ago</div></div>
            {!n.read&&<span style={{width:7,height:7,borderRadius:"50%",background:C.a,flexShrink:0}}/>}
          </div>
        </div>
      ))}
    </div>
    <div style={{padding:"8px 10px",borderTop:`1px solid ${C.b1}`,textAlign:"center"}}><button onClick={onClose} style={{fontSize:11,color:C.t3,background:"none",border:"none",cursor:"pointer"}}>Close</button></div>
  </div>;
}

// ── InfoRow utility ──
export function InfoRow({label,value,copy,color,mono}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 0",borderBottom:`1px solid ${C.b1}22`}}>
    <span style={{fontSize:10.5,color:C.t3,fontFamily:FM,letterSpacing:"0.3px",flexShrink:0,marginRight:10,paddingTop:1}}>{label}</span>
    <div style={{display:"flex",alignItems:"center",gap:5,textAlign:"right"}}>
      <span style={{fontSize:12,color:color||C.t1,fontFamily:mono?FM:FB,wordBreak:"break-all"}}>{value||"—"}</span>
      {copy&&value&&<button onClick={()=>{navigator.clipboard?.writeText(value);showT("Copied!","success");}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:11,padding:0,flexShrink:0}}>⎘</button>}
    </div>
  </div>;
}
