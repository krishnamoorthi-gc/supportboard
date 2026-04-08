import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, FD, FB, FM, FONTS, THEMES, FONT_SIZES, api, uid, showT, playNotifSound, exportCSV, exportTableCSV, nameColor, t, LANGS, now, ROUTES, AUDIT_LOG, CUSTOM_FIELDS_INIT, EMAIL_SIGS_INIT, BRANDS_INIT, A0, L0, IB0, TM0, CR0, AU0, CT0, CV0, MG0, AI_S, BOT, REPLY_POOL, SDLogo, ChIcon, chI, chC, prC, NavIcon, Av, Tag, Btn, Inp, Sel, CompanyPicker, Toggle, Mdl, CountUp, Confetti, ConvPreview, Fld, Spin, Skel, SkelRow, SkelCards, SkelMsgs, SkelTable, EmptyState, ErrorBanner, ConnBadge, AiInsight, LoadingOverlay, UndoToast, OnboardingWizard, CsatSurvey, SlaTimer, CollisionBadge, CfPanel, CfInput, Sparkline, DonutChart, LazyMount, NotifPanel } from "../shared";

export default function CrmScr({contacts,setContacts,convs,comps,setComps,customFields,getCfVal,setCfVal}){
  const [tab,setTab]=useState("leads");const [crmSearch,setCrmSearch]=useState("");const [showQuickAct,setShowQuickAct]=useState(false);
  // ═══ DEALS ═══
  const STAGES=["Lead","Qualified","Proposal","Negotiation","Won","Lost"];
  const SC={Lead:C.t3,Qualified:C.a,Proposal:C.p,Negotiation:C.y,Won:C.g,Lost:C.r};
  const [deals,setDeals]=useState([
    {id:"d1",name:"TechCorp Enterprise Plan",company:"TechCorp",value:48000,stage:"Negotiation",probability:75,owner:"Priya",closeDate:"15/04/26",created:"01/03/26",notes:"Annual contract, needs security review. Budget approved by VP.",contact:"Arjun Mehta",product:"Enterprise",activities:[{type:"call",date:"Today",note:"Pricing discussion, sending final proposal"},{type:"email",date:"Yesterday",note:"Sent security compliance docs"},{type:"meeting",date:"20/03/26",note:"45min demo with IT team"}]},
    {id:"d2",name:"StartupXYZ Pro Upgrade",company:"StartupXYZ",value:12000,stage:"Proposal",probability:50,owner:"Dev",closeDate:"20/04/26",created:"10/03/26",notes:"Currently on Starter, wants Pro for AI features.",contact:"Meera Krishnan",product:"Pro",activities:[{type:"email",date:"Yesterday",note:"Sent Pro vs Enterprise comparison"},{type:"call",date:"18/03/26",note:"Requirements gathering call"}]},
    {id:"d3",name:"GlobalRetail Multi-Brand",company:"GlobalRetail",value:96000,stage:"Lead",probability:15,owner:"Meena",closeDate:"30/05/26",created:"15/03/26",notes:"Large retail chain, 500+ stores. Needs multi-brand + multi-language.",contact:"David Chen",product:"Enterprise",activities:[{type:"note",date:"15/03/26",note:"Inbound inquiry from website contact form"}]},
    {id:"d4",name:"FinanceHub Compliance Add-on",company:"FinanceHub",value:24000,stage:"Qualified",probability:40,owner:"Priya",closeDate:"25/04/26",created:"05/03/26",notes:"Needs HIPAA compliance, audit logs, data residency. Legal review pending.",contact:"Fatima Al-Rashid",product:"Enterprise",activities:[{type:"email",date:"24/03/26",note:"Sent compliance datasheet"},{type:"call",date:"20/03/26",note:"Compliance requirements deep-dive"}]},
    {id:"d5",name:"EduConnect Starter",company:"EduConnect",value:6000,stage:"Won",probability:100,owner:"Dev",closeDate:"10/03/26",created:"20/02/26",notes:"Signed! 14-day trial converted. Very happy with onboarding.",contact:"Priya Nair",product:"Starter",activities:[{type:"call",date:"10/03/26",note:"Contract signed, onboarding kickoff"},{type:"meeting",date:"05/03/26",note:"Final demo + pricing approval"}]},
    {id:"d6",name:"OldCo Renewal",company:"OldCo",value:18000,stage:"Lost",probability:0,owner:"Meena",closeDate:"01/03/26",created:"15/01/26",notes:"Switched to competitor. Price wasn't the issue — needed Salesforce integration.",contact:"",product:"Pro",activities:[{type:"email",date:"01/03/26",note:"Final retention offer rejected"},{type:"call",date:"25/02/26",note:"Churn risk flagged, offered discount"}]},
    {id:"d7",name:"CloudNine Enterprise",company:"CloudNine",value:72000,stage:"Qualified",probability:45,owner:"Priya",closeDate:"10/05/26",created:"22/03/26",notes:"VP Engineering interested. Needs SSO + API access. Budget cycle Q2.",contact:"Vikram Sinha",product:"Enterprise",activities:[{type:"meeting",date:"25/03/26",note:"Discovery call with engineering team"},{type:"note",date:"22/03/26",note:"Referred from lead pipeline"}]},
    {id:"d8",name:"FreshMart Pro",company:"FreshMart",value:24000,stage:"Proposal",probability:55,owner:"Dev",closeDate:"18/04/26",created:"20/03/26",notes:"200+ agents. Comparing us with Freshdesk and Intercom.",contact:"Ananya Reddy",product:"Pro",activities:[{type:"email",date:"26/03/26",note:"Sent competitive comparison + ROI calculator"},{type:"call",date:"22/03/26",note:"Pricing discussion, need volume discount"}]},
    {id:"d9",name:"Globex Corp API Package",company:"Globex Corp",value:60000,stage:"Lead",probability:10,owner:"Meena",closeDate:"30/06/26",created:"26/03/26",notes:"US enterprise, needs custom API + dedicated support.",contact:"James Wilson",product:"Enterprise",activities:[{type:"note",date:"26/03/26",note:"New lead from LinkedIn outreach"}]},
    {id:"d10",name:"PayEase Upgrade to Enterprise",company:"PayEase",value:36000,stage:"Negotiation",probability:80,owner:"Dev",closeDate:"05/04/26",created:"15/03/26",notes:"Current Pro customer upgrading. Needs compliance + SSO. Almost closed.",contact:"Rahul Kapoor",product:"Enterprise",activities:[{type:"call",date:"Today",note:"Final terms discussion, contract review"},{type:"email",date:"25/03/26",note:"Sent Enterprise proposal with SSO pricing"}]}
  ]);
  const [showDF,setShowDF]=useState(false);const [editD,setEditD]=useState(null);const [selDeal,setSelDeal]=useState(null);const [dealSideTab,setDealSideTab]=useState("details");
  const [dN,setDN]=useState("");const [dV,setDV]=useState("");const [dS,setDS]=useState("Lead");const [dO,setDO]=useState("Priya");const [dC,setDC]=useState("");const [dNo,setDNo]=useState("");const [dCo,setDCo]=useState("");const [dCt,setDCt]=useState("");const [dProd,setDProd]=useState("Pro");
  const [drag,setDrag]=useState(null);const [dealFilter,setDealFilter]=useState("all");const [dealView,setDealView]=useState("kanban");const [dealSearch,setDealSearch]=useState("");const [dealOwnerFilter,setDealOwnerFilter]=useState("all");const [dealSort,setDealSort]=useState("value_desc");
  const PRODUCTS=["Starter","Pro","Enterprise"];
  const saveD=()=>{if(!dN.trim())return showT("Name required","error");const p={name:dN,value:Number(dV)||0,stage:dS,owner:dO,closeDate:dC,notes:dNo,company:dCo,contact:dCt,product:dProd,probability:dS==="Won"?100:dS==="Lost"?0:dS==="Negotiation"?75:dS==="Proposal"?50:dS==="Qualified"?40:15,created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),activities:editD?.activities||[]};if(editD){setDeals(pr=>pr.map(d=>d.id===editD.id?{...d,...p}:d));if(api.isConnected())api.patch(`/crm/deals/${editD.id}`,{name:p.name,company:p.company,value:p.value,stage:p.stage,probability:p.probability,owner:p.owner,close_date:p.closeDate,notes:p.notes,contact_name:p.contact,product:p.product}).catch(()=>{});}else{const nid="d"+uid();setDeals(pr=>[{id:nid,...p},...pr]);if(api.isConnected())api.post("/crm/deals",{name:p.name,company:p.company,value:p.value,stage:p.stage,probability:p.probability,owner:p.owner,close_date:p.closeDate,notes:p.notes,contact_name:p.contact,product:p.product}).catch(()=>{});}showT(editD?"Updated":"Created!","success");setShowDF(false);setEditD(null);};
  const openDE=d=>{setDN(d.name);setDV(String(d.value));setDS(d.stage);setDO(d.owner);setDC(d.closeDate);setDNo(d.notes);setDCo(d.company);setDCt(d.contact||"");setDProd(d.product||"Pro");setEditD(d);setShowDF(true);};
  const openDN=()=>{setDN("");setDV("");setDS("Lead");setDO("Priya");setDC("");setDNo("");setDCo("");setDCt("");setDProd("Pro");setEditD(null);setShowDF(true);};
  const markDeal=(id,stage)=>{setDeals(p=>p.map(d=>d.id===id?{...d,stage,probability:stage==="Won"?100:0,activities:[{type:"note",date:"Today",note:"Deal marked as "+stage},...(d.activities||[])]}:d));showT("Deal: "+stage,"success");};
  const logDealActivity=(did,type,note)=>{setDeals(p=>p.map(d=>d.id===did?{...d,activities:[{type,date:"Today",note},...(d.activities||[])]}:d));showT("Activity logged","success");};
  const sortDeals=arr=>{const s=dealSort;if(s==="value_desc")return[...arr].sort((a,b)=>b.value-a.value);if(s==="value_asc")return[...arr].sort((a,b)=>a.value-b.value);if(s==="close_asc")return[...arr].sort((a,b)=>a.closeDate.localeCompare(b.closeDate));if(s==="prob_desc")return[...arr].sort((a,b)=>b.probability-a.probability);if(s==="name_asc")return[...arr].sort((a,b)=>a.name.localeCompare(b.name));return arr;};
  const filteredDeals=sortDeals(deals.filter(d=>(dealFilter==="all"||d.stage===dealFilter)&&(dealOwnerFilter==="all"||d.owner===dealOwnerFilter)&&(!dealSearch||d.name.toLowerCase().includes(dealSearch.toLowerCase())||d.company.toLowerCase().includes(dealSearch.toLowerCase())||(d.contact||"").toLowerCase().includes(dealSearch.toLowerCase()))));

  // ═══ LEADS ═══
  const LEAD_STAGES=["New","Contacted","Interested","Qualified","Converted","Lost"];
  const LC2={New:C.t3,Contacted:C.a,Interested:C.cy,Qualified:C.p,Converted:C.g,Lost:C.r};
  const [leads,setLeads]=useState([
    {id:"ld1",name:"Vikram Sinha",email:"vikram@cloudnine.io",company:"CloudNine",phone:"+91 90001 22334",source:"Website",stage:"Qualified",score:72,owner:"Priya",created:"20/03/26",lastContact:"Today",notes:"Enterprise plan interest, needs multi-brand support. Budget approved for Q2.",designation:"VP Engineering",value:48000,tags:["enterprise","inbound"],activities:[{type:"call",date:"Today",note:"Discussed pricing, sending proposal"},{type:"email",date:"Yesterday",note:"Sent feature comparison doc"},{type:"meeting",date:"18/03/26",note:"30min discovery call"}]},
    {id:"ld2",name:"Ananya Reddy",email:"ananya@freshmart.com",company:"FreshMart",phone:"+91 88765 11223",source:"Referral",stage:"Interested",score:55,owner:"Dev",created:"18/03/26",lastContact:"Yesterday",notes:"200+ agent team, referred by EduConnect. Looking at Pro plan.",designation:"Head of CX",value:24000,tags:["referral","large-team"],activities:[{type:"email",date:"Yesterday",note:"Follow-up on requirements"},{type:"call",date:"16/03/26",note:"Initial discovery, interested in AI features"}]},
    {id:"ld3",name:"James Wilson",email:"james@globex.us",company:"Globex Corp",phone:"+1 415 555 0198",source:"LinkedIn",stage:"New",score:30,owner:"Meena",created:"25/03/26",lastContact:"25/03/26",notes:"Connected on LinkedIn, asked about API capabilities and webhooks.",designation:"CTO",value:96000,tags:["api","outbound","enterprise"],activities:[{type:"note",date:"25/03/26",note:"LinkedIn connection accepted, showed interest in API docs"}]},
    {id:"ld4",name:"Priya Nair",email:"priya@designstudio.co",company:"DesignStudio",phone:"+91 70045 88990",source:"Webinar",stage:"Contacted",score:45,owner:"Priya",created:"22/03/26",lastContact:"2d ago",notes:"Attended AI-powered support webinar. Small team but growing fast.",designation:"Founder",value:6000,tags:["webinar","startup"],activities:[{type:"email",date:"25/03/26",note:"Sent webinar recording + case study"},{type:"note",date:"22/03/26",note:"Registered for AI webinar, asked good questions"}]},
    {id:"ld5",name:"Rahul Kapoor",email:"rahul@payease.in",company:"PayEase",phone:"+91 98123 45678",source:"Trial Signup",stage:"Converted",score:90,owner:"Dev",created:"10/03/26",lastContact:"Today",notes:"Converted to Pro plan! 14-day trial, activated on day 3. Very happy.",designation:"Product Manager",value:12000,tags:["trial","converted"],activities:[{type:"call",date:"Today",note:"Onboarding kickoff call"},{type:"email",date:"24/03/26",note:"Sent Pro welcome pack"},{type:"meeting",date:"22/03/26",note:"Demo of advanced features"}]},
    {id:"ld6",name:"Sneha Iyer",email:"sneha@techwave.io",company:"TechWave",phone:"+91 81234 56789",source:"Cold Email",stage:"Lost",score:15,owner:"Meena",created:"05/03/26",lastContact:"1w ago",notes:"Chose Zendesk. Price was not the issue — they needed Salesforce native integration.",designation:"Support Lead",value:18000,tags:["lost","competitor"],activities:[{type:"email",date:"20/03/26",note:"Sent last attempt with discount offer"},{type:"call",date:"15/03/26",note:"Said going with Zendesk"}]},
    {id:"ld7",name:"Arjun Mehta",email:"arjun@techcorp.io",company:"TechCorp",phone:"+91 98765 43210",source:"Trade Show",stage:"Qualified",score:68,owner:"Priya",created:"15/03/26",lastContact:"Today",notes:"Met at SaaS Connect Bengaluru. Interested in Enterprise with SSO.",designation:"Director of IT",value:72000,tags:["enterprise","event"],activities:[{type:"meeting",date:"Today",note:"Follow-up demo scheduled"},{type:"note",date:"15/03/26",note:"Met at SaaS Connect booth, exchanged cards"}]},
    {id:"ld8",name:"Meera Krishnan",email:"meera@startupxyz.com",company:"StartupXYZ",phone:"+91 77665 44332",source:"Partner",stage:"Interested",score:52,owner:"Dev",created:"22/03/26",lastContact:"Yesterday",notes:"Came through Razorpay partner channel. Evaluating 3 tools.",designation:"Operations Head",value:12000,tags:["partner","evaluation"],activities:[{type:"email",date:"Yesterday",note:"Sent competitive comparison sheet"},{type:"call",date:"23/03/26",note:"Intro call, currently using email only"}]},
    {id:"ld9",name:"David Chen",email:"david@globalretail.com",company:"GlobalRetail",phone:"+1 212 555 0199",source:"Ad Campaign",stage:"New",score:22,owner:"Meena",created:"26/03/26",lastContact:"26/03/26",notes:"Clicked Google Ad, downloaded whitepaper. No response to follow-up yet.",designation:"VP Customer Success",value:60000,tags:["inbound","whitepaper"],activities:[{type:"note",date:"26/03/26",note:"Downloaded 'Scaling Support' whitepaper from Google Ad"}]},
    {id:"ld10",name:"Fatima Al-Rashid",email:"fatima@financehub.co",company:"FinanceHub",phone:"+91 44 2233 9988",source:"Website",stage:"Contacted",score:40,owner:"Priya",created:"24/03/26",lastContact:"Yesterday",notes:"Submitted contact form asking about HIPAA compliance and audit logs.",designation:"Compliance Officer",value:36000,tags:["compliance","healthcare"],activities:[{type:"email",date:"Yesterday",note:"Sent compliance datasheet + audit log feature guide"},{type:"note",date:"24/03/26",note:"Contact form: HIPAA compliance inquiry"}]}
  ]);
  const [showLF,setShowLF]=useState(false);const [editL,setEditL]=useState(null);const [selLead,setSelLead]=useState(null);const [leadSideTab,setLeadSideTab]=useState("details");
  const [lName,setLName]=useState("");const [lEmail,setLEmail]=useState("");const [lCompany,setLCompany]=useState("");const [lPhone,setLPhone]=useState("");const [lSource,setLSource]=useState("Website");const [lStage,setLStage]=useState("New");const [lOwner,setLOwner]=useState("Priya");const [lNotes,setLNotes]=useState("");const [lTags,setLTags]=useState("");const [lDesig,setLDesig]=useState("");const [lValue,setLValue]=useState("");
  const LEAD_SOURCES=["Website","Referral","LinkedIn","Webinar","Trial Signup","Cold Email","Ad Campaign","Trade Show","Partner","Other"];
  const [leadFilter,setLeadFilter]=useState("all");const [leadView,setLeadView]=useState("pipeline");const [leadSearch,setLeadSearch]=useState("");const [leadSourceFilter,setLeadSourceFilter]=useState("all");const [leadOwnerFilter,setLeadOwnerFilter]=useState("all");const [leadSort,setLeadSort]=useState("score_desc");const [dragLead,setDragLead]=useState(null);
  const saveL=()=>{if(!lName.trim())return showT("Name required","error");const p={name:lName,email:lEmail,company:lCompany,phone:lPhone,source:lSource,stage:lStage,owner:lOwner,notes:lNotes,designation:lDesig,value:Number(lValue)||0,tags:lTags?lTags.split(",").map(t=>t.trim()).filter(Boolean):[],score:lStage==="Converted"?90:lStage==="Qualified"?70:lStage==="Interested"?50:lStage==="Contacted"?35:lStage==="New"?20:10,created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),lastContact:"Today",activities:editL?.activities||[]};if(editL)setLeads(pr=>pr.map(l=>l.id===editL.id?{...l,...p}:l));else setLeads(pr=>[{id:"ld"+uid(),...p},...pr]);showT(editL?"Updated":"Lead created!","success");setShowLF(false);setEditL(null);if(api.isConnected()){if(editL)api.patch(`/crm/leads/${editL.id}`,{name:lName,email:lEmail,company:lCompany,stage:lStage,score:p.score,owner:lOwner,value:p.value}).catch(()=>{});else api.post("/crm/leads",{name:lName,email:lEmail,company:lCompany,phone:lPhone,source:lSource,stage:lStage,owner:lOwner,value:p.value}).catch(()=>{});}};
  const openLE=l=>{setLName(l.name);setLEmail(l.email);setLCompany(l.company);setLPhone(l.phone);setLSource(l.source);setLStage(l.stage);setLOwner(l.owner);setLNotes(l.notes);setLTags((l.tags||[]).join(", "));setLDesig(l.designation||"");setLValue(String(l.value||""));setEditL(l);setShowLF(true);};
  const openLN=()=>{setLName("");setLEmail("");setLCompany("");setLPhone("");setLSource("Website");setLStage("New");setLOwner("Priya");setLNotes("");setLTags("");setLDesig("");setLValue("");setEditL(null);setShowLF(true);};
  const convertToContact=l=>{setContacts(p=>[{id:"ct"+uid(),uid:"USR-"+Math.floor(3000+Math.random()*9000),name:l.name,email:l.email,phone:l.phone,company:l.company,plan:"Starter",notes:"Converted from lead: "+l.notes,userType:"User",language:"EN",currency:"INR",location:"",timezone:"Asia/Kolkata",tags:["converted",...(l.tags||[])],convs:0,csat:null,totalSpend:"—",color:[C.a,C.g,C.p,C.y][Math.floor(Math.random()*4)],av:l.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(),createdAt:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),lastActivity:"Today"},...p]);setLeads(p=>p.map(x=>x.id===l.id?{...x,stage:"Converted",score:90}:x));showT(l.name+" converted to contact!","success");if(api.isConnected()){api.post("/contacts",{name:l.name,email:l.email,phone:l.phone,company_id:null,plan:"Starter",notes:"Converted from lead"}).catch(()=>{});api.patch(`/crm/leads/${l.id}`,{stage:"Converted",score:90}).catch(()=>{});}};

  // ═══ CRM API LOADING ═══
  const [crmLoading,setCrmLoading]=useState(false);
  const [crmAi,setCrmAi]=useState(null);const [crmAiLoad,setCrmAiLoad]=useState(false);
  const genCrmAi=async()=>{setCrmAiLoad(true);try{const ctx=`Leads: ${leads.length} (${leads.filter(l=>l.stage==="Qualified").length} qualified). Deals: ${deals.length} (pipeline: $${deals.filter(d=>!["Won","Lost"].includes(d.stage)).reduce((s,d)=>s+d.value,0).toLocaleString()}). Won: ${deals.filter(d=>d.stage==="Won").length}, Lost: ${deals.filter(d=>d.stage==="Lost").length}. Tasks: ${tasks.filter(t=>t.status!=="done").length} open.`;const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:350,system:"You are a CRM AI advisor. Analyze the pipeline and give 4-5 specific actions: deals at risk, leads to prioritize, follow-ups needed. Use names and numbers. No markdown.",messages:[{role:"user",content:ctx}]})});const d=await r.json();setCrmAi(d.content?.[0]?.text);}catch{setCrmAi("• PayEase Upgrade ($36K) is 80% probability — schedule final contract review this week\n• TechCorp Enterprise ($48K) stalled in Negotiation — Priya should send security compliance docs\n• 3 leads scored 60+ haven't been contacted in 5 days: Vikram, Ananya, Arjun\n• FreshMart comparing with Freshdesk — send ROI calculator + case study today\n• CloudNine ($72K) budget cycle is Q2 — set follow-up reminder for April 10");}setCrmAiLoad(false);};
  useEffect(()=>{
    if(!api.isConnected())return;
    setCrmLoading(true);
    Promise.allSettled([
      api.get("/crm/leads").then(r=>{if(r?.leads?.length)setLeads(r.leads.map(l=>({...l,tags:l.tags||[],activities:[],lastContact:l.last_contact||""})));}),
      api.get("/crm/deals").then(r=>{if(r?.deals?.length)setDeals(r.deals.map(d=>({...d,tags:d.tags||[],activities:[],closeDate:d.close_date||"",contact:d.contact_name||""})));}),
      api.get("/crm/tasks").then(r=>{if(r?.tasks?.length)setTasks(r.tasks.map(t=>({...t,tags:t.tags||[],comments:[],dueDate:t.due_date||"",contact:t.contact_name||"",desc:t.description||""})));}),
      api.get("/crm/meetings").then(r=>{if(r?.meetings?.length)setMeetings(r.meetings.map(m=>({...m,attendees:m.attendees||[],contact:m.contact_name||""})));})
    ]).finally(()=>setCrmLoading(false));
  },[]);
  const convertToDeal=l=>{setDN(l.company+" Deal");setDV(String(l.value||""));setDS("Lead");setDO(l.owner);setDCo(l.company);setDCt(l.name);setDNo("From lead: "+l.notes);setDC("");setEditD(null);setShowDF(true);setTab("deals");};
  const logLeadActivity=(lid,type,note)=>{setLeads(p=>p.map(l=>l.id===lid?{...l,activities:[{type,date:"Today",note},...(l.activities||[])],lastContact:"Today"}:l));showT("Activity logged","success");};
  const sortLeads=arr=>{const s=leadSort;if(s==="score_desc")return[...arr].sort((a,b)=>b.score-a.score);if(s==="score_asc")return[...arr].sort((a,b)=>a.score-b.score);if(s==="name_asc")return[...arr].sort((a,b)=>a.name.localeCompare(b.name));if(s==="value_desc")return[...arr].sort((a,b)=>(b.value||0)-(a.value||0));if(s==="newest")return[...arr].sort((a,b)=>b.id.localeCompare(a.id));return arr;};
  const filteredLeads=sortLeads(leads.filter(l=>(leadFilter==="all"||l.stage===leadFilter)&&(leadSourceFilter==="all"||l.source===leadSourceFilter)&&(leadOwnerFilter==="all"||l.owner===leadOwnerFilter)&&(!leadSearch||l.name.toLowerCase().includes(leadSearch.toLowerCase())||l.email.toLowerCase().includes(leadSearch.toLowerCase())||l.company.toLowerCase().includes(leadSearch.toLowerCase()))));

  // ═══ TASKS ═══
  const [tasks,setTasks]=useState([
    {id:"tk1",title:"Send proposal to TechCorp",desc:"Enterprise plan proposal with security addendum and SLA guarantees. Include case studies.",assignee:"Priya",deal:"TechCorp Enterprise Plan",contact:"Arjun Mehta",company:"TechCorp",dueDate:"28/03/26",priority:"high",status:"in_progress",created:"20/03/26",tags:["proposal","enterprise"],comments:[{by:"Priya",date:"Today",text:"Draft ready, reviewing with legal"},{by:"Dev",date:"Yesterday",text:"Added security compliance section"}]},
    {id:"tk2",title:"Follow up with FreshMart",desc:"Call Ananya about team size, requirements, and timeline. She's comparing us with Freshdesk.",assignee:"Dev",deal:"FreshMart Pro",contact:"Ananya Reddy",company:"FreshMart",dueDate:"27/03/26",priority:"urgent",status:"todo",created:"25/03/26",tags:["follow-up","call"],comments:[{by:"Meena",date:"25/03/26",text:"Ananya prefers afternoon calls"}]},
    {id:"tk3",title:"Prepare demo sandbox",desc:"Set up sandbox with sample data, multi-brand config, and AI bot for GlobalRetail demo.",assignee:"Meena",deal:"GlobalRetail Multi-Brand",contact:"David Chen",company:"GlobalRetail",dueDate:"30/03/26",priority:"normal",status:"todo",created:"24/03/26",tags:["demo","setup"],comments:[]},
    {id:"tk4",title:"Send onboarding materials",desc:"Welcome email with setup guide, training video links, and Slack invite for EduConnect.",assignee:"Dev",deal:"EduConnect Starter",contact:"Priya Nair",company:"EduConnect",dueDate:"26/03/26",priority:"normal",status:"done",created:"22/03/26",tags:["onboarding"],comments:[{by:"Dev",date:"26/03/26",text:"All materials sent, customer confirmed receipt"}]},
    {id:"tk5",title:"Update CRM with Globex notes",desc:"Log LinkedIn conversation details and API requirements. Schedule follow-up demo.",assignee:"Meena",deal:"Globex Corp API Package",contact:"James Wilson",company:"Globex Corp",dueDate:"28/03/26",priority:"low",status:"todo",created:"26/03/26",tags:["admin","crm"],comments:[]},
    {id:"tk6",title:"Contract review with legal",desc:"Review FinanceHub HIPAA compliance terms, data residency clause, and SLA penalties.",assignee:"Priya",deal:"FinanceHub Compliance",contact:"Fatima Al-Rashid",company:"FinanceHub",dueDate:"01/04/26",priority:"high",status:"in_progress",created:"23/03/26",tags:["legal","compliance"],comments:[{by:"Priya",date:"Yesterday",text:"Legal reviewing HIPAA addendum, ETA 2 days"}]},
    {id:"tk7",title:"Create ROI calculator for PayEase",desc:"Build spreadsheet showing cost savings vs current Freshdesk setup for Enterprise upgrade pitch.",assignee:"Dev",deal:"PayEase Upgrade to Enterprise",contact:"Rahul Kapoor",company:"PayEase",dueDate:"29/03/26",priority:"normal",status:"in_progress",created:"25/03/26",tags:["sales-tool","spreadsheet"],comments:[{by:"Dev",date:"Today",text:"50% done, adding AI feature savings"}]},
    {id:"tk8",title:"Schedule CloudNine technical demo",desc:"Set up 1hr demo focusing on SSO integration, API webhooks, and custom fields. Invite CTO.",assignee:"Priya",deal:"CloudNine Enterprise",contact:"Vikram Sinha",company:"CloudNine",dueDate:"02/04/26",priority:"normal",status:"todo",created:"26/03/26",tags:["demo","technical"],comments:[]},
    {id:"tk9",title:"Competitive analysis: Zendesk vs us",desc:"Update battle card with latest Zendesk pricing and features. Add TechWave loss learnings.",assignee:"Meena",deal:"",contact:"",company:"",dueDate:"31/03/26",priority:"low",status:"blocked",created:"20/03/26",tags:["research","internal"],comments:[{by:"Meena",date:"24/03/26",text:"Blocked — waiting for updated Zendesk pricing from partner"}]},
    {id:"tk10",title:"Q2 pipeline review deck",desc:"Prepare slide deck with pipeline overview, win/loss analysis, and Q2 targets for Monday standup.",assignee:"Priya",deal:"",contact:"",company:"",dueDate:"31/03/26",priority:"high",status:"todo",created:"26/03/26",tags:["internal","report"],comments:[]}
  ]);
  const [showTF,setShowTF]=useState(false);const [editTk,setEditTk]=useState(null);const [selTask,setSelTask]=useState(null);const [taskSideTab,setTaskSideTab]=useState("details");
  const [tkTitle,setTkTitle]=useState("");const [tkDesc,setTkDesc]=useState("");const [tkAssignee,setTkAssignee]=useState("Priya");const [tkDue,setTkDue]=useState("");const [tkPriority,setTkPriority]=useState("normal");const [tkStatus,setTkStatus]=useState("todo");const [tkContact,setTkContact]=useState("");const [tkDeal,setTkDeal]=useState("");const [tkCompany,setTkCompany]=useState("");const [tkTags,setTkTags]=useState("");
  const TASK_STATUS=[{v:"todo",l:"To Do",c:C.t3,i:"○"},{v:"in_progress",l:"In Progress",c:C.a,i:"◐"},{v:"done",l:"Done",c:C.g,i:"●"},{v:"blocked",l:"Blocked",c:C.r,i:"⊘"}];
  const PRIORITIES=[{v:"low",l:"Low",c:C.t3},{v:"normal",l:"Normal",c:C.a},{v:"high",l:"High",c:C.y},{v:"urgent",l:"Urgent",c:C.r}];
  const [taskView,setTaskView]=useState("board");const [taskFilter,setTaskFilter]=useState("all");const [taskAssigneeFilter,setTaskAssigneeFilter]=useState("all");const [taskPriorityFilter,setTaskPriorityFilter]=useState("all");const [taskSearch,setTaskSearch]=useState("");const [taskSort,setTaskSort]=useState("priority_desc");
  const saveTk=()=>{if(!tkTitle.trim())return showT("Title required","error");const p={title:tkTitle,desc:tkDesc,assignee:tkAssignee,dueDate:tkDue,priority:tkPriority,status:tkStatus,contact:tkContact,deal:tkDeal,company:tkCompany,tags:tkTags?tkTags.split(",").map(t=>t.trim()).filter(Boolean):[],created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"}),comments:editTk?.comments||[]};if(editTk)setTasks(pr=>pr.map(t=>t.id===editTk.id?{...t,...p}:t));else setTasks(pr=>[{id:"tk"+uid(),...p},...pr]);showT(editTk?"Updated":"Task created!","success");setShowTF(false);setEditTk(null);if(api.isConnected()){if(editTk)api.patch(`/crm/tasks/${editTk.id}`,{title:tkTitle,description:tkDesc,assignee:tkAssignee,due_date:tkDue,priority:tkPriority,status:tkStatus}).catch(()=>{});else api.post("/crm/tasks",{title:tkTitle,description:tkDesc,assignee:tkAssignee,due_date:tkDue,priority:tkPriority,status:tkStatus}).catch(()=>{});}};
  const openTkE=t=>{setTkTitle(t.title);setTkDesc(t.desc||"");setTkAssignee(t.assignee);setTkDue(t.dueDate);setTkPriority(t.priority);setTkStatus(t.status);setTkContact(t.contact||"");setTkDeal(t.deal||"");setTkCompany(t.company||"");setTkTags((t.tags||[]).join(", "));setEditTk(t);setShowTF(true);};
  const openTkN=()=>{setTkTitle("");setTkDesc("");setTkAssignee("Priya");setTkDue("");setTkPriority("normal");setTkStatus("todo");setTkContact("");setTkDeal("");setTkCompany("");setTkTags("");setEditTk(null);setShowTF(true);};
  const addTaskComment=(tid,text)=>{setTasks(p=>p.map(t=>t.id===tid?{...t,comments:[{by:"Priya",date:"Today",text},...(t.comments||[])]}:t));showT("Comment added","success");};
  const isOverdue=d=>{if(!d)return false;const[dd,mm]=d.split("/").map(Number);const today=new Date();return new Date(2026,mm-1,dd)<today;};
  const sortTasks=arr=>{const s=taskSort;if(s==="priority_desc"){const po={urgent:4,high:3,normal:2,low:1};return[...arr].sort((a,b)=>(po[b.priority]||0)-(po[a.priority]||0));}if(s==="due_asc")return[...arr].sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));if(s==="name_asc")return[...arr].sort((a,b)=>a.title.localeCompare(b.title));if(s==="newest")return[...arr].sort((a,b)=>b.id.localeCompare(a.id));return arr;};
  const fTasks=sortTasks(tasks.filter(t=>(taskFilter==="all"||t.status===taskFilter)&&(taskAssigneeFilter==="all"||t.assignee===taskAssigneeFilter)&&(taskPriorityFilter==="all"||t.priority===taskPriorityFilter)&&(!taskSearch||t.title.toLowerCase().includes(taskSearch.toLowerCase())||(t.contact||"").toLowerCase().includes(taskSearch.toLowerCase())||(t.company||"").toLowerCase().includes(taskSearch.toLowerCase()))));

  // ═══ MEETINGS ═══
  const [meetings,setMeetings]=useState([
    {id:"mt1",title:"TechCorp Enterprise Demo",type:"demo",contact:"Arjun Mehta",company:"TechCorp",date:"28/03/26",time:"10:00 AM",duration:"45 min",location:"Zoom",host:"Priya",attendees:["Priya","Dev"],agenda:"Product demo with IT team. Cover: multi-brand, security, SSO. Show pricing tiers.",status:"scheduled",notes:"Prep: sandbox ready, load sample data. Arjun confirmed 3 attendees from their side.",outcome:"",deal:"TechCorp Enterprise Plan",activities:[{date:"26/03/26",note:"Sent calendar invite + pre-demo questionnaire"},{date:"25/03/26",note:"Confirmed demo scope with Arjun"}]},
    {id:"mt2",title:"FreshMart Discovery Call",type:"discovery",contact:"Ananya Reddy",company:"FreshMart",date:"27/03/26",time:"2:00 PM",duration:"30 min",location:"Google Meet",host:"Dev",attendees:["Dev"],agenda:"Understand team size (200+ agents), current tools, pain points, timeline.",status:"scheduled",notes:"Referral from EduConnect. Ananya prefers afternoon slots.",outcome:"",deal:"FreshMart Pro",activities:[{date:"25/03/26",note:"Ananya confirmed via email"}]},
    {id:"mt3",title:"Globex API Integration Deep-Dive",type:"technical",contact:"James Wilson",company:"Globex Corp",date:"29/03/26",time:"11:00 AM",duration:"60 min",location:"Teams",host:"Meena",attendees:["Meena","Dev"],agenda:"API walkthrough, webhook setup, authentication flow, rate limits, custom fields.",status:"scheduled",notes:"James is CTO — highly technical audience. Prepare Postman collection.",outcome:"",deal:"Globex Corp API Package",activities:[{date:"27/03/26",note:"Shared API docs + Postman collection"},{date:"26/03/26",note:"James requested OAuth2 flow details"}]},
    {id:"mt4",title:"FinanceHub Contract Review",type:"negotiation",contact:"Fatima Al-Rashid",company:"FinanceHub",date:"01/04/26",time:"3:00 PM",duration:"30 min",location:"Zoom",host:"Priya",attendees:["Priya"],agenda:"HIPAA compliance addendum, SLA guarantees, data residency, penalty terms.",status:"scheduled",notes:"Legal team joining from FinanceHub. Our legal reviewed draft.",outcome:"",deal:"FinanceHub Compliance Add-on",activities:[{date:"28/03/26",note:"Legal approved HIPAA addendum draft"}]},
    {id:"mt5",title:"EduConnect Onboarding Kickoff",type:"onboarding",contact:"Priya Nair",company:"EduConnect",date:"25/03/26",time:"10:30 AM",duration:"60 min",location:"Zoom",host:"Dev",attendees:["Dev","Meena"],agenda:"Account setup walkthrough, admin training, inbox configuration, bot setup.",status:"completed",notes:"All modules configured. Customer very happy with onboarding experience.",outcome:"Fully onboarded — all channels connected, 3 inboxes configured, AI bot trained.",deal:"EduConnect Starter",activities:[{date:"25/03/26",note:"Completed full onboarding in single session"},{date:"24/03/26",note:"Sent pre-onboarding checklist"}]},
    {id:"mt6",title:"Weekly Sales Standup",type:"internal",contact:"",company:"",date:"27/03/26",time:"9:00 AM",duration:"15 min",location:"Huddle",host:"Priya",attendees:["Priya","Dev","Meena"],agenda:"Pipeline review: 10 active deals. Discuss blockers. Q2 target check.",status:"completed",notes:"Quick sync before week starts.",outcome:"3 deals progressed. PayEase upgrade almost closed. Globex needs technical demo.",deal:"",activities:[{date:"27/03/26",note:"Action items: Meena to prep Globex demo, Dev to follow up PayEase"}]},
    {id:"mt7",title:"PayEase Enterprise Walkthrough",type:"demo",contact:"Rahul Kapoor",company:"PayEase",date:"30/03/26",time:"11:30 AM",duration:"45 min",location:"Google Meet",host:"Dev",attendees:["Dev","Priya"],agenda:"Enterprise features demo: SSO, audit logs, custom roles, API access. Show upgrade path.",status:"scheduled",notes:"Current Pro customer. Very engaged, upgrading for compliance features.",outcome:"",deal:"PayEase Upgrade to Enterprise",activities:[{date:"28/03/26",note:"Rahul confirmed + adding his CTO to the call"}]},
    {id:"mt8",title:"CloudNine Technical Assessment",type:"technical",contact:"Vikram Sinha",company:"CloudNine",date:"02/04/26",time:"2:30 PM",duration:"60 min",location:"Zoom",host:"Priya",attendees:["Priya","Meena"],agenda:"SSO integration, API webhooks, custom fields, data migration from Zendesk.",status:"scheduled",notes:"Vikram wants to see live API calls. Prepare dev sandbox with API explorer.",outcome:"",deal:"CloudNine Enterprise",activities:[{date:"27/03/26",note:"Sent technical requirements questionnaire"}]},
    {id:"mt9",title:"StartupXYZ Feature Comparison",type:"follow_up",contact:"Meera Krishnan",company:"StartupXYZ",date:"26/03/26",time:"4:00 PM",duration:"30 min",location:"Phone",host:"Dev",attendees:["Dev"],agenda:"Walk through feature comparison vs Freshdesk and Intercom. Address pricing concerns.",status:"completed",notes:"Meera comparing us with 2 competitors. Price is key factor.",outcome:"Good call — Meera leaning towards us. Needs volume discount for 50+ agents.",deal:"StartupXYZ Pro Upgrade",activities:[{date:"26/03/26",note:"Shared detailed comparison + discount proposal"},{date:"25/03/26",note:"Meera requested side-by-side feature matrix"}]},
    {id:"mt10",title:"Q2 Planning & Strategy",type:"internal",contact:"",company:"",date:"31/03/26",time:"10:00 AM",duration:"90 min",location:"In-Person",host:"Priya",attendees:["Priya","Dev","Meena","Aryan"],agenda:"Q1 review, Q2 targets, territory assignments, marketing campaigns, hiring plan.",status:"scheduled",notes:"Full team meeting. Book the large conference room. Order lunch.",outcome:"",deal:"",activities:[{date:"28/03/26",note:"Priya preparing Q1 review deck"}]}
  ]);
  const [showMF,setShowMF]=useState(false);const [editMt,setEditMt]=useState(null);const [mtFilter,setMtFilter]=useState("all");const [mtView,setMtView]=useState("list");const [selMeeting,setSelMeeting]=useState(null);const [mtSideTab,setMtSideTab]=useState("details");const [mtSearch,setMtSearch]=useState("");const [mtStatusFilter,setMtStatusFilter]=useState("all");const [mtHostFilter,setMtHostFilter]=useState("all");const [mtSort,setMtSort]=useState("date_asc");
  const [mtTitle,setMtTitle]=useState("");const [mtType,setMtType]=useState("demo");const [mtContact,setMtContact]=useState("");const [mtCompany,setMtCompany]=useState("");const [mtDate,setMtDate]=useState("");const [mtTime,setMtTime]=useState("");const [mtDuration,setMtDuration]=useState("30 min");const [mtLocation,setMtLocation]=useState("Zoom");const [mtHost,setMtHost]=useState("Priya");const [mtAgenda,setMtAgenda]=useState("");const [mtNotes,setMtNotes]=useState("");const [mtOutcome,setMtOutcome]=useState("");const [mtDeal,setMtDeal]=useState("");
  const MT_TYPES=[{v:"demo",l:"Demo",i:"🖥",c:C.a},{v:"discovery",l:"Discovery",i:"🔍",c:C.cy},{v:"technical",l:"Technical",i:"⚙",c:C.p},{v:"negotiation",l:"Negotiation",i:"🤝",c:C.y},{v:"onboarding",l:"Onboarding",i:"🚀",c:C.g},{v:"internal",l:"Internal",i:"👥",c:C.t3},{v:"follow_up",l:"Follow-up",i:"📞",c:"#ff6b35"}];
  const saveMt=()=>{if(!mtTitle.trim())return showT("Title required","error");const p={title:mtTitle,type:mtType,contact:mtContact,company:mtCompany,date:mtDate,time:mtTime,duration:mtDuration,location:mtLocation,host:mtHost,attendees:[mtHost],agenda:mtAgenda,notes:mtNotes,outcome:mtOutcome,deal:mtDeal,status:editMt?.status||"scheduled",activities:editMt?.activities||[]};if(editMt)setMeetings(pr=>pr.map(m=>m.id===editMt.id?{...m,...p}:m));else setMeetings(pr=>[{id:"mt"+uid(),...p},...pr]);showT(editMt?"Updated":"Scheduled!","success");setShowMF(false);setEditMt(null);if(api.isConnected()){if(editMt)api.patch(`/crm/meetings/${editMt.id}`,{title:mtTitle,type:mtType,contact_name:mtContact,company:mtCompany,date:mtDate,time:mtTime,duration:mtDuration,location:mtLocation}).catch(()=>{});else api.post("/crm/meetings",{title:mtTitle,type:mtType,contact_name:mtContact,company:mtCompany,date:mtDate,time:mtTime,duration:mtDuration,location:mtLocation}).catch(()=>{});}};
  const openMtE=m=>{setMtTitle(m.title);setMtType(m.type);setMtContact(m.contact);setMtCompany(m.company);setMtDate(m.date);setMtTime(m.time);setMtDuration(m.duration);setMtLocation(m.location);setMtHost(m.host);setMtAgenda(m.agenda);setMtNotes(m.notes);setMtOutcome(m.outcome||"");setMtDeal(m.deal||"");setEditMt(m);setShowMF(true);};
  const openMtN=()=>{setMtTitle("");setMtType("demo");setMtContact("");setMtCompany("");setMtDate("");setMtTime("");setMtDuration("30 min");setMtLocation("Zoom");setMtHost("Priya");setMtAgenda("");setMtNotes("");setMtOutcome("");setMtDeal("");setEditMt(null);setShowMF(true);};
  const completeMeeting=(id,outcome)=>{setMeetings(p=>p.map(m=>m.id===id?{...m,status:"completed",outcome:outcome||"Completed",activities:[{date:"Today",note:"Meeting completed"+(outcome?" — "+outcome:"")},...(m.activities||[])]}:m));showT("Meeting completed","success");};
  const logMtActivity=(mid,note)=>{setMeetings(p=>p.map(m=>m.id===mid?{...m,activities:[{date:"Today",note},...(m.activities||[])]}:m));showT("Note added","success");};
  const sortMeetings=arr=>{const s=mtSort;if(s==="date_asc")return[...arr].sort((a,b)=>(a.date||"").localeCompare(b.date||""));if(s==="date_desc")return[...arr].sort((a,b)=>(b.date||"").localeCompare(a.date||""));if(s==="name_asc")return[...arr].sort((a,b)=>a.title.localeCompare(b.title));return arr;};
  const fMeetings=sortMeetings(meetings.filter(m=>(mtFilter==="all"||m.type===mtFilter)&&(mtStatusFilter==="all"||m.status===mtStatusFilter)&&(mtHostFilter==="all"||m.host===mtHostFilter)&&(!mtSearch||m.title.toLowerCase().includes(mtSearch.toLowerCase())||(m.contact||"").toLowerCase().includes(mtSearch.toLowerCase())||(m.company||"").toLowerCase().includes(mtSearch.toLowerCase()))));

  // ═══ COMPANIES ═══
  const [compQ,setCompQ]=useState("");const [selComp,setSelComp]=useState(null);const [compView,setCompView]=useState("cards");const [compSideTab,setCompSideTab]=useState("details");const [compIndFilter,setCompIndFilter]=useState("all");const [compSzFilter,setCompSzFilter]=useState("all");const [compSort,setCompSort]=useState("name_asc");
  const [showCF,setShowCF]=useState(false);const [editCo,setEditCo]=useState(null);
  const [coName,setCoName]=useState("");const [coDom,setCoDom]=useState("");const [coInd,setCoInd]=useState("SaaS / Technology");const [coSz,setCoSz]=useState("11-50");const [coPh,setCoPh]=useState("");const [coEm,setCoEm]=useState("");const [coWeb,setCoWeb]=useState("");const [coAddr,setCoAddr]=useState("");const [coCtry,setCoCtry]=useState("India");const [coNotes,setCoNotes]=useState("");const [coTags,setCoTags]=useState("");
  const INDUSTRIES=["SaaS / Technology","E-Commerce","Retail","Finance","Healthcare","Education","Media","Manufacturing","Real Estate","Logistics","Other"];
  const COMP_SIZES=["1-10","11-50","51-200","201-500","500+","1000+"];
  const saveCo=()=>{if(!coName.trim())return showT("Name required","error");const p={name:coName,domain:coDom,industry:coInd,size:coSz,phone:coPh,email:coEm,website:coWeb,address:coAddr,country:coCtry,notes:coNotes,tags:coTags?coTags.split(",").map(t=>t.trim()).filter(Boolean):[],color:[C.a,C.g,C.p,C.y,C.cy,"#ff6b35"][comps.length%6]};if(editCo)setComps(pr=>pr.map(c=>c.id===editCo.id?{...c,...p}:c));else setComps(pr=>[{id:"co"+uid(),...p,created:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"2-digit"})},...pr]);showT(editCo?"Updated":"Customer created!","success");setShowCF(false);setEditCo(null);};
  const openCoE=co=>{setCoName(co.name);setCoDom(co.domain);setCoInd(co.industry);setCoSz(co.size);setCoPh(co.phone);setCoEm(co.email);setCoWeb(co.website);setCoAddr(co.address);setCoCtry(co.country);setCoNotes(co.notes);setCoTags((co.tags||[]).join(", "));setEditCo(co);setShowCF(true);};
  const openCoN=()=>{setCoName("");setCoDom("");setCoInd("SaaS / Technology");setCoSz("11-50");setCoPh("");setCoEm("");setCoWeb("");setCoAddr("");setCoCtry("India");setCoNotes("");setCoTags("");setEditCo(null);setShowCF(true);};
  const getCoContacts=name=>contacts.filter(c=>c.company===name);
  const getCoDeals=name=>deals.filter(d=>d.company===name);
  const getCoLeads=name=>leads.filter(l=>l.company===name);
  const getCoMeetings=name=>meetings.filter(m=>m.company===name);
  const getCoRev=name=>deals.filter(d=>d.company===name&&d.stage==="Won").reduce((s,d)=>s+d.value,0);
  const getCoPipeline=name=>deals.filter(d=>d.company===name&&!["Won","Lost"].includes(d.stage)).reduce((s,d)=>s+d.value,0);
  const getCoCsat=name=>{const cts=getCoContacts(name).filter(c=>c.csat);return cts.length?+(cts.reduce((s,c)=>s+(c.csat||0),0)/cts.length).toFixed(1):null;};
  const sortComps=arr=>{const s=compSort;if(s==="name_asc")return[...arr].sort((a,b)=>a.name.localeCompare(b.name));if(s==="name_desc")return[...arr].sort((a,b)=>b.name.localeCompare(a.name));if(s==="deals_desc")return[...arr].sort((a,b)=>getCoDeals(b.name).length-getCoDeals(a.name).length);if(s==="revenue_desc")return[...arr].sort((a,b)=>getCoRev(b.name)-getCoRev(a.name));if(s==="contacts_desc")return[...arr].sort((a,b)=>getCoContacts(b.name).length-getCoContacts(a.name).length);return arr;};
  const fComps=sortComps(comps.filter(c=>(compIndFilter==="all"||c.industry===compIndFilter)&&(compSzFilter==="all"||c.size===compSzFilter)&&(!compQ||c.name.toLowerCase().includes(compQ.toLowerCase())||c.industry.toLowerCase().includes(compQ.toLowerCase())||(c.domain||"").toLowerCase().includes(compQ.toLowerCase()))));

  // ═══ ACTIVITIES ═══
  const [acts,setActs]=useState([
    {id:"ac1",type:"call",contact:"Arjun Mehta",subject:"Follow-up on payment",date:"Today 10:30",agent:"Priya",duration:"12 min",notes:"Resolved via Stripe",done:true},
    {id:"ac2",type:"email",contact:"Sneha Iyer",subject:"Send pricing proposal",date:"Today 14:00",agent:"Dev",duration:"",notes:"Enterprise quote",done:false},
    {id:"ac3",type:"meeting",contact:"Rohan Patel",subject:"Demo for Pro features",date:"Tomorrow 11:00",agent:"Meena",duration:"30 min",notes:"Zoom call",done:false},
    {id:"ac4",type:"task",contact:"Priya Nair",subject:"Prepare onboarding docs",date:"Mar 28",agent:"Priya",duration:"",notes:"New enterprise",done:false},
    {id:"ac5",type:"call",contact:"Dev Kumar",subject:"API integration support",date:"Yesterday",agent:"Dev",duration:"8 min",notes:"Webhook setup",done:true},
    {id:"ac6",type:"email",contact:"Arjun Mehta",subject:"Invoice correction",date:"2d ago",agent:"Priya",duration:"",notes:"",done:true}
  ]);
  const [showAF,setShowAF]=useState(false);const [aT,setAT]=useState("call");const [aSubj,setASubj]=useState("");const [aCont,setACont]=useState("");const [aNote,setANote]=useState("");const [aDate,setADate]=useState("");const [aAg,setAAg]=useState("Priya");const [actFilter,setActFilter]=useState("all");const [actView,setActView]=useState("list");
  const AIC={call:"📞",email:"📧",meeting:"🤝",task:"📋",note:"📝"};
  const saveA=()=>{if(!aSubj.trim())return showT("Subject required","error");setActs(p=>[{id:"ac"+uid(),type:aT,contact:aCont,subject:aSubj,date:aDate||"Today",agent:aAg,duration:"",notes:aNote,done:false},...p]);showT("Activity logged","success");setShowAF(false);};
  const fActs=acts.filter(a=>actFilter==="all"||a.type===actFilter);

  // ═══ SCORING ═══
  const getScore=ct=>{let s=20;if(ct.plan==="Enterprise")s+=30;else if(ct.plan==="Pro")s+=20;else if(ct.plan==="Starter")s+=5;s+=Math.min((ct.convs||0)*3,20);if(ct.csat>=4.5)s+=15;else if(ct.csat>=3.5)s+=8;if((ct.tags||[]).includes("vip"))s+=10;if(ct.totalSpend&&ct.totalSpend!=="—")s+=5;return Math.min(s,100);};
  const sCol=s=>s>=75?C.g:s>=50?C.a:s>=25?C.y:C.r;

  // Dashboard computations (memoized)
  const crmStats=useMemo(()=>{
    const openD=deals.filter(d=>!["Won","Lost"].includes(d.stage));
    const wonD=deals.filter(d=>d.stage==="Won");
    const lostD=deals.filter(d=>d.stage==="Lost");
    const pVal=openD.reduce((s,d)=>s+d.value,0);
    return {openDeals:openD,wonDeals:wonD,lostDeals:lostD,pipelineVal:pVal,
      weightedPipeline:Math.round(openD.reduce((s,d)=>s+d.value*d.probability/100,0)),
      wonVal:wonD.reduce((s,d)=>s+d.value,0),
      winRate:wonD.length+lostD.length>0?Math.round(wonD.length/(wonD.length+lostD.length)*100):0,
      activeLeads:leads.filter(l=>!["Converted","Lost"].includes(l.stage)).length,
      dueTasks:tasks.filter(t=>t.status!=="done").length,
      overdueTasks:tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=="done").length,
      upcomingMtgs:meetings.filter(m=>m.status==="scheduled").length,
      avgDealSize:openD.length?Math.round(pVal/openD.length):0,
      leadConvRate:leads.length?Math.round(leads.filter(l=>l.stage==="Converted").length/leads.length*100):0};
  },[deals,leads,tasks,meetings]);
  const {openDeals,wonDeals,lostDeals,pipelineVal,weightedPipeline,wonVal,winRate,activeLeads,dueTasks,overdueTasks,upcomingMtgs,avgDealSize,leadConvRate}=crmStats;

  // Owner performance (memoized)
  const owners=["Priya","Dev","Meena","Aryan"];
  const ownerStats=useMemo(()=>owners.map(o=>({name:o,deals:deals.filter(d=>d.owner===o&&!["Won","Lost"].includes(d.stage)).length,pipeline:deals.filter(d=>d.owner===o&&!["Won","Lost"].includes(d.stage)).reduce((s,d)=>s+d.value,0),won:deals.filter(d=>d.owner===o&&d.stage==="Won").reduce((s,d)=>s+d.value,0),leads:leads.filter(l=>l.owner===o&&!["Converted","Lost"].includes(l.stage)).length,tasks:tasks.filter(t=>t.assignee===o&&t.status!=="done").length})),[deals,leads,tasks]);

  // Recent activity feed (aggregate from all entities)
  const recentActivities=useMemo(()=>{const r=[];deals.forEach(d=>(d.activities||[]).slice(0,2).forEach(a=>r.push({...a,entity:"deal",entityName:d.name,icon:"💰"})));leads.forEach(l=>(l.activities||[]).slice(0,1).forEach(a=>r.push({...a,entity:"lead",entityName:l.name,icon:"🎯"})));meetings.forEach(m=>(m.activities||[]).slice(0,1).forEach(a=>r.push({...a,entity:"meeting",entityName:m.title,icon:"📅"})));tasks.forEach(t=>(t.comments||[]).slice(0,1).forEach(c=>r.push({date:c.date,note:c.text,entity:"task",entityName:t.title,icon:"✅",type:"comment"})));return r;},[deals,leads,meetings,tasks]);

  // CRM Global search (memoized)
  const crmResults=useMemo(()=>crmSearch.trim().length<2?[]:[ 
    ...leads.filter(l=>l.name.toLowerCase().includes(crmSearch.toLowerCase())||l.company.toLowerCase().includes(crmSearch.toLowerCase())||(l.email||"").toLowerCase().includes(crmSearch.toLowerCase())).map(l=>({type:"lead",id:l.id,title:l.name,sub:l.company+" · "+l.stage,icon:"🎯",color:LC2[l.stage]})),
    ...deals.filter(d=>d.name.toLowerCase().includes(crmSearch.toLowerCase())||d.company.toLowerCase().includes(crmSearch.toLowerCase())||(d.contact||"").toLowerCase().includes(crmSearch.toLowerCase())).map(d=>({type:"deal",id:d.id,title:d.name,sub:d.company+" · ₹"+d.value.toLocaleString(),icon:"💰",color:SC[d.stage]})),
    ...tasks.filter(t=>t.title.toLowerCase().includes(crmSearch.toLowerCase())||(t.contact||"").toLowerCase().includes(crmSearch.toLowerCase())).map(t=>({type:"task",id:t.id,title:t.title,sub:t.assignee+" · "+t.status,icon:"✅",color:TASK_STATUS.find(s=>s.v===t.status)?.c||C.t3})),
    ...meetings.filter(m=>m.title.toLowerCase().includes(crmSearch.toLowerCase())||(m.contact||"").toLowerCase().includes(crmSearch.toLowerCase())||(m.company||"").toLowerCase().includes(crmSearch.toLowerCase())).map(m=>({type:"meeting",id:m.id,title:m.title,sub:m.date+" · "+m.time,icon:"📅",color:MT_TYPES.find(t=>t.v===m.type)?.c||C.a})),
    ...comps.filter(c=>c.name.toLowerCase().includes(crmSearch.toLowerCase())||(c.domain||"").toLowerCase().includes(crmSearch.toLowerCase())).map(c=>({type:"company",id:c.id,title:c.name,sub:c.industry+" · "+c.size,icon:"🏢",color:c.color}))
  ].slice(0,12),[crmSearch,leads,deals,tasks,meetings,comps]);

  // Export
  const exportCSV=(type)=>{let csv="";if(type==="deals"){csv="Name,Company,Value,Stage,Probability,Owner,Contact,Close Date,Product\n";deals.forEach(d=>csv+=`"${d.name}","${d.company}",${d.value},"${d.stage}",${d.probability},"${d.owner}","${d.contact||""}","${d.closeDate}","${d.product||""}"\n`);}else if(type==="leads"){csv="Name,Email,Company,Designation,Phone,Source,Stage,Score,Owner,Value\n";leads.forEach(l=>csv+=`"${l.name}","${l.email}","${l.company}","${l.designation||""}","${l.phone}","${l.source}","${l.stage}",${l.score},"${l.owner}",${l.value||0}\n`);}else if(type==="tasks"){csv="Title,Assignee,Due,Priority,Status,Contact,Company,Deal\n";tasks.forEach(t=>csv+=`"${t.title}","${t.assignee}","${t.dueDate}","${t.priority}","${t.status}","${t.contact||""}","${t.company||""}","${t.deal||""}"\n`);}const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=type+"_export.csv";a.click();URL.revokeObjectURL(url);showT("Exported "+type+".csv","success");};

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,fontFamily:FB,color:C.t1}}>
    {/* ═══ CRM DASHBOARD HEADER ═══ */}
    <div style={{flexShrink:0,background:C.s1,borderBottom:`1px solid ${C.b1}`}}>
      {/* Title + Global Search + Quick Actions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 24px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg, ${C.a}, ${C.p})`,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
          <div><h1 style={{fontSize:20,fontWeight:800,fontFamily:FD,margin:0}}>CRM</h1><p style={{fontSize:11,color:C.t3,marginTop:1,fontFamily:FM}}>Sales pipeline & relationship management</p></div>
        </div>

        {/* Global CRM Search */}
        <div style={{position:"relative",flex:1,maxWidth:340,margin:"0 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:`1px solid ${crmSearch?C.a:C.b1}`,borderRadius:10,padding:"7px 14px",transition:"border .15s"}}>
            <span style={{fontSize:13,color:C.t3}}>🔍</span>
            <input value={crmSearch} onChange={e=>setCrmSearch(e.target.value)} placeholder="Search across all CRM…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
            {crmSearch&&<button onClick={()=>setCrmSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:11}}>×</button>}
          </div>
          {/* Search results dropdown */}
          {crmResults.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,boxShadow:`0 8px 24px ${C.bg}`,zIndex:50,maxHeight:360,overflowY:"auto",padding:6}}>
            <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,padding:"4px 10px",letterSpacing:".5px"}}>{crmResults.length} RESULTS</div>
            {crmResults.map((r,i)=>(
              <div key={i} onClick={()=>{setCrmSearch("");if(r.type==="lead"){setTab("leads");setSelLead(r.id);}else if(r.type==="deal"){setTab("deals");setSelDeal(r.id);}else if(r.type==="task"){setTab("tasks");setSelTask(r.id);}else if(r.type==="meeting"){setTab("meetings");setSelMeeting(r.id);}else if(r.type==="company"){setTab("companies");setSelComp(r.id);}}} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,cursor:"pointer",transition:"background .1s"}} className="hov">
                <span style={{fontSize:16}}>{r.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{r.sub}</div>
                </div>
                <span style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:r.color+"18",color:r.color,fontWeight:700,fontFamily:FM,textTransform:"uppercase"}}>{r.type}</span>
              </div>
            ))}
          </div>}
        </div>

        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {/* Quick Actions dropdown */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowQuickAct(!showQuickAct)} style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700,background:C.s2,color:C.t1,border:`1px solid ${C.b1}`,cursor:"pointer",fontFamily:FM,display:"flex",alignItems:"center",gap:4}}>⚡ Quick Actions <span style={{fontSize:8,color:C.t3}}>▾</span></button>
            {showQuickAct&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,boxShadow:`0 8px 24px ${C.bg}`,zIndex:50,padding:6,minWidth:200}}>
              {[{icon:"🎯",label:"New Lead",action:()=>{openLN();setTab("leads");}},{icon:"💰",label:"New Deal",action:()=>{openDN();setTab("deals");}},{icon:"✅",label:"New Task",action:()=>{openTkN();setTab("tasks");}},{icon:"📅",label:"Schedule Meeting",action:()=>{openMtN();setTab("meetings");}},{icon:"🏢",label:"New Customer",action:()=>{openCoN();setTab("companies");}},{icon:"📋",label:"Log Activity",action:()=>{setShowAF(true);setTab("activities");}},null,{icon:"📤",label:"Export Leads CSV",action:()=>exportCSV("leads")},{icon:"📤",label:"Export Deals CSV",action:()=>exportCSV("deals")},{icon:"📤",label:"Export Tasks CSV",action:()=>exportCSV("tasks")}].map((item,i)=>item===null?<div key={i} style={{height:1,background:C.b1,margin:"4px 0"}}/>:(
                <button key={i} onClick={()=>{item.action();setShowQuickAct(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:6,fontSize:12,color:C.t1,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",fontFamily:FB}} className="hov">
                  <span style={{fontSize:14}}>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>}
          </div>
          {/* Context-sensitive primary action */}
          {tab==="leads"&&<><Btn ch="↓ Export" v="ghost" sm onClick={()=>{exportTableCSV(["Name","Email","Company","Stage","Score","Owner","Value"],leads.map(l=>[l.name,l.email,l.company,l.stage,l.score,l.owner,l.value]),"crm_leads.csv");showT("Exported "+leads.length+" leads","success");}}/><Btn ch="+ New Lead" v="primary" onClick={openLN}/></>}
          {tab==="deals"&&<><Btn ch="↓ Export" v="ghost" sm onClick={()=>{exportTableCSV(["Name","Company","Value","Stage","Probability","Owner","Close Date"],deals.map(d=>[d.name,d.company,d.value,d.stage,d.probability+"%",d.owner,d.closeDate]),"crm_deals.csv");showT("Exported "+deals.length+" deals","success");}}/><Btn ch="+ New Deal" v="primary" onClick={openDN}/></>}
          {tab==="tasks"&&<><Btn ch="↓ Export" v="ghost" sm onClick={()=>{exportTableCSV(["Title","Assignee","Status","Priority","Due Date"],tasks.map(t=>[t.title,t.assignee,t.status,t.priority,t.dueDate]),"crm_tasks.csv");showT("Exported "+tasks.length+" tasks","success");}}/><Btn ch="+ New Task" v="primary" onClick={openTkN}/></>}
          {tab==="meetings"&&<><Btn ch="↓ Export" v="ghost" sm onClick={()=>{exportTableCSV(["Title","Contact","Company","Date","Time","Host","Status"],meetings.map(m=>[m.title,m.contact,m.company,m.date,m.time,m.host,m.status]),"crm_meetings.csv");showT("Exported "+meetings.length+" meetings","success");}}/><Btn ch="+ Schedule" v="primary" onClick={openMtN}/></>}
          {tab==="companies"&&<Btn ch="+ New Customer" v="primary" onClick={openCoN}/>}
          {tab==="activities"&&<Btn ch="+ Log Activity" v="primary" onClick={()=>setShowAF(true)}/>}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,padding:"12px 24px 0"}}>
        {[
          {icon:"🎯",label:"Active Leads",value:activeLeads,sub:leadConvRate+"% conversion",color:C.cy,bg:C.cy+"12",click:()=>setTab("leads")},
          {icon:"💰",label:"Open Deals",value:openDeals.length,sub:"₹"+avgDealSize.toLocaleString()+" avg",color:C.a,bg:C.ad,click:()=>setTab("deals")},
          {icon:"📈",label:"Pipeline",value:"₹"+(pipelineVal/1000).toFixed(0)+"K",sub:"Weighted: ₹"+(weightedPipeline/1000).toFixed(0)+"K",color:C.p,bg:C.pd,click:()=>setTab("deals")},
          {icon:"✅",label:"Won Revenue",value:"₹"+(wonVal/1000).toFixed(0)+"K",sub:winRate+"% win rate",color:C.g,bg:C.gd,click:()=>setTab("deals")},
          {icon:"📋",label:"Tasks Due",value:dueTasks,sub:overdueTasks+" overdue",color:overdueTasks>0?C.r:C.y,bg:overdueTasks>0?C.rd:C.yd,click:()=>setTab("tasks")},
          {icon:"📅",label:"Meetings",value:upcomingMtgs,sub:meetings.filter(m=>m.status==="completed").length+" completed",color:C.cy,bg:C.cy+"12",click:()=>setTab("meetings")}
        ].map(k=>(
          <div key={k.label} onClick={k.click} style={{padding:"10px 12px",background:k.bg,borderRadius:10,border:`1px solid ${k.color}22`,cursor:"pointer",transition:"transform .1s"}} className="hov">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:14}}>{k.icon}</span>
              <span style={{fontSize:9,color:k.color,fontFamily:FM,fontWeight:600}}>{k.sub}</span>
            </div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:k.color}}>{k.value}</div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel + Owner Performance + Recent Activity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"10px 24px"}}>
        {/* Pipeline Funnel */}
        <div style={{background:C.s2,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.b1}`}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>PIPELINE FUNNEL</div>
          <div style={{display:"flex",gap:0,height:28,borderRadius:6,overflow:"hidden"}}>
            {STAGES.map(stage=>{const cnt=deals.filter(d=>d.stage===stage).length;const pct=deals.length?Math.max(cnt/deals.length*100,cnt>0?6:0):0;return pct>0?<div key={stage} title={stage+": "+cnt+" (₹"+deals.filter(d=>d.stage===stage).reduce((s,d)=>s+d.value,0).toLocaleString()+")"} style={{width:pct+"%",background:SC[stage],display:"flex",alignItems:"center",justifyContent:"center",transition:"width .3s",minWidth:cnt>0?20:0}}>
              <span style={{fontSize:8,color:"#fff",fontWeight:700,fontFamily:FM}}>{cnt}</span>
            </div>:null;})}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            {STAGES.map(s=><span key={s} style={{fontSize:7,color:SC[s],fontFamily:FM,fontWeight:600}}>{s}</span>)}
          </div>
        </div>

        {/* Owner Performance */}
        <div style={{background:C.s2,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.b1}`}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>TEAM PERFORMANCE</div>
          {ownerStats.filter(o=>o.deals+o.leads+o.tasks>0).map(o=>(
            <div key={o.name} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <Av i={o.name[0]+o.name[1]} c={o.name==="Priya"?C.a:o.name==="Dev"?C.g:o.name==="Meena"?C.p:C.y} s={20}/>
              <span style={{fontSize:10,fontWeight:600,width:40}}>{o.name}</span>
              <div style={{flex:1,display:"flex",gap:8,fontSize:9,fontFamily:FM}}>
                <span style={{color:C.p}}>{o.deals}D</span>
                <span style={{color:C.cy}}>{o.leads}L</span>
                <span style={{color:C.y}}>{o.tasks}T</span>
                <span style={{color:C.g}}>₹{(o.pipeline/1000).toFixed(0)}K</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div style={{background:C.s2,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.b1}`,maxHeight:90,overflowY:"auto"}}>
          <div style={{fontSize:10,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6}}>RECENT ACTIVITY</div>
          {recentActivities.slice(0,5).map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:4}}>
              <span style={{fontSize:10,flexShrink:0}}>{a.icon}</span>
              <div style={{flex:1,minWidth:0}}><span style={{fontSize:9,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block"}}>{a.note?.slice(0,45)}{(a.note||"").length>45?"…":""}</span><span style={{fontSize:8,color:C.t3,fontFamily:FM}}>{a.entityName} · {a.date}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:"flex",gap:0,padding:"0 24px"}}>
        {[
          ["leads","🎯 Leads",activeLeads],
          ["deals","💰 Deals",openDeals.length],
          ["tasks","✅ Tasks",dueTasks],
          ["meetings","📅 Meetings",upcomingMtgs],
          ["companies","🏢 Customers",comps.length],
          ["activities","📋 Activities",acts.filter(a=>!a.done).length]
        ].map(([id,l,cnt])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 14px",fontSize:12.5,fontWeight:700,fontFamily:FD,color:tab===id?C.a:C.t3,borderBottom:`2.5px solid ${tab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"color .15s"}}>
            {l}
            {cnt>0&&<span style={{fontSize:9,fontFamily:FM,padding:"1px 6px",borderRadius:10,background:tab===id?C.ad:C.s3,color:tab===id?C.a:C.t3,fontWeight:600}}>{cnt}</span>}
          </button>
        ))}
      </div>
    </div>

    {/* ═══ CRM AI ADVISOR ═══ */}
    {!crmLoading&&<div style={{margin:"0 24px 12px"}}>
      <AiInsight title="CRM AI ADVISOR" loading={crmAiLoad} onRefresh={genCrmAi} items={crmAi?crmAi.split("\n").filter(l=>l.trim()).map(l=>({icon:l.startsWith("•")?"":undefined,text:l.replace(/^[•\-]\s*/,"")})):[{text:"Click Refresh to get AI-powered pipeline analysis, deal risk alerts, and next-best-action recommendations."}]}/>
    </div>}

    {/* ═══ CRM LOADING SKELETON ═══ */}
    {crmLoading&&<div style={{flex:1,padding:"24px"}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}><Spin/><span style={{fontSize:12,color:C.t2,fontFamily:FM}}>Loading CRM data from API…</span></div><SkelTable rows={6} cols={5}/></div>}

    {/* ═══ DEALS ═══ */}
    {!crmLoading&&tab==="deals"&&<div style={{flex:1,display:"flex",minWidth:0}}>
      <div style={{flex:1,padding:"16px 24px",overflowY:"auto"}}>
        {/* Toolbar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 12px",flex:1,maxWidth:260}}>
            <span style={{fontSize:12,color:C.t3}}>🔍</span>
            <input value={dealSearch} onChange={e=>setDealSearch(e.target.value)} placeholder="Search deals…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
            {dealSearch&&<button onClick={()=>setDealSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10}}>×</button>}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <Sel val={dealFilter} set={setDealFilter} opts={[{v:"all",l:"All Stages"},...STAGES.map(s=>({v:s,l:s}))]}/>
            <Sel val={dealOwnerFilter} set={setDealOwnerFilter} opts={[{v:"all",l:"All Owners"},...["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))]}/>
            <Sel val={dealSort} set={setDealSort} opts={[{v:"value_desc",l:"Value ↓"},{v:"value_asc",l:"Value ↑"},{v:"prob_desc",l:"Probability ↓"},{v:"close_asc",l:"Close Date"},{v:"name_asc",l:"Name A-Z"}]}/>
            <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>{[["kanban","▦"],["list","☰"]].map(([v,i])=><button key={v} onClick={()=>setDealView(v)} style={{padding:"6px 12px",fontSize:12,background:dealView===v?C.ad:"transparent",color:dealView===v?C.a:C.t3,border:"none",cursor:"pointer",fontWeight:700}}>{i}</button>)}</div>
          </div>
        </div>

        {/* Active filters */}
        {(dealFilter!=="all"||dealOwnerFilter!=="all"||dealSearch)&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"6px 12px",background:C.ad,borderRadius:8,border:`1px solid ${C.a}33`}}>
          <span style={{fontSize:11,color:C.a,fontFamily:FM}}>Showing {filteredDeals.length} of {deals.length} deals</span>
          <div style={{flex:1}}/>
          <button onClick={()=>{setDealFilter("all");setDealOwnerFilter("all");setDealSearch("");}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Clear all</button>
        </div>}

        {/* ═══ KANBAN VIEW ═══ */}
        {dealView==="kanban"&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8}}>
          {STAGES.filter(s=>dealFilter==="all"||s===dealFilter).map(stage=>{const sd=filteredDeals.filter(d=>d.stage===stage);const stageTotal=sd.reduce((s,d)=>s+d.value,0);const weighted=sd.reduce((s,d)=>s+d.value*d.probability/100,0);return(
            <div key={stage} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(drag){setDeals(p=>p.map(d=>d.id===drag?{...d,stage,probability:stage==="Won"?100:stage==="Lost"?0:stage==="Negotiation"?75:stage==="Proposal"?50:stage==="Qualified"?40:15,activities:[{type:"note",date:"Today",note:"Moved to "+stage},...(d.activities||[])]}:d));setDrag(null);showT("→ "+stage,"success");}}} style={{minWidth:195,flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"10px 12px",borderBottom:`3px solid ${SC[stage]}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:700,color:SC[stage]}}>{stage}</span><span style={{fontSize:10,fontFamily:FM,color:C.t3,background:C.s2,padding:"1px 6px",borderRadius:8}}>{sd.length}</span></div>
                <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>₹{stageTotal.toLocaleString()}</div>
                {weighted>0&&weighted!==stageTotal&&<div style={{fontSize:9,color:SC[stage],fontFamily:FM}}>Weighted: ₹{Math.round(weighted).toLocaleString()}</div>}
              </div>
              <div style={{flex:1,padding:6,minHeight:90}}>
                {sd.map(d=>(
                  <div key={d.id} draggable onDragStart={()=>setDrag(d.id)} onClick={()=>{setSelDeal(selDeal===d.id?null:d.id);setDealSideTab("details");}} className="card-lift" style={{padding:10,background:selDeal===d.id?C.ad:C.s2,border:`1.5px solid ${selDeal===d.id?SC[stage]:C.b1}`,borderRadius:8,marginBottom:6,cursor:"grab"}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:2}}>{d.name}</div>
                    <div style={{fontSize:10,color:C.t2,marginBottom:3}}>🏢 {d.company}</div>
                    <div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:SC[stage]}}>₹{d.value.toLocaleString()}</div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.t3,fontFamily:FM,marginTop:4}}>
                      <span>{d.owner}</span>
                      <div style={{display:"flex",alignItems:"center",gap:3}}>
                        <div style={{width:24,height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}><div style={{width:`${d.probability}%`,height:"100%",background:SC[stage],borderRadius:2}}/></div>
                        <span>{d.probability}%</span>
                      </div>
                    </div>
                    {d.contact&&<div style={{fontSize:9,color:C.a,fontFamily:FM,marginTop:2}}>👤 {d.contact}</div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
                      {d.product&&<Tag text={d.product} color={d.product==="Enterprise"?C.p:d.product==="Pro"?C.a:C.t3}/>}
                      <span style={{fontSize:8,color:C.t3,fontFamily:FM}}>📅 {d.closeDate}</span>
                    </div>
                    {/* Inline actions on selected */}
                    {selDeal===d.id&&<div style={{display:"flex",gap:3,marginTop:6,borderTop:`1px solid ${C.b1}`,paddingTop:6}} onClick={e=>e.stopPropagation()}>
                      <Btn ch="✎" v="ghost" sm onClick={()=>openDE(d)}/>
                      {!["Won","Lost"].includes(d.stage)&&<><Btn ch="✓ Won" v="success" sm onClick={()=>markDeal(d.id,"Won")}/><Btn ch="✕ Lost" v="danger" sm onClick={()=>markDeal(d.id,"Lost")}/></>}
                      <Btn ch="🗑" v="danger" sm onClick={()=>{setDeals(p=>p.filter(x=>x.id!==d.id));setSelDeal(null);showT("Deleted","success");}}/>
                    </div>}
                  </div>
                ))}
                {sd.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:10,border:`2px dashed ${C.b1}`,borderRadius:8}}>Drop deals here</div>}
              </div>
            </div>
          );})}
        </div>}

        {/* ═══ LIST VIEW ═══ */}
        {dealView==="list"&&<>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 70px 70px 70px 70px 50px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["Deal","Company","Value","Stage","Prob.","Product","Owner",""].map(h=><span key={h||"x"} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {filteredDeals.map(d=>(
            <div key={d.id} onClick={()=>{setSelDeal(selDeal===d.id?null:d.id);setDealSideTab("details");}} style={{display:"grid",gridTemplateColumns:"1fr 90px 80px 70px 70px 70px 70px 50px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer",background:selDeal===d.id?C.ad:"transparent",opacity:d.stage==="Lost"?0.6:1}}>
              <div>
                <div style={{fontSize:12,fontWeight:600}}>{d.name}</div>
                {d.contact&&<div style={{fontSize:9,color:C.a,fontFamily:FM}}>👤 {d.contact}</div>}
                <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>Close: {d.closeDate}</div>
              </div>
              <span style={{fontSize:11,color:C.t2}}>{d.company}</span>
              <span style={{fontSize:12,fontWeight:700,color:d.stage==="Won"?C.g:d.stage==="Lost"?C.r:C.a,fontFamily:FM}}>₹{d.value.toLocaleString()}</span>
              <Tag text={d.stage} color={SC[d.stage]}/>
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:28,height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}><div style={{width:`${d.probability}%`,height:"100%",background:SC[d.stage],borderRadius:2}}/></div>
                <span style={{fontSize:10,color:C.t2,fontFamily:FM}}>{d.probability}%</span>
              </div>
              <Tag text={d.product||"—"} color={d.product==="Enterprise"?C.p:d.product==="Pro"?C.a:C.t3}/>
              <span style={{fontSize:11,color:C.t2}}>{d.owner}</span>
              <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>openDE(d)} style={{fontSize:9,color:C.a,background:"none",border:"none",cursor:"pointer"}}>✎</button>
                <button onClick={()=>{setDeals(p=>p.filter(x=>x.id!==d.id));if(selDeal===d.id)setSelDeal(null);showT("Deleted","success");}} style={{fontSize:9,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          ))}
          {filteredDeals.length===0&&<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No deals match your filters</div>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:11,color:C.t3,fontFamily:FM}}>
          <span>{filteredDeals.length} deals · Pipeline: ₹{filteredDeals.filter(d=>!["Won","Lost"].includes(d.stage)).reduce((s,d)=>s+d.value,0).toLocaleString()}</span>
          <span>Weighted: ₹{Math.round(filteredDeals.filter(d=>!["Won","Lost"].includes(d.stage)).reduce((s,d)=>s+d.value*d.probability/100,0)).toLocaleString()} · Won: ₹{filteredDeals.filter(d=>d.stage==="Won").reduce((s,d)=>s+d.value,0).toLocaleString()}</span>
        </div>
        </>}
      </div>

      {/* ═══ DEAL DETAIL SIDEBAR ═══ */}
      {selDeal&&(()=>{const d=deals.find(x=>x.id===selDeal);if(!d)return null;const stageIdx=STAGES.indexOf(d.stage);const actIcn={call:"📞",email:"📧",meeting:"🤝",task:"📋",note:"📝"};return <aside style={{width:360,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Deal Details</span><button onClick={()=>setSelDeal(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:2}}>{d.name}</div>
          <div style={{display:"flex",gap:4,marginBottom:8}}><Tag text={d.stage} color={SC[d.stage]}/>{d.product&&<Tag text={d.product} color={d.product==="Enterprise"?C.p:C.a}/>}</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,padding:"8px",background:C.gd,borderRadius:8,textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:C.g}}>₹{d.value.toLocaleString()}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Deal Value</div></div>
            <div style={{flex:1,padding:"8px",background:SC[d.stage]+"12",borderRadius:8,textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,fontFamily:FD,color:SC[d.stage]}}>{d.probability}%</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Probability</div></div>
            <div style={{flex:1,padding:"8px",background:C.pd,borderRadius:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.p}}>₹{Math.round(d.value*d.probability/100).toLocaleString()}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Weighted</div></div>
          </div>
          {/* Stage pipeline */}
          <div style={{display:"flex",gap:2,marginTop:8}}>{STAGES.map((st,i)=>(
            <div key={st} onClick={()=>{setDeals(p=>p.map(x=>x.id===d.id?{...x,stage:st,probability:st==="Won"?100:st==="Lost"?0:st==="Negotiation"?75:st==="Proposal"?50:st==="Qualified"?40:15,activities:[{type:"note",date:"Today",note:"Stage → "+st},...(x.activities||[])]}:x));}} style={{flex:1,padding:"5px 2px",borderRadius:4,textAlign:"center",cursor:"pointer",background:i<=stageIdx?SC[st]+"22":"transparent",border:`1px solid ${i<=stageIdx?SC[st]+"44":C.b1}`}}>
              <div style={{fontSize:7,fontWeight:700,color:i<=stageIdx?SC[st]:C.t3,fontFamily:FM}}>{st}</div>
            </div>
          ))}</div>
        </div>

        {/* Sidebar tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          {[["details","📋 Details"],["activity","📊 Activity"],["notes","📝 Notes"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setDealSideTab(id)} style={{flex:1,padding:"8px 0",fontSize:11,fontWeight:700,fontFamily:FM,color:dealSideTab===id?C.a:C.t3,borderBottom:`2px solid ${dealSideTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lb}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto"}}>
          {/* Details */}
          {dealSideTab==="details"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>DEAL INFORMATION</div>
            <div style={{background:C.s2,borderRadius:10,padding:"8px 12px",marginBottom:14}}>
              {[{icon:"🏢",l:"Company",v:d.company},{icon:"👤",l:"Contact",v:d.contact||"—"},{icon:"📦",l:"Product",v:d.product||"—"},{icon:"👤",l:"Owner",v:d.owner},{icon:"📅",l:"Close Date",v:d.closeDate},{icon:"📅",l:"Created",v:d.created}].map(r=>(
                <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.b1}11`}}>
                  <span style={{fontSize:11}}>{r.icon}</span>
                  <span style={{fontSize:10,color:C.t3,width:70,fontFamily:FM}}>{r.l}</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>}

          {/* Activity */}
          {dealSideTab==="activity"&&<div style={{padding:"12px 18px"}}>
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              {Object.entries(actIcn).map(([t,ic])=>(
                <button key={t} onClick={()=>{const n=window.prompt("Log "+t+":");if(n)logDealActivity(d.id,t,n);}} style={{flex:1,padding:"6px",borderRadius:6,fontSize:10,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"center",fontWeight:600,color:C.t2}} className="hov">{ic}<br/><span style={{fontSize:8,color:C.t3}}>{t}</span></button>
              ))}
            </div>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8,letterSpacing:".5px"}}>TIMELINE ({(d.activities||[]).length})</div>
            {(d.activities||[]).map((a,i)=>(
              <div key={i} style={{display:"flex",gap:10,position:"relative"}}>
                {i<(d.activities||[]).length-1&&<div style={{position:"absolute",left:14,top:28,width:1,bottom:-4,background:C.b1}}/>}
                <div style={{width:28,height:28,borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,zIndex:1}}>{actIcn[a.type]||"📝"}</div>
                <div style={{flex:1,paddingBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:700,textTransform:"capitalize"}}>{a.type}</span><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{a.date}</span></div>
                  <div style={{fontSize:11,color:C.t2,marginTop:2,lineHeight:1.4}}>{a.note}</div>
                </div>
              </div>
            ))}
            {(d.activities||[]).length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>No activities</div>}
          </div>}

          {/* Notes */}
          {dealSideTab==="notes"&&<div style={{padding:"12px 18px"}}>
            <div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.6,marginBottom:12,whiteSpace:"pre-wrap"}}>{d.notes||"No notes."}</div>
            <textarea placeholder="Add a note…" rows={3} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();const v=e.target.value.trim();if(v){setDeals(p=>p.map(x=>x.id===d.id?{...x,notes:x.notes?x.notes+"\n"+v:v}:x));logDealActivity(d.id,"note",v);e.target.value="";}}}} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:4}}>Press Enter to save</div>
          </div>}
          {/* Custom Fields for deal */}
          {customFields&&<div style={{padding:"6px 18px"}}><CfPanel entity="deal" recordId={d.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/></div>}
        </div>

        {/* Actions footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          {!["Won","Lost"].includes(d.stage)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <Btn ch="✓ Mark Won" v="success" full sm onClick={()=>{markDeal(d.id,"Won");setSelDeal(null);}}/>
            <Btn ch="✕ Mark Lost" v="danger" full sm onClick={()=>{markDeal(d.id,"Lost");setSelDeal(null);}}/>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            <Btn ch="✎ Edit Deal" v="ghost" full sm onClick={()=>openDE(d)}/>
            <Btn ch="🗑 Delete" v="danger" full sm onClick={()=>{setDeals(p=>p.filter(x=>x.id!==d.id));setSelDeal(null);showT("Deleted","success");}}/>
          </div>
        </div>
      </aside>;})()}
    </div>}

    {/* ═══ LEADS ═══ */}
    {!crmLoading&&tab==="leads"&&<div style={{flex:1,display:"flex",minWidth:0}}>
      <div style={{flex:1,padding:"16px 24px",overflowY:"auto"}}>
        {/* Toolbar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 12px",flex:1,maxWidth:280}}>
            <span style={{fontSize:12,color:C.t3}}>🔍</span>
            <input value={leadSearch} onChange={e=>setLeadSearch(e.target.value)} placeholder="Search leads…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
            {leadSearch&&<button onClick={()=>setLeadSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10}}>×</button>}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <Sel val={leadSourceFilter} set={setLeadSourceFilter} opts={[{v:"all",l:"All Sources"},...LEAD_SOURCES.map(s=>({v:s,l:s}))]}/>
            <Sel val={leadOwnerFilter} set={setLeadOwnerFilter} opts={[{v:"all",l:"All Owners"},...["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))]}/>
            <Sel val={leadSort} set={setLeadSort} opts={[{v:"score_desc",l:"Score ↓"},{v:"score_asc",l:"Score ↑"},{v:"value_desc",l:"Value ↓"},{v:"name_asc",l:"Name A-Z"},{v:"newest",l:"Newest"}]}/>            <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>
              {[["pipeline","📋"],["kanban","▦"],["list","☰"],["scoring","📊"]].map(([v,ic])=>(
                <button key={v} onClick={()=>setLeadView(v)} title={v[0].toUpperCase()+v.slice(1)} style={{padding:"6px 10px",fontSize:12,fontWeight:700,background:leadView===v?C.ad:"transparent",color:leadView===v?C.a:C.t3,border:"none",cursor:"pointer"}}>{ic}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Stage filter cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:14}}>
          {LEAD_STAGES.map(st=>{const cnt=leads.filter(l=>l.stage===st).length;const isActive=leadFilter===st;return(
            <div key={st} onClick={()=>setLeadFilter(isActive?"all":st)} style={{padding:"10px 8px",background:isActive?LC2[st]+"15":C.s1,border:`1.5px solid ${isActive?LC2[st]:C.b1}`,borderRadius:10,textAlign:"center",cursor:"pointer",transition:"all .15s"}}>
              <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:LC2[st]}}>{cnt}</div>
              <div style={{fontSize:10,color:isActive?LC2[st]:C.t3,fontFamily:FM,fontWeight:isActive?700:400}}>{st}</div>
            </div>
          );})}
        </div>

        {/* Active filters indicator */}
        {(leadFilter!=="all"||leadSourceFilter!=="all"||leadOwnerFilter!=="all"||leadSearch)&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"6px 12px",background:C.ad,borderRadius:8,border:`1px solid ${C.a}33`}}>
          <span style={{fontSize:11,color:C.a,fontFamily:FM}}>Showing {filteredLeads.length} of {leads.length} leads</span>
          <div style={{flex:1}}/>
          <button onClick={()=>{setLeadFilter("all");setLeadSourceFilter("all");setLeadOwnerFilter("all");setLeadSearch("");}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Clear all filters</button>
        </div>}

        {/* ═══ PIPELINE VIEW ═══ */}
        {leadView==="pipeline"&&<>
        {filteredLeads.length===0&&<div style={{padding:40,textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>🎯</div><div style={{fontSize:16,fontWeight:700,fontFamily:FD,color:C.t1}}>No leads found</div><div style={{fontSize:12,color:C.t3,marginTop:4}}>{leadSearch?"No leads match your search":"Adjust filters or create a new lead"}</div></div>}
        {filteredLeads.map(l=>{const stageIdx=LEAD_STAGES.indexOf(l.stage);const progressPct=Math.max(stageIdx/5*100,5);return(
          <div key={l.id} onClick={()=>setSelLead(selLead===l.id?null:l.id)} style={{background:selLead===l.id?C.ad:C.s1,border:`1.5px solid ${selLead===l.id?C.a+"55":C.b1}`,borderRadius:12,marginBottom:8,cursor:"pointer",overflow:"hidden",transition:"all .15s"}}>
            {/* Stage progress bar */}
            <div style={{height:3,background:C.b1}}><div style={{height:"100%",width:progressPct+"%",background:LC2[l.stage],borderRadius:"0 2px 2px 0",transition:"width .3s"}}/></div>
            <div style={{display:"flex",gap:14,padding:"14px 16px",alignItems:"center"}}>
              <Av i={l.name.split(" ").map(n=>n[0]).join("").slice(0,2)} c={LC2[l.stage]} s={40}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:15,fontWeight:700}}>{l.name}</span>
                  <Tag text={l.stage} color={LC2[l.stage]}/>
                  <Tag text={l.source} color={l.source==="Referral"?C.g:l.source==="LinkedIn"?C.cy:l.source==="Trial Signup"?C.p:C.a}/>
                </div>
                <div style={{display:"flex",gap:12,fontSize:12,color:C.t2,marginBottom:3}}>
                  <span>📧 {l.email}</span>
                  <span>🏢 {l.company}</span>
                  {l.designation&&<span>💼 {l.designation}</span>}
                </div>
                <div style={{display:"flex",gap:3,alignItems:"center"}}>
                  {l.value>0&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:C.gd,color:C.g,fontWeight:700,fontFamily:FM}}>₹{l.value.toLocaleString()}</span>}
                  {(l.tags||[]).map(t=><span key={t} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:C.s3,color:C.t3,fontFamily:FM}}>{t}</span>)}
                  {l.notes&&<span style={{fontSize:10,color:C.t3,fontStyle:"italic",marginLeft:6}}>{l.notes.slice(0,40)}{l.notes.length>40?"…":""}</span>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                {/* Score */}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:50,height:6,borderRadius:3,background:C.bg,overflow:"hidden"}}><div style={{width:`${l.score}%`,height:"100%",background:sCol(l.score),borderRadius:3}}/></div>
                  <span style={{fontSize:14,fontWeight:800,color:sCol(l.score),fontFamily:FD,minWidth:24,textAlign:"right"}}>{l.score}</span>
                </div>
                <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{l.owner} · {l.lastContact}</div>
                {/* Quick inline actions */}
                <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
                  <select value={l.stage} onChange={e=>{e.stopPropagation();setLeads(p=>p.map(x=>x.id===l.id?{...x,stage:e.target.value,score:e.target.value==="Converted"?90:e.target.value==="Qualified"?70:e.target.value==="Interested"?50:e.target.value==="Contacted"?35:e.target.value==="New"?20:10}:x));}} style={{padding:"2px 4px",borderRadius:5,fontSize:9,background:LC2[l.stage]+"18",color:LC2[l.stage],border:`1px solid ${LC2[l.stage]}44`,cursor:"pointer",fontFamily:FM,fontWeight:700}}>
                    {LEAD_STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={e=>{e.stopPropagation();openLE(l);}} title="Edit" style={{padding:"2px 6px",borderRadius:4,fontSize:10,color:C.a,background:"none",border:`1px solid ${C.b1}`,cursor:"pointer"}}>✎</button>
                  <button onClick={e=>{e.stopPropagation();setLeads(p=>p.filter(x=>x.id!==l.id));if(selLead===l.id)setSelLead(null);showT("Deleted","success");}} title="Delete" style={{padding:"2px 6px",borderRadius:4,fontSize:10,color:C.r,background:"none",border:`1px solid ${C.b1}`,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            </div>
          </div>
        );})}
        </>}

        {/* ═══ KANBAN VIEW ═══ */}
        {leadView==="kanban"&&<>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8}}>
          {LEAD_STAGES.map(stage=>{const stageLds=filteredLeads.filter(l=>l.stage===stage);const stageVal=stageLds.reduce((s,l)=>s+(l.value||0),0);return(
            <div key={stage} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragLead){setLeads(p=>p.map(l=>l.id===dragLead?{...l,stage,score:stage==="Converted"?90:stage==="Qualified"?70:stage==="Interested"?50:stage==="Contacted"?35:stage==="New"?20:10}:l));logLeadActivity(dragLead,"note","Stage → "+stage);setDragLead(null);}}} style={{minWidth:200,flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"10px 12px",borderBottom:`3px solid ${LC2[stage]}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:700,color:LC2[stage]}}>{stage}</span><span style={{fontSize:10,fontFamily:FM,color:C.t3,background:C.s2,padding:"1px 6px",borderRadius:8}}>{stageLds.length}</span></div>
                {stageVal>0&&<div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:2}}>₹{stageVal.toLocaleString()}</div>}
              </div>
              <div style={{flex:1,padding:6,minHeight:100}}>
                {stageLds.map(l=>(
                  <div key={l.id} draggable onDragStart={()=>setDragLead(l.id)} onClick={()=>setSelLead(selLead===l.id?null:l.id)} className="card-lift" style={{padding:10,background:selLead===l.id?C.ad:C.s2,border:`1px solid ${selLead===l.id?C.a+"44":C.b1}`,borderRadius:8,marginBottom:6,cursor:"grab"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <Av i={l.name.split(" ").map(n=>n[0]).join("").slice(0,2)} c={LC2[l.stage]} s={24}/>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.name}</div></div>
                    </div>
                    {l.designation&&<div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:2}}>{l.designation}</div>}
                    <div style={{fontSize:10,color:C.t2,marginBottom:3}}>🏢 {l.company}</div>
                    {l.value>0&&<div style={{fontSize:12,fontWeight:800,fontFamily:FD,color:C.g,marginBottom:3}}>₹{l.value.toLocaleString()}</div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:3}}>
                        <div style={{width:30,height:4,borderRadius:2,background:C.bg,overflow:"hidden"}}><div style={{width:`${l.score}%`,height:"100%",background:sCol(l.score),borderRadius:2}}/></div>
                        <span style={{fontSize:9,fontWeight:700,color:sCol(l.score),fontFamily:FM}}>{l.score}</span>
                      </div>
                      <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{l.owner}</span>
                    </div>
                    <div style={{display:"flex",gap:2,marginTop:4}}>{(l.tags||[]).slice(0,2).map(t=><span key={t} style={{fontSize:7,padding:"1px 4px",borderRadius:3,background:C.s3,color:C.t3,fontFamily:FM}}>{t}</span>)}</div>
                  </div>
                ))}
                {stageLds.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:10,border:`2px dashed ${C.b1}`,borderRadius:8}}>Drop leads here</div>}
              </div>
            </div>
          );})}
        </div>
        </>}

        {/* ═══ LIST VIEW ═══ */}
        {leadView==="list"&&<>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"36px 1fr 100px 80px 80px 70px 80px 70px 50px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["","Name","Company","Designation","Source","Stage","Value","Score",""].map(h=><span key={h||"av"} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {filteredLeads.map(l=>(
            <div key={l.id} onClick={()=>setSelLead(selLead===l.id?null:l.id)} style={{display:"grid",gridTemplateColumns:"36px 1fr 100px 80px 80px 70px 80px 70px 50px",padding:"9px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer",background:selLead===l.id?C.ad:"transparent",transition:"background .1s"}}>
              <Av i={l.name.split(" ").map(n=>n[0]).join("").slice(0,2)} c={LC2[l.stage]} s={26}/>
              <div>
                <div style={{fontSize:12,fontWeight:600}}>{l.name}</div>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{l.email}</div>
              </div>
              <span style={{fontSize:11,color:C.t2}}>{l.company}</span>
              <span style={{fontSize:10,color:C.t3}}>{l.designation||"—"}</span>
              <Tag text={l.source} color={l.source==="Referral"?C.g:l.source==="LinkedIn"?C.cy:C.a}/>
              <Tag text={l.stage} color={LC2[l.stage]}/>
              <span style={{fontSize:11,fontWeight:700,color:l.value?C.g:C.t3,fontFamily:FM}}>{l.value?"₹"+l.value.toLocaleString():"—"}</span>
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:32,height:5,borderRadius:3,background:C.bg,overflow:"hidden"}}><div style={{width:`${l.score}%`,height:"100%",background:sCol(l.score),borderRadius:3}}/></div>
                <span style={{fontSize:10,fontWeight:700,color:sCol(l.score),fontFamily:FM}}>{l.score}</span>
              </div>
              <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>openLE(l)} style={{fontSize:9,color:C.a,background:"none",border:"none",cursor:"pointer",padding:2}}>✎</button>
                <button onClick={()=>{setLeads(p=>p.filter(x=>x.id!==l.id));if(selLead===l.id)setSelLead(null);showT("Deleted","success");}} style={{fontSize:9,color:C.r,background:"none",border:"none",cursor:"pointer",padding:2}}>✕</button>
              </div>
            </div>
          ))}
          {filteredLeads.length===0&&<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No leads match your filters</div>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{filteredLeads.length} leads · Total value: ₹{filteredLeads.reduce((s,l)=>s+(l.value||0),0).toLocaleString()}</span>
          <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>Avg score: {filteredLeads.length?Math.round(filteredLeads.reduce((s,l)=>s+l.score,0)/filteredLeads.length):0}</span>
        </div>
        </>}

        {/* ═══ SCORING VIEW ═══ */}
        {leadView==="scoring"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[{l:"Hot (75+)",v:leads.filter(x=>x.score>=75).length,c:C.g,icon:"🔥"},{l:"Warm (50-74)",v:leads.filter(x=>x.score>=50&&x.score<75).length,c:C.a,icon:"🌡"},{l:"Cool (25-49)",v:leads.filter(x=>x.score>=25&&x.score<50).length,c:C.y,icon:"❄"},{l:"Cold (<25)",v:leads.filter(x=>x.score<25).length,c:C.r,icon:"🧊"}].map(k=>(
            <div key={k.l} style={{padding:"14px",background:k.c+"10",border:`1px solid ${k.c}22`,borderRadius:12,textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:4}}>{k.icon}</div>
              <div style={{fontSize:24,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
              <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:3}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"40px 1fr 100px 80px 80px 80px 60px",padding:"10px 16px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["","Lead","Company","Source","Stage","Score","Owner"].map(h=><span key={h||"av"} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {[...leads].sort((a,b)=>b.score-a.score).map((ld,idx)=>(
            <div key={ld.id} onClick={()=>setSelLead(selLead===ld.id?null:ld.id)} style={{display:"grid",gridTemplateColumns:"40px 1fr 100px 80px 80px 80px 60px",padding:"10px 16px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer",background:selLead===ld.id?C.ad:"transparent"}}>
              <div style={{position:"relative"}}><Av i={ld.name.split(" ").map(n=>n[0]).join("").slice(0,2)} c={sCol(ld.score)} s={28}/><span style={{position:"absolute",top:-2,right:-4,fontSize:8,fontWeight:800,fontFamily:FM,color:C.t3}}>#{idx+1}</span></div>
              <div><div style={{fontSize:13,fontWeight:600}}>{ld.name}</div><div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{ld.email}</div></div>
              <span style={{fontSize:11,color:C.t2}}>{ld.company}</span>
              <Tag text={ld.source} color={ld.source==="Referral"?C.g:C.a}/>
              <Tag text={ld.stage} color={LC2[ld.stage]}/>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:44,height:6,borderRadius:3,background:C.bg,overflow:"hidden"}}><div style={{width:`${ld.score}%`,height:"100%",background:sCol(ld.score),borderRadius:3}}/></div>
                <span style={{fontSize:12,fontWeight:800,color:sCol(ld.score),fontFamily:FD}}>{ld.score}</span>
              </div>
              <span style={{fontSize:11,color:C.t2}}>{ld.owner}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"16px"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:FD,marginBottom:10}}>📊 Score Breakdown</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[{l:"Plan",d:"Starter +5 · Pro +20 · Enterprise +30",icon:"📋"},{l:"Conversations",d:"+3 per conv (max 20)",icon:"💬"},{l:"CSAT",d:"≥4.5 → +15 · ≥3.5 → +8",icon:"⭐"},{l:"VIP Tag",d:"+10 if tagged 'vip'",icon:"🏷"},{l:"Spend",d:"+5 if recorded spend",icon:"💰"},{l:"Base",d:"Every lead starts at 20",icon:"🎯"}].map(s=>(
              <div key={s.l} style={{padding:"10px",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`}}>
                <div style={{fontSize:14,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:12,fontWeight:700}}>{s.l}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:2}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
        </>}
      </div>

      {/* ═══ LEAD DETAIL SIDEBAR ═══ */}
      {selLead&&(()=>{const l=leads.find(x=>x.id===selLead);if(!l)return null;const stageIdx=LEAD_STAGES.indexOf(l.stage);const actIcn={call:"📞",email:"📧",meeting:"🤝",task:"📋",note:"📝"};return <aside style={{width:360,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Lead Profile</span><button onClick={()=>setSelLead(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Av i={l.name.split(" ").map(n=>n[0]).join("").slice(0,2)} c={LC2[l.stage]} s={50}/>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:700,fontFamily:FD}}>{l.name}</div>
              {l.designation&&<div style={{fontSize:11,color:C.t2,marginTop:1}}>{l.designation} at {l.company}</div>}
              <div style={{display:"flex",gap:4,marginTop:4}}><Tag text={l.stage} color={LC2[l.stage]}/><Tag text={l.source} color={C.a}/>{l.value>0&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:C.gd,color:C.g,fontWeight:700,fontFamily:FM}}>₹{l.value.toLocaleString()}</span>}</div>
            </div>
          </div>
          {/* Score */}
          <div style={{marginTop:10,background:C.s2,borderRadius:8,padding:"8px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3}}>LEAD SCORE</span><span style={{fontSize:13,fontWeight:800,fontFamily:FD,color:sCol(l.score)}}>{l.score}/100</span></div>
            <div style={{height:6,borderRadius:3,background:C.bg,overflow:"hidden"}}><div style={{height:"100%",width:`${l.score}%`,background:`linear-gradient(90deg, ${sCol(l.score)}88, ${sCol(l.score)})`,borderRadius:3}}/></div>
          </div>
          {/* Stage clickable */}
          <div style={{display:"flex",gap:2,marginTop:8}}>{LEAD_STAGES.map((st,i)=>(
            <div key={st} onClick={()=>{setLeads(p=>p.map(x=>x.id===l.id?{...x,stage:st,score:st==="Converted"?90:st==="Qualified"?70:st==="Interested"?50:st==="Contacted"?35:st==="New"?20:10}:x));logLeadActivity(l.id,"note","Stage changed to "+st);}} style={{flex:1,padding:"5px 2px",borderRadius:4,textAlign:"center",cursor:"pointer",background:i<=stageIdx?LC2[st]+"22":"transparent",border:`1px solid ${i<=stageIdx?LC2[st]+"44":C.b1}`}}>
              <div style={{fontSize:7,fontWeight:700,color:i<=stageIdx?LC2[st]:C.t3,fontFamily:FM}}>{st}</div>
            </div>
          ))}</div>
        </div>

        {/* Sidebar tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          {[["details","📋 Details"],["activity","📊 Activity"],["notes","📝 Notes"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setLeadSideTab(id)} style={{flex:1,padding:"8px 0",fontSize:11,fontWeight:700,fontFamily:FM,color:leadSideTab===id?C.a:C.t3,borderBottom:`2px solid ${leadSideTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lb}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{flex:1,overflowY:"auto"}}>
          {/* ── DETAILS TAB ── */}
          {leadSideTab==="details"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>CONTACT INFORMATION</div>
            <div style={{background:C.s2,borderRadius:10,padding:"8px 12px",marginBottom:14}}>
              {[{icon:"📧",l:"Email",v:l.email},{icon:"📞",l:"Phone",v:l.phone},{icon:"🏢",l:"Company",v:l.company},{icon:"💼",l:"Designation",v:l.designation||"—"},{icon:"💰",l:"Est. Value",v:l.value?"₹"+l.value.toLocaleString():"—"},{icon:"👤",l:"Owner",v:l.owner},{icon:"📅",l:"Created",v:l.created},{icon:"🕐",l:"Last Contact",v:l.lastContact}].map(r=>(
                <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.b1}11`}}>
                  <span style={{fontSize:11}}>{r.icon}</span>
                  <span style={{fontSize:10,color:C.t3,width:70,fontFamily:FM}}>{r.l}</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1}}>{r.v}</span>
                </div>
              ))}
            </div>
            {(l.tags||[]).length>0&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4,letterSpacing:".5px"}}>TAGS</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:14}}>{l.tags.map(t=><span key={t} style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:C.s3,color:C.t2,fontFamily:FM}}>{t}</span>)}</div></>}
          </div>}

          {/* ── ACTIVITY TAB ── */}
          {leadSideTab==="activity"&&<div style={{padding:"12px 18px"}}>
            {/* Log new activity */}
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              {Object.entries(actIcn).map(([t,ic])=>(
                <button key={t} onClick={()=>{const n=window.prompt("Log "+t+" note:");if(n)logLeadActivity(l.id,t,n);}} style={{flex:1,padding:"6px",borderRadius:6,fontSize:10,background:C.s2,border:`1px solid ${C.b1}`,cursor:"pointer",textAlign:"center",fontWeight:600,color:C.t2}} className="hov">{ic}<br/><span style={{fontSize:8,color:C.t3}}>{t}</span></button>
              ))}
            </div>
            {/* Timeline */}
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8,letterSpacing:".5px"}}>ACTIVITY TIMELINE ({(l.activities||[]).length})</div>
            {(l.activities||[]).length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>No activities yet</div>}
            {(l.activities||[]).map((a,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:0,position:"relative"}}>
                {/* Timeline line */}
                {i<(l.activities||[]).length-1&&<div style={{position:"absolute",left:14,top:28,width:1,bottom:-4,background:C.b1}}/>}
                <div style={{width:28,height:28,borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,zIndex:1}}>{actIcn[a.type]||"📝"}</div>
                <div style={{flex:1,paddingBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,fontWeight:700,color:C.t1,textTransform:"capitalize"}}>{a.type}</span><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{a.date}</span></div>
                  <div style={{fontSize:11,color:C.t2,marginTop:2,lineHeight:1.4}}>{a.note}</div>
                </div>
              </div>
            ))}
          </div>}

          {/* ── NOTES TAB ── */}
          {leadSideTab==="notes"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>NOTES</div>
            <div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.6,marginBottom:12,whiteSpace:"pre-wrap"}}>{l.notes||"No notes yet."}</div>
            <textarea placeholder="Add a note…" rows={3} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();const v=e.target.value.trim();if(v){setLeads(p=>p.map(x=>x.id===l.id?{...x,notes:x.notes?x.notes+"\n"+v:v}:x));logLeadActivity(l.id,"note",v);e.target.value="";}}}} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:4}}>Press Enter to save note</div>
          </div>}
          {/* Custom Fields for lead */}
          {customFields&&<div style={{padding:"6px 18px"}}><CfPanel entity="lead" recordId={l.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/></div>}
        </div>

        {/* Actions footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <Btn ch="📧 Email" v="ghost" full sm onClick={()=>showT("Opening email to "+l.email,"info")}/>
            <Btn ch="📞 Call" v="ghost" full sm onClick={()=>{showT("Calling "+l.phone,"info");logLeadActivity(l.id,"call","Outbound call");}}/>
          </div>
          {l.stage!=="Converted"&&l.stage!=="Lost"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <Btn ch="👤 Convert" v="primary" full sm onClick={()=>{convertToContact(l);setSelLead(null);}}/>
            <Btn ch="💰 Deal" v="success" full sm onClick={()=>convertToDeal(l)}/>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            <Btn ch="✎ Edit" v="ghost" full sm onClick={()=>openLE(l)}/>
            <Btn ch="🗑 Delete" v="danger" full sm onClick={()=>{setLeads(p=>p.filter(x=>x.id!==l.id));setSelLead(null);showT("Deleted","success");}}/>
          </div>
        </div>
      </aside>;})()}
    </div>}

    {/* ═══ TASKS ═══ */}
    {!crmLoading&&tab==="tasks"&&<div style={{flex:1,display:"flex",minWidth:0}}>
      <div style={{flex:1,padding:"16px 24px",overflowY:"auto"}}>
        {/* Toolbar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 12px",flex:1,maxWidth:240}}>
            <span style={{fontSize:12,color:C.t3}}>🔍</span>
            <input value={taskSearch} onChange={e=>setTaskSearch(e.target.value)} placeholder="Search tasks…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
            {taskSearch&&<button onClick={()=>setTaskSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10}}>×</button>}
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <Sel val={taskFilter} set={setTaskFilter} opts={[{v:"all",l:"All Status"},...TASK_STATUS.map(s=>({v:s.v,l:s.i+" "+s.l}))]}/>
            <Sel val={taskPriorityFilter} set={setTaskPriorityFilter} opts={[{v:"all",l:"All Priority"},...PRIORITIES.map(p=>({v:p.v,l:p.l}))]}/>
            <Sel val={taskAssigneeFilter} set={setTaskAssigneeFilter} opts={[{v:"all",l:"All Assignees"},...["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))]}/>
            <Sel val={taskSort} set={setTaskSort} opts={[{v:"priority_desc",l:"Priority ↓"},{v:"due_asc",l:"Due Date"},{v:"name_asc",l:"Name A-Z"},{v:"newest",l:"Newest"}]}/>
            <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>{[["board","▦"],["list","☰"]].map(([v,i])=><button key={v} onClick={()=>setTaskView(v)} style={{padding:"6px 12px",fontSize:12,background:taskView===v?C.ad:"transparent",color:taskView===v?C.a:C.t3,border:"none",cursor:"pointer",fontWeight:700}}>{i}</button>)}</div>
          </div>
        </div>

        {/* Status cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
          {TASK_STATUS.map(st=>{const cnt=tasks.filter(t=>t.status===st.v).length;const ov=tasks.filter(t=>t.status===st.v&&isOverdue(t.dueDate)&&st.v!=="done").length;return(
            <div key={st.v} onClick={()=>setTaskFilter(taskFilter===st.v?"all":st.v)} style={{padding:10,background:taskFilter===st.v?st.c+"12":C.s1,border:`1.5px solid ${taskFilter===st.v?st.c:C.b1}`,borderRadius:10,textAlign:"center",cursor:"pointer",transition:"all .15s"}}>
              <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:st.c}}>{cnt}</div>
              <div style={{fontSize:9,color:taskFilter===st.v?st.c:C.t3,fontFamily:FM,fontWeight:taskFilter===st.v?700:400}}>{st.i} {st.l}{ov>0?<span style={{color:C.r,marginLeft:4}}>({ov} overdue)</span>:""}</div>
            </div>
          );})}
        </div>

        {/* Board view */}
        {taskView==="board"?<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8}}>
          {TASK_STATUS.map(st=>{const stTasks=fTasks.filter(t=>t.status===st.v);return(
            <div key={st.v} onDragOver={e=>e.preventDefault()} onDrop={e=>{const tid=e.dataTransfer.getData("taskId");if(tid){setTasks(p=>p.map(t=>t.id===tid?{...t,status:st.v,comments:[{by:"Priya",date:"Today",text:"Status → "+st.l},...(t.comments||[])]}:t));showT("→ "+st.l,"success");}}} style={{minWidth:220,flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"10px 12px",borderBottom:`3px solid ${st.c}`,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:700,color:st.c}}>{st.i} {st.l}</span><span style={{fontSize:10,fontFamily:FM,color:C.t3,background:C.s2,padding:"1px 6px",borderRadius:8}}>{stTasks.length}</span></div>
              <div style={{flex:1,padding:6,minHeight:90}}>
                {stTasks.map(t=>{const od=isOverdue(t.dueDate)&&t.status!=="done";const pc=PRIORITIES.find(p=>p.v===t.priority);return(
                  <div key={t.id} draggable onDragStart={e=>e.dataTransfer.setData("taskId",t.id)} onClick={()=>{setSelTask(selTask===t.id?null:t.id);setTaskSideTab("details");}} className="card-lift" style={{padding:10,background:selTask===t.id?C.ad:od?C.rd:C.s2,border:`1.5px solid ${selTask===t.id?st.c:od?C.r+"44":C.b1}`,borderRadius:8,marginBottom:6,cursor:"grab",borderLeft:`3px solid ${pc?.c||C.t3}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                      <div style={{fontSize:12,fontWeight:600,flex:1}}>{t.title}</div>
                      {od&&<span style={{fontSize:7,color:C.r,fontFamily:FM,fontWeight:700,background:C.rd,padding:"1px 4px",borderRadius:3,flexShrink:0,marginLeft:4}}>OVERDUE</span>}
                    </div>
                    {t.desc&&<div style={{fontSize:10,color:C.t3,marginBottom:3,lineHeight:1.3}}>{t.desc.slice(0,60)}{t.desc.length>60?"…":""}</div>}
                    {t.contact&&<div style={{fontSize:9,color:C.a,fontFamily:FM}}>👤 {t.contact}</div>}
                    {t.deal&&<div style={{fontSize:9,color:C.p,fontFamily:FM}}>💰 {t.deal}</div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
                      <div style={{display:"flex",gap:3,alignItems:"center"}}>
                        <Tag text={t.priority} color={pc?.c||C.t3}/>
                        <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{t.assignee}</span>
                      </div>
                      <span style={{fontSize:9,color:od?C.r:C.t3,fontFamily:FM}}>📅 {t.dueDate}</span>
                    </div>
                    {(t.tags||[]).length>0&&<div style={{display:"flex",gap:2,marginTop:4}}>{t.tags.slice(0,2).map(tg=><span key={tg} style={{fontSize:7,padding:"1px 4px",borderRadius:3,background:C.s3,color:C.t3,fontFamily:FM}}>{tg}</span>)}</div>}
                    {(t.comments||[]).length>0&&<div style={{fontSize:8,color:C.t3,fontFamily:FM,marginTop:3}}>💬 {t.comments.length} comment{t.comments.length!==1?"s":""}</div>}
                  </div>
                );})}
                {stTasks.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:10,border:`2px dashed ${C.b1}`,borderRadius:8}}>Drop tasks here</div>}
              </div>
            </div>
          );})}
        </div>:
        /* List view */
        <><div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"28px 1fr 80px 75px 70px 65px 70px 40px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>{["","Task","Assignee","Due","Priority","Status","Company",""].map(h=><span key={h||"ck"} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}</div>
          {fTasks.map(t=>{const ps=PRIORITIES.find(p=>p.v===t.priority);const ss=TASK_STATUS.find(s=>s.v===t.status);const od=isOverdue(t.dueDate)&&t.status!=="done";return(
            <div key={t.id} onClick={()=>{setSelTask(selTask===t.id?null:t.id);setTaskSideTab("details");}} style={{display:"grid",gridTemplateColumns:"28px 1fr 80px 75px 70px 65px 70px 40px",padding:"9px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer",background:selTask===t.id?C.ad:od?C.rd+"55":"transparent",opacity:t.status==="done"?0.6:1}}>
              <button onClick={e=>{e.stopPropagation();setTasks(p=>p.map(x=>x.id===t.id?{...x,status:x.status==="done"?"todo":"done"}:x));}} style={{width:18,height:18,borderRadius:5,border:`2px solid ${t.status==="done"?C.g:C.b1}`,background:t.status==="done"?C.g:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff"}}>{t.status==="done"?"✓":""}</button>
              <div>
                <div style={{fontSize:12,fontWeight:600,textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}{od&&<span style={{color:C.r,fontSize:8,marginLeft:5,fontFamily:FM}}>⚠ OVERDUE</span>}</div>
                {t.contact&&<div style={{fontSize:9,color:C.a,fontFamily:FM,marginTop:1}}>👤 {t.contact}{t.deal?" · 💰 "+t.deal:""}</div>}
                {(t.comments||[]).length>0&&<span style={{fontSize:8,color:C.t3,fontFamily:FM}}>💬 {t.comments.length}</span>}
              </div>
              <span style={{fontSize:11,color:C.t2}}>{t.assignee}</span>
              <span style={{fontSize:10,fontFamily:FM,color:od?C.r:C.t2}}>{t.dueDate}</span>
              <Tag text={t.priority} color={ps?.c||C.t3}/>
              <span style={{fontSize:9,color:ss?.c,fontFamily:FM,fontWeight:700}}>{ss?.i} {ss?.l}</span>
              <span style={{fontSize:9,color:C.t3}}>{t.company||"—"}</span>
              <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>openTkE(t)} style={{fontSize:9,color:C.a,background:"none",border:"none",cursor:"pointer"}}>✎</button>
                <button onClick={()=>{setTasks(p=>p.filter(x=>x.id!==t.id));if(selTask===t.id)setSelTask(null);showT("Deleted","success");}} style={{fontSize:9,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          );})}
          {fTasks.length===0&&<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No tasks match your filters</div>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:11,color:C.t3,fontFamily:FM}}>
          <span>{fTasks.length} tasks · {fTasks.filter(t=>isOverdue(t.dueDate)&&t.status!=="done").length} overdue</span>
          <span>Done: {tasks.filter(t=>t.status==="done").length}/{tasks.length}</span>
        </div></>}
      </div>

      {/* ═══ TASK DETAIL SIDEBAR ═══ */}
      {selTask&&(()=>{const t=tasks.find(x=>x.id===selTask);if(!t)return null;const ps=PRIORITIES.find(p=>p.v===t.priority);const ss=TASK_STATUS.find(s=>s.v===t.status);const od=isOverdue(t.dueDate)&&t.status!=="done";return <aside style={{width:360,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Task Details</span><button onClick={()=>setSelTask(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
          <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
            <button onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,status:x.status==="done"?"todo":"done"}:x))} style={{width:24,height:24,borderRadius:7,border:`2.5px solid ${t.status==="done"?C.g:C.b1}`,background:t.status==="done"?C.g:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0,marginTop:2}}>{t.status==="done"?"✓":""}</button>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700,textDecoration:t.status==="done"?"line-through":"none"}}>{t.title}</div>
              {od&&<div style={{fontSize:10,color:C.r,fontFamily:FM,fontWeight:700,marginTop:2}}>⚠ OVERDUE — was due {t.dueDate}</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            <Tag text={t.priority} color={ps?.c||C.t3}/><Tag text={ss?.l||t.status} color={ss?.c||C.t3}/>
            {t.tags?.map(tg=><span key={tg} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:C.s3,color:C.t3,fontFamily:FM}}>{tg}</span>)}
          </div>
          {/* Status buttons */}
          <div style={{display:"flex",gap:2,marginTop:8}}>{TASK_STATUS.map(st=>(
            <button key={st.v} onClick={()=>{setTasks(p=>p.map(x=>x.id===t.id?{...x,status:st.v,comments:[{by:"Priya",date:"Today",text:"Status → "+st.l},...(x.comments||[])]}:x));}} style={{flex:1,padding:"5px 2px",borderRadius:5,textAlign:"center",cursor:"pointer",background:t.status===st.v?st.c+"22":"transparent",border:`1px solid ${t.status===st.v?st.c+"44":C.b1}`,fontSize:8,fontWeight:700,color:t.status===st.v?st.c:C.t3,fontFamily:FM}}>{st.i} {st.l}</button>
          ))}</div>
        </div>

        {/* Sidebar tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          {[["details","📋 Details"],["comments","💬 Comments ("+((t.comments||[]).length)+")"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setTaskSideTab(id)} style={{flex:1,padding:"8px 0",fontSize:11,fontWeight:700,fontFamily:FM,color:taskSideTab===id?C.a:C.t3,borderBottom:`2px solid ${taskSideTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lb}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto"}}>
          {/* Details */}
          {taskSideTab==="details"&&<div style={{padding:"12px 18px"}}>
            {t.desc&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4,letterSpacing:".5px"}}>DESCRIPTION</div><div style={{background:C.s2,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.6,marginBottom:14}}>{t.desc}</div></>}
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>TASK INFO</div>
            <div style={{background:C.s2,borderRadius:10,padding:"8px 12px",marginBottom:14}}>
              {[{icon:"👤",l:"Assignee",v:t.assignee},{icon:"📅",l:"Due Date",v:t.dueDate||"—"},{icon:"🏢",l:"Company",v:t.company||"—"},{icon:"👤",l:"Contact",v:t.contact||"—"},{icon:"💰",l:"Deal",v:t.deal||"—"},{icon:"📅",l:"Created",v:t.created}].map(r=>(
                <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.b1}11`}}>
                  <span style={{fontSize:11}}>{r.icon}</span>
                  <span style={{fontSize:10,color:C.t3,width:65,fontFamily:FM}}>{r.l}</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>}

          {/* Comments */}
          {taskSideTab==="comments"&&<div style={{padding:"12px 18px"}}>
            <textarea placeholder="Add a comment… (Enter to post)" rows={2} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();const v=e.target.value.trim();if(v){addTaskComment(t.id,v);e.target.value="";}}}} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"none",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            {(t.comments||[]).length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>No comments yet</div>}
            {(t.comments||[]).map((cm,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10}}>
                <Av i={cm.by.split(" ").map(n=>n[0]).join("").slice(0,2)} c={cm.by==="Priya"?C.a:cm.by==="Dev"?C.g:C.p} s={26}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:700}}>{cm.by}</span><span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{cm.date}</span></div>
                  <div style={{fontSize:12,color:C.t2,marginTop:2,lineHeight:1.4}}>{cm.text}</div>
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* Actions footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            <Btn ch="✎ Edit Task" v="ghost" full sm onClick={()=>openTkE(t)}/>
            <Btn ch="🗑 Delete" v="danger" full sm onClick={()=>{setTasks(p=>p.filter(x=>x.id!==t.id));setSelTask(null);showT("Deleted","success");}}/>
          </div>
          {/* Custom Fields for task */}
          {customFields&&<div style={{padding:"6px 0"}}><CfPanel entity="task" recordId={t.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/></div>}
        </div>
      </aside>;})()}
    </div>}

    {/* ═══ MEETINGS ═══ */}
    {!crmLoading&&tab==="meetings"&&<div style={{flex:1,display:"flex",minWidth:0}}>
      <div style={{flex:1,padding:"16px 24px",overflowY:"auto"}}>
        {/* Toolbar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 12px",flex:1,maxWidth:240}}>
            <span style={{fontSize:12,color:C.t3}}>🔍</span>
            <input value={mtSearch} onChange={e=>setMtSearch(e.target.value)} placeholder="Search meetings…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
            {mtSearch&&<button onClick={()=>setMtSearch("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10}}>×</button>}
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <Sel val={mtFilter} set={setMtFilter} opts={[{v:"all",l:"All Types"},...MT_TYPES.map(t=>({v:t.v,l:t.i+" "+t.l}))]}/>
            <Sel val={mtStatusFilter} set={setMtStatusFilter} opts={[{v:"all",l:"All Status"},{v:"scheduled",l:"📅 Scheduled"},{v:"completed",l:"✅ Completed"},{v:"cancelled",l:"❌ Cancelled"}]}/>
            <Sel val={mtHostFilter} set={setMtHostFilter} opts={[{v:"all",l:"All Hosts"},...["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))]}/>
            <Sel val={mtSort} set={setMtSort} opts={[{v:"date_asc",l:"Date ↑"},{v:"date_desc",l:"Date ↓"},{v:"name_asc",l:"Name A-Z"}]}/>
            <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>{[["list","☰"],["kanban","▦"]].map(([v,i])=><button key={v} onClick={()=>setMtView(v)} style={{padding:"6px 12px",fontSize:12,background:mtView===v?C.ad:"transparent",color:mtView===v?C.a:C.t3,border:"none",cursor:"pointer",fontWeight:700}}>{i}</button>)}</div>
          </div>
        </div>

        {/* Status summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
          {[{l:"Scheduled",v:meetings.filter(m=>m.status==="scheduled").length,c:C.a,icon:"📅"},{l:"Completed",v:meetings.filter(m=>m.status==="completed").length,c:C.g,icon:"✅"},{l:"This Week",v:meetings.filter(m=>m.status==="scheduled").length,c:C.p,icon:"📆"}].map(k=>(
            <div key={k.l} style={{padding:10,background:k.c+"10",border:`1px solid ${k.c}22`,borderRadius:10,textAlign:"center"}}>
              <div style={{fontSize:14,marginBottom:2}}>{k.icon}</div>
              <div style={{fontSize:20,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
              <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Active filters */}
        {(mtFilter!=="all"||mtStatusFilter!=="all"||mtHostFilter!=="all"||mtSearch)&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"6px 12px",background:C.ad,borderRadius:8,border:`1px solid ${C.a}33`}}>
          <span style={{fontSize:11,color:C.a,fontFamily:FM}}>Showing {fMeetings.length} of {meetings.length} meetings</span>
          <div style={{flex:1}}/>
          <button onClick={()=>{setMtFilter("all");setMtStatusFilter("all");setMtHostFilter("all");setMtSearch("");}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Clear all</button>
        </div>}

        {/* ═══ LIST VIEW ═══ */}
        {mtView==="list"&&<>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px 70px 65px 65px 70px 40px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["Meeting","Date","Time","Duration","Location","Status",""].map(h=><span key={h||"x"} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {fMeetings.map(m=>{const mt=MT_TYPES.find(t=>t.v===m.type);return(
            <div key={m.id} onClick={()=>{setSelMeeting(selMeeting===m.id?null:m.id);setMtSideTab("details");}} style={{display:"grid",gridTemplateColumns:"1fr 80px 70px 65px 65px 70px 40px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer",background:selMeeting===m.id?C.ad:"transparent",opacity:m.status==="completed"?0.7:m.status==="cancelled"?0.45:1}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13}}>{mt?.i||"📅"}</span>
                  <span style={{fontSize:12,fontWeight:600}}>{m.title}</span>
                  <Tag text={mt?.l||m.type} color={mt?.c||C.a}/>
                </div>
                <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:2}}>
                  {m.contact&&<span>👤 {m.contact}</span>}
                  {m.company&&<span>{m.contact?" · ":""}🏢 {m.company}</span>}
                  {m.deal&&<span> · 💰 {m.deal}</span>}
                </div>
              </div>
              <span style={{fontSize:11,fontFamily:FM,color:C.t2}}>{m.date}</span>
              <span style={{fontSize:11,fontFamily:FM,color:C.t2}}>{m.time}</span>
              <span style={{fontSize:10,color:C.t3}}>{m.duration}</span>
              <span style={{fontSize:10,color:C.t3}}>📍 {m.location}</span>
              <Tag text={m.status} color={m.status==="scheduled"?C.a:m.status==="completed"?C.g:C.r}/>
              <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>openMtE(m)} style={{fontSize:9,color:C.a,background:"none",border:"none",cursor:"pointer"}}>✎</button>
                <button onClick={()=>{setMeetings(p=>p.filter(x=>x.id!==m.id));if(selMeeting===m.id)setSelMeeting(null);showT("Deleted","success");}} style={{fontSize:9,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          );})}
          {fMeetings.length===0&&<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No meetings match your filters</div>}
        </div>
        <div style={{marginTop:10,fontSize:11,color:C.t3,fontFamily:FM}}>{fMeetings.length} meetings · {fMeetings.filter(m=>m.status==="scheduled").length} upcoming · {fMeetings.filter(m=>m.status==="completed").length} completed</div>
        </>}

        {/* ═══ KANBAN VIEW — by type ═══ */}
        {mtView==="kanban"&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8}}>
          {MT_TYPES.filter(t=>mtFilter==="all"||t.v===mtFilter).map(typ=>{const tMtgs=fMeetings.filter(m=>m.type===typ.v);return(
            <div key={typ.v} style={{minWidth:200,flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,display:"flex",flexDirection:"column"}}>
              <div style={{padding:"10px 12px",borderBottom:`3px solid ${typ.c}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:700,color:typ.c}}>{typ.i} {typ.l}</span><span style={{fontSize:10,fontFamily:FM,color:C.t3,background:C.s2,padding:"1px 6px",borderRadius:8}}>{tMtgs.length}</span></div>
              </div>
              <div style={{flex:1,padding:6,minHeight:90}}>
                {tMtgs.map(m=>(
                  <div key={m.id} onClick={()=>{setSelMeeting(selMeeting===m.id?null:m.id);setMtSideTab("details");}} className="card-lift" style={{padding:10,background:selMeeting===m.id?C.ad:m.status==="completed"?C.gd:C.s2,border:`1.5px solid ${selMeeting===m.id?typ.c:C.b1}`,borderRadius:8,marginBottom:6,cursor:"pointer",opacity:m.status==="completed"?0.7:1}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{m.title}</div>
                    <div style={{fontSize:10,color:C.t2}}>📅 {m.date} · 🕐 {m.time}</div>
                    <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:2}}>⏱ {m.duration} · 📍 {m.location}</div>
                    {m.contact&&<div style={{fontSize:9,color:C.a,fontFamily:FM,marginTop:2}}>👤 {m.contact}</div>}
                    {m.company&&<div style={{fontSize:9,color:C.t2,fontFamily:FM}}>🏢 {m.company}</div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      <Tag text={m.status} color={m.status==="scheduled"?C.a:C.g}/>
                      <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{m.host}</span>
                    </div>
                    {m.outcome&&<div style={{fontSize:9,color:C.g,fontFamily:FM,marginTop:3,fontStyle:"italic"}}>✓ {m.outcome.slice(0,50)}{m.outcome.length>50?"…":""}</div>}
                  </div>
                ))}
                {tMtgs.length===0&&<div style={{padding:16,textAlign:"center",color:C.t3,fontSize:10}}>No {typ.l.toLowerCase()}s</div>}
              </div>
            </div>
          );})}
        </div>}
      </div>

      {/* ═══ MEETING DETAIL SIDEBAR ═══ */}
      {selMeeting&&(()=>{const m=meetings.find(x=>x.id===selMeeting);if(!m)return null;const mt=MT_TYPES.find(t=>t.v===m.type);return <aside style={{width:360,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Meeting Details</span><button onClick={()=>setSelMeeting(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:40,height:40,borderRadius:10,background:(mt?.c||C.a)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{mt?.i||"📅"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700}}>{m.title}</div>
              <div style={{display:"flex",gap:4,marginTop:3}}><Tag text={mt?.l||m.type} color={mt?.c||C.a}/><Tag text={m.status} color={m.status==="scheduled"?C.a:m.status==="completed"?C.g:C.r}/></div>
            </div>
          </div>
          {/* Time info cards */}
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <div style={{flex:1,padding:"8px",background:C.s2,borderRadius:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.a}}>📅 {m.date}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Date</div></div>
            <div style={{flex:1,padding:"8px",background:C.s2,borderRadius:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.p}}>🕐 {m.time}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Time</div></div>
            <div style={{flex:1,padding:"8px",background:C.s2,borderRadius:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.t2}}>⏱ {m.duration}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Duration</div></div>
          </div>
        </div>

        {/* Sidebar tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          {[["details","📋 Details"],["agenda","📝 Agenda"],["activity","📊 Activity ("+((m.activities||[]).length)+")"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setMtSideTab(id)} style={{flex:1,padding:"8px 0",fontSize:10,fontWeight:700,fontFamily:FM,color:mtSideTab===id?C.a:C.t3,borderBottom:`2px solid ${mtSideTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lb}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto"}}>
          {/* Details tab */}
          {mtSideTab==="details"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>MEETING INFO</div>
            <div style={{background:C.s2,borderRadius:10,padding:"8px 12px",marginBottom:14}}>
              {[{icon:"📍",l:"Location",v:m.location},{icon:"👤",l:"Host",v:m.host},{icon:"👥",l:"Attendees",v:(m.attendees||[]).join(", ")||"—"},{icon:"👤",l:"Contact",v:m.contact||"—"},{icon:"🏢",l:"Company",v:m.company||"—"},{icon:"💰",l:"Deal",v:m.deal||"—"}].map(r=>(
                <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.b1}11`}}>
                  <span style={{fontSize:11}}>{r.icon}</span>
                  <span style={{fontSize:10,color:C.t3,width:65,fontFamily:FM}}>{r.l}</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1}}>{r.v}</span>
                </div>
              ))}
            </div>
            {m.outcome&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4,letterSpacing:".5px"}}>OUTCOME</div><div style={{background:C.gd,border:`1px solid ${C.g}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.5,marginBottom:14}}>✅ {m.outcome}</div></>}
            {m.notes&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4,letterSpacing:".5px"}}>NOTES</div><div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.5}}>{m.notes}</div></>}
          </div>}

          {/* Agenda tab */}
          {mtSideTab==="agenda"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>AGENDA</div>
            <div style={{background:C.s2,borderRadius:8,padding:"12px 14px",fontSize:12,color:C.t1,lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:14}}>{m.agenda||"No agenda set."}</div>
            <textarea placeholder="Add meeting notes… (Enter to save)" rows={3} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();const v=e.target.value.trim();if(v){setMeetings(p=>p.map(x=>x.id===m.id?{...x,notes:x.notes?x.notes+"\n"+v:v}:x));logMtActivity(m.id,v);e.target.value="";}}}} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:4}}>Press Enter to save note</div>
          </div>}

          {/* Activity tab */}
          {mtSideTab==="activity"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8,letterSpacing:".5px"}}>ACTIVITY LOG ({(m.activities||[]).length})</div>
            {(m.activities||[]).length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>No activity yet</div>}
            {(m.activities||[]).map((a,i)=>(
              <div key={i} style={{display:"flex",gap:10,position:"relative"}}>
                {i<(m.activities||[]).length-1&&<div style={{position:"absolute",left:14,top:24,width:1,bottom:-4,background:C.b1}}/>}
                <div style={{width:28,height:28,borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,zIndex:1}}>📝</div>
                <div style={{flex:1,paddingBottom:12}}>
                  <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:2}}>{a.date}</div>
                  <div style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{a.note}</div>
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* Actions footer */}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          {m.status==="scheduled"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <Btn ch="✅ Complete" v="success" full sm onClick={()=>{const o=window.prompt("Meeting outcome:");if(o!==null){completeMeeting(m.id,o);setSelMeeting(null);}}}/>
            <Btn ch="❌ Cancel" v="danger" full sm onClick={()=>{setMeetings(p=>p.map(x=>x.id===m.id?{...x,status:"cancelled",activities:[{date:"Today",note:"Meeting cancelled"},...(x.activities||[])]}:x));showT("Cancelled","info");}}/>
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
            <Btn ch="✎ Edit" v="ghost" full sm onClick={()=>openMtE(m)}/>
            <Btn ch="🗑 Delete" v="danger" full sm onClick={()=>{setMeetings(p=>p.filter(x=>x.id!==m.id));setSelMeeting(null);showT("Deleted","success");}}/>
          </div>
          {/* Custom Fields for meeting */}
          {customFields&&<div style={{padding:"6px 0"}}><CfPanel entity="meeting" recordId={m.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/></div>}
        </div>
      </aside>;})()}
    </div>}

    {/* ═══ COMPANIES ═══ */}
    {tab==="companies"&&<div style={{flex:1,display:"flex",minWidth:0}}>
      <div style={{flex:1,padding:"16px 24px",overflowY:"auto"}}>
        {/* Toolbar */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 12px",flex:1,maxWidth:240}}>
            <span style={{fontSize:12,color:C.t3}}>🔍</span>
            <input value={compQ} onChange={e=>setCompQ(e.target.value)} placeholder="Search customers…" style={{flex:1,background:"none",border:"none",fontSize:12,color:C.t1,outline:"none",fontFamily:FB}}/>
            {compQ&&<button onClick={()=>setCompQ("")} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:10}}>×</button>}
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <Sel val={compIndFilter} set={setCompIndFilter} opts={[{v:"all",l:"All Industries"},...INDUSTRIES.map(i=>({v:i,l:i}))]}/>
            <Sel val={compSzFilter} set={setCompSzFilter} opts={[{v:"all",l:"All Sizes"},...COMP_SIZES.map(s=>({v:s,l:s}))]}/>
            <Sel val={compSort} set={setCompSort} opts={[{v:"name_asc",l:"Name A-Z"},{v:"name_desc",l:"Name Z-A"},{v:"deals_desc",l:"Most Deals"},{v:"revenue_desc",l:"Revenue ↓"},{v:"contacts_desc",l:"Most Contacts"}]}/>
            <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>{[["cards","▦"],["list","☰"]].map(([v,i])=><button key={v} onClick={()=>setCompView(v)} style={{padding:"6px 12px",fontSize:12,background:compView===v?C.ad:"transparent",color:compView===v?C.a:C.t3,border:"none",cursor:"pointer",fontWeight:700}}>{i}</button>)}</div>
          </div>
        </div>

        {/* KPI summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
          {[{l:"Total",v:comps.length,c:C.a,icon:"🏢"},{l:"Industries",v:[...new Set(comps.map(c=>c.industry))].length,c:C.p,icon:"🏭"},{l:"With Deals",v:comps.filter(c=>getCoDeals(c.name).length>0).length,c:C.y,icon:"💰"},{l:"Won Revenue",v:"₹"+Math.round(comps.reduce((s,c)=>s+getCoRev(c.name),0)/1000)+"K",c:C.g,icon:"💵"},{l:"Pipeline",v:"₹"+Math.round(comps.reduce((s,c)=>s+getCoPipeline(c.name),0)/1000)+"K",c:C.cy,icon:"📊"}].map(k=>(
            <div key={k.l} style={{padding:"8px 6px",background:k.c+"10",border:`1px solid ${k.c}22`,borderRadius:10,textAlign:"center"}}>
              <div style={{fontSize:12,marginBottom:2}}>{k.icon}</div>
              <div style={{fontSize:16,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
              <div style={{fontSize:8,color:C.t3,fontFamily:FM}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Active filters */}
        {(compIndFilter!=="all"||compSzFilter!=="all"||compQ)&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"6px 12px",background:C.ad,borderRadius:8,border:`1px solid ${C.a}33`}}>
          <span style={{fontSize:11,color:C.a,fontFamily:FM}}>Showing {fComps.length} of {comps.length} customers</span>
          <div style={{flex:1}}/>
          <button onClick={()=>{setCompIndFilter("all");setCompSzFilter("all");setCompQ("");}} style={{fontSize:10,color:C.a,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Clear all</button>
        </div>}

        {/* ═══ CARDS VIEW ═══ */}
        {compView==="cards"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div onClick={openCoN} style={{background:C.bg,border:`2px dashed ${C.a}44`,borderRadius:14,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px",cursor:"pointer",minHeight:140}} className="hov">
            <div style={{fontSize:28,marginBottom:6}}>🏢</div><div style={{fontSize:13,fontWeight:700,color:C.a,fontFamily:FD}}>Add Customer</div>
          </div>
          {fComps.map(co=>{const cts=getCoContacts(co.name);const dls=getCoDeals(co.name);const rev=getCoRev(co.name);const pipe=getCoPipeline(co.name);const csat=getCoCsat(co.name);return(
            <div key={co.id} onClick={()=>{setSelComp(selComp===co.id?null:co.id);setCompSideTab("details");}} style={{background:C.s1,border:`1.5px solid ${selComp===co.id?co.color:C.b1}`,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"all .15s"}}>
              <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:co.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:co.color,fontFamily:FD,flexShrink:0}}>{co.name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700}}>{co.name}</div>
                  <div style={{fontSize:10,color:C.t3,fontFamily:FM}}>{co.industry} · {co.size}</div>
                  {co.domain&&<div style={{fontSize:9,color:C.a,fontFamily:FM}}>🌐 {co.domain}</div>}
                </div>
              </div>
              <div style={{padding:"10px 14px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:6}}>
                  {[{l:"Contacts",v:cts.length,c:C.a},{l:"Deals",v:dls.length,c:C.p},{l:"Revenue",v:rev?"₹"+(rev/1000).toFixed(0)+"K":"—",c:C.g},{l:"Pipeline",v:pipe?"₹"+(pipe/1000).toFixed(0)+"K":"—",c:C.cy}].map(s=>(
                    <div key={s.l} style={{padding:4,background:C.s2,borderRadius:5,textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,color:s.c,fontFamily:FM}}>{s.v}</div><div style={{fontSize:7,color:C.t3,fontFamily:FM}}>{s.l}</div></div>
                  ))}
                </div>
                {(co.tags||[]).length>0&&<div style={{display:"flex",gap:2,marginBottom:4}}>{co.tags.slice(0,3).map(t=><span key={t} style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:C.s3,color:C.t3,fontFamily:FM}}>{t}</span>)}</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{co.country&&<span>🌍 {co.country}</span>}{csat&&<span style={{marginLeft:6}}>⭐ {csat}</span>}</div>
                  <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>openCoE(co)} style={{fontSize:9,color:C.a,background:"none",border:`1px solid ${C.b1}`,borderRadius:4,padding:"2px 6px",cursor:"pointer"}}>✎</button>
                    <button onClick={()=>{setComps(p=>p.filter(x=>x.id!==co.id));if(selComp===co.id)setSelComp(null);showT("Deleted","success");}} style={{fontSize:9,color:C.r,background:"none",border:`1px solid ${C.b1}`,borderRadius:4,padding:"2px 6px",cursor:"pointer"}}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          );})}
        </div>}

        {/* ═══ LIST VIEW ═══ */}
        {compView==="list"&&<>
        <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"36px 1fr 90px 60px 55px 55px 65px 65px 40px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
            {["","Company","Industry","Size","Contacts","Deals","Revenue","Pipeline",""].map(h=><span key={h||"x"} style={{fontSize:8,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
          </div>
          {fComps.map(co=>{const cts=getCoContacts(co.name);const dls=getCoDeals(co.name);const rev=getCoRev(co.name);const pipe=getCoPipeline(co.name);return(
            <div key={co.id} onClick={()=>{setSelComp(selComp===co.id?null:co.id);setCompSideTab("details");}} style={{display:"grid",gridTemplateColumns:"36px 1fr 90px 60px 55px 55px 65px 65px 40px",padding:"9px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",cursor:"pointer",background:selComp===co.id?C.ad:"transparent"}}>
              <div style={{width:26,height:26,borderRadius:7,background:co.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:co.color,fontFamily:FD}}>{co.name[0]}</div>
              <div><div style={{fontSize:12,fontWeight:600}}>{co.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{co.domain||co.country||"—"}</div></div>
              <span style={{fontSize:10,color:C.t2}}>{co.industry}</span>
              <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{co.size}</span>
              <span style={{fontSize:11,fontWeight:600,color:cts.length?C.a:C.t3}}>{cts.length}</span>
              <span style={{fontSize:11,fontWeight:600,color:dls.length?C.p:C.t3}}>{dls.length}</span>
              <span style={{fontSize:10,fontWeight:700,color:rev?C.g:C.t3,fontFamily:FM}}>{rev?"₹"+(rev/1000).toFixed(0)+"K":"—"}</span>
              <span style={{fontSize:10,fontWeight:600,color:pipe?C.cy:C.t3,fontFamily:FM}}>{pipe?"₹"+(pipe/1000).toFixed(0)+"K":"—"}</span>
              <div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>openCoE(co)} style={{fontSize:9,color:C.a,background:"none",border:"none",cursor:"pointer"}}>✎</button>
                <button onClick={()=>{setComps(p=>p.filter(x=>x.id!==co.id));if(selComp===co.id)setSelComp(null);showT("Deleted","success");}} style={{fontSize:9,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
              </div>
            </div>
          );})}
          {fComps.length===0&&<div style={{padding:30,textAlign:"center",color:C.t3,fontSize:12}}>No customers match your filters</div>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:11,color:C.t3,fontFamily:FM}}>
          <span>{fComps.length} customers · {[...new Set(fComps.map(c=>c.industry))].length} industries</span>
          <span>Revenue: ₹{Math.round(fComps.reduce((s,c)=>s+getCoRev(c.name),0)/1000)}K · Pipeline: ₹{Math.round(fComps.reduce((s,c)=>s+getCoPipeline(c.name),0)/1000)}K</span>
        </div>
        </>}
      </div>

      {/* ═══ CUSTOMER DETAIL SIDEBAR ═══ */}
      {selComp&&(()=>{const co=comps.find(x=>x.id===selComp);if(!co)return null;const cts=getCoContacts(co.name);const dls=getCoDeals(co.name);const lds=getCoLeads(co.name);const mtgs=getCoMeetings(co.name);const rev=getCoRev(co.name);const pipe=getCoPipeline(co.name);const csat=getCoCsat(co.name);return <aside style={{width:360,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:15,fontWeight:700,fontFamily:FD}}>Customer Profile</span><button onClick={()=>setSelComp(null)} style={{color:C.t3,background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button></div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <div style={{width:48,height:48,borderRadius:14,background:co.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:co.color,fontFamily:FD,flexShrink:0}}>{co.name[0]}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:700}}>{co.name}</div>
              <div style={{fontSize:11,color:C.t3,fontFamily:FM}}>{co.industry} · {co.size} employees</div>
              {co.domain&&<div style={{fontSize:10,color:C.a,fontFamily:FM}}>🌐 {co.domain}</div>}
            </div>
          </div>
          {/* KPI cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5}}>
            {[{l:"Contacts",v:cts.length,c:C.a},{l:"Deals",v:dls.length,c:C.p},{l:"Revenue",v:rev?"₹"+(rev/1000).toFixed(0)+"K":"—",c:C.g},{l:"CSAT",v:csat?csat+"★":"—",c:csat>=4?C.g:csat?C.y:C.t3}].map(s=>(
              <div key={s.l} style={{padding:"6px",background:C.s2,borderRadius:6,textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,fontFamily:FD,color:s.c}}>{s.v}</div><div style={{fontSize:7,color:C.t3,fontFamily:FM}}>{s.l}</div></div>
            ))}
          </div>
          {(co.tags||[]).length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:8}}>{co.tags.map(t=><span key={t} style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:C.s3,color:C.t3,fontFamily:FM}}>{t}</span>)}</div>}
        </div>

        {/* Sidebar tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          {[["details","📋 Details"],["contacts","👤 People ("+cts.length+")"],["deals","💰 Deals ("+dls.length+")"],["activity","📊 Activity"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setCompSideTab(id)} style={{flex:1,padding:"7px 0",fontSize:9,fontWeight:700,fontFamily:FM,color:compSideTab===id?C.a:C.t3,borderBottom:`2px solid ${compSideTab===id?C.a:"transparent"}`,background:"transparent",border:"none",cursor:"pointer"}}>{lb}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto"}}>
          {/* Details tab */}
          {compSideTab==="details"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>COMPANY INFO</div>
            <div style={{background:C.s2,borderRadius:10,padding:"8px 12px",marginBottom:14}}>
              {[{icon:"🌐",l:"Domain",v:co.domain||"—"},{icon:"📧",l:"Email",v:co.email||"—"},{icon:"📞",l:"Phone",v:co.phone||"—"},{icon:"👥",l:"Size",v:co.size+" employees"},{icon:"🏭",l:"Industry",v:co.industry},{icon:"📍",l:"Address",v:co.address||"—"},{icon:"🌍",l:"Country",v:co.country||"—"},{icon:"📅",l:"Created",v:co.created}].map(r=>(
                <div key={r.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.b1}11`}}>
                  <span style={{fontSize:11}}>{r.icon}</span>
                  <span style={{fontSize:10,color:C.t3,width:60,fontFamily:FM}}>{r.l}</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.t1,flex:1}}>{r.v}</span>
                </div>
              ))}
            </div>
            {co.notes&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:4,letterSpacing:".5px"}}>NOTES</div><div style={{background:C.yd,border:`1px solid ${C.y}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t1,lineHeight:1.5,marginBottom:14,whiteSpace:"pre-wrap"}}>{co.notes}</div></>}
            <textarea placeholder="Add a note… (Enter to save)" rows={2} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();const v=e.target.value.trim();if(v){setComps(p=>p.map(x=>x.id===co.id?{...x,notes:x.notes?x.notes+"\n"+v:v}:x));showT("Note added","success");e.target.value="";}}}} style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.t1,fontFamily:FB,resize:"none",outline:"none",boxSizing:"border-box"}}/>
          </div>}

          {/* Contacts tab */}
          {compSideTab==="contacts"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8,letterSpacing:".5px"}}>CONTACTS AT {co.name.toUpperCase()} ({cts.length})</div>
            {cts.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>No contacts at this company</div>}
            {cts.map(ct=>(
              <div key={ct.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <Av i={ct.av} c={ct.color} s={30}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600}}>{ct.name}</div>
                  <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{ct.email}</div>
                  {ct.phone&&<div style={{fontSize:9,color:C.t3,fontFamily:FM}}>📞 {ct.phone}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <Tag text={ct.plan} color={ct.plan==="Enterprise"?C.p:ct.plan==="Pro"?C.a:C.t3}/>
                  {ct.csat&&<div style={{fontSize:9,color:ct.csat>=4?C.g:C.y,fontFamily:FM,marginTop:2}}>⭐ {ct.csat}</div>}
                </div>
              </div>
            ))}
            {/* Leads at company */}
            {lds.length>0&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginTop:14,marginBottom:6,letterSpacing:".5px"}}>LEADS ({lds.length})</div>
            {lds.map(l=>(
              <div key={l.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <Av i={l.name.split(" ").map(n=>n[0]).join("").slice(0,2)} c={LC2[l.stage]} s={24}/>
                <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600}}>{l.name}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{l.designation||l.email}</div></div>
                <Tag text={l.stage} color={LC2[l.stage]}/>
              </div>
            ))}</>}
          </div>}

          {/* Deals tab */}
          {compSideTab==="deals"&&<div style={{padding:"12px 18px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
              <div style={{padding:"8px",background:C.gd,borderRadius:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.g}}>₹{rev.toLocaleString()}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Won Revenue</div></div>
              <div style={{padding:"8px",background:C.cy+"12",borderRadius:8,textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,fontFamily:FD,color:C.cy}}>₹{pipe.toLocaleString()}</div><div style={{fontSize:8,color:C.t3,fontFamily:FM}}>Pipeline</div></div>
            </div>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:6,letterSpacing:".5px"}}>DEALS ({dls.length})</div>
            {dls.length===0&&<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>No deals yet</div>}
            {dls.map(d=>(
              <div key={d.id} style={{padding:"10px",background:C.s2,borderRadius:8,marginBottom:6,border:`1px solid ${C.b1}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{fontSize:12,fontWeight:600}}>{d.name}</div>
                  <Tag text={d.stage} color={SC[d.stage]}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:14,fontWeight:800,fontFamily:FD,color:d.stage==="Won"?C.g:d.stage==="Lost"?C.r:C.a}}>₹{d.value.toLocaleString()}</span>
                  <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{d.owner} · {d.probability}%</span>
                </div>
                {d.contact&&<div style={{fontSize:9,color:C.a,fontFamily:FM,marginTop:2}}>👤 {d.contact}</div>}
              </div>
            ))}
            <Btn ch="+ Create Deal" v="success" full sm onClick={()=>{setDCo(co.name);openDN();}}/>
            {/* Meetings */}
            {mtgs.length>0&&<><div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginTop:14,marginBottom:6,letterSpacing:".5px"}}>MEETINGS ({mtgs.length})</div>
            {mtgs.map(m=>{const mt=MT_TYPES.find(t=>t.v===m.type);return(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.b1}22`}}>
                <span style={{fontSize:14}}>{mt?.i||"📅"}</span>
                <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600}}>{m.title}</div><div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{m.date} · {m.time}</div></div>
                <Tag text={m.status} color={m.status==="scheduled"?C.a:C.g}/>
              </div>
            );})}</>}
          </div>}

          {/* Activity tab */}
          {compSideTab==="activity"&&<div style={{padding:"12px 18px"}}>
            <div style={{fontSize:9,fontWeight:700,fontFamily:FM,color:C.t3,marginBottom:8,letterSpacing:".5px"}}>COMPANY TIMELINE</div>
            {/* Aggregate activities from deals + meetings */}
            {(()=>{const timeline=[];dls.forEach(d=>(d.activities||[]).forEach(a=>timeline.push({...a,source:"💰 "+d.name,type:"deal"})));mtgs.forEach(m=>(m.activities||[]).forEach(a=>timeline.push({...a,source:(MT_TYPES.find(t=>t.v===m.type)?.i||"📅")+" "+m.title,type:"meeting"})));lds.forEach(l=>(l.activities||[]).forEach(a=>timeline.push({...a,source:"🎯 "+l.name,type:"lead"})));return timeline.length===0?<div style={{padding:20,textAlign:"center",color:C.t3,fontSize:11}}>No activity yet</div>:timeline.slice(0,15).map((a,i)=>(
              <div key={i} style={{display:"flex",gap:10,position:"relative"}}>
                {i<Math.min(timeline.length,15)-1&&<div style={{position:"absolute",left:14,top:24,width:1,bottom:-4,background:C.b1}}/>}
                <div style={{width:28,height:28,borderRadius:8,background:C.s2,border:`1px solid ${C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0,zIndex:1}}>{a.type==="deal"?"💰":a.type==="meeting"?"📅":"🎯"}</div>
                <div style={{flex:1,paddingBottom:10}}>
                  <div style={{fontSize:9,color:C.a,fontFamily:FM,marginBottom:1}}>{a.source}</div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{a.note}</span><span style={{fontSize:8,color:C.t3,fontFamily:FM,flexShrink:0,marginLeft:6}}>{a.date}</span></div>
                </div>
              </div>
            ));})()}
          </div>}
        </div>

        {/* Actions footer */}
        {/* Custom Fields for company */}
        {customFields&&<div style={{padding:"6px 18px"}}><CfPanel entity="company" recordId={co.id} fields={customFields} getCfVal={getCfVal} setCfVal={setCfVal} compact/></div>}
        <div style={{padding:"12px 18px",borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <Btn ch="✎ Edit" v="ghost" full sm onClick={()=>openCoE(co)}/>
            <Btn ch="💰 New Deal" v="success" full sm onClick={()=>{setDCo(co.name);openDN();}}/>
          </div>
          <Btn ch="🗑 Delete Customer" v="danger" full sm onClick={()=>{setComps(p=>p.filter(x=>x.id!==co.id));setSelComp(null);showT("Deleted","success");}}/>
        </div>
      </aside>;})()}
    </div>}

    {/* ═══ ACTIVITIES ═══ */}
    {tab==="activities"&&<div style={{flex:1,padding:"20px 24px",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",gap:3}}>{[{v:"all",l:"All"},...Object.entries(AIC).map(([t,i])=>({v:t,l:i+" "+t}))].map(f=><button key={f.v} onClick={()=>setActFilter(f.v)} style={{padding:"6px 10px",borderRadius:8,fontSize:10,fontWeight:700,fontFamily:FM,background:actFilter===f.v?C.ad:"transparent",color:actFilter===f.v?C.a:C.t3,border:`1px solid ${actFilter===f.v?C.a+"44":C.b1}`,cursor:"pointer"}}>{f.l}</button>)}</div>
        <div style={{display:"flex",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,overflow:"hidden"}}>{[["list","☰"],["kanban","▦"]].map(([v,i])=><button key={v} onClick={()=>setActView(v)} style={{padding:"6px 12px",fontSize:12,background:actView===v?C.ad:"transparent",color:actView===v?C.a:C.t3,border:"none",cursor:"pointer",fontWeight:700}}>{i}</button>)}</div>
      </div>
      {/* List view */}
      {actView==="list"&&<>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"30px 24px 1fr 100px 80px 80px 50px",padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
          {["","","Subject","Contact","Agent","Date",""].map(h=><span key={h||"ck"} style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,textTransform:"uppercase"}}>{h}</span>)}
        </div>
        {fActs.map(a=>(
          <div key={a.id} style={{display:"grid",gridTemplateColumns:"30px 24px 1fr 100px 80px 80px 50px",padding:"9px 14px",borderBottom:`1px solid ${C.b1}22`,alignItems:"center",opacity:a.done?0.55:1}}>
            <button onClick={()=>setActs(p=>p.map(x=>x.id===a.id?{...x,done:!x.done}:x))} style={{width:20,height:20,borderRadius:6,border:`2px solid ${a.done?C.g:C.b1}`,background:a.done?C.g:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>{a.done?"✓":""}</button>
            <span style={{fontSize:15}}>{AIC[a.type]}</span>
            <div><div style={{fontSize:12,fontWeight:600,textDecoration:a.done?"line-through":"none"}}>{a.subject}</div>{a.notes&&<div style={{fontSize:9,color:C.t3,fontFamily:FM,marginTop:1}}>{a.notes.slice(0,50)}</div>}</div>
            <span style={{fontSize:11,color:C.t2}}>{a.contact}</span>
            <span style={{fontSize:11,color:C.t2}}>{a.agent}</span>
            <span style={{fontSize:10,color:C.t3,fontFamily:FM}}>{a.date}</span>
            <button onClick={()=>{setActs(p=>p.filter(x=>x.id!==a.id));showT("Deleted","success");}} style={{color:C.r,background:"none",border:"none",cursor:"pointer",fontSize:10}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,fontSize:11,color:C.t3,fontFamily:FM}}>{fActs.length} activities · {fActs.filter(a=>a.done).length} done · {fActs.filter(a=>!a.done).length} pending</div>
      </>}
      {/* Kanban view - by type */}
      {actView==="kanban"&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8}}>
        {Object.entries(AIC).map(([type,icon])=>{const typeActs=fActs.filter(a=>a.type===type);return(
          <div key={type} style={{minWidth:200,flex:1,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"10px 12px",borderBottom:`3px solid ${C.a}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:700}}>{icon} {type[0].toUpperCase()+type.slice(1)}s</span>
              <span style={{fontSize:10,fontFamily:FM,color:C.t3,background:C.s2,padding:"1px 6px",borderRadius:8}}>{typeActs.length}</span>
            </div>
            <div style={{flex:1,padding:6,minHeight:80}}>
              {typeActs.map(a=>(
                <div key={a.id} className="card-lift" style={{padding:10,background:a.done?C.gd:C.s2,border:`1px solid ${a.done?C.g+"33":C.b1}`,borderRadius:8,marginBottom:6,opacity:a.done?0.65:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                    <button onClick={()=>setActs(p=>p.map(x=>x.id===a.id?{...x,done:!x.done}:x))} style={{width:16,height:16,borderRadius:4,border:`2px solid ${a.done?C.g:C.b1}`,background:a.done?C.g:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",flexShrink:0}}>{a.done?"✓":""}</button>
                    <div style={{fontSize:11,fontWeight:600,textDecoration:a.done?"line-through":"none",flex:1}}>{a.subject}</div>
                  </div>
                  <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>👤 {a.contact} · {a.agent}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                    <span style={{fontSize:9,color:C.t3,fontFamily:FM}}>{a.date}</span>
                    <button onClick={()=>{setActs(p=>p.filter(x=>x.id!==a.id));showT("Deleted","success");}} style={{fontSize:8,color:C.r,background:"none",border:"none",cursor:"pointer"}}>✕</button>
                  </div>
                </div>
              ))}
              {typeActs.length===0&&<div style={{padding:16,textAlign:"center",color:C.t3,fontSize:10}}>No {type}s</div>}
            </div>
          </div>
        );})}
      </div>}
    </div>}

    {/* ═══ MODALS ═══ */}
    {showDF&&<Mdl title={editD?"Edit Deal":"New Deal"} onClose={()=>{setShowDF(false);setEditD(null);}} w={560}>
      <Fld label="Deal Name"><Inp val={dN} set={setDN} ph="e.g. TechCorp Enterprise Plan"/></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Value (₹)"><Inp val={dV} set={setDV} ph="48000" type="number"/></Fld></div><div style={{flex:1}}><Fld label="Company"><CompanyPicker val={dCo} set={setDCo} comps={comps} setComps={setComps}/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Contact"><Inp val={dCt} set={setDCt} ph="Contact name"/></Fld></div><div style={{flex:1}}><Fld label="Product"><Sel val={dProd} set={setDProd} opts={PRODUCTS.map(p=>({v:p,l:p}))}/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Stage"><Sel val={dS} set={setDS} opts={STAGES.map(s=>({v:s,l:s}))}/></Fld></div><div style={{flex:1}}><Fld label="Owner"><Sel val={dO} set={setDO} opts={["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))}/></Fld></div></div>
      <Fld label="Expected Close Date"><Inp val={dC} set={setDC} ph="DD/MM/YY"/></Fld>
      <Fld label="Notes"><textarea value={dNo} onChange={e=>setDNo(e.target.value)} rows={3} placeholder="Deal context, requirements, next steps…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowDF(false);setEditD(null);}}/>{editD&&<Btn ch="Delete" v="danger" onClick={()=>{setDeals(p=>p.filter(d=>d.id!==editD.id));setShowDF(false);showT("Deleted","success");}}/>}<Btn ch={editD?"Save":"Create Deal"} v="primary" onClick={saveD}/></div>
    </Mdl>}
    {showLF&&<Mdl title={editL?"Edit Lead":"New Lead"} onClose={()=>{setShowLF(false);setEditL(null);}} w={580}>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Full Name"><Inp val={lName} set={setLName} ph="Vikram Sinha"/></Fld></div><div style={{flex:1}}><Fld label="Email"><Inp val={lEmail} set={setLEmail} ph="vikram@company.com" type="email"/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Company"><CompanyPicker val={lCompany} set={setLCompany} comps={comps} setComps={setComps}/></Fld></div><div style={{flex:1}}><Fld label="Designation"><Inp val={lDesig} set={setLDesig} ph="VP Engineering"/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Phone"><Inp val={lPhone} set={setLPhone} ph="+91 90001 22334"/></Fld></div><div style={{flex:1}}><Fld label="Est. Deal Value (₹)"><Inp val={lValue} set={setLValue} ph="48000" type="number"/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Source"><Sel val={lSource} set={setLSource} opts={LEAD_SOURCES.map(s=>({v:s,l:s}))}/></Fld></div><div style={{flex:1}}><Fld label="Stage"><Sel val={lStage} set={setLStage} opts={LEAD_STAGES.map(s=>({v:s,l:s}))}/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Owner"><Sel val={lOwner} set={setLOwner} opts={["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))}/></Fld></div><div style={{flex:1}}><Fld label="Tags (comma-sep)"><Inp val={lTags} set={setLTags} ph="enterprise, inbound"/></Fld></div></div>
      <Fld label="Notes"><textarea value={lNotes} onChange={e=>setLNotes(e.target.value)} rows={3} placeholder="Context, requirements, next steps…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowLF(false);setEditL(null);}}/>{editL&&<Btn ch="Delete" v="danger" onClick={()=>{setLeads(p=>p.filter(l=>l.id!==editL.id));setShowLF(false);showT("Deleted","success");}}/>}<Btn ch={editL?"Save":"Create Lead"} v="primary" onClick={saveL}/></div>
    </Mdl>}
    {showTF&&<Mdl title={editTk?"Edit Task":"New Task"} onClose={()=>{setShowTF(false);setEditTk(null);}} w={560}>
      <Fld label="Title"><Inp val={tkTitle} set={setTkTitle} ph="e.g. Send proposal to TechCorp"/></Fld>
      <Fld label="Description"><textarea value={tkDesc} onChange={e=>setTkDesc(e.target.value)} rows={3} placeholder="Task details, acceptance criteria, context…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Assignee"><Sel val={tkAssignee} set={setTkAssignee} opts={["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))}/></Fld></div><div style={{flex:1}}><Fld label="Due Date"><Inp val={tkDue} set={setTkDue} ph="DD/MM/YY"/></Fld></div></div>
      <Fld label="Priority"><div style={{display:"flex",gap:4}}>{PRIORITIES.map(p=><button key={p.v} onClick={()=>setTkPriority(p.v)} style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,background:tkPriority===p.v?p.c+"18":"transparent",color:tkPriority===p.v?p.c:C.t3,border:`1.5px solid ${tkPriority===p.v?p.c+"55":C.b1}`,cursor:"pointer"}}>{p.l}</button>)}</div></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Status"><Sel val={tkStatus} set={setTkStatus} opts={TASK_STATUS.map(s=>({v:s.v,l:s.i+" "+s.l}))}/></Fld></div><div style={{flex:1}}><Fld label="Company"><CompanyPicker val={tkCompany} set={setTkCompany} comps={comps} setComps={setComps}/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Contact"><Inp val={tkContact} set={setTkContact} ph="Contact name"/></Fld></div><div style={{flex:1}}><Fld label="Related Deal"><Inp val={tkDeal} set={setTkDeal} ph="Deal name"/></Fld></div></div>
      <Fld label="Tags (comma-separated)"><Inp val={tkTags} set={setTkTags} ph="proposal, follow-up, demo"/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowTF(false);setEditTk(null);}}/>{editTk&&<Btn ch="Delete" v="danger" onClick={()=>{setTasks(p=>p.filter(t=>t.id!==editTk.id));setShowTF(false);setSelTask(null);showT("Deleted","success");}}/>}<Btn ch={editTk?"Save":"Create Task"} v="primary" onClick={saveTk}/></div>
    </Mdl>}
    {showMF&&<Mdl title={editMt?"Edit Meeting":"Schedule Meeting"} onClose={()=>{setShowMF(false);setEditMt(null);}} w={580}>
      <Fld label="Title"><Inp val={mtTitle} set={setMtTitle} ph="e.g. TechCorp Enterprise Demo"/></Fld>
      <Fld label="Type"><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{MT_TYPES.map(t=><button key={t.v} onClick={()=>setMtType(t.v)} style={{padding:"6px 10px",borderRadius:7,fontSize:11,fontWeight:600,background:mtType===t.v?(t.c)+"18":"transparent",color:mtType===t.v?t.c:C.t3,border:`1.5px solid ${mtType===t.v?t.c+"55":C.b1}`,cursor:"pointer"}}>{t.i} {t.l}</button>)}</div></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Date"><Inp val={mtDate} set={setMtDate} ph="DD/MM/YY"/></Fld></div><div style={{flex:1}}><Fld label="Time"><Inp val={mtTime} set={setMtTime} ph="10:00 AM"/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Duration"><Sel val={mtDuration} set={setMtDuration} opts={["15 min","30 min","45 min","60 min","90 min","2 hours"].map(d=>({v:d,l:d}))}/></Fld></div><div style={{flex:1}}><Fld label="Location"><Sel val={mtLocation} set={setMtLocation} opts={["Zoom","Google Meet","Teams","Phone","In-Person","Huddle","Other"].map(l=>({v:l,l}))}/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Contact"><Inp val={mtContact} set={setMtContact} ph="Contact name"/></Fld></div><div style={{flex:1}}><Fld label="Company"><CompanyPicker val={mtCompany} set={setMtCompany} comps={comps} setComps={setComps}/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Host"><Sel val={mtHost} set={setMtHost} opts={["Priya","Dev","Meena","Aryan"].map(n=>({v:n,l:n}))}/></Fld></div><div style={{flex:1}}><Fld label="Related Deal"><Inp val={mtDeal} set={setMtDeal} ph="Deal name"/></Fld></div></div>
      <Fld label="Agenda"><textarea value={mtAgenda} onChange={e=>setMtAgenda(e.target.value)} rows={3} placeholder="Meeting agenda, discussion points, goals…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
      <Fld label="Notes"><textarea value={mtNotes} onChange={e=>setMtNotes(e.target.value)} rows={2} placeholder="Prep notes, reminders…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
      {editMt?.status==="completed"&&<Fld label="Outcome"><textarea value={mtOutcome} onChange={e=>setMtOutcome(e.target.value)} rows={2} placeholder="Meeting outcome, next steps…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowMF(false);setEditMt(null);}}/>{editMt&&<Btn ch="Delete" v="danger" onClick={()=>{setMeetings(p=>p.filter(m=>m.id!==editMt.id));setShowMF(false);setSelMeeting(null);showT("Cancelled","success");}}/>}<Btn ch={editMt?"Save":"Schedule"} v="primary" onClick={saveMt}/></div>
    </Mdl>}
    {showAF&&<Mdl title="Log Activity" onClose={()=>setShowAF(false)} w={460}>
      <Fld label="Type"><div style={{display:"flex",gap:4}}>{Object.entries(AIC).map(([t,i])=><button key={t} onClick={()=>setAT(t)} style={{flex:1,padding:8,borderRadius:8,fontSize:12,background:aT===t?C.ad:C.s2,color:aT===t?C.a:C.t2,border:`1px solid ${aT===t?C.a+"44":C.b1}`,cursor:"pointer",textAlign:"center"}}>{i} {t}</button>)}</div></Fld>
      <Fld label="Subject"><Inp val={aSubj} set={setASubj} ph="Follow-up call"/></Fld>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Contact"><Inp val={aCont} set={setACont} ph="Contact name"/></Fld></div><div style={{flex:1}}><Fld label="Agent"><Sel val={aAg} set={setAAg} opts={["Priya","Dev","Meena"].map(n=>({v:n,l:n}))}/></Fld></div></div>
      <Fld label="Date"><Inp val={aDate} set={setADate} ph="Today"/></Fld>
      <Fld label="Notes"><Inp val={aNote} set={setANote} ph="Details…"/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>setShowAF(false)}/><Btn ch="Log Activity" v="primary" onClick={saveA}/></div>
    </Mdl>}
    {/* Company form */}
    {showCF&&<Mdl title={editCo?"Edit Customer":"New Customer"} onClose={()=>{setShowCF(false);setEditCo(null);}} w={580}>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Company"><CompanyPicker val={coName} set={setCoName} comps={comps} setComps={setComps}/></Fld></div><div style={{flex:1}}><Fld label="Domain"><Inp val={coDom} set={setCoDom} ph="techcorp.io"/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Industry"><Sel val={coInd} set={setCoInd} opts={INDUSTRIES.map(i=>({v:i,l:i}))}/></Fld></div><div style={{flex:1}}><Fld label="Company Size"><Sel val={coSz} set={setCoSz} opts={COMP_SIZES.map(s=>({v:s,l:s+" employees"}))}/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Email"><Inp val={coEm} set={setCoEm} ph="info@company.com" type="email"/></Fld></div><div style={{flex:1}}><Fld label="Phone"><Inp val={coPh} set={setCoPh} ph="+91 80 4567 8900"/></Fld></div></div>
      <div style={{display:"flex",gap:12}}><div style={{flex:1}}><Fld label="Website"><Inp val={coWeb} set={setCoWeb} ph="company.com"/></Fld></div><div style={{flex:1}}><Fld label="Country"><Sel val={coCtry} set={setCoCtry} opts={["India","United States","United Kingdom","Germany","Japan","Singapore","UAE","Other"].map(c=>({v:c,l:c}))}/></Fld></div></div>
      <Fld label="Address"><Inp val={coAddr} set={setCoAddr} ph="Street, City, State"/></Fld>
      <Fld label="Tags (comma-separated)"><Inp val={coTags} set={setCoTags} ph="enterprise, priority, customer"/></Fld>
      <Fld label="Notes"><textarea value={coNotes} onChange={e=>setCoNotes(e.target.value)} rows={3} placeholder="Internal notes about this customer…" style={{width:"100%",background:C.bg,border:`1px solid ${C.b1}`,borderRadius:8,padding:"10px 12px",fontSize:13,color:C.t1,fontFamily:FB,resize:"vertical",outline:"none",lineHeight:1.6,boxSizing:"border-box"}}/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn ch="Cancel" v="ghost" onClick={()=>{setShowCF(false);setEditCo(null);}}/>{editCo&&<Btn ch="Delete" v="danger" onClick={()=>{setComps(p=>p.filter(c=>c.id!==editCo.id));setShowCF(false);if(selComp===editCo.id)setSelComp(null);showT("Deleted","success");}}/>}<Btn ch={editCo?"Save":"Create Customer"} v="primary" onClick={saveCo}/></div>
    </Mdl>}
  </div>;
}


