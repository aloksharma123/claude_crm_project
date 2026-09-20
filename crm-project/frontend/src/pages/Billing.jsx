import { useEffect, useState } from "react";
import { api, getSessionUser } from "../api";

function formatMoney(paise) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const currentUser = getSessionUser();

  function load() {
    api.getBillingStatus().then(setStatus).catch(console.error);
  }

  useEffect(load, []);

  async function handleBuy() {
    setError("");
    setProcessing(true);
    try {
      const order = await api.createBillingOrder(seats);

      if (!window.Razorpay) {
        setError("Payment widget failed to load. Check your connection and try again.");
        setProcessing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Fieldstone CRM",
        description: `${order.seats} seat${order.seats > 1 ? "s" : ""} — annual plan`,
        order_id: order.orderId,
        prefill: { email: currentUser?.email, name: currentUser?.fullName },
        theme: { color: "#33503f" },
        handler: async (response) => {
          try {
            await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            load();
          } catch (err) {
            setError("Payment succeeded but verification failed — contact support with your payment ID: " + response.razorpay_payment_id);
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => setProcessing(false),
        },
      });
      rzp.on("payment.failed", () => {
        setError("Payment failed. No charge was made.");
        setProcessing(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  }

  if (!status) return <div className="loading-text">Loading…</div>;

  if (currentUser?.role !== "admin") {
    return (
      <>
        <div className="page-header"><h1>Billing</h1></div>
        <div className="empty-state">Only a workspace admin can manage billing.</div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Billing</h1>
          <div className="page-subtitle">Annual, per-seat pricing</div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{status.planSeats}</div>
          <div className="stat-label">Seats on your plan</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{status.seatsUsed}</div>
          <div className="stat-label">Seats in use</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{status.planExpiresAt ? new Date(status.planExpiresAt).toLocaleDateString() : "—"}</div>
          <div className="stat-label">{status.planExpiresAt ? "Renews / expires" : "No paid plan yet"}</div>
        </div>
      </div>

      {!status.configured && (
        <div className="error-banner" style={{ background: "#faf3df", borderColor: "var(--gold)", color: "var(--ink)" }}>
          Payments aren't configured on this server yet — Razorpay keys need to be set.
        </div>
      )}

      <div className="panel">
        <h3>Buy seats</h3>
        <div className="page-subtitle" style={{ marginBottom: 14 }}>
          {formatMoney(status.pricePerSeatPaise)} per seat, per year.
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="field" style={{ maxWidth: 160 }}>
          <label>Number of seats</label>
          <input type="number" min="1" value={seats} onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))} />
        </div>
        <div style={{ marginBottom: 14, fontWeight: 600 }}>
          Total: {formatMoney(seats * status.pricePerSeatPaise)}
        </div>
        <button className="btn btn-primary" onClick={handleBuy} disabled={processing || !status.configured}>
          {processing ? "Processing…" : "Pay with Razorpay"}
        </button>
      </div>
    </>
  );
}
