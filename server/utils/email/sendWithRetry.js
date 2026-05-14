import { transporter } from "./mailer.js";

/**
 * Send email with automatic retry logic and exponential backoff
 * Helps handle transient SMTP connection failures in production environments like Render
 * 
 * @param {Object} mailOptions - Nodemailer mail options (from, to, subject, html, etc.)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} delay - Initial delay in ms before first retry (default: 1000)
 * @returns {Promise<Object>} Nodemailer response object with messageId
 * @throws {Error} If all retry attempts fail
 */
export const sendWithRetry = async (mailOptions, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Sending email (attempt ${attempt}/${maxRetries})...`);
      // const info = await Promise.race([
      //   transporter.sendMail(mailOptions),
      //   new Promise((_, reject) => 
      //     setTimeout(() => reject(new Error('Email send timeout')), 15000)
      //   )
      // ]); temporary timeout wrapper to prevent hanging 
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully:`, info.messageId);
      return info;
    } catch (error) {
      const errorCode = error.code || error.errno;
      console.error(`❌ Attempt ${attempt} failed (${errorCode}):`, error.message);
      
      if (attempt === maxRetries) {
        throw error; // Final attempt failed
      }
      
      // Exponential backoff: 1s, 2s, 4s, etc.
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};
