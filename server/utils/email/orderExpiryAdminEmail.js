// server/utils/email/orderExpiryAdminEmail.js
import { sendWithRetry } from "./sendWithRetry.js";

export const sendOrderExpiryAdminEmail = async ({
  adminEmail,
  buyerName,
  orderId,
  totalPrice,
  orderDate,
  hoursElapsed,
  expiryHours,
}) => {
  const appUrl = (process.env.FRONTEND_URL || "https://bigpos.onrender.com").replace(/\/$/, "");

  await sendWithRetry({
    to:      adminEmail,
    subject: `⏰ Order Pickup Overdue — ${buyerName} (${hoursElapsed}h elapsed)`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;width:100%;margin:0 auto;">
          <tr>
            <td style="background:#b45309;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                ⏰ Pickup Overdue Alert — Melech Store
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">
              <p>Hello Admin,</p>
              <p>
                The following order has been <strong style="color:#b45309;">unpicked for ${hoursElapsed} hours</strong>,
                exceeding your configured limit of <strong>${expiryHours} hours</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:16px 0;">
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Order ID:</strong>
                    <span style="font-family:monospace;">#${String(orderId).slice(-10).toUpperCase()}</span>
                  </td>
                </tr>
                <tr><td style="padding:4px 0;font-size:13px;"><strong>Buyer:</strong> ${buyerName}</td></tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Order Amount:</strong> ₦${Number(totalPrice).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Placed On:</strong>
                    ${new Date(orderDate).toLocaleString("en-NG", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Hours Elapsed:</strong>
                    <span style="color:#b45309;font-weight:700;">${hoursElapsed} hours</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;">Take action from your admin dashboard:</p>

              <!-- CTA buttons -->
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:4px 4px 4px 0;">
                    <a href="${appUrl}/admin-dashboard/placed-orders"
                      style="display:block;text-align:center;background:#b45309;color:#fff;
                        font-size:13px;font-weight:700;padding:11px 16px;border-radius:10px;
                        text-decoration:none;">
                      📋 View Placed Orders
                    </a>
                  </td>
                  <td style="padding:4px 0 4px 4px;">
                    <a href="${appUrl}/admin-dashboard/expiring-orders"
                      style="display:block;text-align:center;background:#f1f5f9;color:#374151;
                        font-size:13px;font-weight:600;padding:11px 16px;border-radius:10px;
                        text-decoration:none;border:1px solid #e2e8f0;">
                      ⏰ Expiring Orders
                    </a>
                  </td>
                </tr>
              </table>

              <br/>
              <p>– <strong>Melech Store System</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                This is an automated notification from Melech Store inventory system.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};
