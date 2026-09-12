const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM companies WHERE organization_id = $1 ORDER BY created_at DESC",
    [req.user.organizationId]
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { name, website, industry } = req.body;
  if (!name) return res.status(400).json({ error: "Company name is required" });

  const result = await pool.query(
    `INSERT INTO companies (organization_id, name, website, industry)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.organizationId, name, website || null, industry || null]
  );
  res.status(201).json(result.rows[0]);
});

router.get("/:id", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM companies WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { name, website, industry } = req.body;
  const result = await pool.query(
    `UPDATE companies SET name = $1, website = $2, industry = $3
     WHERE id = $4 AND organization_id = $5 RETURNING *`,
    [name, website || null, industry || null, req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM companies WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  res.status(204).end();
});

module.exports = router;
