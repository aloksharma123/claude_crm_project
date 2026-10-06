import { NavLink, useNavigate } from "react-router-dom";
import { clearSession, getSessionUser } from "../api";

export default function Sidebar() {
  const navigate=useNavigate(), user=getSessionUser();
  const groups=[
    {title:"WORKSPACE",items:[["/","▦","Dashboard"],["/leads","◉","Leads"],["/deals","↗","Opportunities"],["/contacts","●","Contacts"],["/companies","▤","Accounts"]]},
    {title:"SALES & SERVICE",items:[["/products","□","Products"],["/cases","◇","Cases"],["/forecast","◒","Forecast"],["/reports","▥","Reports"]]},
    {title:"ADMINISTRATION",items:[["/team","♙","Team"]]}
  ];
  function logout(){clearSession();navigate("/login")}
  return <aside className="sidebar">
    <div className="sidebar-brand"><span className="brand-mark">F</span><span>FIELDSTONE</span></div>
    <div className="sidebar-search"><span>⌕</span><input placeholder="Search CRM…" onKeyDown={e=>{if(e.key==="Enter")navigate("/search?q="+encodeURIComponent(e.currentTarget.value))}} /></div>
    {groups.map(g=><div className="nav-group" key={g.title}><div className="nav-group-title">{g.title}</div><nav>{g.items.map(([to,icon,label])=><NavLink key={to} to={to} end={to==="/"}><span className="nav-icon">{icon}</span>{label}</NavLink>)}</nav></div>)}
    {user?.role==="admin"&&<div className="nav-group"><div className="nav-group-title">ACCOUNT</div><nav><NavLink to="/billing"><span className="nav-icon">$</span>Billing</NavLink></nav></div>}
    <div className="sidebar-footer"><div className="user-chip"><div className="avatar">{(user?.fullName||"U").slice(0,1).toUpperCase()}</div><div><strong>{user?.fullName||"User"}</strong><small>{user?.role||"member"}</small></div></div><button onClick={logout}>Log out</button></div>
  </aside>;
}
