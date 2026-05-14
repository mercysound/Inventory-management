import { sendWithRetry } from "./sendWithRetry.js";

export const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Password Reset - Melech Solution Hub",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Melech Solution Hub</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #4f46e5;
              margin-bottom: 10px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .reset-button {
              display: inline-block;
              background-color: #4f46e5;
              color: #ffffff;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .reset-button:hover {
              background-color: #3730a3;
            }
            .warning {
              background-color: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              font-size: 14px;
              color: #6b7280;
              margin-top: 30px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .link {
              color: #4f46e5;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Melech Solution Hub</div>
              <div class="title">Password Reset Request</div>
            </div>

            <div class="content">
              <p>Hello,</p>
              <p>You have requested to reset your password for your Melech Solution Hub account. Click the button below to reset your password:</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset Password</a>
              </div>

              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p class="link">${resetUrl}</p>

              <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email.
              </div>

              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

              <p>Best regards,<br>The Melech Solution Hub Team</p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} Melech Solution Hub. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await sendWithRetry(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send password reset email after retries:", {
      code: error.code,
      message: error.message,
      errno: error.errno
    });
    throw error;
  }
};