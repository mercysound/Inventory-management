import { sendWithRetry } from "./sendWithRetry.js";

export const sendCustomerProcessingEmail = async ({
  customerEmail,
  customerName,
  orderId,
  storeName = "Melech Store",
}) => {
  const appUrl = (process.env.FRONTEND_URL || "https://bigpos.onrender.com").replace(/\/$/, "");
  const orderIdShort = String(orderId).slice(-10).toUpperCase();

  await sendWithRetry({
    to:      customerEmail,
    subject: `🛠️ Your Order is Being Processed — ${storeName}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;width:100%;margin:0 auto;">
          <tr>
            <td style="background:#4f46e5;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                🛠️ Order Processing — ${storeName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>
                Great news! Your order <strong style="font-family:monospace;">#${orderIdShort}</strong>
                is now <strong style="color:#4f46e5;">being processed</strong> by our team.
              </p>
              <p>We will notify you again once your order has been delivered or is ready for pickup.</p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0 0;">
                <tr>
                  <td style="padding:4px 4px 4px 0;">
                    <a href="${appUrl}/user-dashboard/completed-history"
                      style="display:block;text-align:center;background:#4f46e5;color:#fff;
                        font-size:13px;font-weight:700;padding:11px 16px;border-radius:10px;
                        text-decoration:none;">
                      📜 Track Your Order
                    </a>
                  </td>
                  <td style="padding:4px 0 4px 4px;">
                    <a href="${appUrl}/user-dashboard"
                      style="display:block;text-align:center;background:#f1f5f9;color:#374151;
                        font-size:13px;font-weight:600;padding:11px 16px;border-radius:10px;
                        text-decoration:none;border:1px solid #e2e8f0;">
                      🛍️ Continue Shopping
                    </a>
                  </td>
                </tr>
              </table>

              <br/>
              <p>Thank you for your patience.</p>
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
