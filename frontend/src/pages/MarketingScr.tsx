import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

// ─── MARKETING ────────────────────────────────────────────────────────────
const MKT_CAMPS=[
  {id:"mk1",ch:"whatsapp",name:"Diwali Sale Blast",goal:"promotion",status:"sent",ab:false,audience:4820,sent:4820,delivered:4680,read:3210,clicked:890,failed:140,unsub:12,revenue:"₹2,84,000",cost:"₹4,200",roi:"6,657%",date:"01/03/26",template:"promotional_offer",spark:[22,35,48,62,71,68,54]},
  {id:"mk2",ch:"email",name:"March Newsletter",goal:"engagement",status:"active",ab:true,audience:12400,sent:12400,delivered:11800,read:4720,clicked:1650,failed:600,unsub:45,revenue:"₹1,12,000",cost:"₹1,800",roi:"6,122%",date:"10/03/26",subject:"What's new in March?",spark:[10,18,42,55,38,62,48]},
  {id:"mk3",ch:"sms",name:"Flash Sale Alert",goal:"promotion",status:"sent",ab:false,audience:2100,sent:2100,delivered:2040,read:1530,clicked:410,failed:60,unsub:8,revenue:"₹68,000",cost:"₹2,100",roi:"3,138%",date:"08/03/26",template:"flash_sale",spark:[15,28,45,52,42,35,22]},
  {id:"mk4",ch:"whatsapp",name:"Abandoned Cart Reminder",goal:"retention",status:"active",ab:false,audience:890,sent:890,delivered:870,read:620,clicked:340,failed:20,unsub:2,revenue:"₹1,45,000",cost:"₹890",roi:"16,192%",date:"12/03/26",template:"cart_reminder",spark:[8,14,22,35,42,55,48]},
  {id:"mk5",ch:"email",name:"Product Launch",goal:"promotion",status:"scheduled",ab:true,audience:15000,sent:0,delivered:0,read:0,clicked:0,failed:0,unsub:0,revenue:"—",cost:"₹2,200",roi:"—",date:"20/03/26",subject:"Introducing our newest product",spark:[0,0,0,0,0,0,0]},
  {id:"mk6",ch:"sms",name:"Appointment Reminder",goal:"engagement",status:"draft",ab:false,audience:0,sent:0,delivered:0,read:0,clicked:0,failed:0,unsub:0,revenue:"—",cost:"—",roi:"—",date:"—",template:"",spark:[0,0,0,0,0,0,0]},
  {id:"mk7",ch:"whatsapp",name:"Feedback Request",goal:"engagement",status:"paused",ab:false,audience:3200,sent:1600,delivered:1560,read:980,clicked:220,failed:40,unsub:5,revenue:"—",cost:"₹1,600",roi:"—",date:"05/03/26",template:"feedback_request",spark:[12,22,35,28,18,10,5]},
  {id:"mk8",ch:"email",name:"Welcome Series #1",goal:"retention",status:"active",ab:false,audience:890,sent:890,delivered:860,read:510,clicked:180,failed:30,unsub:3,revenue:"₹22,000",cost:"₹320",roi:"6,775%",date:"14/03/26",subject:"Welcome aboard!",spark:[5,12,18,25,22,28,32]},
  {id:"mk9",ch:"whatsapp",name:"Re-engagement Push",goal:"retention",status:"sent",ab:true,audience:2400,sent:2400,delivered:2320,read:1680,clicked:520,failed:80,unsub:18,revenue:"₹92,000",cost:"₹2,400",roi:"3,733%",date:"02/03/26",template:"promotional_offer",spark:[18,30,45,55,48,40,32]},
  {id:"mk10",ch:"email",name:"Feature Announcement",goal:"engagement",status:"sent",ab:false,audience:8600,sent:8600,delivered:8200,read:3280,clicked:980,failed:400,unsub:28,revenue:"₹45,000",cost:"₹1,200",roi:"3,650%",date:"28/02/26",subject:"Big update inside",spark:[8,22,38,52,45,35,28]},
  {id:"mk11",ch:"push",name:"Flash Deal Push",goal:"promotion",status:"sent",ab:false,audience:6200,sent:6200,delivered:5900,read:2360,clicked:820,failed:300,unsub:15,revenue:"₹58,000",cost:"₹620",roi:"9,254%",date:"09/03/26",template:"flash_push",spark:[15,28,42,55,38,25,18]},
  {id:"mk12",ch:"push",name:"Abandoned Cart Nudge",goal:"retention",status:"active",ab:false,audience:1800,sent:1800,delivered:1720,read:1030,clicked:480,failed:80,unsub:4,revenue:"₹1,22,000",cost:"₹180",roi:"67,678%",date:"13/03/26",template:"cart_push",spark:[10,18,32,45,52,48,40]},
  {id:"mk13",ch:"push",name:"New Feature Alert",goal:"engagement",status:"scheduled",ab:false,audience:9400,sent:0,delivered:0,read:0,clicked:0,failed:0,unsub:0,revenue:"—",cost:"₹940",roi:"—",date:"18/03/26",template:"feature_push",spark:[0,0,0,0,0,0,0]},
  {id:"mk14",ch:"whatsapp",name:"Champions Reward",goal:"retention",status:"active",ab:false,audience:420,sent:420,delivered:415,read:380,clicked:210,failed:5,unsub:0,revenue:"₹88,000",cost:"₹420",roi:"20,852%",date:"11/03/26",template:"loyalty_reward",spark:[5,12,22,35,42,38,28]}
];
const WA_MKT_T=[{id:"t1",name:"promotional_offer",cat:"Promotion",text:"Hi {{first_name}}! We have an exclusive {{discount}}% OFF just for you. Shop now: {{link}} Valid till {{date}}"},{id:"t2",name:"cart_reminder",cat:"Retention",text:"Hey {{first_name}}! You left items in your cart worth {{amount}}. Complete your order: {{link}}"},{id:"t3",name:"feedback_request",cat:"Engagement",text:"Hi {{first_name}}, how was your experience with {{product}}? Share your thoughts: {{link}}"},{id:"t4",name:"order_update",cat:"Transactional",text:"Hi {{first_name}}, your order #{{order_id}} is {{status}}. Track: {{link}}"},{id:"t5",name:"flash_sale",cat:"Promotion",text:"FLASH SALE! {{discount}}% off everything for {{hours}} hours. Shop: {{link}}"},{id:"t6",name:"welcome",cat:"Onboarding",text:"Welcome to {{company}}, {{first_name}}! Here is how to get started: {{link}}"},{id:"t7",name:"loyalty_reward",cat:"Retention",text:"{{first_name}}, you have earned {{points}} reward points! Redeem now: {{link}}"}];
const SMS_MKT_T=[{id:"s1",name:"flash_sale",cat:"Promotion",text:"FLASH SALE! {{discount}}% off for {{hours}}hrs. Shop: {{link}} Reply STOP to opt out"},{id:"s2",name:"reminder",cat:"Transactional",text:"Reminder: {{first_name}}, your appointment is {{date}} at {{time}}. Reply C to confirm"},{id:"s3",name:"promo_code",cat:"Promotion",text:"{{first_name}}, exclusive {{discount}}% OFF code: {{code}}. Valid {{date}}. {{link}}"},{id:"s4",name:"payment_due",cat:"Transactional",text:"Hi {{first_name}}, payment of {{amount}} is due on {{date}}. Pay now: {{link}}"}];
const EMAIL_MKT_T=[{id:"e1",name:"newsletter",cat:"Engagement",subj:"What is new this month at {{company}}"},{id:"e2",name:"product_launch",cat:"Promotion",subj:"Introducing {{product}} — available now"},{id:"e3",name:"welcome_series",cat:"Onboarding",subj:"Welcome to {{company}}, {{first_name}}!"},{id:"e4",name:"win_back",cat:"Retention",subj:"We miss you, {{first_name}}! Here is {{discount}}% off"}];
const PUSH_MKT_T=[{id:"p1",name:"flash_push",cat:"Promotion",text:"{{discount}}% OFF everything! Ends in {{hours}} hours. Tap to shop."},{id:"p2",name:"cart_push",cat:"Retention",text:"{{first_name}}, you left {{product}} in your cart! Complete checkout now."},{id:"p3",name:"feature_push",cat:"Engagement",text:"New: {{product}} just launched! Be the first to try it."},{id:"p4",name:"review_push",cat:"Engagement",text:"How was your experience with {{product}}? Tap to leave a review."}];
const MKT_SEGS=[{id:"sg1",name:"All Contacts",count:5200,desc:"Every contact in your database",icon:"👥",fixed:true},{id:"sg2",name:"Active Customers",count:3100,desc:"Purchased in last 30 days",icon:"🟢",fixed:true},{id:"sg3",name:"Inactive (30d+)",count:1400,desc:"No activity for 30+ days",icon:"💤",fixed:true},{id:"sg4",name:"High Value (VIP)",count:420,desc:"Lifetime value > $500",icon:"💎",fixed:true},{id:"sg5",name:"New Signups (7d)",count:180,desc:"Registered in the last week",icon:"🆕",fixed:true},{id:"sg6",name:"Cart Abandoners",count:640,desc:"Items in cart, no purchase",icon:"🛒",fixed:true},{id:"sg7",name:"Newsletter Subs",count:8900,desc:"Opted in to email marketing",icon:"📰",fixed:true},{id:"sg8",name:"Pro/Enterprise",count:320,desc:"Paying Pro or Enterprise plans",icon:"🏢",fixed:true},{id:"sg9",name:"Churned Risk",count:280,desc:"Engagement dropped 60%+ last 14d",icon:"⚠️",fixed:true},{id:"sg10",name:"Champions",count:150,desc:"Top 5% by engagement + spend",icon:"🏆",fixed:true}];
const TPL_LIB=[
  {id:"tl1",ch:"email",cat:"Onboarding",name:"Welcome Series #1",desc:"First-touch welcome with getting started CTA",openRate:58,ctr:22,body:"Welcome to {{company}}, {{first_name}}! We are thrilled to have you. Get started: {{link}}"},
  {id:"tl2",ch:"email",cat:"Onboarding",name:"Setup Guide",desc:"Step-by-step product setup email",openRate:52,ctr:28,body:"Hi {{first_name}}, ready to get the most out of {{product}}? Follow our quick setup guide: {{link}}"},
  {id:"tl3",ch:"email",cat:"Promotion",name:"Seasonal Sale",desc:"Limited-time discount announcement",openRate:42,ctr:18,body:"{{first_name}}, our biggest sale of the season is here! {{discount}}% off everything. Shop: {{link}}"},
  {id:"tl4",ch:"email",cat:"Retention",name:"Win-Back",desc:"Re-engage inactive users with offer",openRate:35,ctr:14,body:"We miss you, {{first_name}}! Come back and get {{discount}}% off your next order: {{link}}"},
  {id:"tl5",ch:"email",cat:"Billing",name:"Payment Reminder",desc:"Upcoming payment due notification",openRate:68,ctr:32,body:"Hi {{first_name}}, your payment of {{amount}} is due on {{date}}. Pay now: {{link}}"},
  {id:"tl6",ch:"whatsapp",cat:"Promotion",name:"Flash Sale",desc:"Urgency-driven time-limited offer",openRate:78,ctr:35,body:"FLASH SALE! {{discount}}% off for {{hours}} hours only. Shop now: {{link}}"},
  {id:"tl7",ch:"whatsapp",cat:"Retention",name:"Cart Recovery",desc:"Abandoned cart reminder with link",openRate:72,ctr:42,body:"Hey {{first_name}}! You left {{product}} in your cart. Complete your order: {{link}}"},
  {id:"tl8",ch:"whatsapp",cat:"Engagement",name:"Feedback Request",desc:"Post-purchase review request",openRate:65,ctr:28,body:"Hi {{first_name}}, how was {{product}}? Share feedback: {{link}}"},
  {id:"tl9",ch:"whatsapp",cat:"Onboarding",name:"Welcome Message",desc:"First WhatsApp touchpoint",openRate:82,ctr:38,body:"Welcome to {{company}}, {{first_name}}! We are here to help 24/7. Get started: {{link}}"},
  {id:"tl10",ch:"sms",cat:"Promotion",name:"Promo Code",desc:"Exclusive discount code delivery",openRate:92,ctr:22,body:"{{first_name}}, your exclusive code: {{code}}. {{discount}}% OFF. Valid {{date}}. {{link}}"},
  {id:"tl11",ch:"sms",cat:"Transactional",name:"Appointment Reminder",desc:"Booking/appointment confirmation",openRate:95,ctr:18,body:"Reminder: {{first_name}}, appt on {{date}} at {{time}}. Reply C to confirm."},
  {id:"tl12",ch:"sms",cat:"Billing",name:"Payment Due",desc:"Payment deadline alert",openRate:88,ctr:25,body:"Hi {{first_name}}, {{amount}} due on {{date}}. Pay: {{link}} Reply STOP to opt out"},
  {id:"tl13",ch:"push",cat:"Promotion",name:"Deal Alert",desc:"Time-sensitive push offer",openRate:45,ctr:18,body:"{{discount}}% OFF everything! Ends in {{hours}} hrs. Tap to shop."},
  {id:"tl14",ch:"push",cat:"Retention",name:"Come Back",desc:"Re-engagement push for dormant users",openRate:32,ctr:12,body:"We miss you, {{first_name}}! {{discount}}% off to welcome you back."},
  {id:"tl15",ch:"push",cat:"Engagement",name:"New Feature",desc:"Product update notification",openRate:48,ctr:22,body:"New: {{product}} just launched! Be the first to try it."},
  {id:"tl16",ch:"email",cat:"Engagement",name:"Newsletter",desc:"Monthly digest with highlights",openRate:38,ctr:12,body:"Hi {{first_name}}, here is what happened this month at {{company}}. Read more: {{link}}"},
  {id:"tl17",ch:"email",cat:"Promotion",name:"Product Launch",desc:"New product/feature announcement",openRate:44,ctr:20,body:"{{first_name}}, meet {{product}}! The feature you have been waiting for. Learn more: {{link}}"},
  {id:"tl18",ch:"whatsapp",cat:"Billing",name:"Invoice Ready",desc:"Invoice/receipt delivery via WhatsApp",openRate:88,ctr:45,body:"Hi {{first_name}}, your invoice for {{amount}} is ready. Download: {{link}}"},
  {id:"tl19",ch:"push",cat:"Engagement",name:"Review Request",desc:"Post-delivery review nudge",openRate:38,ctr:15,body:"How was {{product}}? Tap to leave a quick review."},
  {id:"tl20",ch:"sms",cat:"Retention",name:"Loyalty Points",desc:"Points balance & redemption reminder",openRate:85,ctr:20,body:"{{first_name}}, you have {{points}} pts! Redeem for rewards: {{link}}"},
  {id:"tl21",ch:"email",cat:"Retention",name:"Re-activation Offer",desc:"Special deal for churned users",openRate:30,ctr:10,body:"{{first_name}}, it has been a while! We have a special {{discount}}% off just for you: {{link}}"}
];
const MKT_AUTOS=[
  {id:"au1",name:"Welcome Series",trigger:"Contact Created",status:true,steps:["Send welcome email","Wait 2 days","Send tips email","Wait 3 days","Send offer email"],enrolled:1240,completed:890,ch:"email"},
  {id:"au2",name:"Cart Recovery",trigger:"Cart Abandoned",status:true,steps:["Wait 1 hour","Send WhatsApp reminder","Wait 24 hours","Send discount email"],enrolled:640,completed:340,ch:"whatsapp"},
  {id:"au3",name:"Post-Purchase Review",trigger:"Order Delivered",status:true,steps:["Wait 3 days","Send feedback WhatsApp","Wait 5 days","Send NPS email"],enrolled:2100,completed:1560,ch:"whatsapp"},
  {id:"au4",name:"Re-engagement",trigger:"Inactive 30 days",status:false,steps:["Send miss-you email","Wait 7 days","Send SMS offer","Wait 14 days","Mark as churned"],enrolled:450,completed:120,ch:"email"},
  {id:"au5",name:"Birthday Offer",trigger:"Birthday Match",status:true,steps:["Send birthday WhatsApp","Apply 20% coupon"],enrolled:320,completed:310,ch:"whatsapp"},
  {id:"au6",name:"Payment Reminder",trigger:"Payment Due",status:true,steps:["Send SMS 3 days before","Send email 1 day before","Send SMS on due date"],enrolled:890,completed:780,ch:"sms"}
];
const MKT_VARS=["first_name","last_name","email","company","amount","discount","code","link","date","time","product","order_id","status","hours","points"];
const mktGoalC=g=>({promotion:C.r,engagement:C.a,retention:C.p,transactional:C.cy}[g]||C.t3);
const mktStC=s=>({sent:C.g,active:C.a,scheduled:C.cy,draft:C.t3,paused:C.y}[s]||C.t3);
const mktChC=c=>({whatsapp:"#25d366",email:C.a,sms:C.y,push:"#ff6b35"}[c]||C.t3);
const mktChE=c=><ChIcon t={c} s={16}/>;
const mktChL=c=>({whatsapp:"WhatsApp",email:"Email",sms:"SMS",push:"Push"}[c]||c);
const mktPct=(a,b)=>b?Math.round(a/b*100):0;
const mktFill=(text)=>(text||"").replace(/\{\{(\w+)\}\}/g,(m,k)=>({first_name:"Arjun",last_name:"Mehta",email:"arjun@mail.com",company:"SupportDesk",amount:"₹2,499",discount:"25",code:"FLASH25",link:"acme.co/shop",date:"31 Mar",time:"3:00 PM",product:"Pro Plan",order_id:"ORD-4821",status:"shipped",hours:"24",points:"1,250"}[k]||m));

export default function MarketingScr({contacts}){
  const [mtab,setMtab]=useState("overview");
  const [camps,setCamps]=useState(MKT_CAMPS);
  const [autos,setAutos]=useState(MKT_AUTOS);
  const [segments,setSegments]=useState(MKT_SEGS);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [showModal,setShowModal]=useState(false);
  const [showABTest,setShowABTest]=useState(false);
  const [editCamp,setEditCamp]=useState(null);
  const [selCamp,setSelCamp]=useState(null);
  const [viewCamp,setViewCamp]=useState(null);
  const [modalCh,setModalCh]=useState(null);
  // AI Studio state
  const [aiTool,setAiTool]=useState("subjects");
  const [aiInput,setAiInput]=useState("");
  const [aiTone,setAiTone]=useState("professional");
  const [aiCh,setAiCh]=useState("email");
  const [aiResult,setAiResult]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  // Segment builder state
  const [segRules,setSegRules]=useState([{attr:"status",op:"equals",val:"active"}]);
  const [segName,setSegName]=useState("");
  const [editSeg,setEditSeg]=useState(null);
  const [segIcon,setSegIcon]=useState("🎯");
  const [segMode,setSegMode]=useState("rules"); // "rules" | "manual" | "csv"
  const [manualEmails,setManualEmails]=useState("");
  const [csvContacts,setCsvContacts]=useState([]);
  const [csvFileName,setCsvFileName]=useState("");
  const [csvParsing,setCsvParsing]=useState(false);
  const parseCsv=file=>{setCsvParsing(true);setCsvFileName(file.name);const reader=new FileReader();reader.onload=e=>{const text=e.target.result;const lines=text.split("\n").filter(l=>l.trim());const headers=lines[0].split(",").map(h=>h.trim().toLowerCase());const emailIdx=headers.findIndex(h=>h.includes("email"));const nameIdx=headers.findIndex(h=>h.includes("name"));const phoneIdx=headers.findIndex(h=>h.includes("phone"));const rows=lines.slice(1).map((line,i)=>{const cols=line.split(",").map(c=>c.trim().replace(/^"|"$/g,""));return{id:"csv_"+i,email:emailIdx>=0?cols[emailIdx]:"",name:nameIdx>=0?cols[nameIdx]:cols[0]||"",phone:phoneIdx>=0?cols[phoneIdx]:"",valid:emailIdx>=0&&cols[emailIdx]?.includes("@")};}).filter(r=>r.name||r.email);setCsvContacts(rows);setCsvParsing(false);showT(`Parsed ${rows.length} contacts from ${file.name}`,"success");};reader.readAsText(file);};
  const parseManualEmails=()=>{const emails=manualEmails.split(/[\n,;]+/).map(e=>e.trim()).filter(e=>e.includes("@"));return emails.map((e,i)=>({id:"man_"+i,email:e,name:e.split("@")[0],valid:true}));};
  const manualCount=segMode==="csv"?csvContacts.length:segMode==="manual"?parseManualEmails().length:0;
  const segReach=segMode==="rules"?Math.round(contacts.length>0?contacts.length*(0.15+segRules.filter(r=>r.val.trim()).length*0.12):5200*(0.15+segRules.filter(r=>r.val.trim()).length*0.12)):manualCount;
  // Template library state
  const [tplFilter,setTplFilter]=useState("all");
  // ═══ MARKETING API LOADING ═══
  useEffect(()=>{if(!api.isConnected())return;
    api.get("/marketing/campaigns").then(r=>{if(r?.data?.length)setCamps(prev=>{const apiCamps=r.data.map(c=>({...c,channel:c.type||"email",openRate:c.sent_count?(c.open_count/c.sent_count*100).toFixed(1):0,clickRate:c.sent_count?(c.click_count/c.sent_count*100).toFixed(1):0,sent:c.sent_count||0}));return apiCamps.length?apiCamps:prev;});}).catch(()=>{});
    api.get("/marketing/segments").then(r=>{if(r?.data?.length)setSegments(r.data.map(s=>({...s,reach:s.contact_count||0,conditions:s.conditions||{}})));}).catch(()=>{});
  },[]);
  const [tplCatFilter,setTplCatFilter]=useState("all");
  const [tplPreview,setTplPreview]=useState(null);
  const [templates,setTemplates]=useState(TPL_LIB);
  const [showTplModal,setShowTplModal]=useState(false);
  const [editTpl,setEditTpl]=useState(null);
  const [tplName,setTplName]=useState("");const [tplDesc,setTplDesc]=useState("");const [tplCh,setTplCh]=useState("email");const [tplCat,setTplCat]=useState("Promotion");const [tplSubj,setTplSubj]=useState("");const [tplBody,setTplBody]=useState("");
  const [tplAiLoad,setTplAiLoad]=useState(false);
  // Automation CRUD
  const [showAutoModal,setShowAutoModal]=useState(false);const [editAuto,setEditAuto]=useState(null);
  const [autoName,setAutoName]=useState("");const [autoTrigger,setAutoTrigger]=useState("Contact Created");const [autoCh,setAutoCh]=useState("email");const [autoSteps,setAutoSteps]=useState([{type:"send",text:"Send welcome email"},{type:"wait",text:"Wait 2 days"},{type:"send",text:"Send follow-up"}]);
  const AUTO_TRIGGERS=["Contact Created","Cart Abandoned","Order Delivered","Inactive 30 days","Birthday Match","Payment Due","Plan Upgraded","Plan Downgraded","Form Submitted","Tag Added","Conversation Resolved"];
  const AUTO_STEP_TYPES=[{v:"send",l:"Send Message",c:C.a},{v:"wait",l:"Wait / Delay",c:C.y},{v:"condition",l:"If / Condition",c:C.p},{v:"tag",l:"Add Tag",c:C.cy},{v:"notify",l:"Notify Team",c:C.r},{v:"update",l:"Update Contact",c:C.g}];
  const openNewAuto=()=>{setAutoName("");setAutoTrigger("Contact Created");setAutoCh("email");setAutoSteps([{type:"send",text:""},{type:"wait",text:"Wait 1 day"}]);setEditAuto(null);setShowAutoModal(true);};
  const openEditAuto=a=>{setAutoName(a.name);setAutoTrigger(a.trigger);setAutoCh(a.ch);setAutoSteps(a.steps.map(s=>{const isWait=s.toLowerCase().includes("wait");const isCond=s.toLowerCase().includes("if ");return{type:isWait?"wait":isCond?"condition":"send",text:s};}));setEditAuto(a);setShowAutoModal(true);};
  const saveAuto=()=>{if(!autoName.trim())return showT("Name required","error");if(autoSteps.filter(s=>s.text.trim()).length===0)return showT("Add at least one step","error");const steps=autoSteps.filter(s=>s.text.trim()).map(s=>s.text);if(editAuto){setAutos(p=>p.map(a=>a.id===editAuto.id?{...a,name:autoName,trigger:autoTrigger,ch:autoCh,steps}:a));showT("Automation updated","success");}else{setAutos(p=>[{id:"au"+uid(),name:autoName,trigger:autoTrigger,status:false,steps,enrolled:0,completed:0,ch:autoCh},...p]);showT("Automation created!","success");}setShowAutoModal(false);setEditAuto(null);};
  const dupAuto=a=>{setAutos(p=>[{...a,id:"au"+uid(),name:a.name+" (Copy)",status:false,enrolled:0,completed:0},...p]);showT("Duplicated","success");};
  const delAuto=id=>{setAutos(p=>p.filter(a=>a.id!==id));showT("Deleted","success");};
  const openEditTpl=t=>{setTplName(t.name);setTplDesc(t.desc);setTplCh(t.ch);setTplCat(t.cat);setTplSubj(t.subj||"");setTplBody(t.body||"");setEditTpl(t);setShowTplModal(true);};
  const openNewTpl=()=>{setTplName("");setTplDesc("");setTplCh("email");setTplCat("Promotion");setTplSubj("");setTplBody("");setEditTpl(null);setShowTplModal(true);};
  const saveTpl=()=>{
    if(!tplName.trim())return showT("Name required","error");
    if(!tplBody.trim())return showT("Body required","error");
    if(editTpl){setTemplates(p=>p.map(t=>t.id===editTpl.id?{...t,name:tplName,desc:tplDesc,ch:tplCh,cat:tplCat,subj:tplSubj,body:tplBody}:t));showT("Template updated","success");}
    else{setTemplates(p=>[{id:"tl"+uid(),name:tplName,desc:tplDesc,ch:tplCh,cat:tplCat,subj:tplSubj,body:tplBody,openRate:0,ctr:0},...p]);showT("Template created!","success");}
    setShowTplModal(false);setEditTpl(null);
  };
  const dupTpl=t=>{setTemplates(p=>[{...t,id:"tl"+uid(),name:t.name+" (Copy)",openRate:0,ctr:0},...p]);showT("Template duplicated","success");};
  const delTpl=id=>{setTemplates(p=>p.filter(t=>t.id!==id));showT("Template deleted","success");};

  const chFilter=mtab==="whatsapp"||mtab==="email"||mtab==="sms"||mtab==="push"?mtab:null;
  const vis=camps.filter(c=>{
    if(chFilter&&c.ch!==chFilter)return false;
    if(filter!=="all"&&c.status!==filter)return false;
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const tot={sent:camps.reduce((s,c)=>s+c.sent,0),del:camps.reduce((s,c)=>s+c.delivered,0),read:camps.reduce((s,c)=>s+c.read,0),click:camps.reduce((s,c)=>s+c.clicked,0),fail:camps.reduce((s,c)=>s+c.failed,0)};
  const chTot=ch=>{const f=camps.filter(c=>c.ch===ch);return{cnt:f.length,sent:f.reduce((s,c)=>s+c.sent,0),del:f.reduce((s,c)=>s+c.delivered,0),read:f.reduce((s,c)=>s+c.read,0),click:f.reduce((s,c)=>s+c.clicked,0)};};

  const togglePause=id=>setCamps(p=>p.map(c=>c.id===id?{...c,status:c.status==="paused"?"active":"paused"}:c));
  const delCamp=id=>{setCamps(p=>p.filter(c=>c.id!==id));if(selCamp?.id===id)setSelCamp(null);showT("Campaign deleted","success");};
  const launchCamp=id=>{setCamps(p=>p.map(c=>c.id===id?{...c,status:"active",sent:c.audience,delivered:Math.round(c.audience*0.97),read:Math.round(c.audience*0.55),clicked:Math.round(c.audience*0.18),failed:Math.round(c.audience*0.03),date:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"})}:c));showT("Campaign launched!","success");};
  const dupCamp=c=>{const nw={...c,id:"mk"+uid(),name:c.name+" (Copy)",status:"draft",sent:0,delivered:0,read:0,clicked:0,failed:0,unsub:0,revenue:"—",roi:"—",date:"—",spark:[0,0,0,0,0,0,0]};setCamps(p=>[nw,...p]);showT("Campaign duplicated","success");return nw;};
  const openNewForCh=ch2=>{setModalCh(ch2);setEditCamp(null);setShowModal(true);};

  // Sparkline SVG
  const Spark=({data,color:sc,w=80,h=24})=>{const mx=Math.max(...data,1);return <svg style={{width:w,height:h}} viewBox={`0 0 ${w} ${h}`}><polyline fill="none" stroke={sc} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={data.map((v,i)=>`${(i/(data.length-1||1))*w},${h-2-(v/mx)*(h-4)}`).join(" ")}/></svg>;};

  // Campaign row component
  const CampRow=({c})=>{
    const dr=mktPct(c.delivered,c.sent),rr=mktPct(c.read,c.delivered),cr=mktPct(c.clicked,c.read);
    return <div className="hov" onClick={()=>setViewCamp(c)}
      style={{display:"grid",gridTemplateColumns:"2.4fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 80px 90px",padding:"11px 18px",borderBottom:`1px solid ${C.b1}`,cursor:"pointer",background:selCamp?.id===c.id?C.ad:"transparent",transition:"background .12s",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
        <div style={{width:32,height:32,borderRadius:8,background:mktChC(c.ch)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{mktChE(c.ch)}</div>
        <div style={{minWidth:0,flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:12.5,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
            {c.ab&&<span style={{fontSize:8,fontWeight:800,fontFamily:FM,background:C.p+"22",color:C.p,padding:"1px 4px",borderRadius:3,letterSpacing:"0.3px"}}>A/B</span>}
          </div>
          <div style={{fontSize:10,color:C.t3,fontFamily:FM,display:"flex",gap:5,marginTop:1}}>
            <span style={{color:mktGoalC(c.goal)}}>{c.goal}</span>
            {c.date!=="—"&&<span>· {c.date}</span>}
          </div>
        </div>
      </div>
      <Tag text={c.status} color={mktStC(c.status)}/>
      <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:dr>=95?C.g:dr>=85?C.y:c.sent?C.r:C.t3}}>{c.sent?dr+"%":"—"}</span>
      <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:rr>=50?C.g:rr>=30?C.y:c.delivered?C.t2:C.t3}}>{c.delivered?rr+"%":"—"}</span>
      <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:cr>=20?C.g:cr>=10?C.y:c.read?C.t2:C.t3}}>{c.read?cr+"%":"—"}</span>
      <span style={{fontSize:11,color:c.revenue!=="—"?C.g:C.t3,fontFamily:FM,fontWeight:600}}>{c.revenue}</span>
      <Spark data={c.spark||[0,0,0,0,0,0,0]} color={mktChC(c.ch)}/>
      <div style={{display:"flex",gap:3,justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}>
        {(c.status==="active"||c.status==="paused")&&<button onClick={()=>togglePause(c.id)} title={c.status==="paused"?"Resume":"Pause"} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">{c.status==="paused"?"▶":"⏸"}</button>}
        {(c.status==="draft"||c.status==="scheduled")&&<button onClick={()=>launchCamp(c.id)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.gd,border:`1px solid ${C.g}44`,cursor:"pointer",color:C.g}}>▶</button>}
        <button onClick={()=>{setEditCamp(c);setShowModal(true);}} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",color:C.t3}} className="hov">✎</button>
        <button onClick={()=>delCamp(c.id)} style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,background:C.rd,border:`1px solid ${C.r}44`,cursor:"pointer",color:C.r}}>✕</button>
      </div>
    </div>;
  };

  // Campaign table with header
  const CampTable=({data})=><div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden"}}>
    <div style={{display:"grid",gridTemplateColumns:"2.4fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 80px 90px",padding:"9px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
      {["Campaign","Status","Deliv%","Read%","Click%","Revenue","Trend",""].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.4px"}}>{h}</span>)}
    </div>
    {data.length===0&&<EmptyState icon="campaign" title="No campaigns found" desc="Create your first marketing campaign to engage customers across channels."/>}
    {data.map(c=><CampRow key={c.id} c={c}/>)}
  </div>;

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    {/* Header */}
    <div style={{padding:"14px 24px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <h2 style={{fontSize:20,fontWeight:800,fontFamily:FD}}>Marketing Campaigns</h2>
      <div style={{flex:1}}/>
      <div style={{display:"flex",alignItems:"center",gap:8,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:7,padding:"5px 10px"}}>
        <span style={{color:C.t3,fontSize:12}}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search campaigns…" style={{background:"none",border:"none",fontSize:12,color:C.t1,fontFamily:FB,outline:"none",width:140}}/>
      </div>
      <Btn ch="✦ AI Studio" v="ai" onClick={()=>setMtab("ai_studio")}/>
      <Btn ch="⚡ A/B Test" v="ai" onClick={()=>setShowABTest(true)}/>
      <div style={{display:"flex",gap:3}}>
        {[["whatsapp","+ WA","#25d366"],["email","+ Email",C.a],["sms","+ SMS",C.y],["push","+ Push","#ff6b35"]].map(([id,lbl,clr])=>(
          <button key={id} onClick={()=>openNewForCh(id)} style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:clr+"15",color:clr,border:`1px solid ${clr}44`}}>{lbl}</button>
        ))}
      </div>
      <Btn ch="+ New Campaign" v="primary" onClick={()=>{setModalCh(null);setEditCamp(null);setShowModal(true);}}/>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,background:C.s1,padding:"0 24px"}}>
      {[["overview","reports","Overview"],["whatsapp",null,"WhatsApp"],["email",null,"Email"],["sms",null,"SMS"],["push",null,"Push"],["automations","automations","Automations"],["ai_studio","aibot","AI Studio"],["segments","contacts","Segments"],["templates","knowledgebase","Templates"],["analytics","reports","Analytics"]].map(([id,navId,lbl])=>(
        <button key={id} onClick={()=>{setMtab(id);setFilter("all");}} style={{padding:"11px 14px",fontSize:10.5,fontWeight:700,fontFamily:FM,letterSpacing:"0.3px",color:mtab===id?C.a:C.t3,borderBottom:`2px solid ${mtab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>{navId?<NavIcon id={navId} s={13} col={mtab===id?C.a:C.t3}/>:<ChIcon t={id} s={13}/>} {lbl}</button>
      ))}
    </div>

    <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

      {/* ═══ OVERVIEW ═══ */}
      {mtab==="overview"&&<>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:20}}>
          {[{l:"Campaigns",v:camps.length,c:C.a,i:<NavIcon id="marketing" s={14} col={C.a}/>},{l:"Total Sent",v:tot.sent.toLocaleString(),c:C.cy,i:<NavIcon id="send" s={14} col={C.cy}/>},{l:"Delivery Rate",v:mktPct(tot.del,tot.sent)+"%",c:C.g,i:<NavIcon id="resolve" s={14} col={C.g}/>},{l:"Read/Open",v:mktPct(tot.read,tot.del)+"%",c:C.p,i:<NavIcon id="monitor" s={14} col={C.p}/>},{l:"Click Rate",v:mktPct(tot.click,tot.read)+"%",c:C.y,i:<NavIcon id="export" s={14} col={C.y}/>},{l:"Failed",v:tot.fail.toLocaleString(),c:C.r,i:<NavIcon id="spam" s={14} col={C.r}/>}].map(k=>(
            <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"12px 14px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,width:40,height:40,background:k.c+"08",borderRadius:"0 0 0 40px"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.3px"}}>{k.l}</span><span style={{opacity:0.6}}>{k.i}</span></div>
              <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Channel summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:20}}>
          {["whatsapp","email","sms","push"].map(ch=>{const t=chTot(ch);return(
            <div key={ch} onClick={()=>setMtab(ch)} className="hov" style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"16px",cursor:"pointer",transition:"background .12s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:36,height:36,borderRadius:9,background:mktChC(ch)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{mktChE(ch)}</div>
                <div><div style={{fontSize:14,fontWeight:700,color:C.t1,fontFamily:FD}}>{mktChL(ch)}</div><div style={{fontSize:10,color:C.t3}}>{t.cnt} campaigns</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[{l:"Sent",v:t.sent.toLocaleString()},{l:"Delivered",v:mktPct(t.del,t.sent)+"%"},{l:"Read",v:mktPct(t.read,t.del)+"%"}].map(s=>(
                  <div key={s.l} style={{textAlign:"center",padding:"6px",background:C.s2,borderRadius:6}}>
                    <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:800,fontFamily:FM,color:mktChC(ch)}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          );})}
        </div>

        {/* Recent campaigns */}
        <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:10}}>Recent Campaigns</div>
        <CampTable data={camps.filter(c=>c.status!=="draft").slice(0,5)}/>
      </>}

      {/* ═══ CHANNEL TABS (WhatsApp / Email / SMS) ═══ */}
      {(mtab==="whatsapp"||mtab==="email"||mtab==="sms"||mtab==="push")&&<>
        {/* Channel KPIs */}
        {(()=>{const t=chTot(mtab);return <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
          {[{l:"Campaigns",v:t.cnt,c:mktChC(mtab)},{l:"Sent",v:t.sent.toLocaleString(),c:C.cy},{l:"Delivered",v:mktPct(t.del,t.sent)+"%",c:C.g},{l:mtab==="email"?"Open Rate":"Read Rate",v:mktPct(t.read,t.del)+"%",c:C.p},{l:"Click Rate",v:mktPct(t.click,t.read)+"%",c:C.y}].map(k=>(
            <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:5}}>{k.l}</div>
              <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>;})()}
        {/* Filter bar */}
        <div style={{display:"flex",gap:4,marginBottom:12}}>
          {["all","active","sent","scheduled","draft","paused"].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:filter===s?mktStC(s)+"22":"transparent",color:filter===s?mktStC(s):C.t3,border:`1px solid ${filter===s?mktStC(s)+"55":C.b1}`,textTransform:"capitalize"}}>{s==="all"?"All":s}</button>
          ))}
        </div>
        <CampTable data={vis}/>
      </>}

      {/* ═══ AUTOMATIONS ═══ */}
      {mtab==="automations"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Marketing Automations</div><div style={{fontSize:12,color:C.t3}}>Automated multi-step campaigns triggered by events</div></div>
          <Btn ch="+ Create Automation" v="primary" onClick={openNewAuto}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:16}}>
          {[{l:"Total",v:autos.length,c:C.a},{l:"Active",v:autos.filter(a=>a.status).length,c:C.g},{l:"Enrolled",v:autos.reduce((s,a)=>s+a.enrolled,0).toLocaleString(),c:C.cy}].map(k=>(
            <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {/* Create card */}
          <div onClick={openNewAuto} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 16px",cursor:"pointer",minHeight:180}} className="hov">
            <div style={{width:44,height:44,borderRadius:14,background:C.ad,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><NavIcon id="workflow" s={20} col={C.a}/></div>
            <div style={{fontSize:13,fontWeight:700,color:C.a,fontFamily:FD}}>Create Automation</div>
            <div style={{fontSize:10,color:C.t3,textAlign:"center",marginTop:4}}>Build a multi-step flow triggered by events</div>
          </div>
          {autos.map(a=>(
            <div key={a.id} style={{background:C.s1,border:`1px solid ${a.status?mktChC(a.ch)+"44":C.b1}`,borderRadius:14,padding:"16px",transition:"all .2s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:34,height:34,borderRadius:9,background:mktChC(a.ch)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{mktChE(a.ch)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{a.name}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>Trigger: {a.trigger}</div>
                </div>
                <Toggle val={a.status} set={v=>{setAutos(p=>p.map(x=>x.id===a.id?{...x,status:v}:x));showT(`${a.name} ${v?"enabled":"disabled"}`,v?"success":"info");}}/>
              </div>
              {/* Flow steps */}
              <div style={{marginBottom:12}}>
                {a.steps.map((st,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<a.steps.length-1?4:0}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:a.status?mktChC(a.ch)+"22":C.s3,border:`1px solid ${a.status?mktChC(a.ch)+"44":C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:a.status?mktChC(a.ch):C.t3,fontWeight:700,fontFamily:FM,flexShrink:0}}>{i+1}</div>
                    <span style={{fontSize:11,color:a.status?C.t2:C.t3}}>{st}</span>
                    {i<a.steps.length-1&&<span style={{fontSize:10,color:C.t3,marginLeft:"auto"}}>→</span>}
                  </div>
                ))}
              </div>
              {/* Stats */}
              <div style={{display:"flex",gap:12,padding:"8px 10px",background:C.s2,borderRadius:8,marginBottom:10}}>
                {[{l:"Enrolled",v:a.enrolled},{l:"Completed",v:a.completed},{l:"Rate",v:mktPct(a.completed,a.enrolled)+"%"}].map(s=>(
                  <div key={s.l} style={{textAlign:"center",flex:1}}>
                    <div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{s.l}</div>
                    <div style={{fontSize:13,fontWeight:800,fontFamily:FM,color:a.status?C.t1:C.t3}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {/* Actions */}
              <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                <button onClick={()=>openEditAuto(a)} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.cy,background:C.cy+"14",border:`1px solid ${C.cy}44`,cursor:"pointer",fontFamily:FM}}>Edit</button>
                <button onClick={()=>dupAuto(a)} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.t3,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FM}}>⧉</button>
                <button onClick={()=>delAuto(a.id)} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,cursor:"pointer",fontFamily:FM}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ═══ CREATE/EDIT AUTOMATION MODAL ═══ */}
      {showAutoModal&&<Mdl title={editAuto?"Edit Automation":"Create New Automation"} onClose={()=>{setShowAutoModal(false);setEditAuto(null);}} w={580}>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><Fld label="Automation Name"><Inp val={autoName} set={setAutoName} ph="e.g. Welcome Series"/></Fld></div>
          <div style={{flex:1}}><Fld label="Primary Channel">
            <div style={{display:"flex",gap:4}}>
              {[["whatsapp","WA","#25d366"],["email","Email",C.a],["sms","SMS",C.y],["push","Push","#ff6b35"]].map(([id,lbl,clr])=>(
                <button key={id} onClick={()=>setAutoCh(id)} style={{flex:1,padding:"7px",borderRadius:8,fontSize:10,fontWeight:700,cursor:"pointer",background:autoCh===id?clr+"18":"transparent",color:autoCh===id?clr:C.t3,border:`1.5px solid ${autoCh===id?clr+"55":C.b1}`,fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><ChIcon t={id} s={12}/>{lbl}</button>
              ))}
            </div>
          </Fld></div>
        </div>
        <Fld label="Trigger Event">
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {AUTO_TRIGGERS.map(tr=>(
              <button key={tr} onClick={()=>setAutoTrigger(tr)} style={{padding:"5px 10px",borderRadius:8,fontSize:10,fontWeight:600,cursor:"pointer",background:autoTrigger===tr?C.ad:C.s2,color:autoTrigger===tr?C.a:C.t3,border:`1.5px solid ${autoTrigger===tr?C.a+"55":C.b1}`,fontFamily:FB}}>{tr}</button>
            ))}
          </div>
        </Fld>
        <Fld label={"Flow Steps ("+autoSteps.length+")"}>
          <div style={{background:C.s2,borderRadius:10,padding:"12px",marginBottom:8}}>
            {autoSteps.map((st,i)=>(
              <div key={i} style={{marginBottom:8}}>
                {i>0&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 0"}}><div style={{width:1,height:12,background:C.b2}}/></div>}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:(AUTO_STEP_TYPES.find(t=>t.v===st.type)?.c||C.a)+"22",border:`1px solid ${(AUTO_STEP_TYPES.find(t=>t.v===st.type)?.c||C.a)+"44"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:AUTO_STEP_TYPES.find(t=>t.v===st.type)?.c||C.a,fontWeight:800,fontFamily:FM,flexShrink:0}}>{i+1}</div>
                  <Sel val={st.type} set={v=>setAutoSteps(p=>p.map((x,j)=>j===i?{...x,type:v}:x))} opts={AUTO_STEP_TYPES.map(t=>({v:t.v,l:t.l}))} sx={{width:130}}/>
                  <input value={st.text} onChange={e=>setAutoSteps(p=>p.map((x,j)=>j===i?{...x,text:e.target.value}:x))} placeholder={st.type==="send"?"e.g. Send welcome email":st.type==="wait"?"e.g. Wait 2 days":st.type==="condition"?"e.g. If opened previous email":st.type==="tag"?"e.g. Add tag: engaged":st.type==="notify"?"e.g. Notify support team":st.type==="update"?"e.g. Set status to active":"Step description"} style={{flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:7,padding:"6px 10px",fontSize:11.5,color:C.t1,fontFamily:FB,outline:"none"}}/>
                  {autoSteps.length>1&&<button onClick={()=>setAutoSteps(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:13,flexShrink:0}}>×</button>}
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {AUTO_STEP_TYPES.map(t=>(
              <button key={t.v} onClick={()=>setAutoSteps(p=>[...p,{type:t.v,text:""}])} style={{padding:"4px 10px",borderRadius:6,fontSize:9,fontWeight:700,color:t.c,background:t.c+"14",border:`1px solid ${t.c}44`,cursor:"pointer",fontFamily:FM,display:"flex",alignItems:"center",gap:3}}>+ {t.l}</button>
            ))}
          </div>
        </Fld>
        {/* Preview */}
        {autoSteps.filter(s=>s.text.trim()).length>0&&<div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",marginBottom:12}}>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",marginBottom:8}}>FLOW PREVIEW</div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
            <Tag text={autoTrigger} color={C.p}/>
            <span style={{color:C.t3}}>→</span>
            {autoSteps.filter(s=>s.text.trim()).map((s,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4}}>{i>0&&<span style={{color:C.t3}}>→</span>}<Tag text={s.text} color={AUTO_STEP_TYPES.find(t=>t.v===s.type)?.c||C.a}/></span>)}
          </div>
        </div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn ch="Cancel" v="ghost" onClick={()=>{setShowAutoModal(false);setEditAuto(null);}}/>
          <Btn ch={editAuto?"Update":"Create Automation"} v="primary" onClick={saveAuto}/>
        </div>
      </Mdl>}

      {/* ═══ ANALYTICS ═══ */}
      {mtab==="analytics"&&<>
        {/* Channel comparison */}
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px",marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Channel Comparison</div>
          {["whatsapp","email","sms","push"].map(ch=>{const t=chTot(ch);const maxS=Math.max(...["whatsapp","email","sms","push"].map(c=>chTot(c).sent),1);return(
            <div key={ch} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:28,height:28,borderRadius:7,background:mktChC(ch)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{mktChE(ch)}</div>
              <span style={{fontSize:12,color:C.t2,width:70,flexShrink:0}}>{mktChL(ch)}</span>
              <div style={{flex:1,height:10,background:C.bg,borderRadius:5,overflow:"hidden"}}><div style={{width:`${(t.sent/maxS)*100}%`,height:"100%",background:`linear-gradient(90deg,${mktChC(ch)}aa,${mktChC(ch)})`,borderRadius:5,transition:"width .6s"}}/></div>
              <span style={{fontSize:11,fontWeight:700,fontFamily:FM,color:mktChC(ch),width:50,textAlign:"right"}}>{t.sent.toLocaleString()}</span>
            </div>
          );})}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          {/* Delivery health rings */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Delivery Health</div>
            <div style={{display:"flex",justifyContent:"space-around"}}>
              {[{l:"Delivery",v:mktPct(tot.del,tot.sent),c:C.g},{l:"Read/Open",v:mktPct(tot.read,tot.del),c:C.p},{l:"Click",v:mktPct(tot.click,tot.read),c:C.y}].map(r=>(
                <div key={r.l} style={{textAlign:"center"}}>
                  <svg viewBox="0 0 80 80" style={{width:70,height:70}}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={C.b1} strokeWidth="6"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={r.c} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${r.v*2.01} 201`} transform="rotate(-90 40 40)" style={{transition:"stroke-dasharray .8s"}}/>
                    <text x="40" y="38" textAnchor="middle" style={{fontSize:14,fontWeight:800,fill:r.c}}>{r.v}%</text>
                    <text x="40" y="50" textAnchor="middle" style={{fontSize:7,fill:C.t3}}>{r.l}</text>
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Goal breakdown */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:14}}>Campaign Goals</div>
            {["promotion","engagement","retention"].map(g=>{const cnt=camps.filter(c=>c.goal===g).length;return(
              <div key={g} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <Tag text={g} color={mktGoalC(g)}/>
                <div style={{flex:1,height:7,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:`${(cnt/camps.length)*100}%`,height:"100%",background:mktGoalC(g),borderRadius:4}}/></div>
                <span style={{fontSize:11,fontFamily:FM,color:C.t2}}>{cnt}</span>
              </div>
            );})}
          </div>
        </div>

        {/* Top campaigns by ROI */}
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`}}><span style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Top Campaigns by ROI</span></div>
          <div style={{display:"grid",gridTemplateColumns:"40px 2fr 0.8fr 0.8fr 0.8fr 0.8fr",padding:"8px 18px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["#","Campaign","Channel","Revenue","Cost","ROI"].map(h=><span key={h} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM}}>{h}</span>)}
          </div>
          {camps.filter(c=>c.roi!=="—").sort((a,b)=>parseFloat(b.roi.replace(/[^0-9.]/g,""))-parseFloat(a.roi.replace(/[^0-9.]/g,""))).slice(0,5).map((c,i)=>(
            <div key={c.id} style={{display:"grid",gridTemplateColumns:"40px 2fr 0.8fr 0.8fr 0.8fr 0.8fr",padding:"11px 18px",borderBottom:`1px solid ${C.b1}`,alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:800,fontFamily:FD,color:i===0?C.g:i===1?C.y:C.t2}}>{i+1}</span>
              <span style={{fontSize:12,fontWeight:600}}>{c.name}</span>
              <Tag text={c.ch} color={mktChC(c.ch)}/>
              <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:C.g}}>{c.revenue}</span>
              <span style={{fontSize:11,fontFamily:FM,color:C.t3}}>{c.cost}</span>
              <span style={{fontSize:12,fontWeight:800,fontFamily:FM,color:C.g}}>{c.roi}</span>
            </div>
          ))}
        </div>
      </>}

      {/* ═══ AI STUDIO ═══ */}
      {mtab==="ai_studio"&&<>
        <div style={{display:"flex",gap:10,marginBottom:18}}>
          {[["subjects","Subject Lines","send"],["copywriter","Copy Writer","newconv"],["timing","Smart Timing","monitor"],["advisor","Performance Advisor","reports"]].map(([id,lbl,navId])=>(
            <button key={id} onClick={()=>{setAiTool(id);setAiResult("");}} style={{flex:1,padding:"14px 12px",borderRadius:12,background:aiTool===id?C.pd:C.s1,border:`1.5px solid ${aiTool===id?C.p+"55":C.b1}`,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><NavIcon id={navId} s={14} col={aiTool===id?C.p:C.t2}/><span style={{fontSize:12,fontWeight:700,color:aiTool===id?C.p:C.t1}}>{lbl}</span></div>
            </button>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {/* Input panel */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>{aiTool==="subjects"?"Subject Line Generator":aiTool==="copywriter"?"AI Copy Writer":aiTool==="timing"?"Smart Send Timing":"Performance Advisor"}</div>
            {(aiTool==="subjects"||aiTool==="copywriter")&&<>
              <Fld label="Topic / Brief"><textarea value={aiInput} onChange={e=>setAiInput(e.target.value)} rows={3} placeholder={aiTool==="subjects"?"e.g. Spring sale, 25% off all plans":"Describe what you want to promote…"} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none"}}/></Fld>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><Fld label="Tone"><Sel val={aiTone} set={setAiTone} opts={[{v:"professional",l:"Professional"},{v:"friendly",l:"Friendly"},{v:"urgent",l:"Urgent"},{v:"playful",l:"Playful"},{v:"minimal",l:"Minimal"}]}/></Fld></div>
                {aiTool==="copywriter"&&<div style={{flex:1}}><Fld label="Channel"><Sel val={aiCh} set={setAiCh} opts={[{v:"email",l:"Email"},{v:"whatsapp",l:"WhatsApp"},{v:"sms",l:"SMS"},{v:"push",l:"Push"}]}/></Fld></div>}
              </div>
            </>}
            {aiTool==="timing"&&<Fld label="Describe your audience"><textarea value={aiInput} onChange={e=>setAiInput(e.target.value)} rows={3} placeholder="e.g. B2B SaaS users in India, mostly founders and developers" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none"}}/></Fld>}
            {aiTool==="advisor"&&<Fld label="Paste campaign metrics"><textarea value={aiInput} onChange={e=>setAiInput(e.target.value)} rows={4} placeholder="e.g. Email campaign: 12,000 sent, 38% open rate, 4% CTR, 0.8% conversion" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"none",outline:"none"}}/></Fld>}
            <Btn ch={aiLoading?"✦ Generating…":"✦ Generate with AI"} v="ai" full disabled={aiLoading||!aiInput.trim()} onClick={async()=>{
              setAiLoading(true);setAiResult("");
              const prompts={subjects:"Generate exactly 5 email subject lines for: "+aiInput+". Tone: "+aiTone+". Number them 1-5. Just the lines, no commentary.",
                copywriter:"Write a "+aiCh+" marketing message for: "+aiInput+". Tone: "+aiTone+". "+(aiCh==="sms"?"Keep under 160 chars.":"Be concise, 2-4 sentences.")+" Include a CTA. No markdown.",
                timing:"For this audience: "+aiInput+", suggest the optimal send times for Email, WhatsApp, and SMS. Give specific days and times with brief reasoning for each. No markdown.",
                advisor:"Analyze these campaign metrics and give 4 specific optimization recommendations with industry benchmarks: "+aiInput+". Number them 1-4. Be specific and actionable. No markdown."};
              try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,system:"You are a marketing analytics expert. Be specific, data-driven, and actionable. No markdown formatting.",messages:[{role:"user",content:prompts[aiTool]}]})});
                const data=await res.json();setAiResult(data.content?.[0]?.text||"Unable to generate. Try again.");
              }catch(e){setAiResult("AI service unavailable. Please try again.");}
              setAiLoading(false);
            }}/>
          </div>

          {/* Results panel */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
            <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:14}}>Results</div>
            {aiLoading&&<div style={{display:"flex",gap:8,alignItems:"center",padding:"20px 0"}}><Spin/><span style={{fontSize:12,color:C.t2}}>AI is generating…</span></div>}
            {!aiLoading&&!aiResult&&<div style={{padding:"30px",textAlign:"center",color:C.t3,fontSize:12}}>Enter your input and click Generate to see AI-powered results here</div>}
            {!aiLoading&&aiResult&&<div style={{fontSize:12.5,color:C.t2,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiResult}</div>}
            {!aiLoading&&aiResult&&aiTool==="subjects"&&<div style={{marginTop:14,display:"flex",gap:8}}>
              <Btn ch="🔄 Regenerate" v="ghost" sm onClick={()=>{setAiResult("");}}/>
              <Btn ch="⚡ A/B Test Top 2" v="ai" sm onClick={()=>{setShowABTest(true);}}/>
            </div>}
            {!aiLoading&&aiResult&&aiTool==="copywriter"&&<div style={{marginTop:14,display:"flex",gap:8}}>
              <Btn ch="Use in Campaign" v="primary" sm onClick={()=>{setShowModal(true);showT("Copy pasted to new campaign","success");}}/>
              <Btn ch="🔄 Regenerate" v="ghost" sm/>
            </div>}
          </div>
        </div>
      </>}

      {/* ═══ SEGMENTS ═══ */}
      {mtab==="segments"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          {/* Segments list */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:FD}}>Audience Segments ({segments.length})</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {segments.map(sg=>(
                <div key={sg.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>{sg.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{sg.name}</div>
                      <div style={{fontSize:10,color:C.t3}}>{sg.desc}</div>
                      {sg.rules&&<div style={{display:"flex",gap:3,marginTop:3,flexWrap:"wrap"}}>{sg.rules.map((r,i)=><span key={i} style={{fontSize:8,background:C.pd,color:C.p,padding:"1px 5px",borderRadius:3,fontFamily:FM}}>{r.attr} {r.op} {r.val}</span>)}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:800,fontFamily:FM,color:C.a}}>{sg.count.toLocaleString()}</div>
                      <div style={{fontSize:9,color:C.t3}}>contacts</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4,marginTop:8,justifyContent:"flex-end"}}>
                    <button onClick={()=>{setSegName(sg.name);setSegRules(sg.rules||[{attr:"status",op:"equals",val:"active"}]);setEditSeg(sg);}} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.t2,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FM}}>Edit</button>
                    <button onClick={()=>{setEditCamp(null);setShowModal(true);showT("Campaign for "+sg.name,"info");}} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer",fontFamily:FM}}>Campaign</button>
                    {!sg.fixed&&<button onClick={()=>{setSegments(p=>p.filter(x=>x.id!==sg.id));showT("Segment deleted","success");}} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,cursor:"pointer",fontFamily:FM}}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Segment builder */}
          <div>
            <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:12}}>{editSeg?"Edit Segment":"Create New Segment"}</div>
            <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:14,padding:"18px"}}>
              <Fld label="Segment Name"><Inp val={segName} set={setSegName} ph="e.g. High-intent trial users"/></Fld>
              {/* Mode toggle */}
              <Fld label="Source">
                <div style={{display:"flex",gap:0,marginBottom:4}}>
                  {[{id:"rules",l:"Filter Rules",i:"⚙"},{id:"manual",l:"Manual Entry",i:"✏"},{id:"csv",l:"Upload CSV",i:"📄"}].map(m=>(
                    <button key={m.id} onClick={()=>setSegMode(m.id)} style={{flex:1,padding:"10px 8px",fontSize:11,fontWeight:700,cursor:"pointer",background:segMode===m.id?C.ad:"transparent",color:segMode===m.id?C.a:C.t3,border:`1.5px solid ${segMode===m.id?C.a+"55":C.b1}`,borderRadius:m.id==="rules"?"10px 0 0 10px":m.id==="csv"?"0 10px 10px 0":"0",fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                      <span style={{fontSize:13}}>{m.i}</span>{m.l}
                    </button>
                  ))}
                </div>
              </Fld>

              {/* RULES MODE */}
              {segMode==="rules"&&<>
                <Fld label="Filter Rules">
                  {segRules.map((r,i)=>(
                    <div key={i} style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                      {i>0&&<span style={{fontSize:10,color:C.p,fontFamily:FM,fontWeight:700,width:30,flexShrink:0}}>AND</span>}
                      <Sel val={r.attr} set={v=>setSegRules(p=>p.map((x,j)=>j===i?{...x,attr:v}:x))} opts={[{v:"status",l:"Status"},{v:"plan",l:"Plan"},{v:"activity",l:"Last Activity"},{v:"spend",l:"Total Spend"},{v:"channel",l:"Channel"},{v:"tags",l:"Tags"},{v:"location",l:"Location"},{v:"language",l:"Language"}]} sx={{flex:1}}/>
                      <Sel val={r.op} set={v=>setSegRules(p=>p.map((x,j)=>j===i?{...x,op:v}:x))} opts={[{v:"equals",l:"equals"},{v:"not_equals",l:"not equals"},{v:"contains",l:"contains"},{v:"greater_than",l:"greater than"},{v:"less_than",l:"less than"}]} sx={{flex:1}}/>
                      <Inp val={r.val} set={v=>setSegRules(p=>p.map((x,j)=>j===i?{...x,val:v}:x))} ph="value" sx={{flex:1}}/>
                      {segRules.length>1&&<button onClick={()=>setSegRules(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:14}}>×</button>}
                    </div>
                  ))}
                  <button onClick={()=>setSegRules(p=>[...p,{attr:"status",op:"equals",val:""}])} style={{fontSize:11,color:C.a,background:"none",border:`1px dashed ${C.a}44`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontFamily:FB,width:"100%"}}>+ Add Rule</button>
                </Fld>
              </>}

              {/* MANUAL MODE */}
              {segMode==="manual"&&<>
                <Fld label="Enter Emails (one per line, or comma/semicolon separated)">
                  <textarea value={manualEmails} onChange={e=>setManualEmails(e.target.value)} rows={6} placeholder={"arjun@mail.com\nsarah@startup.io\nmarcus@corp.com\nnadia@eu.co"} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,fontFamily:FM,resize:"vertical",outline:"none",lineHeight:1.8,boxSizing:"border-box"}}/>
                </Fld>
                {manualEmails.trim()&&<div style={{background:C.s2,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                  <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>PREVIEW ({parseManualEmails().length} valid emails)</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",maxHeight:80,overflowY:"auto"}}>
                    {parseManualEmails().slice(0,20).map(c=>(
                      <span key={c.id} style={{fontSize:10,background:c.valid?C.gd:C.rd,color:c.valid?C.g:C.r,padding:"2px 7px",borderRadius:5,fontFamily:FM}}>{c.email}</span>
                    ))}
                    {parseManualEmails().length>20&&<span style={{fontSize:9,color:C.t3}}>+{parseManualEmails().length-20} more</span>}
                  </div>
                </div>}
              </>}

              {/* CSV UPLOAD MODE */}
              {segMode==="csv"&&<>
                <Fld label="Upload CSV or Excel File">
                  <div style={{border:`2px dashed ${csvContacts.length>0?C.g:C.a}44`,borderRadius:12,padding:"24px 16px",textAlign:"center",background:csvContacts.length>0?C.gd:C.ad,cursor:"pointer",transition:"all .2s",position:"relative"}} onClick={()=>document.getElementById("csvUpload")?.click()}>
                    <input id="csvUpload" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)parseCsv(f);}}/>
                    {csvParsing?<><Spin/><div style={{fontSize:12,color:C.t2,marginTop:8}}>Parsing file…</div></>:
                    csvContacts.length>0?<>
                      <div style={{fontSize:24,marginBottom:6}}>✅</div>
                      <div style={{fontSize:13,fontWeight:700,color:C.g}}>{csvFileName}</div>
                      <div style={{fontSize:11,color:C.t2,marginTop:2}}>{csvContacts.length} contacts parsed · {csvContacts.filter(c=>c.valid).length} valid emails</div>
                      <button onClick={e=>{e.stopPropagation();setCsvContacts([]);setCsvFileName("");}} style={{fontSize:10,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,borderRadius:5,padding:"3px 10px",cursor:"pointer",marginTop:8,fontFamily:FM}}>Remove File</button>
                    </>:<>
                      <div style={{fontSize:28,marginBottom:8,opacity:.5}}>📄</div>
                      <div style={{fontSize:13,fontWeight:700,color:C.a}}>Click to upload or drag & drop</div>
                      <div style={{fontSize:11,color:C.t3,marginTop:4}}>Supports CSV, TSV, TXT</div>
                      <div style={{fontSize:10,color:C.t3,marginTop:2}}>Required column: <strong>email</strong> · Optional: name, phone</div>
                    </>}
                  </div>
                </Fld>
                {csvContacts.length>0&&<div style={{background:C.s2,borderRadius:8,overflow:"hidden",marginBottom:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"30px 1fr 1.5fr 40px",padding:"6px 10px",borderBottom:`1px solid ${C.b1}`,background:C.s3}}>
                    {["#","Name","Email","✓"].map(h=><span key={h} style={{fontSize:8,fontWeight:700,color:C.t3,fontFamily:FM}}>{h}</span>)}
                  </div>
                  <div style={{maxHeight:140,overflowY:"auto"}}>
                    {csvContacts.slice(0,50).map((c,i)=>(
                      <div key={c.id} style={{display:"grid",gridTemplateColumns:"30px 1fr 1.5fr 40px",padding:"4px 10px",borderBottom:`1px solid ${C.b1}22`,fontSize:10,color:c.valid?C.t2:C.r}}>
                        <span style={{fontFamily:FM,color:C.t3}}>{i+1}</span>
                        <span>{c.name}</span>
                        <span style={{fontFamily:FM}}>{c.email}</span>
                        <span style={{color:c.valid?C.g:C.r}}>{c.valid?"✓":"✕"}</span>
                      </div>
                    ))}
                    {csvContacts.length>50&&<div style={{padding:"6px 10px",textAlign:"center",fontSize:9,color:C.t3}}>… and {csvContacts.length-50} more rows</div>}
                  </div>
                  <div style={{padding:"6px 10px",borderTop:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",fontSize:9,color:C.t3,fontFamily:FM}}>
                    <span>Total: {csvContacts.length}</span>
                    <span style={{color:C.g}}>Valid: {csvContacts.filter(c=>c.valid).length}</span>
                    <span style={{color:C.r}}>Invalid: {csvContacts.filter(c=>!c.valid).length}</span>
                  </div>
                </div>}

                <div style={{background:C.ad,border:`1px solid ${C.a}33`,borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:10,color:C.t2}}>
                  <strong>CSV Format:</strong> First row = headers. Must include an "email" column. Example:<br/>
                  <code style={{fontFamily:FM,fontSize:9,color:C.a}}>name,email,phone<br/>Arjun Mehta,arjun@mail.com,+91-9876543210</code>
                </div>
              </>}

              <Fld label="Icon">
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{["👥","🟢","💤","💎","🆕","🛒","📰","🏢","⚠️","🏆","🎯","📈","💰","🔁","🌍","📱"].map(ic=>(
                  <button key={ic} onClick={()=>setSegIcon(ic)} style={{width:30,height:30,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${segIcon===ic?C.a:C.b1}`,background:segIcon===ic?C.ad:"transparent",cursor:"pointer"}}>{ic}</button>
                ))}</div>
              </Fld>
              <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px",textAlign:"center",marginBottom:14}}>
                <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:3}}>{segMode==="rules"?"ESTIMATED REACH":"CONTACTS COUNT"}</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:FD,color:segReach>0?C.a:C.t3}}>{segReach.toLocaleString()}</div>
                <div style={{fontSize:10,color:C.t3}}>{segMode==="rules"?`contacts match ${segRules.filter(r=>r.val).length} rule${segRules.filter(r=>r.val).length!==1?"s":""}`:segMode==="manual"?"emails entered manually":"contacts from uploaded file"}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {editSeg&&<Btn ch="Cancel" v="ghost" full onClick={()=>{setEditSeg(null);setSegName("");setSegRules([{attr:"status",op:"equals",val:""}]);setSegIcon("🎯");setSegMode("rules");setManualEmails("");setCsvContacts([]);setCsvFileName("");}}/>}
                <Btn ch={editSeg?"Update Segment":"Save Segment"} v="primary" full onClick={()=>{
                  if(!segName.trim())return showT("Name required","error");
                  if(segMode==="rules"&&!segRules.some(r=>r.val.trim()))return showT("Add at least one rule with a value","error");
                  if(segMode==="manual"&&parseManualEmails().length===0)return showT("Enter at least one valid email","error");
                  if(segMode==="csv"&&csvContacts.length===0)return showT("Upload a CSV file first","error");
                  const desc=segMode==="rules"?segRules.map(r=>`${r.attr} ${r.op} ${r.val}`).join(" AND "):segMode==="manual"?`${parseManualEmails().length} manually entered contacts`:`Uploaded from ${csvFileName} (${csvContacts.filter(c=>c.valid).length} contacts)`;
                  const payload={name:segName,desc,count:segReach,icon:segIcon,rules:segMode==="rules"?[...segRules]:null,source:segMode,contacts:segMode==="manual"?parseManualEmails():segMode==="csv"?csvContacts.filter(c=>c.valid):null};
                  if(editSeg){setSegments(p=>p.map(s=>s.id===editSeg.id?{...s,...payload}:s));showT("Segment updated!","success");setEditSeg(null);}
                  else{setSegments(p=>[...p,{id:"sg"+uid(),...payload}]);showT("Segment '"+segName+"' created with "+segReach+" contacts!","success");}
                  setSegName("");setSegRules([{attr:"status",op:"equals",val:""}]);setSegIcon("🎯");setManualEmails("");setCsvContacts([]);setCsvFileName("");setSegMode("rules");
                }}/>
                <Btn ch="→ Campaign" v="ai" full onClick={()=>{
                  if(!segName.trim())return showT("Name the segment first","error");
                  if(segReach===0)return showT("Segment is empty","error");
                  const desc=segMode==="rules"?segRules.map(r=>`${r.attr} ${r.op} ${r.val}`).join(" AND "):`${segReach} contacts (${segMode})`;
                  setSegments(p=>[...p,{id:"sg"+uid(),name:segName,desc,count:segReach,icon:segIcon,source:segMode}]);
                  setShowModal(true);showT("Segment saved → creating campaign","success");
                }}/>
              </div>
            </div>
          </div>
        </div>
      </>}

      {/* ═══ TEMPLATES ═══ */}
      {mtab==="templates"&&<>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",gap:4}}>
            {["all","email","whatsapp","sms","push"].map(f=>(
              <button key={f} onClick={()=>setTplFilter(f)} style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:tplFilter===f?mktChC(f)+"22":"transparent",color:tplFilter===f?mktChC(f):C.t3,border:`1px solid ${tplFilter===f?mktChC(f)+"55":C.b1}`,textTransform:"capitalize"}}>{f==="all"?"All Channels":mktChL(f)}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:4}}>
            {["all","Onboarding","Promotion","Retention","Engagement","Billing","Transactional"].map(cat=>(
              <button key={cat} onClick={()=>setTplCatFilter(cat)} style={{padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:600,cursor:"pointer",background:tplCatFilter===cat?C.s3:"transparent",color:tplCatFilter===cat?C.t1:C.t3,border:`1px solid ${tplCatFilter===cat?C.b2:C.b1}`}}>{cat==="all"?"All":cat}</button>
            ))}
          </div>
          <div style={{flex:1}}/>
          <Btn ch="+ Create Template" v="primary" onClick={openNewTpl}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {/* Create card */}
          <div onClick={openNewTpl} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 16px",cursor:"pointer",transition:"all .15s",minHeight:180}} className="hov">
            <div style={{width:44,height:44,borderRadius:14,background:C.ad,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><NavIcon id="newconv" s={20} col={C.a}/></div>
            <div style={{fontSize:13,fontWeight:700,color:C.a,fontFamily:FD}}>Create Template</div>
            <div style={{fontSize:10,color:C.t3,textAlign:"center",marginTop:4}}>Build a reusable message template for any channel</div>
          </div>
          {templates.filter(t=>(tplFilter==="all"||t.ch===tplFilter)&&(tplCatFilter==="all"||t.cat===tplCatFilter)).map(t=>(
            <div key={t.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",transition:"all .15s"}}>
              <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <span style={{fontSize:14}}>{mktChE(t.ch)}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.t1,flex:1}}>{t.name}</span>
                </div>
                <div style={{fontSize:10.5,color:C.t3,lineHeight:1.4,marginBottom:8}}>{t.desc}</div>
                <div style={{display:"flex",gap:6}}>
                  <Tag text={t.cat} color={mktGoalC(t.cat.toLowerCase())}/>
                  <Tag text={t.ch} color={mktChC(t.ch)}/>
                </div>
              </div>
              <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:12}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>OPEN</div><div style={{fontSize:12,fontWeight:800,fontFamily:FM,color:t.openRate>=50?C.g:t.openRate>=35?C.y:C.t2}}>{t.openRate}%</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>CTR</div><div style={{fontSize:12,fontWeight:800,fontFamily:FM,color:t.ctr>=20?C.g:t.ctr>=12?C.y:C.t2}}>{t.ctr}%</div></div>
                </div>
                <div style={{display:"flex",gap:3}}>
                  <button onClick={()=>setTplPreview(tplPreview===t.id?null:t.id)} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.t2,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>{tplPreview===t.id?"Hide":"Preview"}</button>
                  <button onClick={()=>openEditTpl(t)} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.cy,background:C.cy+"14",border:`1px solid ${C.cy}44`,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>dupTpl(t)} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.t3,background:C.s3,border:`1px solid ${C.b1}`,cursor:"pointer"}}>⧉</button>
                  <button onClick={()=>delTpl(t.id)} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.r,background:C.rd,border:`1px solid ${C.r}44`,cursor:"pointer"}}>✕</button>
                  <button onClick={()=>{setShowModal(true);showT("Template loaded","success");}} style={{padding:"3px 8px",borderRadius:5,fontSize:9,fontWeight:600,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer"}}>Use</button>
                </div>
              </div>
              {tplPreview===t.id&&<div style={{padding:"10px 14px",background:C.bg,borderTop:`1px solid ${C.b1}`,fontSize:11.5,color:C.t2,lineHeight:1.5}}>{mktFill(t.body)}</div>}
            </div>
          ))}
        </div>
      </>}

      {/* ═══ CREATE/EDIT TEMPLATE MODAL ═══ */}
      {showTplModal&&<Mdl title={editTpl?"Edit Template":"Create New Template"} onClose={()=>{setShowTplModal(false);setEditTpl(null);}} w={560}>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><Fld label="Template Name"><Inp val={tplName} set={setTplName} ph="e.g. Welcome Series #1"/></Fld></div>
          <div style={{flex:1}}><Fld label="Description"><Inp val={tplDesc} set={setTplDesc} ph="Short description"/></Fld></div>
        </div>
        <div style={{display:"flex",gap:12}}>
          <div style={{flex:1}}><Fld label="Channel">
            <div style={{display:"flex",gap:4}}>
              {[["whatsapp","WhatsApp","#25d366"],["email","Email",C.a],["sms","SMS",C.y],["push","Push","#ff6b35"]].map(([id,lbl,clr])=>(
                <button key={id} onClick={()=>setTplCh(id)} style={{flex:1,padding:"7px",borderRadius:8,fontSize:10,fontWeight:700,cursor:"pointer",background:tplCh===id?clr+"18":"transparent",color:tplCh===id?clr:C.t3,border:`1.5px solid ${tplCh===id?clr+"55":C.b1}`,fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><ChIcon t={id} s={12}/>{lbl}</button>
              ))}
            </div>
          </Fld></div>
          <div style={{flex:1}}><Fld label="Category"><Sel val={tplCat} set={setTplCat} opts={["Onboarding","Promotion","Retention","Engagement","Billing","Transactional"].map(c=>({v:c,l:c}))}/></Fld></div>
        </div>
        {tplCh==="email"&&<Fld label="Subject Line"><Inp val={tplSubj} set={setTplSubj} ph="Email subject with {{first_name}} variables"/></Fld>}
        <Fld label="Message Body">
          <textarea value={tplBody} onChange={e=>setTplBody(e.target.value)} rows={6} placeholder={"Hi {{first_name}}!\n\nWrite your message here…\n\nBest,\n{{company}}"} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {MKT_VARS.slice(0,8).map(v=>(
                <button key={v} onClick={()=>setTplBody(p=>p+"{{"+v+"}}")} style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontFamily:FM,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer"}}>{"{"+v+"}"}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:4}}>
              {tplCh==="sms"&&<span style={{fontSize:10,color:tplBody.length>160?C.r:C.t3,fontFamily:FM}}>{tplBody.length}/160</span>}
              <button onClick={async()=>{setTplAiLoad(true);try{const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:"You are a marketing copywriter. Write a short "+tplCh+" template for category: "+tplCat+". Use {{first_name}}, {{company}}, {{link}} variables. No markdown. "+(tplCh==="sms"?"Under 160 chars.":"2-4 sentences."),messages:[{role:"user",content:"Write a "+tplCat+" "+tplCh+" template"+(tplName?" called "+tplName:"")}]})});const d=await res.json();setTplBody(d.content?.[0]?.text||"");if(tplCh==="email"&&!tplSubj)setTplSubj(tplName||"Special for you");}catch(e){setTplBody("Hi {{first_name}}! We have something special for you. Check it out: {{link}}");}setTplAiLoad(false);}} disabled={tplAiLoad} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,color:C.p,background:C.pd,border:`1px solid ${C.p}44`,cursor:"pointer",fontFamily:FM}}>{tplAiLoad?"Generating…":"✦ AI Write"}</button>
            </div>
          </div>
        </Fld>
        {/* Live preview */}
        {tplBody&&<div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",marginBottom:10}}>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",marginBottom:6}}>LIVE PREVIEW</div>
          {tplCh==="whatsapp"&&<div style={{display:"flex",gap:8}}><div style={{width:28,height:28,borderRadius:14,background:"#25d36622",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChIcon t="whatsapp" s={16}/></div>
            <div style={{padding:"9px 12px",borderRadius:"3px 12px 12px 12px",background:"#25d36612",border:"1px solid #25d36633",fontSize:12,color:C.t2,lineHeight:1.5,maxWidth:"85%"}}>{mktFill(tplBody)}</div></div>}
          {tplCh==="sms"&&<div style={{padding:"10px 12px",borderRadius:12,background:C.yd,border:`1px solid ${C.y}33`,fontSize:12,color:C.t2,lineHeight:1.5,maxWidth:"80%"}}>{mktFill(tplBody)}</div>}
          {tplCh==="email"&&<div style={{border:`1px solid ${C.b1}`,borderRadius:8,overflow:"hidden"}}>
            {tplSubj&&<div style={{padding:"8px 12px",background:C.s2,borderBottom:`1px solid ${C.b1}`,fontSize:11}}><span style={{color:C.t3}}>Subject: </span><span style={{fontWeight:600}}>{mktFill(tplSubj)}</span></div>}
            <div style={{padding:"12px",fontSize:12,color:C.t2,lineHeight:1.6,whiteSpace:"pre-line"}}>{mktFill(tplBody)}</div>
          </div>}
          {tplCh==="push"&&<div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"10px 12px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`}}><div style={{width:24,height:24,borderRadius:6,background:"#ff6b3522",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChIcon t="push" s={12}/></div>
            <div style={{fontSize:12,color:C.t2,lineHeight:1.4}}>{mktFill(tplBody)}</div></div>}
        </div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn ch="Cancel" v="ghost" onClick={()=>{setShowTplModal(false);setEditTpl(null);}}/>
          <Btn ch={editTpl?"Update Template":"Create Template"} v="primary" onClick={saveTpl}/>
        </div>
      </Mdl>}
    </div>

    {/* ═══ CAMPAIGN DETAIL MODAL ═══ */}
    {viewCamp&&<CampDetailModal camp={viewCamp} onClose={()=>setViewCamp(null)}
      onEdit={c=>{setViewCamp(null);setEditCamp(c);setShowModal(true);}}
      onDuplicate={c=>{const nw=dupCamp(c);setViewCamp(nw);}}
      onDelete={c=>{delCamp(c.id);setViewCamp(null);}}
      onPause={c=>{togglePause(c.id);setViewCamp({...c,status:c.status==="paused"?"active":"paused"});}}
      onLaunch={c=>{launchCamp(c.id);setViewCamp(null);}}
    />}

    {/* ═══ CREATE/EDIT MODAL ═══ */}
    {showModal&&<MktModal2 editCamp={editCamp} defaultCh={modalCh} segments={segments} onClose={()=>{setShowModal(false);setEditCamp(null);setModalCh(null);}} onSave={camp=>{
      if(editCamp){setCamps(p=>p.map(c=>c.id===editCamp.id?{...c,...camp}:c));showT("Campaign updated","success");}
      else{setCamps(p=>[{id:"mk"+uid(),...camp,sent:0,delivered:0,read:0,clicked:0,failed:0,unsub:0,revenue:"—",cost:"—",roi:"—",date:camp.status==="scheduled"?camp.schedDate||"—":"—",spark:[0,0,0,0,0,0,0]},...p]);showT("Campaign created!","success");}
      setShowModal(false);setEditCamp(null);
    }}/>}

    {/* A/B Test Modal */}
    {showABTest&&<ABTestModal segments={segments} onClose={()=>setShowABTest(false)} onLaunch={camp=>{
      setCamps(p=>[{id:"mk"+uid(),...camp,ab:true,sent:0,delivered:0,read:0,clicked:0,failed:0,unsub:0,revenue:"—",cost:"—",roi:"—",date:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),spark:[0,0,0,0,0,0,0]},...p]);
      setShowABTest(false);showT("A/B Test launched!","success");
    }}/>}
  </div>;
}

function MktModal2({editCamp,defaultCh,segments,onClose,onSave}){
  const [step,setStep]=useState(1);
  const [ch,setCh]=useState(editCamp?.ch||defaultCh||"whatsapp");
  const [name,setName]=useState(editCamp?.name||"");
  const [goal,setGoal]=useState(editCamp?.goal||"promotion");
  const [status,setStatus]=useState(editCamp?.status||"draft");
  const [schedDate,setSchedDate]=useState("");
  const [subject,setSubject]=useState(editCamp?.subject||"");
  const [body,setBody]=useState(editCamp?.template||"");
  const [segment,setSegment]=useState("sg1");
  const [ab,setAb]=useState(editCamp?.ab||false);
  const [aiLoading,setAiLoading]=useState(false);
  const audience=segments.find(s=>s.id===segment)?.count||0;
  const templates=ch==="whatsapp"?WA_MKT_T:ch==="sms"?SMS_MKT_T:EMAIL_MKT_T;

  // ═══ CHANNEL VALIDATORS ═══
  const SPAM_WORDS=["free","winner","congratulations","act now","limited time","click here","buy now","no cost","100%","guarantee","urgent","risk free"];
  const validate=()=>{const errs=[];const warns=[];
    // Common
    if(!name.trim())errs.push("Campaign name is required");
    if(!body.trim())errs.push("Message content is required");
    // WhatsApp
    if(ch==="whatsapp"){
      if(body.length>4096)errs.push("WhatsApp messages cannot exceed 4,096 characters ("+body.length+"/4096)");
      if(body.length>1024)warns.push("Messages over 1,024 chars may be truncated on older devices");
      if(/<[^>]+>/.test(body))errs.push("WhatsApp does not support HTML tags — use plain text only");
      if(!body.includes("{{"))warns.push("No personalization variables — add {{first_name}} for better engagement (+26% CTR)");
      if(body.match(/https?:\/\//g)?.length>3)warns.push("Too many links may trigger spam filters — keep to 1-2 links");
      if(status==="active")warns.push("WhatsApp Business requires pre-approved message templates for broadcast — ensure your template is approved");
      if(!body.toLowerCase().includes("stop")&&!body.toLowerCase().includes("opt")&&!body.toLowerCase().includes("unsubscribe"))errs.push("WhatsApp campaigns require opt-out text (e.g. 'Reply STOP to unsubscribe')");
    }
    // Email
    if(ch==="email"){
      if(!subject.trim())errs.push("Email subject line is required");
      if(subject.length>150)errs.push("Subject line too long ("+subject.length+"/150 chars) — keep under 60 for best open rates");
      if(subject.length>60)warns.push("Subject over 60 chars may be truncated on mobile ("+subject.length+" chars)");
      if(subject===subject.toUpperCase()&&subject.length>5)warns.push("ALL CAPS subject lines have 10% lower open rates");
      if((subject.match(/!/g)||[]).length>2)warns.push("Multiple exclamation marks may trigger spam filters");
      const spamHits=SPAM_WORDS.filter(w=>body.toLowerCase().includes(w)||subject.toLowerCase().includes(w));
      if(spamHits.length>0)warns.push("Spam trigger words detected: "+spamHits.join(", ")+" — may affect deliverability");
      if(!body.includes("{{"))warns.push("No personalization — emails with {{first_name}} see 29% higher open rates");
      if(!body.toLowerCase().includes("unsubscribe"))errs.push("Email campaigns require an unsubscribe link — add {{unsubscribe}} or 'Unsubscribe' text");
      if(body.length<50)warns.push("Message is very short ("+body.length+" chars) — consider adding more value content");
      const linkCount=(body.match(/https?:\/\//g)||[]).length+(body.match(/\{\{link\}\}/g)||[]).length;
      if(linkCount===0)warns.push("No CTA link found — add {{link}} or a URL for tracking");
      if(linkCount>5)warns.push("Too many links ("+linkCount+") — emails with 1-3 links perform best");
    }
    // SMS
    if(ch==="sms"){
      const smsLen=body.length;const parts=Math.ceil(smsLen/160);
      if(smsLen>480)errs.push("SMS over 480 chars (3 segments) will be very expensive — currently "+smsLen+" chars ("+parts+" segments)");
      if(smsLen>160)warns.push("Message is "+smsLen+" chars = "+parts+" SMS segments ($"+((parts*0.0079)*audience).toFixed(2)+" estimated cost for "+audience+" contacts)");
      if(smsLen===0)errs.push("SMS body cannot be empty");
      if(/[^\x00-\x7F]/.test(body))warns.push("Non-ASCII characters detected — Unicode SMS limits to 70 chars/segment instead of 160");
      if(!body.toLowerCase().includes("stop")&&!body.toLowerCase().includes("opt out"))errs.push("SMS campaigns require opt-out text (e.g. 'Reply STOP to opt out')");
      if(!body.includes("{{"))warns.push("No personalization — add {{first_name}} for 18% better response rate");
      if(body.toLowerCase().includes("http")&&!body.includes("{{link}}"))warns.push("Use {{link}} for trackable shortened URLs instead of raw URLs");
      const capsRatio=body.replace(/[^A-Za-z]/g,"").length>0?(body.replace(/[^A-Z]/g,"").length/body.replace(/[^A-Za-z]/g,"").length):0;
      if(capsRatio>0.5&&body.length>20)warns.push("Over 50% capital letters — may appear as spam and reduce deliverability");
    }
    // Push
    if(ch==="push"){
      if(body.length>240)warns.push("Push notifications over 240 chars may be truncated on Android");
      if(body.length>100)warns.push("Optimal push length is 40-100 chars — currently "+body.length);
    }
    return{errs,warns};
  };
  const {errs,warns}=validate();
  const hasBlockers=errs.length>0;
  const ValidationPanel=()=>(errs.length>0||warns.length>0)?<div style={{marginTop:10}}>
    {errs.map((e,i)=><div key={"e"+i} style={{display:"flex",gap:6,alignItems:"flex-start",padding:"6px 10px",background:C.rd,border:`1px solid ${C.r}33`,borderRadius:7,marginBottom:4,fontSize:11,color:C.r}}>
      <span style={{fontWeight:800,flexShrink:0}}>✕</span><span>{e}</span>
    </div>)}
    {warns.map((w,i)=><div key={"w"+i} style={{display:"flex",gap:6,alignItems:"flex-start",padding:"6px 10px",background:C.yd,border:`1px solid ${C.y}33`,borderRadius:7,marginBottom:4,fontSize:11,color:"#8b6914"}}>
      <span style={{fontWeight:800,flexShrink:0}}>⚠</span><span>{w}</span>
    </div>)}
  </div>:null;

  const genAI=async()=>{
    setAiLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,
          system:"You are a marketing copywriter. Write a short, compelling marketing message for a "+ch+" campaign. Goal: "+goal+". Keep it concise (2-3 sentences for WhatsApp/SMS, 4-5 for email). Use {{first_name}} for personalization. Include a CTA. No markdown.",
          messages:[{role:"user",content:"Write a "+goal+" "+ch+" marketing message"+(name?" for a campaign called "+name:"")+". Be creative and engaging."}]})});
      const data=await res.json();
      const txt=data.content?.[0]?.text||"";
      setBody(txt);if(ch==="email"&&!subject)setSubject(name||"Special offer for you");
    }catch(e){setBody("Hi {{first_name}}! We have something special just for you. Check it out now!");}
    setAiLoading(false);
  };

  const save=asStatus=>{
    if(!name.trim())return showT("Campaign name required","error");
    if(!body.trim())return showT("Content required","error");
    const v=validate();
    if(v.errs.length>0&&asStatus!=="draft"){showT("Fix "+v.errs.length+" error"+(v.errs.length>1?"s":"")+" before sending","error");return;}
    if(v.warns.length>0&&asStatus==="active"&&!window.confirm(v.warns.length+" warning"+(v.warns.length>1?"s":"")+": "+v.warns[0]+(v.warns.length>1?" (+more)":"")+"\n\nSend anyway?"))return;
    onSave({ch,name,goal,status:asStatus||status,audience,template:body,subject:ch==="email"?subject:undefined,schedDate,ab});
  };

  return <Mdl title={editCamp?"Edit Campaign":"New Campaign"} onClose={onClose} w={600}>
    {/* Steps */}
    <div style={{display:"flex",gap:0,marginBottom:18}}>
      {[{n:1,l:"Details"},{n:2,l:"Content"},{n:3,l:"Audience"},{n:4,l:"Review"}].map(s=>(
        <div key={s.n} onClick={()=>s.n<=step&&setStep(s.n)} style={{flex:1,textAlign:"center",cursor:s.n<=step?"pointer":"default",padding:"8px 0",borderBottom:`2px solid ${step===s.n?C.a:step>s.n?C.g:C.b1}`}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:step===s.n?C.a:step>s.n?C.g:C.s3,color:step>=s.n?"#fff":C.t3,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,fontFamily:FM,marginBottom:2}}>{step>s.n?"✓":s.n}</div>
          <div style={{fontSize:10,color:step===s.n?C.a:step>s.n?C.g:C.t3,fontFamily:FM,fontWeight:700}}>{s.l}</div>
        </div>
      ))}
    </div>

    {/* Step 1 */}
    {step===1&&<div>
      <Fld label="Channel">
        <div style={{display:"flex",gap:8}}>
          {[["whatsapp","WhatsApp","#25d366"],["email","Email",C.a],["sms","SMS",C.y],["push","Push","#ff6b35"]].map(([id,lbl,clr])=>(
            <button key={id} onClick={()=>setCh(id)} style={{flex:1,padding:"10px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:ch===id?clr+"18":"transparent",color:ch===id?clr:C.t3,border:`1.5px solid ${ch===id?clr+"55":C.b1}`,fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><ChIcon t={id} s={15}/>{lbl}</button>
          ))}
        </div>
      </Fld>
      <Fld label="Campaign Name"><Inp val={name} set={setName} ph="e.g. Spring Sale Blast"/></Fld>
      <Fld label="Goal">
        <div style={{display:"flex",gap:6}}>
          {[["promotion","🎯 Promotion"],["engagement","💬 Engagement"],["retention","🔄 Retention"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setGoal(id)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",background:goal===id?mktGoalC(id)+"18":"transparent",color:goal===id?mktGoalC(id):C.t3,border:`1px solid ${goal===id?mktGoalC(id)+"55":C.b1}`,fontFamily:FB}}>{lbl}</button>
          ))}
        </div>
      </Fld>
      <div style={{display:"flex",gap:14}}>
        <div style={{flex:1}}><Fld label="Status"><Sel val={status} set={setStatus} opts={[{v:"draft",l:"Draft"},{v:"scheduled",l:"Scheduled"},{v:"active",l:"Send Now"}]}/></Fld></div>
        {status==="scheduled"&&<div style={{flex:1}}><Fld label="Schedule Date"><Inp val={schedDate} set={setSchedDate} ph="DD/MM/YY"/></Fld></div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:`1px solid ${C.b1}`}}>
        <span style={{fontSize:12,color:C.t2}}>Enable A/B Testing</span><Toggle val={ab} set={setAb}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn ch="Next →" v="primary" onClick={()=>{if(!name.trim())return showT("Name required","error");setStep(2);}}/></div>
    </div>}

    {/* Step 2 */}
    {step===2&&<div>
      {templates.length>0&&<Fld label={ch==="email"?"Email Template":"Message Template"}>
        <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:120,overflowY:"auto"}}>
          {templates.map(t=>(
            <button key={t.id} onClick={()=>{setBody(t.text||"");if(t.subj)setSubject(t.subj);}} className="hov" style={{padding:"7px 10px",borderRadius:8,fontSize:11,color:C.t2,border:`1px solid ${C.b1}`,background:"transparent",cursor:"pointer",textAlign:"left",lineHeight:1.4,fontFamily:FB}}>
              <div style={{display:"flex",gap:6,marginBottom:2}}><span style={{color:mktChC(ch),fontFamily:FM,fontWeight:700,fontSize:10}}>{t.name}</span><Tag text={t.cat} color={mktGoalC(t.cat?.toLowerCase()||"")}/></div>
              <span style={{color:C.t3,fontSize:10}}>{(t.text||t.subj||"").slice(0,70)}…</span>
            </button>
          ))}
        </div>
      </Fld>}
      {ch==="email"&&<Fld label="Subject Line">
        <Inp val={subject} set={setSubject} ph="Your email subject…"/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
          <span style={{fontSize:9,color:subject.length>60?subject.length>150?C.r:C.y:C.t3,fontFamily:FM}}>{subject.length}/60 recommended{subject.length>150?" — ⚠ MAX 150":subject.length>60?" — may truncate on mobile":""}</span>
          {subject===subject.toUpperCase()&&subject.length>5&&<span style={{fontSize:9,color:C.y,fontFamily:FM}}>⚠ ALL CAPS</span>}
        </div>
      </Fld>}
      <Fld label="Message Content">
        <textarea value={body} onChange={e=>setBody(e.target.value)} rows={5} placeholder="Write your message…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {MKT_VARS.slice(0,6).map(v=>(
              <button key={v} onClick={()=>setBody(p=>p+"{{"+v+"}}")} style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontFamily:FM,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer"}}>{"{"+v+"}"}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {ch==="sms"&&<span style={{fontSize:10,color:body.length>160?body.length>480?C.r:C.y:C.t3,fontFamily:FM,fontWeight:body.length>160?700:400}}>{body.length}/160{body.length>160?" ("+Math.ceil(body.length/160)+" parts)":""}</span>}
            {ch==="whatsapp"&&<span style={{fontSize:10,color:body.length>4096?C.r:body.length>1024?C.y:C.t3,fontFamily:FM}}>{body.length}/4096</span>}
            {ch==="email"&&<span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{body.length} chars</span>}
            <button onClick={genAI} disabled={aiLoading} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,color:C.p,background:C.pd,border:`1px solid ${C.p}44`,cursor:"pointer",fontFamily:FM}}>{aiLoading?"Generating…":"✦ AI Generate"}</button>
          </div>
        </div>
      </Fld>
      {/* Preview */}
      {body&&<div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",marginBottom:8}}>
        <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",marginBottom:6}}>LIVE PREVIEW</div>
        {ch==="whatsapp"&&<div style={{display:"flex",gap:8}}><div style={{width:28,height:28,borderRadius:14,background:"#25d36622",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChIcon t="whatsapp" s={16}/></div>
          <div style={{padding:"9px 12px",borderRadius:"3px 12px 12px 12px",background:"#25d36612",border:"1px solid #25d36633",fontSize:12,color:C.t2,lineHeight:1.5,maxWidth:"85%"}}>{mktFill(body)}</div></div>}
        {ch==="sms"&&<div style={{padding:"10px 12px",borderRadius:12,background:C.yd,border:`1px solid ${C.y}33`,fontSize:12,color:C.t2,lineHeight:1.5,maxWidth:"80%"}}>{mktFill(body)}</div>}
        {ch==="email"&&<div style={{border:`1px solid ${C.b1}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",background:C.s2,borderBottom:`1px solid ${C.b1}`,fontSize:11}}>
            <span style={{color:C.t3}}>Subject: </span><span style={{fontWeight:600}}>{mktFill(subject)}</span>
          </div>
          <div style={{padding:"12px",fontSize:12,color:C.t2,lineHeight:1.6}}>{mktFill(body)}</div>
        </div>}
      </div>}
      {/* Validation */}
      <ValidationPanel/>
      {/* Channel guidelines */}
      <div style={{padding:"8px 10px",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,marginBottom:8}}>
        <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,letterSpacing:"0.4px",marginBottom:4}}>{ch.toUpperCase()} GUIDELINES</div>
        {ch==="whatsapp"&&<div style={{fontSize:10,color:C.t3,lineHeight:1.6}}>• Max 4,096 chars · No HTML · Include opt-out text · Broadcast requires approved template · 1-2 links max · Use {{first_name}} for personalization</div>}
        {ch==="email"&&<div style={{fontSize:10,color:C.t3,lineHeight:1.6}}>• Subject: under 60 chars · Avoid spam words (free, winner, urgent) · Include unsubscribe link · 1-3 CTAs · Use {{first_name}} · Avoid ALL CAPS</div>}
        {ch==="sms"&&<div style={{fontSize:10,color:C.t3,lineHeight:1.6}}>• 160 chars = 1 SMS · 161-320 = 2 SMS ($2x) · Unicode = 70 chars/segment · Include STOP opt-out · Use {{link}} for tracking · Avoid CAPS</div>}
        {ch==="push"&&<div style={{fontSize:10,color:C.t3,lineHeight:1.6}}>• Optimal 40-100 chars · Max 240 chars · Clear CTA · Personalize with {{first_name}}</div>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
        <Btn ch="← Back" v="ghost" onClick={()=>setStep(1)}/>
        <Btn ch="Next →" v="primary" onClick={()=>{if(!body.trim())return showT("Content required","error");const v=validate();if(v.errs.length>0)return showT(v.errs[0],"error");setStep(3);}}/>
      </div>
    </div>}

    {/* Step 3 */}
    {step===3&&<div>
      <Fld label="Select Audience Segment">
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {segments.map(sg=>(
            <button key={sg.id} onClick={()=>setSegment(sg.id)} className="hov" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:segment===sg.id?C.ad:C.s2,border:`1px solid ${segment===sg.id?C.a+"55":C.b1}`,cursor:"pointer",transition:"background .12s"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:segment===sg.id?C.a:C.t3,flexShrink:0}}/>
              <div style={{flex:1,textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{sg.name}</div>
                <div style={{fontSize:10,color:C.t3}}>{sg.desc}</div>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:C.a,fontFamily:FM}}>{sg.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </Fld>
      <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"14px",textAlign:"center",marginBottom:10}}>
        <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:4}}>ESTIMATED REACH</div>
        <div style={{fontSize:32,fontWeight:800,fontFamily:FD,color:C.a}}>{audience.toLocaleString()}</div>
        <div style={{fontSize:11,color:C.t3}}>contacts via {mktChL(ch)}</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn ch="← Back" v="ghost" onClick={()=>setStep(2)}/>
        <Btn ch="Review →" v="primary" onClick={()=>setStep(4)}/>
      </div>
    </div>}

    {/* Step 4: Review */}
    {step===4&&<div>
      <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:10}}>Campaign Summary</div>
      <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>
        {[["Channel",<span key="ch" style={{display:"inline-flex",alignItems:"center",gap:4}}><ChIcon t={ch} s={14}/> {mktChL(ch)}</span>],["Name",name],["Goal",goal],["Status",status],["Audience",audience.toLocaleString()+" contacts"],["A/B Test",ab?"Yes":"No"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",padding:"8px 12px",borderBottom:`1px solid ${C.b1}`}}>
            <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:90,flexShrink:0}}>{k}</span>
            <span style={{fontSize:12,color:C.t1,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{fontSize:11,fontWeight:700,color:C.t3,fontFamily:FM,marginBottom:6}}>MESSAGE PREVIEW</div>
      <div style={{padding:"12px",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,fontSize:12,color:C.t2,lineHeight:1.6,marginBottom:14}}>
        {ch==="email"&&subject&&<div style={{fontWeight:700,color:C.t1,marginBottom:6}}>Subject: {mktFill(subject)}</div>}
        {mktFill(body)}
      </div>
      {/* Validation summary */}
      <div style={{padding:"10px 14px",background:hasBlockers?C.rd:warns.length?C.yd:C.gd,border:`1px solid ${hasBlockers?C.r:warns.length?C.y:C.g}33`,borderRadius:10,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>{hasBlockers?"🚫":warns.length?"⚠️":"✅"}</span>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:hasBlockers?C.r:warns.length?"#8b6914":C.g}}>{hasBlockers?errs.length+" Error"+(errs.length>1?"s":"")+" — Fix before sending":warns.length?warns.length+" Warning"+(warns.length>1?"s":"")+" — Review recommended":"All checks passed — Ready to send!"}</div>
          {hasBlockers&&<div style={{fontSize:10,color:C.r,marginTop:2}}>{errs[0]}{errs.length>1?" (+"+( errs.length-1)+" more)":""}</div>}
          {!hasBlockers&&warns.length>0&&<div style={{fontSize:10,color:"#8b6914",marginTop:2}}>{warns[0]}{warns.length>1?" (+"+( warns.length-1)+" more)":""}</div>}
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn ch="← Back" v="ghost" onClick={()=>setStep(3)}/>
        <div style={{display:"flex",gap:8}}>
          <Btn ch="Save Draft" v="ghost" onClick={()=>save("draft")}/>
          <Btn ch={"🚀 "+({active:"Launch Now",scheduled:"Schedule",draft:"Save Draft"}[status]||"Launch")} v={hasBlockers?"ghost":"primary"} onClick={()=>{if(hasBlockers)return showT("Fix "+errs.length+" validation error"+(errs.length>1?"s":"")+" first","error");save(status);}}/>
        </div>
      </div>
    </div>}
  </Mdl>;
}

function ABTestModal({segments,onClose,onLaunch}){
  const [step,setStep]=useState(1);
  const [ch,setCh]=useState("whatsapp");
  const [name,setName]=useState("");
  const [metric,setMetric]=useState("open_rate");
  const [duration,setDuration]=useState("24h");
  const [winner,setWinner]=useState("auto");
  const [varA,setVarA]=useState("");
  const [varB,setVarB]=useState("");
  const [subjA,setSubjA]=useState("");
  const [subjB,setSubjB]=useState("");
  const [activeVar,setActiveVar]=useState("A");
  const [segment,setSegment]=useState("sg1");
  const [split,setSplit]=useState(50);
  const [aiLoadA,setAiLoadA]=useState(false);
  const [aiLoadB,setAiLoadB]=useState(false);
  const audience=segments.find(s=>s.id===segment)?.count||0;
  const countA=Math.round(audience*split/100);
  const countB=audience-countA;
  const templates=ch==="whatsapp"?WA_MKT_T:ch==="sms"?SMS_MKT_T:EMAIL_MKT_T;

  const genVariant=async(variant)=>{
    const isA=variant==="A";
    isA?setAiLoadA(true):setAiLoadB(true);
    const tone=isA?"formal, benefit-focused, professional":"casual, urgency-driven, conversational";
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:250,
          system:"You are a marketing copywriter creating variant "+variant+" of an A/B test for "+ch+". Tone: "+tone+". Use {{first_name}} for personalization. Include a CTA. "+(ch==="sms"?"Keep under 160 chars. ":"")+"No markdown. Just the message text.",
          messages:[{role:"user",content:"Write variant "+variant+" ("+(isA?"control — formal/benefit-focused":"challenger — casual/urgency-focused")+") for: "+(name||"marketing campaign")}]})});
      const data=await res.json();
      const txt=data.content?.[0]?.text||"Hi {{first_name}}! Check out our latest offer.";
      isA?setVarA(txt):setVarB(txt);
    }catch(e){isA?setVarA("Hi {{first_name}}! We have an exciting offer for you. Check it out: {{link}}"):setVarB("Hey {{first_name}}! Last chance — this deal expires soon. Grab it: {{link}}");}
    isA?setAiLoadA(false):setAiLoadB(false);
  };

  const launch=()=>{
    if(!name.trim())return showT("Test name required","error");
    if(!varA.trim()||!varB.trim())return showT("Both variants required","error");
    onLaunch({ch,name:name+" (A/B)",goal:"promotion",status:"active",audience,template:varA,subject:ch==="email"?subjA:undefined});
  };

  return <Mdl title="New A/B Test" onClose={onClose} w={640}>
    {/* Step indicator */}
    <div style={{display:"flex",gap:0,marginBottom:18}}>
      {[{n:1,l:"Setup"},{n:2,l:"Variants"},{n:3,l:"Audience"},{n:4,l:"Review"}].map(s=>(
        <div key={s.n} onClick={()=>s.n<=step&&setStep(s.n)} style={{flex:1,textAlign:"center",cursor:s.n<=step?"pointer":"default",padding:"8px 0",borderBottom:`2px solid ${step===s.n?C.p:step>s.n?C.g:C.b1}`}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:step===s.n?C.p:step>s.n?C.g:C.s3,color:step>=s.n?"#fff":C.t3,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,fontFamily:FM,marginBottom:2}}>{step>s.n?"✓":s.n}</div>
          <div style={{fontSize:10,color:step===s.n?C.p:step>s.n?C.g:C.t3,fontFamily:FM,fontWeight:700}}>{s.l}</div>
        </div>
      ))}
    </div>

    {/* ── Step 1: Setup ── */}
    {step===1&&<div>
      <Fld label="Test Name"><Inp val={name} set={setName} ph="e.g. Subject Line Test — March Promo"/></Fld>
      <Fld label="Channel">
        <div style={{display:"flex",gap:8}}>
          {[["whatsapp","WhatsApp","#25d366"],["email","Email",C.a],["sms","SMS",C.y]].map(([id,lbl,clr])=>(
            <button key={id} onClick={()=>setCh(id)} style={{flex:1,padding:"10px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:ch===id?clr+"18":"transparent",color:ch===id?clr:C.t3,border:`1.5px solid ${ch===id?clr+"55":C.b1}`,fontFamily:FB,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><ChIcon t={id} s={15}/>{lbl}</button>
          ))}
        </div>
      </Fld>
      <Fld label="Primary Metric">
        <div style={{display:"flex",gap:6}}>
          {[["open_rate","Open Rate"],["ctr","Click Rate"],["conversion","Conversion"],["revenue","Revenue"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setMetric(id)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",background:metric===id?C.p+"18":"transparent",color:metric===id?C.p:C.t3,border:`1px solid ${metric===id?C.p+"55":C.b1}`,fontFamily:FB}}>{lbl}</button>
          ))}
        </div>
      </Fld>
      <div style={{display:"flex",gap:14}}>
        <div style={{flex:1}}>
          <Fld label="Test Duration">
            <div style={{display:"flex",gap:4}}>
              {["6h","12h","24h","48h","72h"].map(d=>(
                <button key={d} onClick={()=>setDuration(d)} style={{flex:1,padding:"7px 0",borderRadius:7,fontSize:10,fontWeight:700,fontFamily:FM,cursor:"pointer",background:duration===d?C.cy+"18":"transparent",color:duration===d?C.cy:C.t3,border:`1px solid ${duration===d?C.cy+"55":C.b1}`}}>{d}</button>
              ))}
            </div>
          </Fld>
        </div>
        <div style={{flex:1}}>
          <Fld label="Winner Selection"><Sel val={winner} set={setWinner} opts={[{v:"auto",l:"Auto-send to remaining"},{v:"manual",l:"Manual review"},{v:"statistical",l:"Statistical significance"}]}/></Fld>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><Btn ch="Next →" v="primary" onClick={()=>{if(!name.trim())return showT("Name required","error");setStep(2);}}/></div>
    </div>}

    {/* ── Step 2: Variants ── */}
    {step===2&&<div>
      {/* Variant tabs */}
      <div style={{display:"flex",gap:0,marginBottom:14}}>
        {[["A","Variant A (Control)",C.a],["B","Variant B (Challenger)",C.p]].map(([id,lbl,clr])=>(
          <button key={id} onClick={()=>setActiveVar(id)} style={{flex:1,padding:"10px",fontSize:12,fontWeight:700,cursor:"pointer",background:activeVar===id?clr+"12":"transparent",color:activeVar===id?clr:C.t3,border:"none",borderBottom:`2px solid ${activeVar===id?clr:"transparent"}`,fontFamily:FB}}>{lbl}</button>
        ))}
      </div>

      {/* Template picker */}
      {templates.length>0&&<Fld label="Quick Template">
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {templates.slice(0,4).map(t=>(
            <button key={t.id} onClick={()=>{activeVar==="A"?setVarA(t.text||""):setVarB(t.text||"");if(t.subj){activeVar==="A"?setSubjA(t.subj):setSubjB(t.subj);}}} className="hov" style={{padding:"5px 10px",borderRadius:6,fontSize:10,color:C.t2,border:`1px solid ${C.b1}`,background:"transparent",cursor:"pointer",fontFamily:FB}}>{t.name}</button>
          ))}
        </div>
      </Fld>}

      {/* Subject (email) */}
      {ch==="email"&&<Fld label={activeVar==="A"?"Subject A":"Subject B"}><Inp val={activeVar==="A"?subjA:subjB} set={activeVar==="A"?setSubjA:setSubjB} ph="Email subject line…"/></Fld>}

      {/* Message body */}
      <Fld label={activeVar==="A"?"Message A (Control)":"Message B (Challenger)"}>
        <textarea value={activeVar==="A"?varA:varB} onChange={e=>activeVar==="A"?setVarA(e.target.value):setVarB(e.target.value)} rows={4} placeholder={activeVar==="A"?"Write your control variant…":"Write your challenger variant…"} style={{width:"100%",background:C.bg,border:`1px solid ${activeVar==="A"?C.a+"44":C.p+"44"}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
          <div style={{display:"flex",gap:3}}>
            {MKT_VARS.slice(0,5).map(v=>(
              <button key={v} onClick={()=>{const ins="{{"+v+"}}";activeVar==="A"?setVarA(p=>p+ins):setVarB(p=>p+ins);}} style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontFamily:FM,color:C.a,background:C.ad,border:`1px solid ${C.a}44`,cursor:"pointer"}}>{"{"+v+"}"}</button>
            ))}
          </div>
          <button onClick={()=>genVariant(activeVar)} disabled={activeVar==="A"?aiLoadA:aiLoadB} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,color:C.p,background:C.pd,border:`1px solid ${C.p}44`,cursor:"pointer",fontFamily:FM}}>{(activeVar==="A"?aiLoadA:aiLoadB)?"Generating…":"✦ AI Generate"}</button>
        </div>
      </Fld>

      {/* Side-by-side preview */}
      <div style={{fontSize:10,color:C.t3,fontFamily:FM,letterSpacing:"0.4px",marginBottom:6}}>SIDE-BY-SIDE PREVIEW</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        {[["A",varA,subjA,C.a],["B",varB,subjB,C.p]].map(([label,text,subj,clr])=>(
          <div key={label} style={{background:C.bg,border:`1px solid ${clr}33`,borderRadius:10,padding:"10px",position:"relative"}}>
            <div style={{position:"absolute",top:6,right:8,fontSize:9,fontWeight:800,fontFamily:FM,color:clr,background:clr+"18",padding:"1px 6px",borderRadius:4}}>VAR {label}</div>
            {ch==="email"&&subj&&<div style={{fontSize:10,fontWeight:600,color:C.t1,marginBottom:5,paddingBottom:5,borderBottom:`1px solid ${C.b1}`}}>Subj: {mktFill(subj)}</div>}
            <div style={{fontSize:11,color:C.t2,lineHeight:1.5,minHeight:40}}>{text?mktFill(text):<span style={{color:C.t3,fontStyle:"italic"}}>No content yet</span>}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn ch="← Back" v="ghost" onClick={()=>setStep(1)}/>
        <Btn ch="Next →" v="primary" onClick={()=>{if(!varA.trim()||!varB.trim())return showT("Both variants required","error");setStep(3);}}/>
      </div>
    </div>}

    {/* ── Step 3: Audience ── */}
    {step===3&&<div>
      <Fld label="Select Segment">
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {segments.slice(0,5).map(sg=>(
            <button key={sg.id} onClick={()=>setSegment(sg.id)} className="hov" style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,background:segment===sg.id?C.ad:C.s2,border:`1px solid ${segment===sg.id?C.a+"55":C.b1}`,cursor:"pointer"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:segment===sg.id?C.a:C.t3,flexShrink:0}}/>
              <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{sg.name}</div><div style={{fontSize:10,color:C.t3}}>{sg.desc}</div></div>
              <span style={{fontSize:12,fontWeight:700,color:C.a,fontFamily:FM}}>{sg.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </Fld>

      {/* Split slider */}
      <Fld label="A/B Split Ratio">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{textAlign:"center",minWidth:60}}>
            <div style={{fontSize:8,fontFamily:FM,color:C.a,fontWeight:700}}>VAR A</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:C.a}}>{split}%</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{countA.toLocaleString()}</div>
          </div>
          <div style={{flex:1}}>
            <input type="range" min="10" max="90" step="5" value={split} onChange={e=>setSplit(Number(e.target.value))} style={{width:"100%",accentColor:C.p,cursor:"pointer"}}/>
            <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginTop:6}}>
              <div style={{width:split+"%",background:C.a,transition:"width .2s"}}/>
              <div style={{width:(100-split)+"%",background:C.p,transition:"width .2s"}}/>
            </div>
          </div>
          <div style={{textAlign:"center",minWidth:60}}>
            <div style={{fontSize:8,fontFamily:FM,color:C.p,fontWeight:700}}>VAR B</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:C.p}}>{100-split}%</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{countB.toLocaleString()}</div>
          </div>
        </div>
      </Fld>

      <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",textAlign:"center",marginBottom:10}}>
        <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:3}}>TOTAL AUDIENCE</div>
        <div style={{fontSize:28,fontWeight:800,fontFamily:FD,color:C.a}}>{audience.toLocaleString()}</div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn ch="← Back" v="ghost" onClick={()=>setStep(2)}/>
        <Btn ch="Review →" v="primary" onClick={()=>setStep(4)}/>
      </div>
    </div>}

    {/* ── Step 4: Review & Launch ── */}
    {step===4&&<div>
      <div style={{fontSize:13,fontWeight:700,fontFamily:FD,marginBottom:10}}>A/B Test Summary</div>
      <div style={{background:C.bg,border:`1px solid ${C.b1}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>
        {[["Test Name",name],["Channel",<span key="ch" style={{display:"inline-flex",alignItems:"center",gap:4}}><ChIcon t={ch} s={14}/> {mktChL(ch)}</span>],["Primary Metric",{open_rate:"Open Rate",ctr:"Click Rate",conversion:"Conversion",revenue:"Revenue"}[metric]],["Duration",duration],["Winner Selection",{auto:"Auto-send to remaining",manual:"Manual review",statistical:"Statistical significance"}[winner]],["Audience",audience.toLocaleString()+" contacts"],["Split",split+"% A / "+(100-split)+"% B ("+countA+" / "+countB+")"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",padding:"8px 12px",borderBottom:`1px solid ${C.b1}`}}>
            <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:120,flexShrink:0}}>{k}</span>
            <span style={{fontSize:12,color:C.t1,fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>

      {/* Side-by-side variant preview */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {[["A",varA,subjA,C.a,split,countA],["B",varB,subjB,C.p,100-split,countB]].map(([label,text,subj,clr,pct,cnt])=>(
          <div key={label} style={{background:C.bg,border:`1.5px solid ${clr}44`,borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"8px 12px",background:clr+"12",borderBottom:`1px solid ${clr}33`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,fontWeight:800,fontFamily:FM,color:clr}}>VARIANT {label}</span>
              <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{pct}% · {cnt.toLocaleString()} contacts</span>
            </div>
            <div style={{padding:"10px 12px"}}>
              {ch==="email"&&subj&&<div style={{fontSize:10,fontWeight:600,color:C.t1,marginBottom:5,paddingBottom:5,borderBottom:`1px solid ${C.b1}`}}>Subject: {mktFill(subj)}</div>}
              <div style={{fontSize:11.5,color:C.t2,lineHeight:1.5}}>{mktFill(text)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={{background:C.ad,border:`1px solid ${C.a}44`,borderRadius:10,padding:"12px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:14,flexShrink:0}}>💡</span>
        <div style={{fontSize:11.5,color:C.t2,lineHeight:1.5}}>
          After <strong style={{color:C.t1}}>{duration}</strong>, the {winner==="auto"?"winning variant will be automatically sent to the remaining audience":winner==="manual"?"results will be ready for your manual review":"test will continue until statistical significance is reached"}. Primary metric: <strong style={{color:C.p}}>{metric.replace("_"," ")}</strong>.
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between"}}>
        <Btn ch="← Back" v="ghost" onClick={()=>setStep(3)}/>
        <Btn ch="🚀 Launch A/B Test" v="primary" onClick={launch}/>
      </div>
    </div>}
  </Mdl>;
}

function CampDetailModal({camp,onClose,onEdit,onDuplicate,onDelete,onPause,onLaunch}){
  const [dtab,setDtab]=useState("overview");
  const [testAddr,setTestAddr]=useState("");
  const [showDelConfirm,setShowDelConfirm]=useState(false);
  const c=camp;
  const dr=mktPct(c.delivered,c.sent),rr=mktPct(c.read,c.delivered),cr=mktPct(c.clicked,c.read),fr=mktPct(c.failed,c.sent);
  const tabs=[{id:"overview",l:"Overview"},{id:"content",l:"Content"},{id:"audience",l:"Audience"}];
  if(c.ab)tabs.push({id:"abtest",l:"A/B Results"});
  tabs.push({id:"settings",l:"Settings"});

  return <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:16,width:720,maxWidth:"95vw",maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeUp .2s ease"}} onClick={e=>e.stopPropagation()}>
      {/* Header */}
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:10,background:mktChC(c.ch)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{mktChE(c.ch)}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16,fontWeight:800,fontFamily:FD}}>{c.name}</span>
            <Tag text={c.status} color={mktStC(c.status)}/>
            {c.ab&&<span style={{fontSize:9,fontWeight:800,fontFamily:FM,background:C.p+"22",color:C.p,padding:"2px 6px",borderRadius:4}}>A/B TEST</span>}
          </div>
          <div style={{fontSize:11,color:C.t3,fontFamily:FM,marginTop:2}}>{mktChL(c.ch)} · {c.goal} · {c.date}</div>
        </div>
        <div style={{display:"flex",gap:5}}>
          {c.status==="draft"&&<Btn ch="▶ Launch" v="success" sm onClick={()=>onLaunch(c)}/>}
          {(c.status==="active"||c.status==="paused")&&<Btn ch={c.status==="paused"?"▶ Resume":"⏸ Pause"} v="warn" sm onClick={()=>onPause(c)}/>}
          <Btn ch="✎ Edit" v="ghost" sm onClick={()=>onEdit(c)}/>
          <Btn ch="⎘ Duplicate" v="ghost" sm onClick={()=>onDuplicate(c)}/>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.t3,fontSize:22,cursor:"pointer"}}>×</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,padding:"0 20px"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setDtab(t.id)} style={{padding:"10px 16px",fontSize:11,fontWeight:700,fontFamily:FM,color:dtab===t.id?C.a:C.t3,borderBottom:`2px solid ${dtab===t.id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{t.l}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>

        {/* ── Overview ── */}
        {dtab==="overview"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[{l:"Audience",v:c.audience.toLocaleString(),c2:C.t2},{l:"Sent",v:c.sent.toLocaleString(),c2:C.cy},{l:"Delivered",v:dr+"%",c2:C.g},{l:c.ch==="email"?"Open Rate":"Read Rate",v:rr+"%",c2:C.p}].map(k=>(
              <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>{k.l}</div>
                <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c2}}>{k.v}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[{l:"Clicked",v:cr+"%",c2:C.y},{l:"Failed",v:fr+"%",c2:C.r},{l:"Revenue",v:c.revenue,c2:c.revenue!=="—"?C.g:C.t3},{l:"ROI",v:c.roi,c2:c.roi!=="—"?C.g:C.t3}].map(k=>(
              <div key={k.l} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>{k.l}</div>
                <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c2}}>{k.v}</div>
              </div>
            ))}
          </div>
          {/* Delivery funnel */}
          {c.sent>0&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:12}}>Delivery Funnel</div>
            {[{l:"Sent",v:c.sent,c2:C.cy},{l:"Delivered",v:c.delivered,c2:C.g},{l:c.ch==="email"?"Opened":"Read",v:c.read,c2:C.p},{l:"Clicked",v:c.clicked,c2:C.y}].map(f=>(
              <div key={f.l} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:11,color:C.t2}}>{f.l}</span>
                  <span style={{fontSize:11,fontWeight:700,fontFamily:FM,color:f.c2}}>{f.v.toLocaleString()} ({mktPct(f.v,c.sent)}%)</span>
                </div>
                <div style={{height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:(f.v/Math.max(c.sent,1)*100)+"%",height:"100%",background:f.c2,borderRadius:4,transition:"width .6s"}}/></div>
              </div>
            ))}
          </div>}
          {/* Sparkline */}
          {c.spark&&c.spark.some(v=>v>0)&&<div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px"}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:10}}>Engagement Trend</div>
            <svg style={{width:"100%",height:60}} viewBox="0 0 300 60">
              <polyline fill="none" stroke={mktChC(c.ch)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                points={c.spark.map((v,i)=>{const mx=Math.max(...c.spark,1);return `${(i/(c.spark.length-1||1))*300},${56-(v/mx)*50}`;}).join(" ")}/>
              {c.spark.map((v,i)=>{const mx=Math.max(...c.spark,1);return <circle key={i} cx={(i/(c.spark.length-1||1))*300} cy={56-(v/mx)*50} r="3" fill={mktChC(c.ch)}/>;
              })}
            </svg>
          </div>}
        </>}

        {/* ── Content ── */}
        {dtab==="content"&&<>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:10}}>Message Preview</div>
            {c.subject&&<div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.b1}`}}>Subject: {c.subject}</div>}
            <div style={{padding:"12px",borderRadius:c.ch==="whatsapp"?"3px 14px 14px 14px":c.ch==="sms"?"10px":"0",background:c.ch==="whatsapp"?"#25d36612":c.ch==="sms"?C.yd:C.bg,border:`1px solid ${c.ch==="whatsapp"?"#25d36633":c.ch==="sms"?C.y+"33":C.b1}`,fontSize:13,color:C.t2,lineHeight:1.6}}>
              {mktFill(c.template||c.subject||"No content preview available")}
            </div>
          </div>
          {/* Send test */}
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px"}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:10}}>Send Test</div>
            <div style={{display:"flex",gap:8}}>
              <Inp val={testAddr} set={setTestAddr} ph={c.ch==="email"?"test@example.com":c.ch==="sms"?"+91 98765 43210":c.ch==="push"?"device-token":"phone number"}/>
              <Btn ch="Send Test" v="primary" onClick={()=>{if(!testAddr.trim())return showT("Enter a recipient","error");showT("Test sent to "+testAddr,"success");setTestAddr("");}}/>
            </div>
            <div style={{fontSize:10,color:C.t3,marginTop:6}}>Send a test version of this campaign to verify formatting and content before sending to your full audience.</div>
          </div>
        </>}

        {/* ── Audience ── */}
        {dtab==="audience"&&<>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:FD,marginBottom:12}}>Audience Breakdown</div>
            {[{l:"Total Reached",v:c.audience,pct:100,c2:C.t2},{l:"Delivered",v:c.delivered,pct:mktPct(c.delivered,c.audience),c2:C.g},{l:"Engaged (Read/Open)",v:c.read,pct:mktPct(c.read,c.audience),c2:C.p},{l:"Converted (Clicked)",v:c.clicked,pct:mktPct(c.clicked,c.audience),c2:C.y},{l:"Unsubscribed",v:c.unsub||0,pct:mktPct(c.unsub||0,c.audience),c2:C.r}].map(a=>(
              <div key={a.l} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:11,color:C.t2}}>{a.l}</span>
                  <span style={{fontSize:11,fontWeight:700,fontFamily:FM,color:a.c2}}>{a.v.toLocaleString()} ({a.pct}%)</span>
                </div>
                <div style={{height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:a.pct+"%",height:"100%",background:a.c2,borderRadius:4,transition:"width .6s"}}/></div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>BOUNCE RATE</div>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:fr>5?C.r:fr>2?C.y:C.g}}>{fr}%</div>
            </div>
            <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>UNSUB RATE</div>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:mktPct(c.unsub||0,c.sent)>2?C.r:C.g}}>{mktPct(c.unsub||0,c.sent)}%</div>
            </div>
          </div>
        </>}

        {/* ── A/B Results ── */}
        {dtab==="abtest"&&c.ab&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            {[{label:"Variant A (Control)",color:C.a,open:rr+2,click:cr+3,conv:Math.round(cr*0.8)},{label:"Variant B (Challenger)",color:C.p,open:rr-1,click:cr-2,conv:Math.round(cr*0.6)}].map((v,i)=>(
              <div key={i} style={{background:C.s1,border:`1.5px solid ${v.color}44`,borderRadius:12,padding:"16px"}}>
                <div style={{fontSize:12,fontWeight:700,color:v.color,fontFamily:FD,marginBottom:12}}>{v.label}</div>
                {[{l:c.ch==="email"?"Open Rate":"Read Rate",v2:v.open,c2:v.open>rr?C.g:C.y},{l:"Click Rate",v2:v.click,c2:v.click>cr?C.g:C.y},{l:"Conversion",v2:v.conv,c2:C.p}].map(m=>(
                  <div key={m.l} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:C.t2}}>{m.l}</span>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:FM,color:m.c2}}>{m.v2}%</span>
                    </div>
                    <div style={{height:7,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{width:m.v2+"%",height:"100%",background:v.color,borderRadius:4}}/></div>
                  </div>
                ))}
                <Btn ch={"Declare "+v.label.split(" ")[1]+" Winner"} v={i===0?"primary":"ai"} full sm onClick={()=>showT(v.label.split(" ")[1]+" declared winner! Sending to remaining audience.","success")}/>
              </div>
            ))}
          </div>
          <div style={{background:C.ad,border:`1px solid ${C.a}44`,borderRadius:10,padding:"12px 14px",fontSize:11.5,color:C.t2,lineHeight:1.5}}>
            💡 Variant A is outperforming Variant B on open rate (+{3}pp) and click rate (+{5}pp). Consider declaring it the winner to maximize campaign performance.
          </div>
        </>}

        {/* ── Settings ── */}
        {dtab==="settings"&&<>
          <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
            {[["Campaign ID",c.id],["Channel",<span key="ch" style={{display:"inline-flex",alignItems:"center",gap:4}}><ChIcon t={c.ch} s={14}/> {mktChL(c.ch)}</span>],["Goal",c.goal],["Status",c.status],["Created",c.date],["Audience",c.audience.toLocaleString()],["A/B Test",c.ab?"Enabled":"Disabled"],["Cost",c.cost||"—"],["Revenue",c.revenue],["ROI",c.roi]].map(([k,v])=>(
              <div key={k} style={{display:"flex",padding:"9px 14px",borderBottom:`1px solid ${C.b1}`}}>
                <span style={{fontSize:11,color:C.t3,fontFamily:FM,width:100,flexShrink:0}}>{k}</span>
                <span style={{fontSize:12,color:C.t1,fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn ch="↓ Export Report" v="ghost" full onClick={()=>showT("Report exported as CSV","success")}/>
            {!showDelConfirm?<Btn ch="🗑 Delete Campaign" v="danger" full onClick={()=>setShowDelConfirm(true)}/>:
              <div style={{flex:1,display:"flex",gap:6,alignItems:"center",padding:"8px 12px",background:C.rd,border:`1px solid ${C.r}44`,borderRadius:8}}>
                <span style={{fontSize:12,color:C.r,flex:1}}>Are you sure? This cannot be undone.</span>
                <Btn ch="Yes, Delete" v="danger" sm onClick={()=>onDelete(c)}/>
                <Btn ch="Cancel" v="ghost" sm onClick={()=>setShowDelConfirm(false)}/>
              </div>}
          </div>
        </>}
      </div>
    </div>
  </div>;
}


