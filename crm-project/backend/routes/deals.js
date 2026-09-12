const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"];

router.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT d.*, c.first_name, c.last_name, co.name AS company_name
     FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id
     LEFT JOIN companies co ON co.id = d.company_id
     WHERE d.organization_id = $1
     ORDER BY d.created_at DESC`,
    [req.user.organizationId]
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { title, valueCents, stage, contactId, companyId } = req.body;
  if (!title) return res.status(400).json({ error: "Deal title is required" });
  const useStage = STAGES.includes(stage) ? stage : "new";

  const result = await pool.query(
    `INSERT INTO deals (organization_id, contact_id, company_id, title, value_cents, stage, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.organizationId, contactId || null, companyId || null, title, valueCents || 0, useStage, req.user.id]
  );
  res.status(201).json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { title, valueCents, stage, contactId, companyId } = req.body;
  if (stage && !STAGES.includes(stage)) {
    return res.status(400).json({ error: `Stage must be one of: ${STAGES.join(", ")}` });
  }

  const result = await pool.query(
    `UPDATE deals SET title = $1, value_cents = $2, stage = $3, contact_id = $4, company_id = $5, updated_at = now()
     WHERE id = $6 AND organization_id = $7 RETURNING *`,
    [title, valueCents || 0, stage || "new", contactId || null, companyId || null, req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

// Lightweight endpoint just for dragging a deal card to a new stage.
router.patch("/:id/stage", async (req, res) => {
  const { stage } = req.body;
  if (!STAGES.includes(stage)) {
    return res.status(400).json({ error: `Stage must be one of: ${STAGES.join(", ")}` });
  }
  const result = await pool.query(
    `UPDATE deals SET stage = $1, updated_at = now() WHERE id = $2 AND organization_id = $3 RETURNING *`,
    [stage, req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM deals WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  res.status(204).end();
});

module.exports = router;
