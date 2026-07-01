// server/utils/email/lowStockAdminEmail.js
// Sends a digest email to the admin listing all products at/below their
// effective low-stock threshold.

import { sendEmail } from "./emailService.js";

export const sendLowStockAdminEmail = async ({ adminEmail, products, storeName }) => {
  if (!products.length) return;

  const rows = products.map((p) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;font-weight:600;color:#111827;">${p.name}</td>
      <td style="padding:10px 12px;text-align:center;">
        <span style="display:inline-block;padding:2px 10px;border-radius:99px;
          background:${p.stock === 0 ? "#fee2e2" : "#fef3c7"};
          color:${p.stock === 0 ? "#b91c1c" : "#92400e"};
          font-weight:700;font-size:13px;">
          ${p.stock === 0 ? "Out of stock" : `${p.stock} left`}
        </span>
      </td>
      <td style="padding:10px 12px;text-align:center;color:#6b7280;font-size:13px;">
        Alert at ≤${p.threshold}
      </td>
      <td style="padding:10px 12px;color:#6b7280;font-size:13px;">${p.category || "—"}</td>
      <td style="padding:10px 12px;color:#6b7280;font-size:13px;">${p.supplier || "—"}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
      <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#dc2626,#f97316);padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">
            ⚠️ Low Stock Alert — ${storeName}
          </h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">
            ${products.length} product${products.length !== 1 ? "s" : ""} ${products.length !== 1 ? "are" : "is"} at or below the low-stock threshold.
          </p>
        </div>

        <!-- Table -->
        <div style="padding:24px 32px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Product</th>
                <th style="padding:10px 12px;text-align:center;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Stock</th>
                <th style="padding:10px 12px;text-align:center;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Threshold</th>
                <th style="padding:10px 12px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Category</th>
                <th style="padding:10px 12px;color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Supplier</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            ${storeName} · Low-stock alerts run every 30 minutes.<br>
            Manage thresholds in <strong>Admin Settings → Inventory Alerts</strong> or per product in the Products page.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to:      adminEmail,
    subject: `⚠️ Low Stock Alert — ${products.length} product${products.length !== 1 ? "s" : ""} need attention | ${storeName}`,
    html,
  });
};
