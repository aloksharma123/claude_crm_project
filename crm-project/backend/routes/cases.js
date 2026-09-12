const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const STATUSES = ["open", "pending", "closed"];
const PRIORITIES = ["low", "medium", "high"];

router.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, ct.first_name, ct.last_name
     FROM cases c
     LEFT JOIN contacts ct ON ct.id = c.contact_id
     WHERE c.organization_id = $1
     ORDER BY c.created_at DESC`,
    [req.user.organizationId]
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { subject, description, priority, contactId } = req.body;
  if (!subject) return res.status(400).json({ error: "Subject is required" });
  if (priority && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Priority must be one of: ${PRIORITIES.join(", ")}` });
  }

  const result = await pool.query(
    `INSERT INTO cases (organization_id, contact_id, subject, description, priority, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.organizationId, contactId || null, subject, description || null, priority || "medium", req.user.id]
  );
  res.status(201).json(result.rows[0]);
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}` });
  }
  const result = await pool.query(
    `UPDATE cases SET status = $1, updated_at = now() WHERE id = $2 AND organization_id = $3 RETURNING *`,
    [status, req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM cases WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  res.status(204).end();
});

module.exports = router;
