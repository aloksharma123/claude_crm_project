const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, co.name AS company_name
     FROM contacts c
     LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.organization_id = $1
     ORDER BY c.created_at DESC`,
    [req.user.organizationId]
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { firstName, lastName, email, phone, title, companyId } = req.body;
  if (!firstName) return res.status(400).json({ error: "First name is required" });

  const result = await pool.query(
    `INSERT INTO contacts (organization_id, company_id, first_name, last_name, email, phone, title)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.organizationId, companyId || null, firstName, lastName || null, email || null, phone || null, title || null]
  );
  res.status(201).json(result.rows[0]);
});

router.get("/:id", async (req, res) => {
  const contact = await pool.query(
    `SELECT c.*, co.name AS company_name
     FROM contacts c LEFT JOIN companies co ON co.id = c.company_id
     WHERE c.id = $1 AND c.organization_id = $2`,
    [req.params.id, req.user.organizationId]
  );
  if (!contact.rows[0]) return res.status(404).json({ error: "Not found" });

  const activities = await pool.query(
    `SELECT * FROM activities WHERE contact_id = $1 AND organization_id = $2 ORDER BY created_at DESC`,
    [req.params.id, req.user.organizationId]
  );
  const deals = await pool.query(
    `SELECT * FROM deals WHERE contact_id = $1 AND organization_id = $2 ORDER BY created_at DESC`,
    [req.params.id, req.user.organizationId]
  );

  res.json({ ...contact.rows[0], activities: activities.rows, deals: deals.rows });
});

router.put("/:id", async (req, res) => {
  const { firstName, lastName, email, phone, title, companyId } = req.body;
  const result = await pool.query(
    `UPDATE contacts SET first_name = $1, last_name = $2, email = $3, phone = $4, title = $5, company_id = $6
     WHERE id = $7 AND organization_id = $8 RETURNING *`,
    [firstName, lastName || null, email || null, phone || null, title || null, companyId || null, req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM contacts WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  res.status(204).end();
});

module.exports = router;
