// import nodemailer from "nodemailer";


// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️  NODEMAILER CONFIGURATION - DEV vs PRODUCTION
// ═══════════════════════════════════════════════════════════════════════════════
//
// This file supports both development and production email sending.
// All password reset emails automatically use this transporter.
//
// 📝 IMPORTANT: You should NOT need to change anything for password emails
//    to work - just choose your configuration below!
//
// ═══════════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────────
// ✅ PRODUCTION CONFIGURATION (Currently Active)
// Use this for Render deployment with real Gmail
// ───────────────────────────────────────────────────────────────────────────────

// // ✅ PRODUCTION - Active for Render deployment
// export const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASS,
//   },
//   connectionTimeout: 10000,
//   socketTimeout: 10000,
//   secure: true,
//   requireTLS: true,
// });

// transporter.verify((err) => {
//   if (err) {
//     console.error("❌ SMTP error:", err.message);
//     console.error("⚠️  Check MAIL_USER and MAIL_PASS env variables.");
//   } else {
//     console.log("✅ SMTP is ready");
//   }
// });

// ─────────────────────────────────────────────────────
// 🧪 DEV Option A: Ethereal (uncomment to use locally)
// ─────────────────────────────────────────────────────
/*
import nodemailer from "nodemailer";
const testAccount = await nodemailer.createTestAccount();
export const transporter = nodemailer.createTransport({
  host: testAccount.smtp.host,
  port: testAccount.smtp.port,
  secure: testAccount.smtp.secure,
  auth: { user: testAccount.user, pass: testAccount.pass },
  connectionTimeout: 30000,
  socketTimeout: 30000,
});
transporter.verify((err) => {
  if (err) console.error("❌ Ethereal error:", err.message);
  else console.log("✅ Ethereal ready - https://ethereal.email");
});
*/

// ─────────────────────────────────────────────────────
// 🧪 DEV Option B: MailHog (uncomment to use locally)
// ─────────────────────────────────────────────────────
/*
import nodemailer from "nodemailer";
export const transporter = nodemailer.createTransport({
  host: "127.0.0.1",
  port: 1025,
  secure: false,
  connectionTimeout: 30000,
  socketTimeout: 30000,
});
transporter.verify((err) => {
  if (err) console.error("❌ MailHog error:", err.message);
  else console.log("✅ MailHog ready - http://localhost:1025");
});
*/



// for resend mailer integration (currently not used, but can be switched to by changing transporter and sendWithRetry)
// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY);


// export { resend };


import nodemailer from "nodemailer";

// SMTP transport fallback for local development or when env vars are not configured.
// If MAIL_USER / MAIL_PASS are available, use Gmail SMTP.
// Otherwise, use JSON transport so email calls resolve without blocking startup.
const createTransporter = () => {
  if (process.env.MAIL_USER && process.env.MAIL_PASS) {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
      secure: true,
      requireTLS: true,
    });
    transport.verify((err) => {
      if (err) {
        console.error("❌ SMTP error:", err.message);
        console.error("⚠️  Check MAIL_USER and MAIL_PASS env variables.");
      } else {
        console.log("✅ SMTP is ready");
      }
    });
    return transport;
  }

  if (process.env.BREVO_USER && process.env.BREVO_PASS) {
    const transport = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });
    transport.verify((err) => {
      if (err) {
        console.error("❌ Brevo SMTP error:", err.message);
        console.error("⚠️  Check BREVO_USER and BREVO_PASS env variables.");
      } else {
        console.log("✅ Brevo SMTP ready");
      }
    });
    return transport;
  }

  const transport = nodemailer.createTransport({ jsonTransport: true });
  console.warn("⚠️ No SMTP credentials found; using JSON transport for email delivery.");
  return transport;
};

export const transporter = createTransporter();

// Brevo also has an HTTP API (like Resend) that works over port 443 which Render doesn't block. Let's use that instead of their SMTP.
// Brevo HTTP API - works on Render free tier
import { BrevoClient } from "@getbrevo/brevo";

const brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

export { brevoClient };