const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const orgId = req.user.organizationId;

  const [contacts, companies, openDeals, wonDeals, upcomingTasks] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM contacts WHERE organization_id = $1", [orgId]),
    pool.query("SELECT COUNT(*) FROM companies WHERE organization_id = $1", [orgId]),
    pool.query(
      "SELECT COUNT(*), COALESCE(SUM(value_cents), 0) AS total_value FROM deals WHERE organization_id = $1 AND stage NOT IN ('won', 'lost')",
      [orgId]
    ),
    pool.query(
      "SELECT COUNT(*), COALESCE(SUM(value_cents), 0) AS total_value FROM deals WHERE organization_id = $1 AND stage = 'won'",
      [orgId]
    ),
    pool.query(
      `SELECT a.*, c.first_name, c.last_name FROM activities a
       LEFT JOIN contacts c ON c.id = a.contact_id
       WHERE a.organization_id = $1 AND a.type = 'task' AND a.completed = false
       ORDER BY a.due_at ASC NULLS LAST LIMIT 5`,
      [orgId]
    ),
  ]);

  res.json({
    contactCount: Number(contacts.rows[0].count),
    companyCount: Number(companies.rows[0].count),
    openDealCount: Number(openDeals.rows[0].count),
    openPipelineValueCents: Number(openDeals.rows[0].total_value),
    wonDealCount: Number(wonDeals.rows[0].count),
    wonValueCents: Number(wonDeals.rows[0].total_value),
    upcomingTasks: upcomingTasks.rows,
  });
});

module.exports = router;
