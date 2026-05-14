import nodemailer from "nodemailer";

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
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,        // Your Gmail address
    pass: process.env.MAIL_PASS,        // Gmail App Password (16 chars, NOT regular password)
  },
  // ✅ Production-grade timeout & connection settings
  connectionTimeout: 10000,  // 10 seconds to establish connection
  socketTimeout: 10000,      // 10 seconds for socket operations
  pool: {
    maxConnections: 3,       // Limit concurrent SMTP connections (prevents rate limits)
    maxMessages: 100,        // Messages per connection before recycling
    rateDelta: 1000,         // milliseconds between messages
    rateLimit: 10,           // Messages per rateDelta (respects Gmail rate limits)
  },
  // ✅ TLS settings for Render compatibility
  secure: true,              // Use TLS encryption
  requireTLS: true,          // Require TLS negotiation
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 DEVELOPMENT CONFIGURATIONS (Below - Uncomment one for local testing)
// ═══════════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────────
// DEV Option A: Ethereal (Free test email service - No setup needed!)
// Best for: Quick local testing without real emails
// Steps: Just uncomment the code below, restart server, emails show in console
// ───────────────────────────────────────────────────────────────────────────────
/*
// Uncomment this entire block for Ethereal testing:
(async () => {
  const testAccount = await nodemailer.createTestAccount();
  
  const devTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    // Dev: Relaxed timeouts for debugging
    connectionTimeout: 30000,  // 30 seconds (more lenient)
    socketTimeout: 30000,
    pool: {
      maxConnections: 1,       // Single connection for dev
      maxMessages: 50,
    },
  });
  
  devTransporter.verify((err) => {
    if (err) console.error("❌ Ethereal error:", err.message);
    else console.log("✅ Ethereal ready - View emails: https://ethereal.email");
  });
  
  // Replace the export above with this:
  export { devTransporter as transporter };
})();
*/

// ───────────────────────────────────────────────────────────────────────────────
// DEV Option B: MailHog (Local SMTP server with Web UI)
// Best for: Full local email testing with nice interface
// Setup:
//   1. Download: https://github.com/mailhog/MailHog/releases
//   2. Run: ./mailhog
//   3. SMTP: localhost:1025
//   4. Web UI: http://localhost:1025
// Then uncomment below:
// ───────────────────────────────────────────────────────────────────────────────
/*
// Uncomment this entire block for MailHog testing:
export const transporter = nodemailer.createTransport({
  host: "127.0.0.1",
  port: 1025,                // Default MailHog SMTP port
  secure: false,             // No TLS needed for localhost
  connectionTimeout: 30000,  // Dev: More lenient
  socketTimeout: 30000,
  pool: {
    maxConnections: 2,
    maxMessages: 50,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ MailHog error:", err.message);
    console.error("⚠️  Make sure MailHog is running: http://localhost:1025");
  } else {
    console.log("✅ MailHog SMTP ready");
    console.log("📧 View emails: http://localhost:1025");
  }
});
*/

// ───────────────────────────────────────────────────────────────────────────────
// DEV Option C: Gmail (Same as production - for testing real Gmail before deploy)
// Best for: Testing with actual Gmail account locally
// Setup:
//   1. Set MAIL_USER and MAIL_PASS in .env (Gmail App Password required!)
//   2. Uncomment below
// Then uncomment:
// ───────────────────────────────────────────────────────────────────────────────
/*
// Uncomment this entire block for local Gmail testing:
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  // Dev: More lenient than production
  connectionTimeout: 30000,  // 30 seconds (more time for debugging)
  socketTimeout: 30000,
  pool: {
    maxConnections: 2,
    maxMessages: 50,
  },
  secure: true,
  requireTLS: true,
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ Gmail SMTP error:", err.message);
  } else {
    console.log("✅ Gmail SMTP ready (LOCAL DEV MODE)");
  }
});
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 VERIFY SMTP CONNECTION ON STARTUP
// This runs when the server starts to confirm email service is working
// ═══════════════════════════════════════════════════════════════════════════════
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP error:", err.message);
    console.error("⚠️  Email service unavailable. Password resets may not work.");
    console.error("📋 Check your MAIL_USER and MAIL_PASS environment variables.");
  } else {
    console.log("✅ SMTP is ready - Email service verified and working"); 
  }
});
