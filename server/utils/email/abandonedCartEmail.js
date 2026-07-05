// server/utils/email/abandonedCartEmail.js
// Sends a reminder to a user who left items in their cart without completing purchase.
import { sendWithRetry } from "./sendWithRetry.js";

export const sendAbandonedCartEmail = async ({
  customerEmail,
  customerName,
  storeName = "Melech Store",
  cartItems = [],         // [{ name, quantity, price }]
  cartTotal = 0,
  minutesLeft = 15,
}) => {
  if (!customerEmail) return;

  const itemRows = cartItems.map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">
        ${item.name || "Product"}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center;">
        ${item.quantity}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:right;">
        ₦${Number(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px;width:100%;">

            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 32px;text-align:center;">
              <p style="margin:0;font-size:28px;">🛒</p>
              <h1 style="margin:12px 0 4px;font-size:22px;color:#fff;font-weight:700;">
                Don't forget your cart!
              </h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,.8);">
                You left items behind at ${storeName}
              </p>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding:32px;">
              <p style="font-size:15px;color:#374151;margin:0 0 8px;">
                Hi <strong>${customerName || "there"}</strong>,
              </p>
              <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
                You have unpaid items in your cart that will be automatically removed in
                approximately <strong style="color:#dc2626;">${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}</strong>.
                Complete your purchase now to secure your items!
              </p>

              <!-- Cart items table -->
              ${cartItems.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Item</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
                <p style="font-size:16px;font-weight:700;color:#111827;margin:0;">
                  Total: <span style="color:#4f46e5;">₦${Number(cartTotal).toLocaleString()}</span>
                </p>
              </div>
              ` : ""}

              <!-- CTA -->
              <div style="text-align:center;margin:28px 0;">
                <a href="${process.env.FRONTEND_URL || "#"}"
                  style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;font-weight:700;
                    padding:14px 40px;border-radius:12px;text-decoration:none;letter-spacing:.02em;">
                  Complete My Purchase →
                </a>
              </div>

              <p style="font-size:12px;color:#9ca3af;text-align:center;line-height:1.5;margin:0;">
                If you no longer wish to buy these items, you can ignore this email.
                Your cart will be cleared automatically.
              </p>
            </td></tr>

            <!-- Footer -->
            <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} ${storeName}. All rights reserved.
              </p>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendWithRetry({
    to:      customerEmail,
    subject: `⏰ Your cart at ${storeName} expires soon — complete your order!`,
    html,
  });
};
