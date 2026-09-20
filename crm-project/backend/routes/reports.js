const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Every source/groupBy/metric combo is explicitly whitelisted here and maps
// to a fixed, safe SQL fragment — never built from raw user input — so this
// endpoint can't be used for SQL injection regardless of what's passed in.
const SOURCES = {
  deals: {
    table: "deals",
    groupBy: {
      stage: "stage",
      owner: "COALESCE(owner_id::text, 'Unassigned')",
      month: "to_char(created_at, 'YYYY-MM')",
    },
    metrics: {
      count: "COUNT(*)",
      sum_value: "COALESCE(SUM(value_cents), 0) / 100.0",
    },
  },
  leads: {
    table: "leads",
    groupBy: {
      status: "status",
      source: "COALESCE(source, 'Unknown')",
      month: "to_char(created_at, 'YYYY-MM')",
    },
    metrics: {
      count: "COUNT(*)",
    },
  },
  cases: {
    table: "cases",
    groupBy: {
      status: "status",
      priority: "priority",
      month: "to_char(created_at, 'YYYY-MM')",
    },
    metrics: {
      count: "COUNT(*)",
    },
  },
};

router.get("/options", (req, res) => {
  // Tells the frontend what combinations are valid, so it only ever sends
  // requests this endpoint will accept.
  const options = {};
  for (const [source, cfg] of Object.entries(SOURCES)) {
    options[source] = {
      groupBy: Object.keys(cfg.groupBy),
      metrics: Object.keys(cfg.metrics),
    };
  }
  res.json(options);
});

router.get("/run", async (req, res) => {
  const { source, groupBy, metric } = req.query;

  const sourceCfg = SOURCES[source];
  if (!sourceCfg) return res.status(400).json({ error: "Unknown data source" });

  const groupByExpr = sourceCfg.groupBy[groupBy];
  if (!groupByExpr) return res.status(400).json({ error: "Unknown grouping for this source" });

  const metricExpr = sourceCfg.metrics[metric];
  if (!metricExpr) return res.status(400).json({ error: "Unknown metric for this source" });

  try {
    const sql = `
      SELECT ${groupByExpr} AS label, ${metricExpr} AS value
      FROM ${sourceCfg.table}
      WHERE organization_id = $1
      GROUP BY ${groupByExpr}
      ORDER BY label ASC
    `;
    const result = await pool.query(sql, [req.user.organizationId]);
    res.json(result.rows.map((r) => ({ label: r.label, value: Number(r.value) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not run report" });
  }
});

module.exports = router;
