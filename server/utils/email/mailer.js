import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail", // or SMTP provider
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ✅ ADD THIS RIGHT AFTER transporter is created
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP error:", err.message);
  } else {
    console.log("✅ SMTP is ready");
  }
});
