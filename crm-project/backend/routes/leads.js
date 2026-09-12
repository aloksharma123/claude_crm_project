const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"];

router.get("/", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM leads WHERE organization_id = $1 ORDER BY created_at DESC",
    [req.user.organizationId]
  );
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { firstName, lastName, companyName, email, phone, source } = req.body;
  if (!firstName) return res.status(400).json({ error: "First name is required" });

  const result = await pool.query(
    `INSERT INTO leads (organization_id, first_name, last_name, company_name, email, phone, source, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.user.organizationId, firstName, lastName || null, companyName || null, email || null, phone || null, source || null, req.user.id]
  );
  res.status(201).json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { firstName, lastName, companyName, email, phone, source, status } = req.body;
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}` });
  }
  const result = await pool.query(
    `UPDATE leads SET first_name = $1, last_name = $2, company_name = $3, email = $4, phone = $5, source = $6, status = COALESCE($7, status)
     WHERE id = $8 AND organization_id = $9 RETURNING *`,
    [firstName, lastName || null, companyName || null, email || null, phone || null, source || null, status || null, req.params.id, req.user.organizationId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(result.rows[0]);
});

// Converts a lead into a Company (Account), Contact, and an Opportunity (Deal),
// all in one step — mirrors Salesforce's lead conversion flow.
router.post("/:id/convert", async (req, res) => {
  const { dealTitle, dealValueCents } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const leadResult = await client.query(
      "SELECT * FROM leads WHERE id = $1 AND organization_id = $2 FOR UPDATE",
      [req.params.id, req.user.organizationId]
    );
    const lead = leadResult.rows[0];
    if (!lead) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }
    if (lead.status === "converted") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This lead has already been converted" });
    }

    let companyId = null;
    if (lead.company_name) {
      const companyResult = await client.query(
        `INSERT INTO companies (organization_id, name) VALUES ($1, $2) RETURNING id`,
        [req.user.organizationId, lead.company_name]
      );
      companyId = companyResult.rows[0].id;
    }

    const contactResult = await client.query(
      `INSERT INTO contacts (organization_id, company_id, first_name, last_name, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.organizationId, companyId, lead.first_name, lead.last_name, lead.email, lead.phone]
    );
    const contactId = contactResult.rows[0].id;

    const dealResult = await client.query(
      `INSERT INTO deals (organization_id, contact_id, company_id, title, value_cents, stage, owner_id)
       VALUES ($1, $2, $3, $4, $5, 'new', $6) RETURNING id`,
      [
        req.user.organizationId,
        contactId,
        companyId,
        dealTitle || `${lead.first_name} ${lead.last_name || ""}`.trim(),
        dealValueCents || 0,
        req.user.id,
      ]
    );
    const dealId = dealResult.rows[0].id;

    await client.query(
      `UPDATE leads SET status = 'converted', converted_contact_id = $1, converted_deal_id = $2 WHERE id = $3`,
      [contactId, dealId, lead.id]
    );

    await client.query("COMMIT");
    res.json({ contactId, companyId, dealId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Could not convert lead" });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM leads WHERE id = $1 AND organization_id = $2",
    [req.params.id, req.user.organizationId]
  );
  res.status(204).end();
});

module.exports = router;
