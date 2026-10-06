import {useEffect,useState} from "react";
import {api,getSessionUser} from "../api";
function money(c){return (Number(c||0)/100).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0})}
export default function Dashboard(){
 const [data,setData]=useState(null),[q,setQ]=useState(""),[activities,setActivities]=useState([]);
 const user=getSessionUser();
 useEffect(()=>{api.dashboard().then(setData).catch(console.error);api.listActivities().then(setActivities).catch(console.error)},[]);
 if(!data)return <div className="loading-text">Loading workspace…</div>;
 const cards=[
  ["Pipeline",money(data.openPipelineValueCents),data.openDealCount+" open opportunities","↗"],
  ["Won revenue",money(data.wonValueCents),data.wonDealCount+" closed won","✓"],
  ["Open leads",data.openLeadCount,"Leads requiring attention","◉"],
  ["Open cases",data.openCaseCount,"Customer cases","◇"]
 ];
 return <div className="dashboard-page">
  <div className="page-header"><div><div className="eyebrow">OVERVIEW</div><h1>Good to see you, {user?.fullName?.split(" ")[0]||"there"}</h1><div className="page-subtitle">Here’s what’s happening across your sales workspace.</div></div><div className="header-actions"><button className="btn btn-secondary" onClick={()=>window.location.reload()}>↻ Refresh</button><button className="btn btn-primary" onClick={()=>window.location.href="/deals"}>＋ New opportunity</button></div></div>
  <div className="stat-grid">{cards.map(([label,value,sub,icon])=><div className="stat-card enhanced" key={label}><div className="stat-top"><span className="stat-label">{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-label">{sub}</div></div>)}</div>
  <div className="dashboard-grid">
   <section className="panel"><div className="panel-header"><div><h3>My work queue</h3><span className="page-subtitle">Recent CRM activity</span></div><a href="/reports">View reports →</a></div>{activities.length===0?<div className="empty-state">No activity yet. Add a task, call, note, or email from a record.</div>:activities.slice(0,7).map(a=><div className="activity-row" key={a.id}><span className="activity-dot">{a.type==="task"?"✓":a.type==="call"?"☎":a.type==="email"?"✉":"•"}</span><div><strong>{a.body}</strong><div className="page-subtitle">{a.type} · {new Date(a.created_at).toLocaleString()}</div></div>{a.type==="task"&&!a.completed&&<button className="btn btn-secondary small" onClick={async()=>{await api.completeActivity(a.id);setActivities(x=>x.map(v=>v.id===a.id?{...v,completed:true}:v))}}>Complete</button>}</div>)}</section>
   <section className="panel"><div className="panel-header"><div><h3>Sales snapshot</h3><span className="page-subtitle">Key relationship counts</span></div></div><div className="mini-stat"><span>Contacts</span><strong>{data.contactCount}</strong></div><div className="mini-stat"><span>Accounts</span><strong>{data.companyCount}</strong></div><div className="mini-stat"><span>Open tasks</span><strong>{data.openTaskCount}</strong></div><div className="mini-stat"><span>Won pipeline</span><strong>{money(data.wonValueCents)}</strong></div></section>
  </div>
 </div>
}
