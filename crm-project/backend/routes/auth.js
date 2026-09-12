const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      organizationId: user.organization_id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Creates a brand new organization + its first admin user.
router.post("/signup", async (req, res) => {
  const { organizationName, fullName, email, password } = req.body;

  if (!organizationName || !fullName || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "An account with that email already exists" });
    }

    const orgResult = await client.query(
      "INSERT INTO organizations (name) VALUES ($1) RETURNING id",
      [organizationName]
    );
    const organizationId = orgResult.rows[0].id;

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (organization_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, organization_id, email, full_name, role`,
      [organizationId, email, passwordHash, fullName]
    );

    await client.query("COMMIT");

    const user = userResult.rows[0];
    const token = issueToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Could not create account" });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = issueToken(user);
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;
