const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Rough probability-to-close per stage, used to weight open pipeline value
// into a forecasted number — same idea as Salesforce's forecast categories.
const STAGE_WEIGHTS = {
  new: 0.1,
  contacted: 0.25,
  qualified: 0.5,
  proposal: 0.75,
  won: 1,
  lost: 0,
};

router.get("/", async (req, res) => {
  const orgId = req.user.organizationId;

  const byStage = await pool.query(
    `SELECT stage, COUNT(*) AS count, COALESCE(SUM(value_cents), 0) AS total_value_cents
     FROM deals WHERE organization_id = $1 GROUP BY stage`,
    [orgId]
  );

  const byMonth = await pool.query(
    `SELECT to_char(COALESCE(expected_close_date, created_at::date), 'YYYY-MM') AS month,
            stage,
            COALESCE(SUM(value_cents), 0) AS total_value_cents
     FROM deals
     WHERE organization_id = $1 AND stage NOT IN ('lost')
     GROUP BY month, stage
     ORDER BY month ASC`,
    [orgId]
  );

  let weightedTotalCents = 0;
  const stageBreakdown = byStage.rows.map((row) => {
    const weight = STAGE_WEIGHTS[row.stage] ?? 0;
    const weightedCents = Math.round(Number(row.total_value_cents) * weight);
    weightedTotalCents += weightedCents;
    return {
      stage: row.stage,
      count: Number(row.count),
      totalValueCents: Number(row.total_value_cents),
      weight,
      weightedValueCents: weightedCents,
    };
  });

  res.json({
    stageBreakdown,
    weightedTotalCents,
    byMonth: byMonth.rows.map((r) => ({
      month: r.month,
      stage: r.stage,
      totalValueCents: Number(r.total_value_cents),
    })),
  });
});

module.exports = router;
