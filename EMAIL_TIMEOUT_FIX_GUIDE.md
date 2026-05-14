# Email Timeout Fix - Production Deployment Guide

## Problem Summary
Your application was experiencing **SMTP connection timeouts** on Render when attempting to send password reset emails. This caused:
- `timeout of 30000ms exceeded` errors on the frontend
- `ETIMEDOUT` errors on the backend from nodemailer
- Failed password reset requests

## Root Causes
1. **No timeout configuration in nodemailer** - SMTP connections had no explicit timeout limits
2. **No retry mechanism** - A single connection failure meant the entire request failed
3. **Insufficient frontend timeout** - 30 seconds wasn't enough for SMTP + retries
4. **No connection pooling** - Each email attempted a fresh SMTP connection

## Solutions Implemented

### 1. Enhanced SMTP Configuration
**File:** `server/utils/email/mailer.js`

Added production-grade settings:
- Connection timeout: 10 seconds
- Socket timeout: 10 seconds  
- Connection pooling (max 3 concurrent connections)
- TLS/SSL enforcement for Render compatibility

```javascript
pool: {
  maxConnections: 3,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 10,
}
```

### 2. Automatic Retry with Exponential Backoff
**Files:** 
- `server/utils/email/sendWithRetry.js` (new)
- All email functions updated to use `sendWithRetry()`

Retry strategy:
- Up to 3 attempts per email
- Exponential backoff: 1s → 2s → 4s
- 15-second timeout per send attempt
- Detailed logging of each attempt

### 3. Extended Frontend Timeout
**File:** `frontend/src/utils/api.js`

- Email routes (forgot-password): **60 seconds** (allows for 3 retries + delays)
- Slow routes (dashboard): **30 seconds**
- Default routes: **10 seconds**

### 4. Better Error Messages
**File:** `frontend/src/pages/ForgotPassword.jsx`

User-friendly error messages:
- Timeout: "Request timed out. Email service may be slow. Please wait a moment and try again."
- 500 error: "Email service is temporarily unavailable. Please try again later."
- Default: "Failed to send reset email. Please try again."

## Deployment Checklist

### ✅ Before Deploying to Render

1. **Verify Environment Variables:**
   ```
   MAIL_USER=your-gmail@gmail.com
   MAIL_PASS=your-app-password  (NOT your Gmail password)
   FRONTEND_URL=https://your-frontend-domain.com
   ```

2. **Use Gmail App Password (NOT Regular Password):**
   - Go to: https://myaccount.google.com/apppasswords
   - Generate a 16-character app password
   - Use this in `MAIL_PASS`, not your regular Gmail password

3. **Enable "Less secure app access" (if needed):**
   - https://myaccount.google.com/lesssecureapps
   - Or use App Passwords (recommended above)

4. **Test Locally:**
   ```bash
   # Backend
   npm start
   # Test forgot-password endpoint with curl/Postman
   
   # Frontend
   npm run dev
   # Test forgot password form
   ```

### 🚀 Deploy Steps

1. **Push changes to git:**
   ```bash
   git add .
   git commit -m "Fix: Add SMTP timeout configuration and retry logic for email sending"
   git push
   ```

2. **On Render:**
   - Changes auto-deploy
   - Check Render logs for: `✅ SMTP is ready`
   - If you see `❌ SMTP error`, verify environment variables

3. **Test in Production:**
   - Go to forgot password page
   - Enter test email
   - Should receive email within 60 seconds
   - Check Render logs for detailed retry attempts

### 🔍 Monitoring & Debugging

**Check logs for successful email sending:**
```
📧 Sending email (attempt 1/3)...
✅ Email sent successfully: <message-id>
```

**If still failing:**
```
❌ Attempt 1 failed (ETIMEDOUT): connect ETIMEDOUT
⏳ Retrying in 1000ms...
```

### 📊 Logs Meaning

| Log | Status | Action |
|-----|--------|--------|
| `✅ SMTP is ready` | OK | Email service initialized |
| `📧 Sending email (attempt X/3)` | Attempting | Normal |
| `✅ Email sent successfully` | SUCCESS | Email sent |
| `❌ Attempt X failed` | Retrying | Will retry soon |
| `❌ SMTP error` | CRITICAL | Check env vars |

## Estimated Performance Improvements

| Scenario | Before | After |
|----------|--------|-------|
| SMTP working normally | ~2-3 seconds | ~2-3 seconds |
| Transient connection issue | ❌ Timeout/failure | ✅ Succeeds on retry |
| SMTP service slow | ❌ Timeout | ✅ Succeeds (extended timeout) |
| User never sees hanging UI | ❌ 30s wait | ✅ 60s with better messages |

## Alternative Solutions (Future)

If email issues persist:
1. **Switch to Resend/SendGrid:** No SMTP connection issues
2. **Add message queue:** Redis + Bull for async email processing
3. **Use Render custom domains:** Better IP reputation

## Testing the Fix

### Test Case 1: Normal Email Send
```bash
curl -X POST http://localhost:5002/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```
Expected: Email arrives within 3 seconds

### Test Case 2: Simulate Slow SMTP
Check logs - should show retries if SMTP is slow

### Test Case 3: Check Connection Pool
Monitor SMTP logs - should reuse connections

## Rollback (If Needed)

If new code causes issues:
```bash
git revert HEAD
git push  # Render auto-deploys
```

This will revert to the version before these fixes.

## Support

For persistent issues:
1. Check Render logs in dashboard
2. Verify Gmail App Password is set correctly
3. Check `FRONTEND_URL` matches your actual domain
4. Consider switching to SendGrid/Resend if issues continue
