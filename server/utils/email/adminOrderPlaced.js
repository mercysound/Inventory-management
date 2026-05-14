import { sendWithRetry } from "./sendWithRetry.js";

export const sendAdminOrderPlacedEmail = async ({
  adminEmail,
  buyerName,
  totalPrice,
  orderId,
}) => {
  try {
    const mailOptions = {
      from: `"Melech Store" <${process.env.MAIL_USER}>`,
      to: adminEmail,
      subject: "🛒 New Order Placed",
      html: `
        <h2>New Order Alert</h2>
        <p><strong>Customer:</strong> ${buyerName}</p>
        <p><strong>Total:</strong> ₦${totalPrice.toLocaleString()}</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <br/>
        <p>Login to the admin dashboard to process this order.</p>
      `,
    };
    
    await sendWithRetry(mailOptions);
  } catch (error) {
    console.error("Failed to send admin order placed email:", error.message);
  }
};