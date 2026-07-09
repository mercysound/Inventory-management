import { sendWithRetry } from "./sendWithRetry.js";

export const sendCustomerDeliveredEmail = async ({
  customerEmail,
  customerName,
  orderId,
  storeName = "Melech Store",
}) => {
  const appUrl = (process.env.FRONTEND_URL || "https://bigpos.onrender.com").replace(/\/$/, "");
  const orderIdShort = String(orderId).slice(-10).toUpperCase();

  await sendWithRetry({
    to:      customerEmail,
    subject: `📦 Your Order Has Been Delivered — ${storeName}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;width:100%;margin:0 auto;">
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                📦 Order Delivered — ${storeName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">
              <p>Hello <strong>${customerName}</strong> 🎉</p>
              <p>
                Your order <strong style="font-family:monospace;">#${orderIdShort}</strong>
                has been <strong style="color:#16a34a;">successfully delivered</strong>.
              </p>
              <p>We hope you enjoy your purchase! If you have any concerns, please reach out to us.</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0 0;">
                <tr>
                  <td style="padding:4px 4px 4px 0;">
                    <a href="${appUrl}/user-dashboard/completed-history"
                      style="display:block;text-align:center;background:#16a34a;color:#fff;
                        font-size:13px;font-weight:700;padding:11px 16px;border-radius:10px;
                        text-decoration:none;">
                      📜 View Order History
                    </a>
                  </td>
                  <td style="padding:4px 0 4px 4px;">
                    <a href="${appUrl}/user-dashboard"
                      style="display:block;text-align:center;background:#f1f5f9;color:#374151;
                        font-size:13px;font-weight:600;padding:11px 16px;border-radius:10px;
                        text-decoration:none;border:1px solid #e2e8f0;">
                      🛍️ Shop Again
                    </a>
                  </td>
                </tr>
              </table>

              <br/>
              <p>Thank you for shopping with <strong>${storeName}</strong>.</p>
              <p>– <strong>${storeName} Team</strong></p>
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
