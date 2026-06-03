// server/utils/email/orderExpiryAdminEmail.js
import { transporter } from "./mailer.js";

/**
 * Sends an email to the admin notifying them that an order has expired
 * (buyer has not collected their goods within the set time limit).
 */
export const sendOrderExpiryAdminEmail = async ({
  adminEmail,
  buyerName,
  orderId,
  totalPrice,
  orderDate,
  hoursElapsed,
  expiryHours,
}) => {
  await transporter.sendMail({
    from: `"Melech Store System" <${process.env.MAIL_USER}>`,
    to: adminEmail,
    subject: `⏰ Order Pickup Overdue — ${buyerName} (${hoursElapsed}h elapsed)`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;
                 width:100%;margin:0 auto;">
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
                style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;
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
                    <strong>Buyer:</strong> ${buyerName}
                  </td>
                </tr>
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

              <p>
                Please log in to the admin dashboard to review this order.
                You may choose to:
              </p>
              <ul style="margin:8px 0;padding-left:20px;font-size:13px;">
                <li>Contact the buyer to arrange pickup</li>
                <li>Cancel the order and restore the stock if the buyer is unresponsive</li>
              </ul>
              <p>
                Go to <strong>Placed Orders</strong> in your admin dashboard to take action.
              </p>
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
