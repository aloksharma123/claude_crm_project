import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";

function formatMoney(cents) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState("note");

  function load() {
    api.getContact(id).then(setContact).catch(console.error);
  }

  useEffect(load, [id]);

  async function handleAddActivity(e) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    await api.createActivity({ contactId: id, type: noteType, body: noteBody });
    setNoteBody("");
    load();
  }

  if (!contact) return <div className="loading-text">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <Link to="/contacts" className="page-subtitle">&larr; Contacts</Link>
          <h1>{contact.first_name} {contact.last_name}</h1>
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel">
          <h3>Details</h3>
          <div className="page-subtitle" style={{ marginBottom: 6 }}>Company</div>
          <div style={{ marginBottom: 14 }}>{contact.company_name || "—"}</div>
          <div className="page-subtitle" style={{ marginBottom: 6 }}>Email</div>
          <div style={{ marginBottom: 14 }}>{contact.email || "—"}</div>
          <div className="page-subtitle" style={{ marginBottom: 6 }}>Phone</div>
          <div style={{ marginBottom: 14 }}>{contact.phone || "—"}</div>
          <div className="page-subtitle" style={{ marginBottom: 6 }}>Title</div>
          <div>{contact.title || "—"}</div>

          {contact.deals?.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Deals</h3>
              {contact.deals.map((d) => (
                <div key={d.id} className="task-row">
                  <span>{d.title}</span>
                  <span className="page-subtitle">{formatMoney(d.value_cents)}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="panel">
          <h3>Activity</h3>
          <form onSubmit={handleAddActivity} style={{ marginBottom: 18 }}>
            <div className="field">
              <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div className="field">
              <textarea rows={3} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Log a note, call, or task…" />
            </div>
            <button className="btn btn-primary">Add</button>
          </form>

          {contact.activities?.length === 0 && <div className="page-subtitle">No activity logged yet.</div>}
          {contact.activities?.map((a) => (
            <div key={a.id} className="activity-item">
              <span className="activity-type-tag">{a.type}</span>
              {a.body}
              <div className="page-subtitle" style={{ marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
