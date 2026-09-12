import { useEffect, useState } from "react";
import { api } from "../api";

const STATUS_LABELS = { new: "New", contacted: "Contacted", qualified: "Qualified", unqualified: "Unqualified", converted: "Converted" };

export default function Leads() {
  const [leads, setLeads] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", companyName: "", email: "", phone: "", source: "" });
  const [error, setError] = useState("");
  const [convertingId, setConvertingId] = useState(null);

  function load() {
    api.listLeads().then(setLeads).catch(console.error);
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createLead(form);
      setShowModal(false);
      setForm({ firstName: "", lastName: "", companyName: "", email: "", phone: "", source: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConvert(lead) {
    setConvertingId(lead.id);
    try {
      await api.convertLead(lead.id, { dealTitle: `${lead.first_name} ${lead.last_name || ""}`.trim() });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <div className="page-subtitle">People who haven't been qualified into contacts yet</div>
        </div>
      </div>

      <div className="table-toolbar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add lead</button>
      </div>

      {!leads && <div className="loading-text">Loading…</div>}
      {leads && leads.length === 0 && <div className="empty-state">No leads yet. Add one to get started.</div>}
      {leads && leads.length > 0 && (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Company</th><th>Source</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>{l.first_name} {l.last_name}</td>
                <td>{l.company_name || "—"}</td>
                <td>{l.source || "—"}</td>
                <td>{STATUS_LABELS[l.status] || l.status}</td>
                <td>
                  {l.status !== "converted" && (
                    <button className="btn btn-secondary" onClick={() => handleConvert(l)} disabled={convertingId === l.id}>
                      {convertingId === l.id ? "Converting…" : "Convert"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add lead</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleAdd}>
              <div className="field">
                <label>First name</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="field">
                <label>Last name</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="field">
                <label>Company</label>
                <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="">Unknown</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="cold_call">Cold call</option>
                  <option value="event">Event</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">Save lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
