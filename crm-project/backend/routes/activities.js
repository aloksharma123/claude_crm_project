const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const { contactId, dealId, type, body, dueAt } = req.body;
  if (!body) return res.status(400).json({ error: "Activity body is required" });

  const result = await pool.query(
    `INSERT INTO activities (organization_id, contact_id, deal_id, user_id, type, body, due_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.organizationId, contactId || null, dealId || null, req.user.id, type || "note", body, dueAt || null]
  );
  res.status(201).json(result.rows[0]);
});

router.put("/:id/complete", async (req, res) => {
  const result = await pool.query(
    `UPDATE activities SET completed = true WHERE id = $1 AND organization_id = $2 RETURNING *`,
    [req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM activities WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  res.status(204).end();
});

module.exports = router;
