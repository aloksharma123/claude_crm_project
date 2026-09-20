const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { sendEmail } = require("../lib/email");

const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, organizationId: user.organization_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// List everyone in the org, plus seat usage.
router.get("/", requireAuth, async (req, res) => {
  const org = await pool.query(
    "SELECT plan_seats, plan_expires_at FROM organizations WHERE id = $1",
    [req.user.organizationId]
  );
  const members = await pool.query(
    `SELECT id, email, full_name, role, invite_accepted, created_at
     FROM users WHERE organization_id = $1 ORDER BY created_at ASC`,
    [req.user.organizationId]
  );

  res.json({
    planSeats: org.rows[0].plan_seats,
    planExpiresAt: org.rows[0].plan_expires_at,
    seatsUsed: members.rows.length,
    members: members.rows.map((m) => ({
      id: m.id,
      email: m.email,
      fullName: m.full_name,
      role: m.role,
      pending: !m.invite_accepted,
      createdAt: m.created_at,
    })),
  });
});

// Invite a teammate. Admin-only, and blocked once the org is at its seat limit.
router.post("/invite", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only an admin can invite teammates" });
  }

  const { email, fullName } = req.body;
  if (!email || !fullName) {
    return res.status(400).json({ error: "Email and name are required" });
  }

  try {
    const org = await pool.query(
      "SELECT plan_seats FROM organizations WHERE id = $1",
      [req.user.organizationId]
    );
    const used = await pool.query(
      "SELECT COUNT(*) FROM users WHERE organization_id = $1",
      [req.user.organizationId]
    );
    if (Number(used.rows[0].count) >= org.rows[0].plan_seats) {
      return res.status(402).json({ error: "You're at your seat limit. Purchase more seats to invite another teammate." });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Someone with that email already has an account" });
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    await pool.query(
      `INSERT INTO users (organization_id, email, full_name, role, invite_token, invite_accepted, email_verified)
       VALUES ($1, $2, $3, 'member', $4, false, false)`,
      [req.user.organizationId, email, fullName, inviteToken]
    );

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const link = `${appUrl}/accept-invite?token=${inviteToken}`;
    try {
      await sendEmail({
        to: email,
        subject: "You've been invited to a Fieldstone workspace",
        html: `<p>Hi ${fullName},</p><p>You've been invited to join a team on Fieldstone. Set your password to get started:</p><p><a href="${link}">${link}</a></p>`,
      });
    } catch (err) {
      console.error("Failed to send invite email:", err);
    }

    res.status(201).json({ invited: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not send invite" });
  }
});

// Public — the invited person hits this with their token to set a password
// and activate their account.
router.post("/accept-invite", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE invite_token = $1", [token]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: "Invalid or already-used invite link" });

    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await pool.query(
      `UPDATE users SET password_hash = $1, invite_accepted = true, invite_token = NULL
       WHERE id = $2 RETURNING *`,
      [passwordHash, user.id]
    );

    const authToken = issueToken(updated.rows[0]);
    res.json({
      token: authToken,
      user: {
        id: updated.rows[0].id,
        email: updated.rows[0].email,
        fullName: updated.rows[0].full_name,
        role: updated.rows[0].role,
        emailVerified: updated.rows[0].email_verified,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not accept invite" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only an admin can remove teammates" });
  }
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "You can't remove yourself" });
  }
  await pool.query("DELETE FROM users WHERE id = $1 AND organization_id = $2", [req.params.id, req.user.organizationId]);
  res.status(204).end();
});

module.exports = router;
