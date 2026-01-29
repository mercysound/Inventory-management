import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail", // or SMTP provider
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
