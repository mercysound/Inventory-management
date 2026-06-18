import { sendWithRetry } from "./sendWithRetry.js";

export const sendCustomerCancelledEmail = async ({
  customerEmail,
  customerName,
  orderId,
  totalPrice,
}) => {
  await sendWithRetry({
    to:      customerEmail,
    subject: "❌ Your Order Has Been Cancelled — Melech Store",
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;
                 width:100%;margin:0 auto;">
          <tr>
            <td style="background:#dc2626;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                ❌ Order Cancelled — Melech Store
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>
                Your order <strong>#${String(orderId).slice(-10).toUpperCase()}</strong>
                has been <strong style="color:#dc2626;">cancelled</strong> by our team.
              </p>
              <p><strong>Order Amount:</strong> ₦${Number(totalPrice || 0).toLocaleString()}</p>
              <p>
                If you have already paid, a refund will be processed to your original
                payment method within a few business days.
              </p>
              <p>If you believe this was an error, please contact us.</p>
              <br/>
              <p>We apologise for any inconvenience caused.</p>
              <p>– <strong>Melech Store Team</strong></p>
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
