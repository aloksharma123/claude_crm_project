import { useEffect, useState } from "react";
import { api } from "../api";

const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

function formatMoney(cents) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function Deals() {
  const [deals, setDeals] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", valueCents: "", contactId: "" });
  const [error, setError] = useState("");
  const [dragOverStage, setDragOverStage] = useState(null);

  function load() {
    api.listDeals().then(setDeals).catch(console.error);
  }

  useEffect(() => {
    load();
    api.listContacts().then(setContacts).catch(console.error);
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createDeal({ ...form, valueCents: Math.round(Number(form.valueCents || 0) * 100) });
      setShowModal(false);
      setForm({ title: "", valueCents: "", contactId: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function moveDeal(dealId, stage) {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage } : d)));
    try {
      await api.updateDealStage(dealId, stage);
    } catch (err) {
      load(); // revert on failure
    }
  }

  if (!deals) return <div className="loading-text">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Pipeline</h1>
          <div className="page-subtitle">Drag a deal card to move it between stages</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add deal</button>
      </div>

      <div className="pipeline-board">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key);
          const total = stageDeals.reduce((sum, d) => sum + Number(d.value_cents), 0);
          return (
            <div
              key={stage.key}
              className={`pipeline-column${dragOverStage === stage.key ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                const dealId = e.dataTransfer.getData("text/plain");
                setDragOverStage(null);
                if (dealId) moveDeal(dealId, stage.key);
              }}
            >
              <div className="pipeline-column-header">
                <span>{stage.label} ({stageDeals.length})</span>
                <span className="pipeline-column-total">{formatMoney(total)}</span>
              </div>
              {stageDeals.map((d) => (
                <div
                  key={d.id}
                  className="deal-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}
                >
                  <div className="deal-card-title">{d.title}</div>
                  <div className="deal-card-value">{formatMoney(d.value_cents)}</div>
                  {(d.first_name || d.company_name) && (
                    <div className="deal-card-sub">{[d.first_name, d.company_name].filter(Boolean).join(" · ")}</div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add deal</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleAdd}>
              <div className="field">
                <label>Deal title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="field">
                <label>Value (USD)</label>
                <input type="number" min="0" value={form.valueCents} onChange={(e) => setForm({ ...form, valueCents: e.target.value })} />
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
                <button className="btn btn-primary">Save deal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
