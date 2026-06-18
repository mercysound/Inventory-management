import UserModel from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendResponse, sendError } from '../utils/apiResponse.js';
import { getPaginationParams, getPaginationMeta } from '../utils/pagination.js';
import { sendWithRetry } from '../utils/email/sendWithRetry.js';

const VALID_ROLES = ['admin', 'staff', 'customer', 'wholesale'];

// ─────────────────────────────────────────────────────────────────────────────
// addUser
// ─────────────────────────────────────────────────────────────────────────────
const addUser = async (req, res) => {
  try {
    const { name, address, phone, email, password, role } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) return sendError(res, 400, 'User already exists');

    let assignedRole = 'customer';
    if (req.user?.role === 'admin' && VALID_ROLES.includes(role)) {
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
// getUsers (admin only)
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
// getUser (own profile)
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
// updateUserprofile (own profile)
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
// deleteUser (admin only)
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
// updateProfile (complete-profile flow)
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
// updateUser (admin edits any user — including password reset)
// Admin does NOT need the old password. This is a privileged override.
// ─────────────────────────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, role, newPassword } = req.body;

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

    const updateData = {
      ...(name    && { name }),
      ...(email   && { email }),
      ...(phone   !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(role && VALID_ROLES.includes(role) && { role }),
    };

    // Admin password reset — hash the new password directly, no old password needed
    if (newPassword && newPassword.trim().length >= 6) {
      updateData.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    const updated = await UserModel.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    return sendResponse(res, 200, { user: updated }, 'User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    return sendError(res, 500, `Failed to update user: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// In-memory job store
// ─────────────────────────────────────────────────────────────────────────────
const broadcastJobs = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// emailBroadcast — POST /users/email-broadcast
// ─────────────────────────────────────────────────────────────────────────────
const emailBroadcast = async (req, res) => {
  try {
    const { targetRole, singleEmail, subject, body, attachments = [] } = req.body;

    if (!subject?.trim()) return sendError(res, 400, 'Email subject is required');
    if (!body?.trim())    return sendError(res, 400, 'Email body is required');

    let recipients = [];
    if (singleEmail) {
      const match = await UserModel.findOne({ email: singleEmail }).select('name email');
      if (!match) return sendError(res, 404, `No user found with email: ${singleEmail}`);
      recipients = [match];
    } else if (targetRole === 'all') {
      recipients = await UserModel.find().select('name email');
    } else if (VALID_ROLES.includes(targetRole)) {
      recipients = await UserModel.find({ role: targetRole }).select('name email');
    } else {
      return sendError(res, 400, 'Provide a valid targetRole or singleEmail');
    }

    if (recipients.length === 0) {
      return sendError(res, 404, 'No recipients found for the selected target');
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    broadcastJobs.set(jobId, {
      status: 'running',
      total: recipients.length,
      sent: 0,
      failed: 0,
      failedList: [],
      startedAt: new Date().toISOString(),
      finishedAt: null,
    });

    res.status(202).json({
      success: true,
      message: `Broadcast started for ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`,
      data: { jobId, total: recipients.length },
    });

    const mailAttachments = attachments.map(att => ({
      filename: att.name,
      content:  Buffer.from(att.base64, 'base64'),
      contentType: att.type,
    }));

    const htmlShell = (innerBody) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.06);max-width:560px;width:100%;">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">📦 Inventory System</p>
        </td></tr>
        <tr><td style="padding:32px;color:#374151;font-size:14px;line-height:1.7;">${innerBody}</td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            This email was sent by your inventory management system.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const job = broadcastJobs.get(jobId);
    const BATCH = 5;

    (async () => {
      for (let i = 0; i < recipients.length; i += BATCH) {
        const batch = recipients.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(user =>
            sendWithRetry({
              to:      user.email,
              subject,
              html:    htmlShell(body),
            }).then(() => ({ ok: true, email: user.email }))
              .catch(err => ({ ok: false, email: user.email, reason: _classifyError(err) }))
          )
        );

        for (const r of results) {
          const val = r.value || { ok: false, email: '?', reason: 'Unknown error' };
          if (val.ok) { job.sent++; }
          else { job.failed++; job.failedList.push({ email: val.email, reason: val.reason }); }
        }

        if (i + BATCH < recipients.length) {
          await new Promise(r => setTimeout(r, 400));
        }
      }

      job.status = 'done';
      job.finishedAt = new Date().toISOString();
      setTimeout(() => broadcastJobs.delete(jobId), 30 * 60 * 1000);
    })().catch(err => {
      console.error(`[Broadcast ${jobId}] Fatal:`, err);
      job.status = 'done';
      job.finishedAt = new Date().toISOString();
    });

  } catch (error) {
    console.error('Email broadcast setup error:', error);
    return sendError(res, 500, `Failed to start email broadcast: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// emailBroadcastStatus — GET /users/email-broadcast/:jobId
// ─────────────────────────────────────────────────────────────────────────────
const emailBroadcastStatus = (req, res) => {
  const job = broadcastJobs.get(req.params.jobId);
  if (!job) return sendError(res, 404, 'Job not found or already expired');
  return sendResponse(res, 200, { job }, 'Job status retrieved');
};

function _classifyError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid') || msg.includes('does not exist') || msg.includes('550'))
    return 'Invalid or non-existent email address';
  if (msg.includes('timeout') || msg.includes('etimedout'))
    return 'Connection timed out';
  if (msg.includes('spam') || msg.includes('blocked') || msg.includes('554'))
    return 'Rejected as spam';
  if (msg.includes('rate') || msg.includes('too many'))
    return 'Rate limited by mail server';
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
