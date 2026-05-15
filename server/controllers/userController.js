import UserModel from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';
// import { transporter } from '../utils/email/mailer.js';   // your existing mailer

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: addUser
// ─────────────────────────────────────────────────────────────────────────────
const addUser = async (req, res) => {
  try {
    const { name, address, phone, email, password, role } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) return sendError(res, 400, 'User already exists');

    let assignedRole = 'customer';
    if (req.user?.role === 'admin' && ['admin', 'staff', 'customer'].includes(role)) {
      assignedRole = role;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await UserModel.create({
      name, address, phone, email,
      password: hashedPassword,
      role: assignedRole,
      profileCompleted: true,
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    return sendResponse(res, 201, {
      token,
      user: {
        id: newUser._id, name: newUser.name, email: newUser.email,
        role: newUser.role, picture: newUser.picture || '',
        phone: newUser.phone || '', address: newUser.address || '',
        profileCompleted: newUser.profileCompleted,
      },
    }, 'User created successfully');
  } catch (error) {
    console.error('Error adding user:', error);
    return sendError(res, 500, `Failed to create user: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: getUsers  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { skip, limit, page, sort } = getPaginationParams(req);
    const total = await UserModel.countDocuments();
    const users = await UserModel.find()
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const meta = getPaginationMeta(total, limit, page);
    return sendResponse(res, 200, { users }, 'Users retrieved successfully', meta);
  } catch (error) {
    console.error('Error fetching users:', error);
    return sendError(res, 500, 'Failed to fetch users');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: getUser  (own profile)
// ─────────────────────────────────────────────────────────────────────────────
const getUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select('-password');
    if (!user) return sendError(res, 404, 'User not found');
    return sendResponse(res, 200, user, 'User retrieved successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to fetch user');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: updateUserprofile  (own profile — with optional pw change)
// ─────────────────────────────────────────────────────────────────────────────
const updateUserprofile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email, address, oldPassword, password } = req.body;
    const user = await UserModel.findById(userId);
    if (!user) return sendError(res, 404, 'User not found');

    const updateData = { name, email, address };

    if (password?.trim()) {
      if (!oldPassword) return sendError(res, 400, 'Current password is required');
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) return sendError(res, 400, 'Current password is incorrect');
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    return sendResponse(res, 200, updatedUser, 'Profile updated successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to update user profile');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: deleteUser  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const existingUser = await UserModel.findById(id);
    if (!existingUser) return sendError(res, 404, 'User not found');
    await UserModel.findByIdAndDelete(id);
    return sendResponse(res, 200, null, 'User deleted successfully');
  } catch (error) {
    return sendError(res, 500, 'Failed to delete user');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING: updateProfile  (complete-profile flow)
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { phone, address } = req.body;
    const userId = req.user._id;
    if (!phone) return sendError(res, 400, 'Phone number is required');

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { phone, address, profileCompleted: true },
      { new: true }
    ).select('-password');

    return sendResponse(res, 200, {
      user: {
        id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
        role: updatedUser.role, picture: updatedUser.picture || '',
        phone: updatedUser.phone || '', address: updatedUser.address || '',
        profileCompleted: updatedUser.profileCompleted,
      },
    }, 'Profile updated successfully');
  } catch (error) {
    return sendError(res, 500, `Failed to update profile: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW: updateUser  (admin edits any user's name, email, phone, address, role)
// ─────────────────────────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, role } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return sendError(res, 404, 'User not found');

    // Guard: prevent demoting the last admin
    if (user.role === 'admin' && role && role !== 'admin') {
      const adminCount = await UserModel.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return sendError(res, 400, 'Cannot change role — at least one admin must exist');
      }
    }

    // Guard: email uniqueness if changed
    if (email && email !== user.email) {
      const conflict = await UserModel.findOne({ email, _id: { $ne: id } });
      if (conflict) return sendError(res, 400, 'Email is already in use by another account');
    }

    const allowed = ['admin', 'staff', 'customer'];
    const updateData = {
      ...(name    && { name }),
      ...(email   && { email }),
      ...(phone   !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(role && allowed.includes(role) && { role }),
    };

    const updated = await UserModel.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    return sendResponse(res, 200, { user: updated }, 'User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    return sendError(res, 500, `Failed to update user: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// In-memory job store  (replace with Redis/DB for multi-instance deployments)
// ─────────────────────────────────────────────────────────────────────────────
const broadcastJobs = new Map();
// job shape: { status:'running'|'done', total, sent, failed, failedList:[{email,reason}], startedAt, finishedAt }

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/email-broadcast
//   Validates, resolves recipients, responds immediately with a jobId,
//   then sends emails in the background — so the frontend never times out.
// ─────────────────────────────────────────────────────────────────────────────
const emailBroadcast = async (req, res) => {
  try {
    const { targetRole, singleEmail, subject, body, attachments = [] } = req.body;

    if (!subject?.trim()) return sendError(res, 400, 'Email subject is required');
    if (!body?.trim())    return sendError(res, 400, 'Email body is required');

    // ── 1. Resolve recipients (fast DB query — fine to do before responding) ──
    let recipients = [];
    if (singleEmail) {
      const match = await UserModel.findOne({ email: singleEmail }).select('name email');
      if (!match) return sendError(res, 404, `No user found with email: ${singleEmail}`);
      recipients = [match];
    } else if (targetRole === 'all') {
      recipients = await UserModel.find().select('name email');
    } else if (['admin', 'staff', 'customer'].includes(targetRole)) {
      recipients = await UserModel.find({ role: targetRole }).select('name email');
    } else {
      return sendError(res, 400, 'Provide a valid targetRole or singleEmail');
    }

    if (recipients.length === 0) {
      return sendError(res, 404, 'No recipients found for the selected target');
    }

    // ── 2. Create job record & respond IMMEDIATELY — no timeout possible ──
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    broadcastJobs.set(jobId, {
      status: 'running',
      total: recipients.length,
      sent: 0,
      failed: 0,
      failedList: [],   // [{ email, reason }]
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });

    // ── 3. Respond immediately with 202 Accepted ──
    res.status(202).json({
      success: true,
      message: `Broadcast started for ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`,
      data: { jobId, total: recipients.length },
    });

    // ── 4. Build shared resources (done once, not per-email) ──
    const mailAttachments = attachments.map(att => ({
      filename: att.name,
      content:  Buffer.from(att.base64, 'base64'),
      contentType: att.type,
    }));

    const htmlShell = (innerBody) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;width:100%;">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">📦 Inventory System</p>
        </td></tr>
        <tr><td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">${innerBody}</td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            This email was sent by your inventory management system.
            If you believe this was sent in error, please contact your administrator.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ── 5. Send in background — errors are caught per-recipient ──
    const job = broadcastJobs.get(jobId);
    const BATCH = 5; // conservative: avoid Gmail rate limits

    (async () => {
      for (let i = 0; i < recipients.length; i += BATCH) {
        const batch = recipients.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(user =>
            transporter.sendMail({
              from:        `"Inventory System" <${process.env.MAIL_USER}>`,
              to:          user.email,
              subject,
              html:        htmlShell(body),
              attachments: mailAttachments,
            }).then(() => ({ ok: true, email: user.email }))
              .catch(err => ({ ok: false, email: user.email, reason: _classifyError(err) }))
          )
        );

        for (const r of results) {
          const val = r.value || { ok: false, email: '?', reason: 'Unknown error' };
          if (val.ok) {
            job.sent++;
          } else {
            job.failed++;
            job.failedList.push({ email: val.email, reason: val.reason });
            console.warn(`[Broadcast ${jobId}] Failed → ${val.email}: ${val.reason}`);
          }
        }

        // Small pause between batches to respect Gmail send rate limits
        if (i + BATCH < recipients.length) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      job.status = 'done';
      job.finishedAt = new Date().toISOString();
      console.log(`[Broadcast ${jobId}] Done — sent:${job.sent} failed:${job.failed}/${job.total}`);

      // Auto-clean after 30 min so Map doesn't grow forever
      setTimeout(() => broadcastJobs.delete(jobId), 30 * 60 * 1000);
    })().catch(err => {
      console.error(`[Broadcast ${jobId}] Fatal background error:`, err);
      job.status = 'done';
      job.finishedAt = new Date().toISOString();
    });

  } catch (error) {
    console.error('Email broadcast setup error:', error);
    return sendError(res, 500, `Failed to start email broadcast: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/email-broadcast/:jobId
//   Frontend polls this every 3s until status === 'done'
// ─────────────────────────────────────────────────────────────────────────────
const emailBroadcastStatus = (req, res) => {
  const job = broadcastJobs.get(req.params.jobId);
  if (!job) return sendError(res, 404, 'Job not found or already expired');
  return sendResponse(res, 200, { job }, 'Job status retrieved');
};

// ── Helper: turn raw SMTP errors into plain-English reasons ──────────────────
function _classifyError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid') || msg.includes('does not exist') || msg.includes('550') || msg.includes('551') || msg.includes('553'))
    return 'Invalid or non-existent email address';
  if (msg.includes('timeout') || msg.includes('etimedout') || msg.includes('econnreset'))
    return 'Connection timed out — likely a temporary network issue';
  if (msg.includes('spam') || msg.includes('blocked') || msg.includes('554'))
    return 'Rejected as spam by recipient server';
  if (msg.includes('rate') || msg.includes('too many') || msg.includes('421'))
    return 'Rate limited by mail server — will retry on next broadcast';
  if (msg.includes('enotfound') || msg.includes('getaddrinfo'))
    return 'Recipient mail server could not be reached (DNS failure)';
  return err?.message || 'Unknown delivery error';
}

export {
  addUser,
  getUser,
  getUsers,
  deleteUser,
  updateProfile,
  updateUserprofile,
  updateUser,
  emailBroadcast,
  emailBroadcastStatus,
};