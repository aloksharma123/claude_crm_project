import { useEffect, useState } from "react";
import { api } from "../api";

function formatMoney(cents) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function Products() {
  const [products, setProducts] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: "" });
  const [error, setError] = useState("");

  function load() {
    api.listProducts().then(setProducts).catch(console.error);
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createProduct({ name: form.name, sku: form.sku, priceCents: Math.round(Number(form.price || 0) * 100) });
      setShowModal(false);
      setForm({ name: "", sku: "", price: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <div className="page-subtitle">What you sell — used as line items on deals</div>
        </div>
      </div>

      <div className="table-toolbar">
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add product</button>
      </div>

      {!products && <div className="loading-text">Loading…</div>}
      {products && products.length === 0 && <div className="empty-state">No products yet.</div>}
      {products && products.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Name</th><th>SKU</th><th>Price</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku || "—"}</td>
                <td>{formatMoney(p.price_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add product</h3>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleAdd}>
              <div className="field">
                <label>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="field">
                <label>SKU</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="field">
                <label>Price (USD)</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary">Save product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
