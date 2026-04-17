import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { C, FD, FB, FM, api, uid, showT, Btn, Inp, Sel, Fld, Mdl, Toggle, Spin, EmptyState } from "../shared";

/*
  Workflow Builder — n8n-style visual canvas.
  Features:
   - List workflows with stats (sidebar)
   - Visual canvas with draggable nodes + SVG edges
   - Node palette (trigger, condition, actions) — click to add
   - Right drawer: configure selected node
   - Save, toggle active, test-run, delete
   - Runs panel with live updates via window "ws" event
*/

const GRID = 16;

const snapPos = (x:number,y:number) => ({ x: Math.round(x/GRID)*GRID, y: Math.round(y/GRID)*GRID });

const NODE_COLORS:Record<string,string> = {
  trigger:"#f5a623", condition:"#4c82fb", delay:"#8496bc",
  send_reply:"#9b6dff", send_email:"#9b6dff", send_sms:"#9b6dff", send_whatsapp:"#22c55e",
  ai_reply:"#a855f7",
  assign_agent:"#22d4e8", add_label:"#22d4e8", set_priority:"#22d4e8", resolve:"#22d4e8", snooze:"#22d4e8",
  launch_campaign:"#f04f5a", webhook:"#f04f5a", log:"#6b7280",
};

const NODE_W = 200;
const NODE_H = 64;

export default function WorkflowScr(){
  const [workflows,setWorkflows]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null);   // currently opened workflow (full)
  const [catalog,setCatalog]=useState<any>({triggers:[],nodeTypes:[],operators:[],contextVars:[]});
  const [inboxes,setInboxes]=useState<any[]>([]);
  const [agentsList,setAgentsList]=useState<any[]>([]);
  const [runs,setRuns]=useState<any[]>([]);
  const [runDetail,setRunDetail]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [showNewForm,setShowNewForm]=useState(false);
  const [newName,setNewName]=useState("");
  const [newTrigger,setNewTrigger]=useState("new_conversation");
  const [selNodeId,setSelNodeId]=useState<string|null>(null);
  const [canvasZoom,setCanvasZoom]=useState(1);
  const [canvasPan,setCanvasPan]=useState({x:40,y:40});
  const [dragNode,setDragNode]=useState<{id:string,dx:number,dy:number}|null>(null);
  const [connectFrom,setConnectFrom]=useState<string|null>(null);
  const canvasRef=useRef<HTMLDivElement|null>(null);

  // ── bootstrap ────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!api.isConnected())return;
    api.get("/workflows/_catalog").then(r=>r&&setCatalog(r)).catch(()=>{});
    api.get("/workflows").then(r=>r?.workflows&&setWorkflows(r.workflows)).catch(()=>{});
    api.get("/inboxes").then(r=>r?.inboxes&&setInboxes(r.inboxes)).catch(()=>{});
    api.get("/agents").then(r=>r?.agents&&setAgentsList(r.agents)).catch(()=>{});
  },[]);

  // ── load runs for selected workflow ──────────────────────────────────────
  const loadRuns=useCallback(()=>{
    if(!selected?.id)return;
    api.get(`/workflows/${selected.id}/runs`).then(r=>r?.runs&&setRuns(r.runs)).catch(()=>{});
  },[selected?.id]);

  useEffect(()=>{ if(selected?.id) loadRuns(); },[selected?.id,loadRuns]);

  // ── listen for live run events via ws bus ────────────────────────────────
  useEffect(()=>{
    const h=(e:any)=>{
      const m=e.detail; if(!m)return;
      if((m.type==="workflow_run_started"||m.type==="workflow_run_completed")&&m.workflow_id===selected?.id){
        loadRuns();
        if(m.type==="workflow_run_completed"){
          setWorkflows(p=>p.map(w=>w.id===m.workflow_id?{...w,stats:{...(w.stats||{}),runs:((w.stats?.runs||0)+1),last_run:new Date().toISOString()}}:w));
        }
      }
    };
    window.addEventListener("ws",h as any);
    return()=>window.removeEventListener("ws",h as any);
  },[selected?.id,loadRuns]);

  // ── create ───────────────────────────────────────────────────────────────
  const createWorkflow=async()=>{
    if(!newName.trim())return showT("Name required","error");
    try{
      const tcfg=catalog.triggers.find(t=>t.id===newTrigger);
      const tNode={ id:"n_"+uid(), type:"trigger", label:tcfg?.label||newTrigger, icon:tcfg?.icon||"⚡", x:40, y:160, config:{} };
      const r=await api.post("/workflows",{
        name:newName,
        trigger_type:newTrigger,
        trigger_config:{conditions:[]},
        nodes:[tNode], edges:[],
        active:1,
      });
      if(r?.workflow){
        setWorkflows(p=>[r.workflow,...p]);
        setSelected(r.workflow);
        setShowNewForm(false); setNewName(""); setNewTrigger("new_conversation");
        showT("Workflow created","success");
      }
    }catch(e){ showT((e as any).message||"Create failed","error"); }
  };

  // ── delete / toggle ──────────────────────────────────────────────────────
  const deleteWorkflow=async(id:string)=>{
    if(!window.confirm("Delete this workflow?"))return;
    await api.del(`/workflows/${id}`);
    setWorkflows(p=>p.filter(w=>w.id!==id));
    if(selected?.id===id)setSelected(null);
    showT("Deleted","success");
  };
  const toggleActive=async(wf:any,val:boolean)=>{
    setWorkflows(p=>p.map(w=>w.id===wf.id?{...w,active:val}:w));
    if(selected?.id===wf.id)setSelected(p=>({...p,active:val}));
    try{ await api.patch(`/workflows/${wf.id}`,{active:val?1:0}); }catch{}
    showT(val?"Enabled":"Disabled","success");
  };

  // ── persist current workflow (save button) ───────────────────────────────
  const persist=async()=>{
    if(!selected)return;
    try{
      setLoading(true);
      const r=await api.patch(`/workflows/${selected.id}`,{
        name:selected.name, description:selected.description,
        nodes:selected.nodes, edges:selected.edges,
        trigger_type:selected.trigger_type, trigger_config:selected.trigger_config,
      });
      if(r?.workflow){
        setSelected(r.workflow);
        setWorkflows(p=>p.map(w=>w.id===r.workflow.id?r.workflow:w));
        showT("Saved","success");
      }
    }catch(e){ showT("Save failed: "+(e as any).message,"error"); }
    finally{ setLoading(false); }
  };

  // ── test run ─────────────────────────────────────────────────────────────
  const testRun=async()=>{
    if(!selected)return;
    try{
      await persist();
      const r=await api.post(`/workflows/${selected.id}/test`,{context:{contact:{name:"Test User",email:"test@example.com"},message:{text:"Hello"}}});
      showT(r?.status==="success"?"Test OK":"Test completed — "+(r?.status||""),"info");
      loadRuns();
    }catch(e){ showT("Test failed: "+(e as any).message,"error"); }
  };

  // ── node helpers (work on selected.nodes) ────────────────────────────────
  const updateSelected=(patch:any)=>setSelected(p=>p?{...p,...patch}:p);
  const addNode=(type:string)=>{
    if(!selected)return;
    const nt=catalog.nodeTypes.find(n=>n.id===type);
    const count=(selected.nodes||[]).length;
    const id="n_"+uid();
    const newNode={ id, type, label:nt?.label||type, icon:nt?.icon||"⚙", x:240+(count%3)*240, y:160+Math.floor(count/3)*120, config:defaultConfig(type) };
    updateSelected({ nodes:[...(selected.nodes||[]), newNode] });
    setSelNodeId(id);
  };
  const defaultConfig=(type:string):any=>{
    switch(type){
      case "condition": return { mode:"and", conditions:[{attr:"message.text",op:"contains",val:""}] };
      case "delay": return { ms:60000 };
      case "send_reply": return { text:"Thanks for reaching out! {{contact.name}}" };
      case "send_email": return { to:"{{contact.email}}", subject:"", body:"" };
      case "send_sms": return { to:"{{contact.phone}}", text:"", inbox_id:"" };
      case "send_whatsapp": return { to:"{{contact.phone}}", text:"", inbox_id:"" };
      case "ai_reply": return { prompt:"Answer helpfully based on the customer's question" };
      case "assign_agent": return { agent_id:"" };
      case "add_label": return { label:"" };
      case "set_priority": return { priority:"high" };
      case "resolve": return {};
      case "snooze": return { hours:24 };
      case "webhook": return { url:"", method:"POST" };
      case "log": return { text:"" };
      case "launch_campaign": return { campaign_id:"" };
      default: return {};
    }
  };
  const updateNode=(id:string,patch:any)=>{
    if(!selected)return;
    updateSelected({ nodes:(selected.nodes||[]).map((n:any)=>n.id===id?{...n,...patch}:n) });
  };
  const updateNodeConfig=(id:string,cfgPatch:any)=>{
    if(!selected)return;
    updateSelected({ nodes:(selected.nodes||[]).map((n:any)=>n.id===id?{...n,config:{...(n.config||{}),...cfgPatch}}:n) });
  };
  const deleteNode=(id:string)=>{
    if(!selected)return;
    const node=(selected.nodes||[]).find((n:any)=>n.id===id);
    if(node?.type==="trigger")return showT("Cannot delete trigger node","error");
    updateSelected({
      nodes:(selected.nodes||[]).filter((n:any)=>n.id!==id),
      edges:(selected.edges||[]).filter((e:any)=>e.source!==id&&e.target!==id),
    });
    if(selNodeId===id)setSelNodeId(null);
  };

  // ── edges ────────────────────────────────────────────────────────────────
  const addEdge=(source:string,target:string,label?:string)=>{
    if(!selected||source===target)return;
    const exists=(selected.edges||[]).some((e:any)=>e.source===source&&e.target===target&&(e.label||"")===(label||""));
    if(exists)return;
    updateSelected({ edges:[...(selected.edges||[]), {id:"e_"+uid(),source,target,label:label||""}] });
  };
  const deleteEdge=(edgeId:string)=>{
    if(!selected)return;
    updateSelected({ edges:(selected.edges||[]).filter((e:any)=>e.id!==edgeId) });
  };

  // ── canvas mouse handlers ────────────────────────────────────────────────
  const onCanvasMouseMove=(e:React.MouseEvent)=>{
    if(!dragNode||!canvasRef.current||!selected)return;
    const rect=canvasRef.current.getBoundingClientRect();
    const rawX=(e.clientX-rect.left-canvasPan.x)/canvasZoom-dragNode.dx;
    const rawY=(e.clientY-rect.top-canvasPan.y)/canvasZoom-dragNode.dy;
    const {x,y}=snapPos(rawX,rawY);
    updateNode(dragNode.id,{x,y});
  };
  const onCanvasMouseUp=()=>{ setDragNode(null); };

  const selectedNode=useMemo(()=>{
    if(!selected||!selNodeId)return null;
    return (selected.nodes||[]).find((n:any)=>n.id===selNodeId)||null;
  },[selected,selNodeId]);

  // ═══ RENDER ═══════════════════════════════════════════════════════════════
  if(!selected){
    // list view
    return <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,fontFamily:FD}}>Workflow Builder</h2>
          <p style={{fontSize:13,color:C.t3,marginTop:4}}>Visual automations — trigger, condition, action. Built on your own data, no external APIs.</p>
        </div>
        <Btn ch="+ New Workflow" v="primary" onClick={()=>setShowNewForm(true)}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          {l:"Total Workflows",v:workflows.length,c:C.a},
          {l:"Active",v:workflows.filter(w=>w.active).length,c:C.g},
          {l:"Total Runs",v:workflows.reduce((s,w)=>s+(w.stats?.runs||0),0).toLocaleString(),c:C.p},
          {l:"Errors",v:workflows.reduce((s,w)=>s+(w.stats?.errors||0),0).toLocaleString(),c:C.r},
        ].map(k=>(
          <div key={k.l} style={{padding:14,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,fontFamily:FD,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:3}}>{k.l}</div>
          </div>
        ))}
      </div>

      {workflows.length===0&&<EmptyState icon="⚡" title="No workflows yet" desc="Create your first automation — assign tickets, auto-reply, escalate, and more." action="+ New Workflow" onAction={()=>setShowNewForm(true)}/>}

      {workflows.map(w=>{
        const trig=catalog.triggers.find(t=>t.id===w.trigger_type);
        return (
          <div key={w.id} style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"14px 18px",marginBottom:10,borderLeft:`4px solid ${w.active?C.g:C.t3}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Toggle val={w.active} set={(v)=>toggleActive(w,v)}/>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>{ setSelected(w); setSelNodeId(null); }}>
                <div style={{fontSize:14,fontWeight:700}}>{w.name}</div>
                <div style={{fontSize:11,color:C.t3,marginTop:3,display:"flex",gap:10,flexWrap:"wrap"}}>
                  <span>{trig?.icon||"⚡"} {trig?.label||w.trigger_type}</span>
                  <span>· {(w.nodes||[]).length} nodes</span>
                  <span>· {w.stats?.runs||0} runs</span>
                  {w.stats?.errors>0&&<span style={{color:C.r}}>· {w.stats.errors} errors</span>}
                  {w.stats?.last_run&&<span>· last: {new Date(w.stats.last_run).toLocaleString()}</span>}
                </div>
              </div>
              <Btn ch="Open" v="ghost" sm onClick={()=>{ setSelected(w); setSelNodeId(null); }}/>
              <button onClick={()=>deleteWorkflow(w.id)} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:14,padding:6}}>🗑</button>
            </div>
          </div>
        );
      })}

      {showNewForm&&<Mdl title="New Workflow" onClose={()=>setShowNewForm(false)} w={500}>
        <Fld label="Workflow Name"><Inp val={newName} set={setNewName} ph="e.g. Auto-reply to WhatsApp greetings"/></Fld>
        <Fld label="Trigger">
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
            {catalog.triggers.map((t:any)=>(
              <button key={t.id} onClick={()=>setNewTrigger(t.id)}
                style={{padding:"10px 12px",borderRadius:8,background:newTrigger===t.id?C.ad:C.s2,border:`1px solid ${newTrigger===t.id?C.a:C.b1}`,cursor:"pointer",textAlign:"left",fontSize:12,color:newTrigger===t.id?C.a:C.t1,fontWeight:600}}>
                <span style={{marginRight:6}}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </Fld>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
          <Btn ch="Cancel" v="ghost" onClick={()=>setShowNewForm(false)}/>
          <Btn ch="Create" v="primary" onClick={createWorkflow}/>
        </div>
      </Mdl>}
    </div>;
  }

  // ═══ EDITOR VIEW ══════════════════════════════════════════════════════════
  const nodes=selected.nodes||[];
  const edges=selected.edges||[];
  const trig=catalog.triggers.find(t=>t.id===selected.trigger_type);

  return <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:C.bg}}>
    {/* ── toolbar ── */}
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:`1px solid ${C.b1}`,background:C.s1,flexShrink:0}}>
      <button onClick={()=>setSelected(null)} style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:"6px 10px",cursor:"pointer",fontSize:12,color:C.t2}}>← Back</button>
      <input value={selected.name} onChange={e=>updateSelected({name:e.target.value})}
        style={{background:"transparent",border:"none",outline:"none",fontSize:16,fontWeight:700,fontFamily:FD,color:C.t1,flex:1,minWidth:0}}/>
      <span style={{fontSize:11,color:C.t3,fontFamily:FM}}>{trig?.icon} {trig?.label}</span>
      <Toggle val={!!selected.active} set={(v)=>toggleActive(selected,v)}/>
      <Btn ch="▶ Test" v="ghost" sm onClick={testRun}/>
      <Btn ch={loading?"Saving…":"💾 Save"} v="primary" sm onClick={persist}/>
    </div>

    <div style={{display:"flex",flex:1,minHeight:0}}>
      {/* ── node palette ── */}
      <div style={{width:180,background:C.s1,borderRight:`1px solid ${C.b1}`,padding:12,overflowY:"auto",flexShrink:0}}>
        <div style={{fontSize:10,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:6}}>ADD NODE</div>
        {["logic","message","ai","action","util"].map(cat=>{
          const items=(catalog.nodeTypes||[]).filter((n:any)=>n.category===cat);
          if(!items.length)return null;
          return <div key={cat} style={{marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:600,color:C.t3,fontFamily:FM,textTransform:"uppercase",marginBottom:4,paddingLeft:2}}>{cat}</div>
            {items.map((n:any)=>(
              <button key={n.id} onClick={()=>addNode(n.id)}
                style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"7px 10px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,marginBottom:3,cursor:"pointer",fontSize:12,color:C.t1,textAlign:"left",borderLeft:`3px solid ${NODE_COLORS[n.id]||C.a}`}}
                className="hov">
                <span style={{fontSize:14}}>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </div>;
        })}
      </div>

      {/* ── canvas ── */}
      <div ref={canvasRef}
        onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp}
        onClick={e=>{if(e.target===canvasRef.current){setSelNodeId(null); setConnectFrom(null);}}}
        style={{flex:1,position:"relative",overflow:"auto",background:`${C.bg} radial-gradient(${C.b1} 1px, transparent 1px) 0 0 / 20px 20px`,minWidth:0}}>

        {/* SVG edges */}
        <svg style={{position:"absolute",top:0,left:0,width:4000,height:3000,pointerEvents:"none"}}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={C.t3}/>
            </marker>
          </defs>
          {edges.map((e:any)=>{
            const s=nodes.find((n:any)=>n.id===e.source);
            const t=nodes.find((n:any)=>n.id===e.target);
            if(!s||!t)return null;
            const x1=s.x+NODE_W, y1=s.y+NODE_H/2;
            const x2=t.x, y2=t.y+NODE_H/2;
            const mx=(x1+x2)/2;
            const color=e.label==="true"?C.g:e.label==="false"?C.r:C.t3;
            return <g key={e.id} style={{pointerEvents:"auto"}} onClick={()=>{ if(window.confirm("Delete this connection?"))deleteEdge(e.id); }}>
              <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                stroke={color} strokeWidth={2} fill="none" markerEnd="url(#arrow)" style={{cursor:"pointer"}}/>
              {e.label&&<text x={(x1+x2)/2} y={(y1+y2)/2-4} fill={color} fontSize={10} fontWeight={700} textAnchor="middle" fontFamily="sans-serif" style={{userSelect:"none"}}>{e.label.toUpperCase()}</text>}
            </g>;
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((n:any)=>{
          const col=NODE_COLORS[n.type]||C.a;
          const isSel=selNodeId===n.id;
          const isConnect=connectFrom===n.id;
          return <div key={n.id}
            onMouseDown={e=>{
              if((e.target as HTMLElement).dataset.handle)return;
              const rect=canvasRef.current?.getBoundingClientRect();
              if(!rect)return;
              const localX=(e.clientX-rect.left-canvasPan.x)/canvasZoom;
              const localY=(e.clientY-rect.top-canvasPan.y)/canvasZoom;
              setDragNode({id:n.id,dx:localX-n.x,dy:localY-n.y});
              setSelNodeId(n.id); setConnectFrom(null);
            }}
            style={{
              position:"absolute", left:n.x, top:n.y, width:NODE_W, minHeight:NODE_H,
              background:C.s1, border:`2px solid ${isSel?col:C.b1}`, borderRadius:10,
              padding:"8px 10px", cursor:dragNode?.id===n.id?"grabbing":"grab",
              boxShadow:isSel?`0 0 0 3px ${col}33`:"0 1px 3px rgba(0,0,0,0.2)",
              userSelect:"none", display:"flex", flexDirection:"column", gap:4,
            }}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16}}>{n.icon||"⚙"}</span>
              <span style={{fontSize:12,fontWeight:700,color:C.t1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.label}</span>
              {n.type!=="trigger"&&<button onMouseDown={e=>e.stopPropagation()} onClick={()=>deleteNode(n.id)} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:11}}>✕</button>}
            </div>
            <div style={{fontSize:9,color:C.t3,fontFamily:FM,lineHeight:1.3,maxHeight:24,overflow:"hidden"}}>{nodeSummary(n)}</div>

            {/* Left (in) handle — not shown on trigger */}
            {n.type!=="trigger"&&<div data-handle="in"
              onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{
                e.stopPropagation();
                if(connectFrom&&connectFrom!==n.id){
                  const srcNode=nodes.find((x:any)=>x.id===connectFrom);
                  let lbl="";
                  if(srcNode?.type==="condition"){
                    lbl = window.confirm("Connect as TRUE branch? (Cancel = FALSE)")?"true":"false";
                  }
                  addEdge(connectFrom,n.id,lbl);
                  setConnectFrom(null);
                }
              }}
              style={{position:"absolute",left:-7,top:"50%",marginTop:-7,width:14,height:14,borderRadius:"50%",background:connectFrom?C.g:C.s2,border:`2px solid ${col}`,cursor:"pointer",zIndex:2}}
              title="Click when connecting"/>}

            {/* Right (out) handle */}
            <div data-handle="out"
              onMouseDown={e=>e.stopPropagation()}
              onClick={e=>{ e.stopPropagation(); setConnectFrom(isConnect?null:n.id); }}
              style={{position:"absolute",right:-7,top:"50%",marginTop:-7,width:14,height:14,borderRadius:"50%",background:isConnect?C.g:col,border:`2px solid ${C.s1}`,cursor:"pointer",zIndex:2}}
              title="Click then click the next node's left handle"/>
          </div>;
        })}

        {connectFrom&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:C.s1,border:`1px solid ${C.g}55`,color:C.g,padding:"8px 16px",borderRadius:10,fontSize:12,fontWeight:600,zIndex:10}}>
          🔗 Click a node's left handle to connect · <button onClick={()=>setConnectFrom(null)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",marginLeft:8}}>Cancel</button>
        </div>}
      </div>

      {/* ── right drawer: node config OR runs panel ── */}
      <div style={{width:320,background:C.s1,borderLeft:`1px solid ${C.b1}`,display:"flex",flexDirection:"column",flexShrink:0,minHeight:0}}>
        {selectedNode?(
          <NodeConfigPanel node={selectedNode} selected={selected} updateNode={updateNode} updateNodeConfig={updateNodeConfig}
            catalog={catalog} inboxes={inboxes} agents={agentsList} updateSelected={updateSelected}/>
        ):(
          <RunsPanel runs={runs} runDetail={runDetail} setRunDetail={setRunDetail} workflowId={selected.id}/>
        )}
      </div>
    </div>
  </div>;
}

// ── helpers ───────────────────────────────────────────────────────────────
function nodeSummary(n:any){
  const c=n.config||{};
  switch(n.type){
    case "trigger": return "When this event fires";
    case "condition": return `if ${(c.conditions||[]).length} rule(s) ${c.mode||"and"}`;
    case "delay": return `wait ${Math.round((c.ms||0)/1000)}s`;
    case "send_reply": return c.text?.slice(0,40)||"(empty)";
    case "send_email": return `to: ${c.to||"?"}`;
    case "send_sms": return `to: ${c.to||"?"}`;
    case "send_whatsapp": return `to: ${c.to||"?"}`;
    case "ai_reply": return c.prompt?.slice(0,40)||"AI reply";
    case "assign_agent": return `agent: ${c.agent_id||"?"}`;
    case "add_label": return `label: ${c.label||"?"}`;
    case "set_priority": return `priority: ${c.priority||"?"}`;
    case "snooze": return `${c.hours||24}h`;
    case "webhook": return `${c.method||"POST"} ${c.url||"?"}`;
    case "log": return c.text?.slice(0,40)||"(empty)";
    default: return "";
  }
}

// ── node config panel ─────────────────────────────────────────────────────
function NodeConfigPanel({node,selected,updateNode,updateNodeConfig,catalog,inboxes,agents,updateSelected}:any){
  const cfg=node.config||{};
  const isTrigger=node.type==="trigger";

  return <div style={{padding:14,overflowY:"auto",flex:1,minHeight:0}}>
    <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:6}}>NODE CONFIG</div>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,marginBottom:14}}>
      <span style={{fontSize:18}}>{node.icon}</span>
      <span style={{fontSize:13,fontWeight:700}}>{node.label}</span>
    </div>

    {isTrigger?(
      <TriggerFilters selected={selected} updateSelected={updateSelected} catalog={catalog}/>
    ):null}

    {node.type==="condition"&&<ConditionEditor cfg={cfg} onChange={p=>updateNodeConfig(node.id,p)} catalog={catalog}/>}
    {node.type==="delay"&&<Fld label="Wait (seconds)"><Inp val={String((cfg.ms||0)/1000)} set={v=>updateNodeConfig(node.id,{ms:Math.max(0,Number(v)||0)*1000})} ph="60"/></Fld>}
    {node.type==="send_reply"&&<>
      <Fld label="Message (supports {{variables}})">
        <textarea value={cfg.text||""} onChange={e=>updateNodeConfig(node.id,{text:e.target.value})}
          style={{width:"100%",minHeight:80,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:8,color:C.t1,fontFamily:FB,fontSize:12,outline:"none"}} placeholder="Thanks {{contact.name}}!"/>
      </Fld>
      <VarHints/>
    </>}
    {node.type==="send_email"&&<>
      <Fld label="To"><Inp val={cfg.to||""} set={v=>updateNodeConfig(node.id,{to:v})} ph="{{contact.email}}"/></Fld>
      <Fld label="Subject"><Inp val={cfg.subject||""} set={v=>updateNodeConfig(node.id,{subject:v})}/></Fld>
      <Fld label="Body">
        <textarea value={cfg.body||""} onChange={e=>updateNodeConfig(node.id,{body:e.target.value})}
          style={{width:"100%",minHeight:80,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:8,color:C.t1,fontFamily:FB,fontSize:12,outline:"none"}}/>
      </Fld>
      <Fld label="Inbox (optional)">
        <Sel val={cfg.inbox_id||""} set={v=>updateNodeConfig(node.id,{inbox_id:v})}
          opts={[{v:"",l:"(default)"}, ...(inboxes||[]).filter(i=>i.type==="email").map((i:any)=>({v:i.id,l:i.name}))]}/>
      </Fld>
    </>}
    {(node.type==="send_sms"||node.type==="send_whatsapp")&&<>
      <Fld label="To phone"><Inp val={cfg.to||""} set={v=>updateNodeConfig(node.id,{to:v})} ph="{{contact.phone}}"/></Fld>
      <Fld label="Message">
        <textarea value={cfg.text||""} onChange={e=>updateNodeConfig(node.id,{text:e.target.value})}
          style={{width:"100%",minHeight:70,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:8,color:C.t1,fontFamily:FB,fontSize:12,outline:"none"}}/>
      </Fld>
      <Fld label="Inbox">
        <Sel val={cfg.inbox_id||""} set={v=>updateNodeConfig(node.id,{inbox_id:v})}
          opts={[{v:"",l:"-- select --"}, ...(inboxes||[]).filter(i=>i.type===(node.type==="send_sms"?"sms":"whatsapp")).map((i:any)=>({v:i.id,l:i.name}))]}/>
      </Fld>
    </>}
    {node.type==="ai_reply"&&<>
      <Fld label="Prompt">
        <textarea value={cfg.prompt||""} onChange={e=>updateNodeConfig(node.id,{prompt:e.target.value})}
          style={{width:"100%",minHeight:80,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,padding:8,color:C.t1,fontFamily:FB,fontSize:12,outline:"none"}} placeholder="Reply helpfully…"/>
      </Fld>
      <p style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:4}}>Uses your built-in Gemini assistant. The reply is posted to the conversation automatically.</p>
    </>}
    {node.type==="assign_agent"&&<Fld label="Agent">
      <Sel val={cfg.agent_id||""} set={v=>updateNodeConfig(node.id,{agent_id:v})}
        opts={[{v:"",l:"-- select --"}, ...(agents||[]).map((a:any)=>({v:a.id,l:a.name}))]}/>
    </Fld>}
    {node.type==="add_label"&&<Fld label="Label"><Inp val={cfg.label||""} set={v=>updateNodeConfig(node.id,{label:v})} ph="vip"/></Fld>}
    {node.type==="set_priority"&&<Fld label="Priority">
      <Sel val={cfg.priority||"high"} set={v=>updateNodeConfig(node.id,{priority:v})}
        opts={["low","normal","high","urgent"].map(p=>({v:p,l:p}))}/>
    </Fld>}
    {node.type==="snooze"&&<Fld label="Hours"><Inp val={String(cfg.hours||24)} set={v=>updateNodeConfig(node.id,{hours:Math.max(1,Number(v)||24)})}/></Fld>}
    {node.type==="webhook"&&<>
      <Fld label="URL"><Inp val={cfg.url||""} set={v=>updateNodeConfig(node.id,{url:v})} ph="https://hooks.example.com/…"/></Fld>
      <Fld label="Method"><Sel val={cfg.method||"POST"} set={v=>updateNodeConfig(node.id,{method:v})} opts={["POST","GET","PUT","PATCH","DELETE"].map(m=>({v:m,l:m}))}/></Fld>
    </>}
    {node.type==="log"&&<Fld label="Log text"><Inp val={cfg.text||""} set={v=>updateNodeConfig(node.id,{text:v})} ph="something happened"/></Fld>}
  </div>;
}

function TriggerFilters({selected,updateSelected,catalog}:any){
  const tcfg=selected.trigger_config||{};
  const conds=tcfg.conditions||[];
  return <>
    <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:6}}>TRIGGER FILTERS (optional)</div>
    {conds.map((c:any,i:number)=>(
      <div key={i} style={{display:"flex",gap:4,marginBottom:5}}>
        <Inp val={c.attr} set={v=>updateSelected({trigger_config:{...tcfg,conditions:conds.map((x:any,j:number)=>j===i?{...x,attr:v}:x)}})} ph="message.text"/>
        <Sel val={c.op||"equals"} set={v=>updateSelected({trigger_config:{...tcfg,conditions:conds.map((x:any,j:number)=>j===i?{...x,op:v}:x)}})} opts={(catalog.operators||[]).map((o:any)=>({v:o.id,l:o.label}))}/>
        <Inp val={c.val} set={v=>updateSelected({trigger_config:{...tcfg,conditions:conds.map((x:any,j:number)=>j===i?{...x,val:v}:x)}})} ph="value"/>
        <button onClick={()=>updateSelected({trigger_config:{...tcfg,conditions:conds.filter((_:any,j:number)=>j!==i)}})} style={{background:"none",border:"none",color:C.r,cursor:"pointer"}}>✕</button>
      </div>
    ))}
    <button onClick={()=>updateSelected({trigger_config:{...tcfg,conditions:[...conds,{attr:"message.text",op:"contains",val:""}]}})}
      style={{fontSize:11,color:C.a,background:"none",border:`1px dashed ${C.a}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer",marginBottom:10}}>+ Add Filter</button>
    <p style={{fontSize:10,color:C.t3,fontFamily:FM,marginBottom:14}}>Only run this workflow when trigger data matches all filters.</p>
  </>;
}

function ConditionEditor({cfg,onChange,catalog}:any){
  const conds=cfg.conditions||[];
  return <>
    <Fld label="Match mode">
      <Sel val={cfg.mode||"and"} set={v=>onChange({mode:v})} opts={[{v:"and",l:"ALL (AND)"},{v:"or",l:"ANY (OR)"}]}/>
    </Fld>
    <div style={{fontSize:9,color:C.t3,fontFamily:FM,marginBottom:4}}>CONDITIONS</div>
    {conds.map((c:any,i:number)=>(
      <div key={i} style={{display:"flex",gap:4,marginBottom:5}}>
        <Inp val={c.attr} set={v=>onChange({conditions:conds.map((x:any,j:number)=>j===i?{...x,attr:v}:x)})} ph="message.text"/>
        <Sel val={c.op||"equals"} set={v=>onChange({conditions:conds.map((x:any,j:number)=>j===i?{...x,op:v}:x)})} opts={(catalog.operators||[]).map((o:any)=>({v:o.id,l:o.label}))}/>
        <Inp val={c.val} set={v=>onChange({conditions:conds.map((x:any,j:number)=>j===i?{...x,val:v}:x)})} ph="value"/>
        <button onClick={()=>onChange({conditions:conds.filter((_:any,j:number)=>j!==i)})} style={{background:"none",border:"none",color:C.r,cursor:"pointer"}}>✕</button>
      </div>
    ))}
    <button onClick={()=>onChange({conditions:[...conds,{attr:"message.text",op:"contains",val:""}]})}
      style={{fontSize:11,color:C.a,background:"none",border:`1px dashed ${C.a}44`,borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>+ Add Condition</button>
    <p style={{fontSize:10,color:C.t3,fontFamily:FM,marginTop:10}}>Connect the right handle to two nodes — one TRUE branch, one FALSE branch.</p>
    <VarHints/>
  </>;
}

function VarHints(){
  return <div style={{marginTop:10,padding:8,background:C.s2,border:`1px dashed ${C.b1}`,borderRadius:7,fontSize:10,color:C.t3,fontFamily:FM}}>
    <div style={{fontWeight:700,marginBottom:3}}>Variables:</div>
    <code>{"{{contact.name}}"}</code>, <code>{"{{contact.email}}"}</code>, <code>{"{{contact.phone}}"}</code>,<br/>
    <code>{"{{conversation.subject}}"}</code>, <code>{"{{conversation.channel}}"}</code>,<br/>
    <code>{"{{message.text}}"}</code>, <code>{"{{ai_reply}}"}</code>
  </div>;
}

// ── runs panel ────────────────────────────────────────────────────────────
function RunsPanel({runs,runDetail,setRunDetail,workflowId}:any){
  const openRun=async(id:string)=>{
    try{ const r=await api.get(`/workflows/${workflowId}/runs/${id}`); if(r?.run)setRunDetail(r.run); }catch{}
  };
  if(runDetail){
    return <div style={{padding:14,overflowY:"auto",flex:1}}>
      <button onClick={()=>setRunDetail(null)} style={{background:"none",border:"none",color:C.a,cursor:"pointer",fontSize:12,padding:0,marginBottom:10}}>← Back to runs</button>
      <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>Run {runDetail.id.slice(-6)}</div>
      <div style={{fontSize:10,color:runDetail.status==="error"?C.r:C.g,fontFamily:FM,marginBottom:10}}>
        {runDetail.status.toUpperCase()} · {runDetail.started_at} {runDetail.completed_at?`→ ${runDetail.completed_at}`:""}
      </div>
      {runDetail.error_message&&<div style={{padding:8,background:C.rd,border:`1px solid ${C.r}33`,borderRadius:6,fontSize:11,color:C.r,marginBottom:10}}>{runDetail.error_message}</div>}
      <div style={{fontSize:9,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:4}}>EXECUTION LOG ({(runDetail.execution_log||[]).length})</div>
      {(runDetail.execution_log||[]).map((step:any,i:number)=>(
        <div key={i} style={{padding:"6px 8px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:6,marginBottom:4,fontSize:11}}>
          <div style={{fontWeight:700,color:step.error?C.r:C.t1}}>{step.action||"step"}{step.branch?` → ${step.branch}`:""}</div>
          {Object.entries(step).filter(([k])=>!["node","action","ts"].includes(k)).map(([k,v]:any)=>(
            <div key={k} style={{fontSize:10,color:C.t3,fontFamily:FM}}><span>{k}:</span> {typeof v==="object"?JSON.stringify(v):String(v)}</div>
          ))}
        </div>
      ))}
    </div>;
  }
  return <div style={{padding:14,overflowY:"auto",flex:1}}>
    <div style={{fontSize:9,fontWeight:700,color:C.t3,fontFamily:FM,letterSpacing:"0.5px",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
      RECENT RUNS
      <span style={{marginLeft:"auto",fontSize:9,color:C.g,display:"flex",alignItems:"center",gap:4}}>
        <span style={{width:6,height:6,borderRadius:"50%",background:C.g,animation:"pulse 1.6s infinite"}}/>LIVE
      </span>
    </div>
    {runs.length===0&&<div style={{fontSize:11,color:C.t3,padding:"12px 0"}}>No runs yet. Save and wait for a trigger to fire — or hit ▶ Test.</div>}
    {runs.map((r:any)=>(
      <button key={r.id} onClick={()=>openRun(r.id)}
        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:7,marginBottom:4,cursor:"pointer",textAlign:"left"}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:r.status==="error"?C.r:r.status==="running"?C.y:C.g,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,fontWeight:600,color:C.t1}}>{r.status}</div>
          <div style={{fontSize:9,color:C.t3,fontFamily:FM}}>{r.started_at}</div>
        </div>
      </button>
    ))}
  </div>;
}
