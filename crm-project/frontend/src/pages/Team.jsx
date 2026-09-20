import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getSessionUser } from "../api";

export default function Team() {
  const [data, setData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "" });
  const [error, setError] = useState("");
  const currentUser = getSessionUser();

  function load() {
    api.listTeam().then(setData).catch(console.error);
  }

  useEffect(load, []);

  async function handleInvite(e) {
    e.preventDefault();
    setError("");
    try {
      await api.inviteTeammate(form);
      setShowModal(false);
      setForm({ email: "", fullName: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(id) {
    if (!confirm("Remove this teammate?")) return;
    await api.removeTeammate(id);
    load();
  }

  if (!data) return <div className="loading-text">Loading…</div>;

  const atLimit = data.seatsUsed >= data.planSeats;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <div className="page-subtitle">{data.seatsUsed} of {data.planSeats} seats used</div>
        </div>
      </div>

      {atLimit && (
        <div className="error-banner" style={{ background: "#faf3df", borderColor: "var(--gold)", color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>You're at your seat limit.</span>
          <Link to="/billing" className="btn btn-secondary">Buy more seats</Link>
        </div>
      )}

      {currentUser?.role === "admin" && (
        <div className="table-toolbar">
          <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={atLimit}>Invite teammate</button>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {data.members.map((m) => (
            <tr key={m.id}>
              <td>{m.fullName}</td>
              <td>{m.email}</td>
              <td style={{ textTransform: "capitalize" }}>{m.role}</td>
              <td>{m.pending ? "Invite pending" : "Active"}</td>
              <td>
                {currentUser?.role === "admin" && m.id !== currentUser.id && (
                  <button className="btn btn-secondary" onClick={() => handleRemove(m.id)}>Remove</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Invite teammate</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleInvite}>
              <div className="field">
                <label>Full name</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
