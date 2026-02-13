const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Admin = require('../models/Admin');
const PasswordResetToken = require('../models/PasswordResetToken');
const emailService = require('../services/emailService');
const { authenticateToken } = require('../middleware/auth');

// Generate JWT token
function generateToken(adminId) {
  return jwt.sign(
    { id: adminId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin by email
    const admin = await Admin.findByEmail(email);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if admin is active
    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await Admin.verifyPassword(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await Admin.updateLastLogin(admin.id);

    // Generate JWT token
    const token = generateToken(admin.id);

    // Return token and admin info (without password)
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        created_at: admin.created_at,
        last_login: admin.last_login
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get current admin info (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      admin: req.admin
    });
  } catch (error) {
    console.error('Error fetching admin info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Request password reset
// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 FORGOT PASSWORD REQUEST FOR:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find admin by email
    const admin = await Admin.findByEmail(email);
    console.log('🔍 Admin found:', admin ? 'YES' : 'NO');

    // SECURITY: Always return success message even if email doesn't exist
    let responseMessage = 'If an account with that email exists, a password reset link has been sent';
    
    if (!admin) {
      console.log('⚠️ No admin found with email:', email);
      return res.json({
        success: true,
        message: responseMessage
      });
    }

    console.log('✅ Admin details:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      is_active: admin.is_active
    });

    // Check if admin is active
    if (!admin.is_active) {
      console.log('⛔ Admin account is inactive');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Create password reset token
    console.log('🔐 Creating password reset token...');
    const resetToken = await PasswordResetToken.create(admin.id);
    
    if (!resetToken) {
      console.error('❌ FAILED: PasswordResetToken.create() returned null/undefined');
      throw new Error('Failed to create reset token');
    }
    
    if (!resetToken.token) {
      console.error('❌ FAILED: resetToken.token is missing');
      console.log('Reset token object:', resetToken);
      throw new Error('Reset token missing from created object');
    }
    
    console.log('✅ Token created successfully');
    console.log('🔑 Token (first 10 chars):', resetToken.token.substring(0, 10) + '...');
    console.log('🔑 Full token:', resetToken.token);

    // Create reset link
    const resetLink = `${process.env.CLIENT_URL}/admin/reset-password/${resetToken.token}`;
    console.log('🔗 RESET LINK:', resetLink);

    try {
      // Send reset email
      console.log('📤 Attempting to send email via emailService...');
      const emailResult = await emailService.sendPasswordResetEmail(email, resetToken.token, admin.name);
      console.log('✅ Email service returned:', emailResult ? 'Success' : 'No result');
      
      if (emailResult && emailResult.messageId) {
        console.log('📧 Email sent! Message ID:', emailResult.messageId);
      }
      
    } catch (emailError) {
      console.error('❌ EMAIL SENDING FAILED:');
      console.error('Error name:', emailError.name);
      console.error('Error message:', emailError.message);
      console.error('Error stack:', emailError.stack);
      
      // Log the reset link for manual testing
      console.log('🔗 MANUAL RESET LINK (for testing):', resetLink);
      
      // Still return success to user for security
      console.log('⚠️ Returning success to user despite email error');
    }

    console.log('✅ Forgot password process completed');
    res.json({
      success: true,
      message: responseMessage
    });

  } catch (error) {
    console.error('❌ FORGOT PASSWORD ERROR:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error processing your request'
    });
  }
});

// Reset password with token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find and validate token
    const isTokenValid = await PasswordResetToken.isValid(token);

    if (!isTokenValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Get token details (with admin info)
    const tokenRecord = await PasswordResetToken.findByToken(token);

    if (!tokenRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Update admin password
    await Admin.updatePassword(tokenRecord.admin_id, password);

    // Mark token as used
    await PasswordResetToken.markAsUsed(token);

    // Send confirmation email
    try {
      await emailService.sendPasswordChangedEmail(tokenRecord.email, tokenRecord.name);
    } catch (emailError) {
      console.error('Error sending password changed email:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Change password (for logged in admins)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get admin
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isValidPassword = await Admin.verifyPassword(currentPassword, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Update password
    await Admin.updatePassword(admin.id, newPassword);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Logout (in JWT, logout is handled client-side by removing token)
// But we can optionally invalidate tokens server-side if needed
router.post('/logout', authenticateToken, async (req, res) => {
  // For JWT, logout is handled on client-side by removing the token
  // If using sessions, you would invalidate the session here
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// ==================== AUDIT LOG ROUTES FOR ADMINS ====================

const AuditLog = require('../models/AuditLog');
const ReportGenerator = require('../utils/reportGenerator');

// Get admin's own audit logs
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      actionType = null,
      startDate = null,
      endDate = null,
      entityType = null
    } = req.query;

    const logs = await AuditLog.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      performedById: req.admin.id,
      performedByType: 'ADMIN',
      actionType: actionType || null,
      startDate: startDate || null,
      endDate: endDate || null,
      entityType: entityType || null
    });

    res.json({
      success: true,
      data: logs.data || logs,
      pagination: logs.pagination || {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length || 0,
        pages: Math.ceil((logs.length || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
});

// Get all admin audit logs without pagination (for reports)
router.get('/audit-logs/all', authenticateToken, async (req, res) => {
  try {
    const {
      actionType = null,
      startDate = null,
      endDate = null,
      entityType = null
    } = req.query;

    const logs = await AuditLog.findAll({
      page: 1,
      limit: 50000,
      performedById: req.admin.id,
      performedByType: 'ADMIN',
      actionType: actionType || null,
      startDate: startDate || null,
      endDate: endDate || null,
      entityType: entityType || null
    });

    res.json({
      success: true,
      data: logs.data || logs,
      count: (logs.data || logs).length
    });
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
});

// Generate admin audit log report (PDF or CSV)
router.post('/audit-logs/report', authenticateToken, async (req, res) => {
  try {
    const {
      format = 'pdf', // pdf or csv
      actionType = null,
      startDate = null,
      endDate = null,
      entityType = null,
      pageLogsOnly = false, // If true, only export logs from current page
      logsPerPage = 50,
      currentPage = 1
    } = req.body;

    let logs;
    
    if (pageLogsOnly) {
      // Fetch logs for current page only
      logs = await AuditLog.findAll({
        page: parseInt(currentPage),
        limit: parseInt(logsPerPage),
        performedById: req.admin.id,
        performedByType: 'ADMIN',
        actionType: actionType || null,
        startDate: startDate || null,
        endDate: endDate || null,
        entityType: entityType || null
      });
      logs = logs.data || logs;
    } else {
      // Fetch all logs for export
      logs = await AuditLog.findAll({
        page: 1,
        limit: 50000,
        performedById: req.admin.id,
        performedByType: 'ADMIN',
        actionType: actionType || null,
        startDate: startDate || null,
        endDate: endDate || null,
        entityType: entityType || null
      });
      logs = logs.data || logs;
    }

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No audit logs found matching the specified criteria'
      });
    }

    // Generate report
    const report = await ReportGenerator.generate(logs, format, {
      performedById: req.admin.id,
      actionType,
      startDate,
      endDate,
      entityType
    });

    // Prepare response
    const filename = `admin-audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;

    if (format.toLowerCase() === 'pdf') {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': report.length
      });
      return res.send(report);
    } else if (format.toLowerCase() === 'csv') {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      return res.send(report);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format specified. Use "pdf" or "csv".'
      });
    }

  } catch (error) {
    console.error('Error generating admin report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
});

module.exports = router;
