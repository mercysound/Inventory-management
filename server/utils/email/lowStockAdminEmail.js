// server/utils/email/lowStockAdminEmail.js
import { sendWithRetry } from "./sendWithRetry.js";

export const sendLowStockAdminEmail = async ({ adminEmail, products, storeName }) => {
  if (!products.length) return;

  const appUrl = (process.env.FRONTEND_URL || "https://bigpos.onrender.com").replace(/\/$/, "");

  // ── Vertical card layout — works on ALL email clients and mobile screens ──
  // Using a 2-column mini-table inside each card instead of a wide horizontal
  // table that gets clipped on mobile email clients.
  const cards = products.map((p) => {
    const isOut      = p.stock === 0;
    const stockBg    = isOut ? "#fee2e2" : "#fef3c7";
    const stockColor = isOut ? "#b91c1c" : "#92400e";
    const stockLabel = isOut ? "Out of stock" : `${p.stock} left`;
    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;
        padding:16px;margin-bottom:12px;">
        <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">
          ${p.name}
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;width:50%;vertical-align:top;">
              <span style="font-size:11px;font-weight:600;color:#9ca3af;
                text-transform:uppercase;letter-spacing:.05em;display:block;">
                Stock
              </span>
              <span style="display:inline-block;margin-top:4px;padding:3px 12px;
                border-radius:99px;background:${stockBg};color:${stockColor};
                font-weight:700;font-size:13px;">
                ${stockLabel}
              </span>
            </td>
            <td style="padding:4px 0;width:50%;vertical-align:top;">
              <span style="font-size:11px;font-weight:600;color:#9ca3af;
                text-transform:uppercase;letter-spacing:.05em;display:block;">
                Threshold
              </span>
              <span style="font-size:13px;color:#374151;font-weight:600;
                display:inline-block;margin-top:6px;">
                Alert at ≤${p.threshold}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0 0;vertical-align:top;">
              <span style="font-size:11px;font-weight:600;color:#9ca3af;
                text-transform:uppercase;letter-spacing:.05em;display:block;">
                Category
              </span>
              <span style="font-size:13px;color:#374151;
                display:inline-block;margin-top:4px;">
                ${p.category || "—"}
              </span>
            </td>
            <td style="padding:8px 0 0;vertical-align:top;">
              <span style="font-size:11px;font-weight:600;color:#9ca3af;
                text-transform:uppercase;letter-spacing:.05em;display:block;">
                Supplier
              </span>
              <span style="font-size:13px;color:#374151;
                display:inline-block;margin-top:4px;">
                ${p.supplier || "—"}
              </span>
            </td>
          </tr>
        </table>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f9fafb;
  font-family:system-ui,-apple-system,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px 32px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dc2626,#f97316);
      padding:24px 28px;border-radius:16px 16px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;line-height:1.3;">
        ⚠️ Low Stock Alert — ${storeName}
      </h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px;">
        ${products.length} product${products.length !== 1 ? "s" : ""}
        ${products.length !== 1 ? "are" : "is"} at or below the low-stock threshold.
      </p>
    </div>

    <!-- Product cards -->
    <div style="background:#f9fafb;padding:20px 20px 8px;
      border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      ${cards}
    </div>

    <!-- CTA -->
    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;
      padding:20px 24px 24px;text-align:center;border-radius:0 0 16px 16px;">
      <a href="${appUrl}/admin-dashboard/products"
        style="display:inline-block;background:#dc2626;color:#fff;
          font-size:14px;font-weight:700;padding:12px 28px;
          border-radius:10px;text-decoration:none;letter-spacing:.01em;">
        🔧 Go to Products Page →
      </a>
      <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
        Or visit
        <a href="${appUrl}/admin-dashboard/settings"
          style="color:#4f46e5;text-decoration:none;font-weight:600;">
          Admin Settings → Inventory Alerts
        </a>
        to adjust thresholds.
      </p>
      <p style="margin:10px 0 0;font-size:11px;color:#d1d5db;">
        ${storeName} · Low-stock alerts run every 30 minutes.
      </p>
    </div>

  </div>
</body>
</html>`;

  await sendWithRetry({
    to:      adminEmail,
    subject: `⚠️ Low Stock Alert — ${products.length} product${products.length !== 1 ? "s" : ""} need attention | ${storeName}`,
    html,
  });
};
