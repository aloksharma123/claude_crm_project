import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Contacts() {
  const [contacts, setContacts] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "", companyId: "" });
  const [error, setError] = useState("");

  function load() {
    api.listContacts().then(setContacts).catch(console.error);
  }

  useEffect(() => {
    load();
    api.listCompanies().then(setCompanies).catch(console.error);
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createContact(form);
      setShowModal(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", title: "", companyId: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Contacts</h1>
          <div className="page-subtitle">Everyone you're in touch with</div>
        </div>
      </div>

      <div className="table-toolbar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add contact</button>
      </div>

      {!contacts && <div className="loading-text">Loading…</div>}
      {contacts && contacts.length === 0 && <div className="empty-state">No contacts yet. Add your first one to get started.</div>}
      {contacts && contacts.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Title</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/contacts/${c.id}`}>{c.first_name} {c.last_name}</Link></td>
                <td>{c.company_name || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.title || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add contact</h3>
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
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="field">
                <label>Company</label>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                  <option value="">No company</option>
                  {companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">Save contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
