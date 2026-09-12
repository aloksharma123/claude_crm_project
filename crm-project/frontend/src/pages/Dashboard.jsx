import { useEffect, useState } from "react";
import { api, getSessionUser } from "../api";

function formatMoney(cents) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [resendStatus, setResendStatus] = useState("idle"); // idle | sending | sent
  const user = getSessionUser();

  useEffect(() => {
    api.dashboard().then(setData).catch(console.error);
  }, []);

  async function handleResend() {
    setResendStatus("sending");
    try {
      await api.resendVerification(user.email);
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
    }
  }

  if (!data) return <div className="loading-text">Loading…</div>;

  return (
    <>
      {user && !user.emailVerified && (
        <div className="error-banner" style={{ background: "#faf3df", borderColor: "var(--gold)", color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Please verify your email to secure your account.</span>
          {resendStatus === "sent" ? (
            <span style={{ fontWeight: 600 }}>Sent — check your inbox</span>
          ) : (
            <button className="btn btn-secondary" onClick={handleResend} disabled={resendStatus === "sending"}>
              {resendStatus === "sending" ? "Sending…" : "Resend email"}
            </button>
          )}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="page-subtitle">A snapshot of where things stand</div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{data.openDealCount}</div>
          <div className="stat-label">Open deals</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatMoney(data.openPipelineValueCents)}</div>
          <div className="stat-label">Open pipeline value</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatMoney(data.wonValueCents)}</div>
          <div className="stat-label">Won ({data.wonDealCount})</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.contactCount}</div>
          <div className="stat-label">Contacts across {data.companyCount} companies</div>
        </div>
      </div>

      <div className="panel">
        <h3>Upcoming tasks</h3>
        {data.upcomingTasks.length === 0 && <div className="page-subtitle">No open tasks. Nice and clear.</div>}
        {data.upcomingTasks.map((t) => (
          <div className="task-row" key={t.id}>
            <span>
              {t.body} {t.first_name && <span className="page-subtitle">— {t.first_name} {t.last_name}</span>}
            </span>
            <span className="page-subtitle">{t.due_at ? new Date(t.due_at).toLocaleDateString() : "No due date"}</span>
          </div>
        ))}
      </div>
    </>
  );
}
