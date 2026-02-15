import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail", // or SMTP provider
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// This Runs once when the server starts to Confirms Gmail login works. If it fails, you’ll know before sending any emails
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP error:", err.message);
  } else {
    console.log("✅ SMTP is ready"); 
  }
});
