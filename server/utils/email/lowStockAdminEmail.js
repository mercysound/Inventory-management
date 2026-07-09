// server/utils/email/lowStockAdminEmail.js
import { sendWithRetry } from "./sendWithRetry.js";

export const sendLowStockAdminEmail = async ({ adminEmail, products, storeName }) => {
  if (!products.length) return;

  const appUrl = (process.env.FRONTEND_URL || "https://bigpos.onrender.com").replace(/\/$/, "");

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
      <td style="padding:10px 12px;text-align:center;color:#6b7280;font-size:13px;">Alert at ≤${p.threshold}</td>
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
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">⚠️ Low Stock Alert — ${storeName}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">
            ${products.length} product${products.length !== 1 ? "s" : ""} ${products.length !== 1 ? "are" : "is"} at or below the low-stock threshold.
          </p>
        </div>

        <!-- Table -->
        <div style="padding:24px 32px 16px;">
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

        <!-- CTA Button -->
        <div style="padding:8px 32px 24px;text-align:center;">
          <a href="${appUrl}/admin-dashboard/products"
            style="display:inline-block;background:#dc2626;color:#fff;font-size:14px;font-weight:700;
              padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:.01em;">
            🔧 Go to Products Page →
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
            Or go directly to
            <a href="${appUrl}/admin-dashboard/settings" style="color:#4f46e5;text-decoration:none;font-weight:600;">
              Admin Settings → Inventory Alerts
            </a>
            to adjust thresholds.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            ${storeName} · Low-stock alerts run every 30 minutes.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendWithRetry({
    to:      adminEmail,
    subject: `⚠️ Low Stock Alert — ${products.length} product${products.length !== 1 ? "s" : ""} need attention | ${storeName}`,
    html,
  });
};
