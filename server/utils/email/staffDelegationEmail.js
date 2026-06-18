// server/utils/email/staffDelegationEmail.js
// Email sent to a staff member when the admin grants or revokes their
// order-management delegation access.

import { sendWithRetry } from "./sendWithRetry.js";

/**
 * sendStaffDelegationGrantedEmail
 *
 * @param {object} opts
 * @param {string} opts.staffEmail  - recipient
 * @param {string} opts.staffName   - staff member's display name
 * @param {string} opts.adminName   - the admin who made the change
 * @param {boolean} opts.granted    - true = access granted, false = access revoked
 * @param {string} [opts.storeName] - store name for branding (default "Melech Store")
 */
export const sendStaffDelegationEmail = async ({
  staffEmail,
  staffName,
  adminName,
  granted,
  storeName = "Melech Store",
}) => {
  const action     = granted ? "granted" : "revoked";
  const actionVerb = granted ? "Grant" : "Revoke";
  const headerColor = granted ? "#16a34a" : "#dc2626";
  const badgeColor  = granted ? "#dcfce7" : "#fee2e2";
  const badgeText   = granted ? "#15803d" : "#b91c1c";

  const bodyContent = granted
    ? `
      <p>Great news! You have been granted <strong>Order Management access</strong> by <strong>${adminName}</strong>.</p>
      <p>This means you can now:</p>
      <ul style="padding-left:20px;line-height:2;">
        <li>Search for customer orders by Order ID</li>
        <li>Update order status (Pending → Processing → Delivered)</li>
        <li>Cancel orders when necessary (stock is auto-restored)</li>
        <li>Mark refunds for orders you cancel</li>
      </ul>
      <p>Log in to your dashboard — you will see a new <strong>"Placed Orders"</strong> item in your sidebar.</p>
    `
    : `
      <p>Your <strong>Order Management access</strong> has been <strong>revoked</strong> by <strong>${adminName}</strong>.</p>
      <p>You no longer have access to manage customer placed orders. If you believe this is a mistake, please contact your admin directly.</p>
    `;

  await sendWithRetry({
    to:      staffEmail,
    subject: `🔑 Order Management Access ${actionVerb}d — ${storeName}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;
                 width:100%;margin:0 auto;">
          <tr>
            <td style="background:${headerColor};padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                🔑 Order Access ${actionVerb}d — ${storeName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">
              <p>Hello <strong>${staffName}</strong>,</p>

              <div style="background:${badgeColor};border-radius:8px;padding:12px 16px;margin:16px 0;text-align:center;">
                <span style="font-size:15px;font-weight:700;color:${badgeText};">
                  Access ${action.toUpperCase()}
                </span>
              </div>

              ${bodyContent}

              <br/>
              <p>– <strong>${storeName} System</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                ${storeName} · Automated notification
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};
