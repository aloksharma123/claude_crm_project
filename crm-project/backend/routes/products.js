const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM products WHERE organization_id = $1 ORDER BY created_at DESC",
    [req.user.organizationId]
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { name, sku, priceCents } = req.body;
  if (!name) return res.status(400).json({ error: "Product name is required" });

  const result = await pool.query(
    `INSERT INTO products (organization_id, name, sku, price_cents) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.organizationId, name, sku || null, priceCents || 0]
  );
  res.status(201).json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { name, sku, priceCents, active } = req.body;
  const result = await pool.query(
    `UPDATE products SET name = $1, sku = $2, price_cents = $3, active = $4
     WHERE id = $5 AND organization_id = $6 RETURNING *`,
    [name, sku || null, priceCents || 0, active !== false, req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM products WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  res.status(204).end();
});

module.exports = router;
