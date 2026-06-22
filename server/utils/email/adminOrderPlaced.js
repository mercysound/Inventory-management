import { sendWithRetry } from "./sendWithRetry.js";

export const sendAdminOrderPlacedEmail = async ({
  adminEmail,
  buyerName,
  totalPrice,
  orderId,
  role = "customer",
  fulfillmentType = "pickup",
  deliveryAddress = null,
  deliveryRecipientName = null,
  deliveryPhone = null,
}) => {
  const roleLabel = role === "wholesale" ? "Wholesale Customer" : "Customer";
  const roleColor = role === "wholesale" ? "#d97706" : "#4f46e5";

  const isDelivery = fulfillmentType === "delivery";

  // Delivery block — only included when the customer chose delivery
  const deliveryBlock = isDelivery ? `
    <tr>
      <td style="padding:12px 0 0;">
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:14px 16px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">
            🚚 DELIVERY ORDER — Action Required
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#374151;">
            <strong>Recipient:</strong> ${deliveryRecipientName || "—"}
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#374151;">
            <strong>Phone:</strong> ${deliveryPhone || "—"}
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#374151;">
            <strong>Deliver to:</strong> ${deliveryAddress || "—"}
          </p>
          <p style="margin:0;font-size:11px;color:#92400e;font-style:italic;">
            The customer has been informed that transport fare is separate and will be
            agreed directly between you and the buyer before or after delivery.
            Call the buyer to confirm transport cost before dispatching.
          </p>
        </div>
      </td>
    </tr>` : `
    <tr>
      <td style="padding:4px 0;font-size:13px;">
        <strong>Fulfilment:</strong>
        <span style="color:#16a34a;font-weight:700;">Self Pickup</span>
        — customer will collect in person.
      </td>
    </tr>`;

  await sendWithRetry({
    to:      adminEmail,
    subject: `${isDelivery ? "🚚" : "🛒"} New ${isDelivery ? "Delivery" : "Pickup"} Order — ${buyerName}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;padding:32px 0;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;
                 width:100%;margin:0 auto;">
          <tr>
            <td style="background:${isDelivery ? "#d97706" : "#4f46e5"};padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">
                ${isDelivery ? "🚚 Delivery Order" : "🛒 New Order"} — Melech Store
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
                ${deliveryBlock}
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
