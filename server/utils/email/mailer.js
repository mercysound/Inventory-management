// server/utils/email/mailer.js
//
// Single source of truth for email transport.
// Uses Brevo HTTP API exclusively — works on Render free tier (no SMTP port blocks)
// and locally as long as BREVO_API_KEY is set in .env.
//
// All email helpers MUST use sendWithRetry() from sendWithRetry.js,
// NOT transporter.sendMail() directly.

import { BrevoClient } from "@getbrevo/brevo";

if (!process.env.BREVO_API_KEY) {
  console.warn("⚠️  BREVO_API_KEY not set — emails will fail silently.");
}

const brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY || "" });

// Quick connectivity test on startup
brevoClient.transactionalEmails
  .getSmtpReport({ limit: 1 })
  .then(() => console.log("✅ Brevo API connected"))
  .catch((err) => console.error("❌ Brevo API error:", err?.message || err));

export { brevoClient };
