// server/utils/email/userStatusEmail.js
import { sendWithRetry } from "./sendWithRetry.js";

const APP_NAME = "Melech Store";

// ── Deactivation notice ───────────────────────────────────────────────────────
export const sendDeactivationEmail = async ({ userName, userEmail, reason }) => {
  await sendWithRetry({
    to:      userEmail,
    subject: `⚠️ Your ${APP_NAME} account has been temporarily suspended`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;
                 width:100%;margin:0 auto;">
          <tr>
            <td style="background:#dc2626;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                ⚠️ Account Temporarily Suspended — ${APP_NAME}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.8;">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>
                Your account on <strong>${APP_NAME}</strong> has been
                <strong style="color:#dc2626;">temporarily suspended</strong>
                by the administrator.
              </p>
              ${reason ? `
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;
                           padding:14px 16px;margin:16px 0;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#991b1b;">
                  Reason:
                </p>
                <p style="margin:6px 0 0;font-size:13px;color:#374151;">${reason}</p>
              </div>` : ""}
              <p>
                During this period you will <strong>not be able to log in</strong>
                to the platform. This is a temporary measure and your account data
                is fully preserved.
              </p>
              <p>
                If you believe this is a mistake or need further information,
                please contact our support team by replying to this email.
              </p>
              <br/>
              <p>We apologise for any inconvenience.</p>
              <p>— <strong>${APP_NAME} Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                ${APP_NAME} · Automated account notification
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};

// ── Reactivation notice ───────────────────────────────────────────────────────
export const sendActivationEmail = async ({ userName, userEmail }) => {
  await sendWithRetry({
    to:      userEmail,
    subject: `✅ Your ${APP_NAME} account has been reactivated`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;
                 width:100%;margin:0 auto;">
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                ✅ Account Reactivated — ${APP_NAME}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.8;">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>
                Great news! Your <strong>${APP_NAME}</strong> account has been
                <strong style="color:#16a34a;">reactivated</strong>.
                You can now log in and use the platform as normal.
              </p>
              <p>
                Thank you for your patience during the suspension period.
              </p>
              <br/>
              <p>— <strong>${APP_NAME} Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                ${APP_NAME} · Automated account notification
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};
