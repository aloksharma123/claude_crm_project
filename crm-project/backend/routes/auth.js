const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../db/pool");
const { sendEmail } = require("../lib/email");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VERIFICATION_TTL_HOURS = 24;

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

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    emailVerified: user.email_verified,
  };
}

async function createVerificationToken(client, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
  await client.query(
    "INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt]
  );
  return token;
}

async function sendVerificationEmail(email, fullName, token) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const link = `${appUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your email for Fieldstone",
    html: `<p>Hi ${fullName},</p><p>Confirm your email to finish setting up your Fieldstone workspace:</p><p><a href="${link}">${link}</a></p><p>This link expires in ${VERIFICATION_TTL_HOURS} hours.</p>`,
  });
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

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("Database connection failed:", err);
    return res.status(503).json({ error: "Could not reach the database. Please try again." });
  }

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
       RETURNING *`,
      [organizationId, email, passwordHash, fullName]
    );
    const user = userResult.rows[0];

    const token = await createVerificationToken(client, user.id);

    await client.query("COMMIT");

    // Email sending happens after commit so a slow/failed email never rolls back account creation.
    try {
      await sendVerificationEmail(user.email, user.full_name, token);
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }

    const authToken = issueToken(user);
    res.status(201).json({ token: authToken, user: publicUser(user) });
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
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = issueToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Google sign-in / sign-up. Frontend sends the ID token credential from
// Google Identity Services; we verify it server-side before trusting it.
router.post("/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Missing Google credential" });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: "Google sign-in is not configured on this server" });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("Database connection failed:", err);
    return res.status(503).json({ error: "Could not reach the database. Please try again." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified: googleVerified } = payload;

    await client.query("BEGIN");

    let result = await client.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
    let user = result.rows[0];

    if (!user) {
      // No account linked to this Google ID yet — check if the email already has a
      // password-based account, and link Google to it if so.
      result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
      user = result.rows[0];

      if (user) {
        const updated = await client.query(
          "UPDATE users SET google_id = $1, email_verified = true WHERE id = $2 RETURNING *",
          [googleId, user.id]
        );
        user = updated.rows[0];
      } else {
        // Brand new person — create their organization + admin user.
        const orgResult = await client.query(
          "INSERT INTO organizations (name) VALUES ($1) RETURNING id",
          [`${name || email}'s workspace`]
        );
        const created = await client.query(
          `INSERT INTO users (organization_id, email, full_name, role, google_id, email_verified)
           VALUES ($1, $2, $3, 'admin', $4, $5)
           RETURNING *`,
          [orgResult.rows[0].id, email, name || email, googleId, !!googleVerified]
        );
        user = created.rows[0];
      }
    }

    await client.query("COMMIT");

    const token = issueToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(401).json({ error: "Google sign-in failed" });
  } finally {
    client.release();
  }
});

router.post("/verify-email", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Missing token" });

  try {
    const result = await pool.query(
      "SELECT * FROM email_verifications WHERE token = $1",
      [token]
    );
    const record = result.rows[0];
    if (!record) return res.status(400).json({ error: "Invalid or already-used verification link" });
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: "This verification link has expired" });
    }

    await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [record.user_id]);
    await pool.query("DELETE FROM email_verifications WHERE user_id = $1", [record.user_id]);

    res.json({ verified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not verify email" });
  }
});

router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error("Database connection failed:", err);
    return res.status(503).json({ error: "Could not reach the database. Please try again." });
  }

  try {
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to check which emails are registered.
    if (!user || user.email_verified) {
      return res.json({ sent: true });
    }

    await client.query("DELETE FROM email_verifications WHERE user_id = $1", [user.id]);
    const token = await createVerificationToken(client, user.id);
    await sendVerificationEmail(user.email, user.full_name, token);

    res.json({ sent: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not resend verification email" });
  } finally {
    client.release();
  }
});

module.exports = router;
