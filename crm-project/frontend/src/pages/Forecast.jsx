import { useEffect, useState } from "react";
import { api } from "../api";

function formatMoney(cents) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const STAGE_LABELS = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost" };

export default function Forecast() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getForecast().then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="loading-text">Loading…</div>;

  const months = [...new Set(data.byMonth.map((r) => r.month))].sort();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Forecast</h1>
          <div className="page-subtitle">Pipeline weighted by how likely each stage is to close</div>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="stat-card">
          <div className="stat-value">{formatMoney(data.weightedTotalCents)}</div>
          <div className="stat-label">Weighted forecast total</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h3>By stage</h3>
        <table className="data-table">
          <thead>
            <tr><th>Stage</th><th>Deals</th><th>Total value</th><th>Weight</th><th>Weighted value</th></tr>
          </thead>
          <tbody>
            {data.stageBreakdown.map((row) => (
              <tr key={row.stage}>
                <td>{STAGE_LABELS[row.stage] || row.stage}</td>
                <td>{row.count}</td>
                <td>{formatMoney(row.totalValueCents)}</td>
                <td>{Math.round(row.weight * 100)}%</td>
                <td>{formatMoney(row.weightedValueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>By expected close month</h3>
        {months.length === 0 && <div className="page-subtitle">No deals with values yet.</div>}
        {months.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Month</th><th>Stage</th><th>Value</th></tr></thead>
            <tbody>
              {data.byMonth.map((row, i) => (
                <tr key={i}>
                  <td>{row.month}</td>
                  <td>{STAGE_LABELS[row.stage] || row.stage}</td>
                  <td>{formatMoney(row.totalValueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="page-subtitle" style={{ marginTop: 10 }}>
          Deals without an expected close date are grouped under the month they were created. Add a close date on a deal to forecast it more precisely.
        </div>
      </div>
    </>
  );
}
