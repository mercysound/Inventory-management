// server/utils/email/productExpiryAdminEmail.js
// Email sent to admin when one or more products are approaching their expiry date.

import { sendWithRetry } from "./sendWithRetry.js";

/**
 * sendProductExpiryAdminEmail
 *
 * @param {object}   opts
 * @param {string}   opts.adminEmail
 * @param {Array}    opts.products       — array of { name, batchNumber, expiryDate, stock, daysLeft }
 * @param {string}   [opts.storeName]
 */
export const sendProductExpiryAdminEmail = async ({
  adminEmail,
  products = [],
  storeName = "Melech Store",
}) => {
  if (!products.length) return;

  const rows = products.map((p) => {
    const urgency = p.daysLeft <= 7 ? "#dc2626" : p.daysLeft <= 14 ? "#d97706" : "#4f46e5";
    const label   = p.daysLeft <= 0 ? "EXPIRED" : `${p.daysLeft} day${p.daysLeft !== 1 ? "s" : ""} left`;
    return `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#1f2937;">
          ${p.name}
          ${p.batchNumber ? `<span style="font-size:11px;color:#6b7280;font-weight:400;"> · Batch: ${p.batchNumber}</span>` : ""}
        </td>
        <td style="padding:10px 8px;font-size:12px;color:#374151;text-align:center;">
          ${new Date(p.expiryDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
        </td>
        <td style="padding:10px 8px;text-align:center;">
          <span style="background:${urgency}1a;color:${urgency};border:1px solid ${urgency}40;
            padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;">
            ${label}
          </span>
        </td>
        <td style="padding:10px 8px;font-size:12px;color:#374151;text-align:center;">${p.stock}</td>
      </tr>`;
  }).join("");

  await sendWithRetry({
    to:      adminEmail,
    subject: `⚠️ Product Expiry Alert — ${products.length} item${products.length !== 1 ? "s" : ""} expiring soon`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:600px;
                 width:100%;margin:0 auto;">
          <tr>
            <td style="background:#dc2626;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                ⚠️ Product Expiry Alert — ${storeName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;color:#374151;font-size:14px;">
              <p style="margin:0 0 16px;">
                Hello Admin, the following product${products.length !== 1 ? "s are" : " is"} approaching
                expiry or already expired. Please take action promptly.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:13px;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 8px;text-align:left;font-size:11px;
                      color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Product</th>
                    <th style="padding:10px 8px;text-align:center;font-size:11px;
                      color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Expiry Date</th>
                    <th style="padding:10px 8px;text-align:center;font-size:11px;
                      color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Status</th>
                    <th style="padding:10px 8px;text-align:center;font-size:11px;
                      color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Stock</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;color:#374151;font-size:13px;">
              <p style="margin:0;">
                Please log in to the <strong>admin dashboard → Products</strong>
                to review and update these items.
              </p>
              <br/>
              <p style="margin:0;">– <strong>${storeName} System</strong></p>
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
