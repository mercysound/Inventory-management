import { sendWithRetry } from "./sendWithRetry.js";

export const sendCustomerDeliveredEmail = async ({
  customerEmail,
  customerName,
  orderId,
}) => {
  try {
    const mailOptions = {
      from: `"Melech Store" <${process.env.MAIL_USER}>`,
      to: customerEmail,
      subject: "📦 Your Order Has Been Delivered",
      html: `
        <h2>Order Delivered 🎉</h2>
        <p>Hello ${customerName},</p>
        <p>Your order <strong>#${orderId}</strong> has been successfully delivered.</p>
        <br/>
        <p>Thank you for shopping with Melech Store.</p>
      `,
    };
    
    await sendWithRetry(mailOptions);
  } catch (error) {
    console.error("Failed to send customer delivered email:", error.message);
  }
};
