const crypto = require("crypto");
const express = require("express");
const Razorpay = require("razorpay");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ₹4,999 per seat per year, in paise (Razorpay's base unit). Override via
// env var if pricing changes.
const PRICE_PER_SEAT_PAISE = Number(process.env.PRICE_PER_SEAT_PAISE || 499900);

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

router.get("/status", async (req, res) => {
  const result = await pool.query(
    "SELECT plan_seats, plan_expires_at FROM organizations WHERE id = $1",
    [req.user.organizationId]
  );
  const used = await pool.query(
    "SELECT COUNT(*) FROM users WHERE organization_id = $1",
    [req.user.organizationId]
  );
  res.json({
    planSeats: result.rows[0].plan_seats,
    planExpiresAt: result.rows[0].plan_expires_at,
    seatsUsed: Number(used.rows[0].count),
    pricePerSeatPaise: PRICE_PER_SEAT_PAISE,
    configured: !!getRazorpay(),
  });
});

// Admin creates a Razorpay order for N additional seats, paid annually.
router.post("/create-order", async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Only an admin can purchase seats" });
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(500).json({ error: "Billing isn't configured on this server yet" });
  }

  const seats = Number(req.body.seats);
  if (!Number.isInteger(seats) || seats < 1) {
    return res.status(400).json({ error: "Seats must be a positive whole number" });
  }

  const amountPaise = seats * PRICE_PER_SEAT_PAISE;

  try {
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `org_${req.user.organizationId}_${Date.now()}`,
      notes: { organizationId: req.user.organizationId, seats: String(seats) },
    });

    await pool.query(
      `INSERT INTO billing_orders (organization_id, razorpay_order_id, seats, amount_paise, status)
       VALUES ($1, $2, $3, $4, 'created')`,
      [req.user.organizationId, order.id, seats, amountPaise]
    );

    res.status(201).json({
      orderId: order.id,
      amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      seats,
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    res.status(500).json({ error: "Could not create payment order" });
  }
});

// Frontend calls this after Razorpay's checkout succeeds, with the payment
// details it returns — we verify the signature server-side before trusting it.
router.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment details" });
  }
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: "Billing isn't configured on this server yet" });
  }

  const client = await pool.connect();
  try {
    const orderResult = await client.query(
      "SELECT * FROM billing_orders WHERE razorpay_order_id = $1 AND organization_id = $2",
      [razorpay_order_id, req.user.organizationId]
    );
    const order = orderResult.rows[0];
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === "paid") return res.json({ verified: true }); // already processed

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await client.query("UPDATE billing_orders SET status = 'failed' WHERE id = $1", [order.id]);
      return res.status(400).json({ error: "Payment verification failed" });
    }

    await client.query("BEGIN");

    await client.query(
      "UPDATE billing_orders SET status = 'paid', razorpay_payment_id = $1 WHERE id = $2",
      [razorpay_payment_id, order.id]
    );

    // Add the purchased seats, and extend plan_expires_at by a year from
    // whichever is later: now, or the current expiry (so stacking purchases
    // before renewal doesn't lose time already paid for).
    await client.query(
      `UPDATE organizations
       SET plan_seats = plan_seats + $1,
           plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + INTERVAL '1 year'
       WHERE id = $2`,
      [order.seats, req.user.organizationId]
    );

    await client.query("COMMIT");
    res.json({ verified: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Could not verify payment" });
  } finally {
    client.release();
  }
});

module.exports = router;
