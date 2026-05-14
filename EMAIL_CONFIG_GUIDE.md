# Email Configuration Guide - Dev vs Production

## Quick Answer: Do You Need to Change Anything?

**NO!** Password reset emails will automatically work with whatever email configuration is active. Just choose your setup below.

---

## 🎯 Configuration Locations in `mailer.js`

### Production (Currently Active)
```javascript
// Line 18 - ACTIVE
export const transporter = nodemailer.createTransport({
  service: "gmail",
  // ... production config
});
```

### Development Options (Commented Out)
```javascript
// Line 46-78 - Option A: Ethereal
// Line 80-99 - Option B: MailHog  
// Line 101-126 - Option C: Local Gmail
```

---

## 📋 Setup Guide by Environment

### For Production (Render)
**Status:** ✅ **Already configured**

No changes needed. Your current setup:
- Uses Gmail service
- 10-second timeouts (production)
- Connection pooling enabled
- TLS encryption required

**Environment variables needed:**
```
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=<16-char app password>
FRONTEND_URL=https://your-app.render.com
```

---

### For Development Option A: Ethereal (Easiest)

**Best for:** Quick testing, no email setup needed

**Steps:**

1. **Open `server/utils/email/mailer.js`**

2. **Find the production export (line 18)** and replace with this block (lines 50-78):
   ```javascript
   // Comment out or delete the production transporter
   // export const transporter = nodemailer.createTransport({
   //   service: "gmail",
   //   ...
   // });

   // Uncomment this:
   (async () => {
     const testAccount = await nodemailer.createTestAccount();
     const devTransporter = nodemailer.createTransport({
       host: testAccount.smtp.host,
       port: testAccount.smtp.port,
       secure: testAccount.smtp.secure,
       auth: {
         user: testAccount.user,
         pass: testAccount.pass,
       },
       connectionTimeout: 30000,
       socketTimeout: 30000,
       pool: {
         maxConnections: 1,
         maxMessages: 50,
       },
     });
     export { devTransporter as transporter };
   })();
   ```

3. **Restart your server**
   ```bash
   npm start
   ```

4. **Check console** - You'll see:
   ```
   ✅ Ethereal ready - View emails: https://ethereal.email
   ```

5. **Test forgot password**
   - Open http://localhost:5173/forgot-password
   - Enter any email
   - Check console for test email URL

**Advantages:**
- ✅ No setup required
- ✅ No real emails sent
- ✅ Automatic account creation
- ✅ Can view emails online

**Disadvantages:**
- ❌ Only for testing (not real email delivery)

---

### For Development Option B: MailHog (Best UX)

**Best for:** Full local email testing with beautiful UI

**Steps:**

1. **Download & Run MailHog**
   ```bash
   # Visit: https://github.com/mailhog/MailHog/releases
   # Download for your OS and run:
   ./mailhog
   ```
   
   You should see:
   ```
   MailHog v1.0.0
   
   SMTP listening on 127.0.0.1:1025
   Web UI listening on 127.0.0.1:8025
   ```

2. **Open `server/utils/email/mailer.js`**

3. **Replace production transporter (lines 18-37)** with Option B (lines 81-99):
   ```javascript
   export const transporter = nodemailer.createTransport({
     host: "127.0.0.1",
     port: 1025,
     secure: false,
     connectionTimeout: 30000,
     socketTimeout: 30000,
     pool: {
       maxConnections: 2,
       maxMessages: 50,
     },
   });

   transporter.verify((err) => {
     if (err) {
       console.error("❌ MailHog error:", err.message);
       console.error("⚠️  Make sure MailHog is running: http://localhost:1025");
     } else {
       console.log("✅ MailHog SMTP ready");
       console.log("📧 View emails: http://localhost:1025");
     }
   });
   ```

4. **Restart server**
   ```bash
   npm start
   ```

5. **Test forgot password**
   - Open http://localhost:5173/forgot-password
   - Enter test@example.com
   - Go to http://localhost:8025 to see email

**Advantages:**
- ✅ Beautiful web UI
- ✅ Can see full email
- ✅ No real emails sent
- ✅ More realistic testing

**Disadvantages:**
- ❌ Need to download MailHog
- ❌ Need to run separate process

---

### For Development Option C: Local Gmail (Same as Prod)

**Best for:** Testing with actual Gmail before deploying

**Steps:**

1. **Create Gmail App Password** (if not done)
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password

2. **Set environment variables in `.env`:**
   ```env
   MAIL_USER=your-email@gmail.com
   MAIL_PASS=xxxx xxxx xxxx xxxx
   ```

3. **Open `server/utils/email/mailer.js`**

4. **Replace production transporter** with Option C (lines 102-126):
   ```javascript
   export const transporter = nodemailer.createTransport({
     service: "gmail",
     auth: {
       user: process.env.MAIL_USER,
       pass: process.env.MAIL_PASS,
     },
     connectionTimeout: 30000,  // Dev: More lenient
     socketTimeout: 30000,
     pool: {
       maxConnections: 2,
       maxMessages: 50,
     },
     secure: true,
     requireTLS: true,
   });

   transporter.verify((err) => {
     if (err) {
       console.error("❌ Gmail SMTP error:", err.message);
     } else {
       console.log("✅ Gmail SMTP ready (LOCAL DEV MODE)");
     }
   });
   ```

5. **Restart server**
   ```bash
   npm start
   ```

**Advantages:**
- ✅ Real Gmail testing
- ✅ Same as production
- ✅ Full email delivery
- ✅ Best pre-deployment test

**Disadvantages:**
- ❌ Real emails are sent
- ❌ Gmail rate limits apply
- ❌ Need App Password setup

---

## 🔄 Switching Between Dev and Production

### Save Your Configurations

Create a file `mailer-configs.js` to keep all versions:

```javascript
// Development configs (keep for reference)
const ETHEREAL_CONFIG = { /* ... */ };
const MAILHOG_CONFIG = { /* ... */ };
const LOCAL_GMAIL_CONFIG = { /* ... */ };

// Production config
const PRODUCTION_CONFIG = { /* ... */ };
```

### Quick Switch Commands

**For Production (Render):**
```bash
# Ensure this is in mailer.js
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  // ...
});
```

**For Ethereal:**
```bash
# Uncomment lines 46-78 in mailer.js
# Comment out production transporter
```

**For MailHog:**
```bash
# Uncomment lines 81-99 in mailer.js
# Start MailHog first: ./mailhog
```

---

## 📧 Testing Password Reset with Each Config

### Step-by-Step Test

1. **Start backend:**
   ```bash
   cd server
   npm start
   ```
   Should see: `✅ SMTP is ready`

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Go to forgot password page:**
   ```
   http://localhost:5173/forgot-password
   ```

4. **Enter test email:**
   - Ethereal: Any email (test@test.com)
   - MailHog: Any email
   - Gmail: Your actual email to test real delivery

5. **Wait 3-5 seconds** (for email retry logic)

6. **Check results:**
   - **Ethereal:** Check console for URL
   - **MailHog:** Check http://localhost:8025
   - **Gmail:** Check inbox (may take up to 30s)

---

## 🚨 Troubleshooting

### "❌ SMTP error: Connection timeout"
```
✅ Solution: 
  - Ethereal: Check internet connection
  - MailHog: Ensure MailHog is running (./mailhog)
  - Gmail: Check MAIL_PASS is valid app password
```

### "Connection refused 127.0.0.1:1025"
```
✅ Solution:
  - Make sure MailHog is running in separate terminal
  - Start: ./mailhog
  - Then restart your Node server
```

### "Invalid login" for Gmail
```
✅ Solution:
  - Use 16-character App Password, NOT regular Gmail password
  - Get it from: https://myaccount.google.com/apppasswords
  - Make sure MAIL_USER and MAIL_PASS are correct in .env
```

### Email not arriving (Gmail)
```
✅ Solution:
  - Check spam folder
  - Verify FRONTEND_URL is correct in .env
  - Check backend logs for retry attempts
  - May take 5-30 seconds, give it time
```

---

## 🔐 Security Notes

### Production (Never do in Dev)
```javascript
// ✅ GOOD - Use environment variables
auth: {
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
}

// ❌ BAD - Never hardcode credentials
auth: {
  user: "myemail@gmail.com",
  pass: "mypassword",
}
```

### Development (OK for local testing)
```javascript
// ✅ OK for local dev - but not recommended
// Better to use Ethereal or MailHog
```

---

## 📊 Comparison Table

| Feature | Ethereal | MailHog | Local Gmail | Production |
|---------|----------|---------|-------------|------------|
| **Setup Time** | < 1 min | 5-10 min | 5 min | Already done |
| **UI** | Console | Web (8025) | Email inbox | N/A |
| **Real Emails** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Timeouts** | 30s | 30s | 30s | 10s |
| **Best For** | Quick test | Full test | Pre-deploy | Production |
| **Costs** | Free | Free | Free | Gmail (free) |

---

## ✅ Password Reset Email Testing Checklist

- [ ] Choose your dev environment (Ethereal/MailHog/Gmail)
- [ ] Update `server/utils/email/mailer.js` with selected config
- [ ] Start backend: `npm start`
- [ ] See `✅ SMTP is ready` in logs
- [ ] Start frontend: `npm run dev`
- [ ] Go to forgot password page
- [ ] Enter test email and click send
- [ ] Email arrives in expected place
- [ ] Click reset link in email
- [ ] Successfully reset password
- [ ] Test works! ✅

---

## Summary: No Changes Needed!

All password reset functionality automatically uses whatever `transporter` is exported from `mailer.js`. Just:

1. Pick your environment (Dev or Prod)
2. Uncomment/Comment the appropriate config
3. Restart server
4. Done! Emails work ✅

The retry logic in `sendWithRetry.js` works with ANY email configuration! 🎉
