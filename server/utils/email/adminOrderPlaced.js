import { sendWithRetry } from "./sendWithRetry.js";

export const sendAdminOrderPlacedEmail = async ({
  adminEmail,
  buyerName,
  totalPrice,
  orderId,
  role = "customer",
}) => {
  const roleLabel = role === "wholesale" ? "Wholesale Customer" : "Customer";
  const roleColor = role === "wholesale" ? "#d97706" : "#4f46e5";

  await sendWithRetry({
    to:      adminEmail,
    subject: `🛒 New Order Placed — ${buyerName}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;
                 width:100%;margin:0 auto;">
          <tr>
            <td style="background:#4f46e5;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                🛒 New Order Alert — Melech Store
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">
              <p>Hello Admin,</p>
              <p>A new order has been placed and is waiting for your action.</p>

              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;
                       padding:16px;margin:16px 0;">
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Order ID:</strong>
                    <span style="font-family:monospace;">
                      #${String(orderId).slice(-10).toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Customer:</strong> ${buyerName}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Customer Type:</strong>
                    <span style="color:${roleColor};font-weight:700;">${roleLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;">
                    <strong>Order Total:</strong>
                    <span style="color:#16a34a;font-weight:700;">
                      ₦${Number(totalPrice).toLocaleString()}
                    </span>
                  </td>
                </tr>
              </table>

              <p>
                Please log in to the <strong>admin dashboard → Placed Orders</strong>
                to process this order.
              </p>
              <br/>
              <p>– <strong>Melech Store System</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Melech Store · Automated notification
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};
