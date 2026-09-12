import { useEffect, useState } from "react";
import { api } from "../api";

export default function Companies() {
  const [companies, setCompanies] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", website: "", industry: "" });
  const [error, setError] = useState("");

  function load() {
    api.listCompanies().then(setCompanies).catch(console.error);
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCompany(form);
      setShowModal(false);
      setForm({ name: "", website: "", industry: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Companies</h1>
          <div className="page-subtitle">Organizations you work with</div>
        </div>
      </div>

      <div className="table-toolbar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add company</button>
      </div>

      {!companies && <div className="loading-text">Loading…</div>}
      {companies && companies.length === 0 && <div className="empty-state">No companies yet.</div>}
      {companies && companies.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Name</th><th>Website</th><th>Industry</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.website || "—"}</td>
                <td>{c.industry || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add company</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleAdd}>
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>Website</label>
                <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="field">
                <label>Industry</label>
                <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">Save company</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
