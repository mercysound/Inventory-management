// server/utils/email/sendWithRetry.js
//
// Central email sending function with retry + exponential backoff.
// All email helpers in this project call this function — never call
// brevoClient directly from controllers or other helpers.
//
// mailOptions shape:
//   { from (ignored — sender set below), to, subject, html }

import { brevoClient } from "./mailer.js";

const SENDER_EMAIL = process.env.MAIL_USER   || "noreply@melechstore.com";
const SENDER_NAME  = "Melech Store";

export const sendWithRetry = async (mailOptions, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Sending email to ${mailOptions.to} (attempt ${attempt}/${maxRetries})…`);

      const result = await brevoClient.transactionalEmails.sendTransacEmail({
        sender:      { email: SENDER_EMAIL, name: SENDER_NAME },
        to:          [{ email: mailOptions.to }],
        subject:     mailOptions.subject,
        htmlContent: mailOptions.html,
      });

      console.log(`✅ Email sent → ${mailOptions.to} | messageId: ${result?.messageId ?? "n/a"}`);
      return result;

    } catch (err) {
      console.error(`❌ Email attempt ${attempt}/${maxRetries} failed:`, err?.message || err);

      if (attempt === maxRetries) {
        // Log and swallow — never crash the request because of an email failure
        console.error("📭 All email attempts exhausted. Email not delivered to:", mailOptions.to);
        return null;
      }

      const wait = delay * Math.pow(2, attempt - 1); // 1 s, 2 s, 4 s
      console.log(`⏳ Retrying in ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
};
