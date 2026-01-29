import { transporter } from "./mailer.js";

export const sendCustomerProcessingEmail = async ({
  customerEmail,
  customerName,
  orderId,
}) => {
  await transporter.sendMail({
    from: `"Melech Store" <${process.env.MAIL_USER}>`,
    to: customerEmail,
    subject: "🛠️ Your Order is Being Processed",
    html: `
      <h2>Order Update</h2>
      <p>Hello ${customerName},</p>
      <p>Your order <strong>#${orderId}</strong> is now being processed.</p>
      <p>We are preparing it for delivery.</p>
      <br/>
      <p>Thank you for shopping with Melech Store.</p>
    `,
  });
};
