// Sends transactional email via Resend (https://resend.com).
// Requires RESEND_API_KEY. On Resend's free tier without a verified domain,
// email can only be sent to the address you signed up with — fine for
// development; verify a domain in Resend before sending to real users.

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email send. Would have sent:", { to, subject });
    return { skipped: true };
  }

  const from = process.env.EMAIL_FROM || "Fieldstone <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend send failed:", res.status, body);
    throw new Error("Could not send email");
  }

  return res.json();
}

module.exports = { sendEmail };
