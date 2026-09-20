import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api";

const SOURCE_LABELS = { deals: "Opportunities", leads: "Leads", cases: "Cases" };
const FIELD_LABELS = {
  stage: "Stage", owner: "Owner", month: "Month",
  status: "Status", source: "Lead source", priority: "Priority",
  count: "Count", sum_value: "Total value (₹)",
};

export default function Reports() {
  const [options, setOptions] = useState(null);
  const [source, setSource] = useState("deals");
  const [groupBy, setGroupBy] = useState("stage");
  const [metric, setMetric] = useState("count");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getReportOptions().then(setOptions).catch(console.error);
  }, []);

  useEffect(() => {
    if (!options) return;
    // If switching source made the current groupBy/metric invalid, reset to first available.
    const cfg = options[source];
    const validGroupBy = cfg.groupBy.includes(groupBy) ? groupBy : cfg.groupBy[0];
    const validMetric = cfg.metrics.includes(metric) ? metric : cfg.metrics[0];
    if (validGroupBy !== groupBy) setGroupBy(validGroupBy);
    if (validMetric !== metric) setMetric(validMetric);
  }, [source, options]);

  useEffect(() => {
    if (!options) return;
    setError("");
    api.runReport(source, groupBy, metric)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [source, groupBy, metric, options]);

  if (!options) return <div className="loading-text">Loading…</div>;

  const cfg = options[source];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <div className="page-subtitle">Build a quick chart from your data</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 180 }}>
            <label>Data source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {Object.keys(options).map((s) => <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label>Group by</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              {cfg.groupBy.map((g) => <option key={g} value={g}>{FIELD_LABELS[g] || g}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label>Measure</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)}>
              {cfg.metrics.map((m) => <option key={m} value={m}>{FIELD_LABELS[m] || m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="panel">
        {error && <div className="error-banner">{error}</div>}
        {!error && data && data.length === 0 && <div className="empty-state">No data yet for this combination.</div>}
        {!error && data && data.length > 0 && (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
                <Tooltip contentStyle={{ borderRadius: 3, border: "1px solid var(--line)", fontSize: 13 }} />
                <Bar dataKey="value" fill="var(--pine)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
