const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json({ contacts: [], companies: [], leads: [], deals: [] });
  const term = "%" + q.replace(/%/g, "\\%").replace(/_/g, "\\_") + "%";
  const org = req.user.organizationId;

  const [contacts, companies, leads, deals] = await Promise.all([
    pool.query("SELECT c.id, c.first_name, c.last_name, c.email, c.title, co.name AS company_name FROM contacts c LEFT JOIN companies co ON co.id=c.company_id WHERE c.organization_id=$1 AND (c.first_name ILIKE $2 OR c.last_name ILIKE $2 OR c.email ILIKE $2 OR c.title ILIKE $2 OR co.name ILIKE $2) ORDER BY c.created_at DESC LIMIT 8", [org, term]),
    pool.query("SELECT id, name, website, industry FROM companies WHERE organization_id=$1 AND (name ILIKE $2 OR website ILIKE $2 OR industry ILIKE $2) ORDER BY created_at DESC LIMIT 8", [org, term]),
    pool.query("SELECT id, first_name, last_name, company_name, email, status, source FROM leads WHERE organization_id=$1 AND (first_name ILIKE $2 OR last_name ILIKE $2 OR company_name ILIKE $2 OR email ILIKE $2) ORDER BY created_at DESC LIMIT 8", [org, term]),
    pool.query("SELECT d.id, d.title, d.value_cents, d.stage, co.name AS company_name FROM deals d LEFT JOIN companies co ON co.id=d.company_id WHERE d.organization_id=$1 AND (d.title ILIKE $2 OR co.name ILIKE $2) ORDER BY d.updated_at DESC LIMIT 8", [org, term])
  ]);
  res.json({ contacts: contacts.rows, companies: companies.rows, leads: leads.rows, deals: deals.rows });
});

module.exports = router;
