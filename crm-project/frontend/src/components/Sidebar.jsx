import { NavLink, useNavigate } from "react-router-dom";
import { clearSession, getSessionUser } from "../api";

export default function Sidebar() {
  const navigate = useNavigate();
  const user = getSessionUser();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Fieldstone</div>
      <nav className="sidebar-nav">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/leads">Leads</NavLink>
        <NavLink to="/deals">Pipeline</NavLink>
        <NavLink to="/contacts">Contacts</NavLink>
        <NavLink to="/companies">Accounts</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/cases">Cases</NavLink>
        <NavLink to="/forecast">Forecast</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/team">Team</NavLink>
        {user?.role === "admin" && <NavLink to="/billing">Billing</NavLink>}
      </nav>
      <div className="sidebar-footer">
        {user?.fullName}
        <br />
        <button onClick={handleLogout}>Log out</button>
      </div>
    </aside>
  );
}
