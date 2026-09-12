import { useEffect, useState } from "react";
import { api } from "../api";

const STATUS_OPTIONS = ["open", "pending", "closed"];

export default function Cases() {
  const [cases, setCases] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium", contactId: "" });
  const [error, setError] = useState("");

  function load() {
    api.listCases().then(setCases).catch(console.error);
  }

  useEffect(() => {
    load();
    api.listContacts().then(setContacts).catch(console.error);
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCase(form);
      setShowModal(false);
      setForm({ subject: "", description: "", priority: "medium", contactId: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(id, status) {
    await api.updateCaseStatus(id, status);
    load();
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Cases</h1>
          <div className="page-subtitle">Customer queries and support requests</div>
        </div>
      </div>

      <div className="table-toolbar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add case</button>
      </div>

      {!cases && <div className="loading-text">Loading…</div>}
      {cases && cases.length === 0 && <div className="empty-state">No cases yet.</div>}
      {cases && cases.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Subject</th><th>Contact</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>{c.subject}</td>
                <td>{c.first_name ? `${c.first_name} ${c.last_name || ""}` : "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{c.priority}</td>
                <td>
                  <select value={c.status} onChange={(e) => handleStatusChange(c.id, e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add case</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleAdd}>
              <div className="field">
                <label>Subject</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="field">
                <label>Contact</label>
                <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                  <option value="">No contact</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">Save case</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
