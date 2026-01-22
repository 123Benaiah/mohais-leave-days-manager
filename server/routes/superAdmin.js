const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const pool = require('../config/database');

// Middleware to authenticate super admin
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify it's a super admin token
    if (decoded.type !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
    }

    const superAdmin = await SuperAdmin.findById(decoded.id);
    if (!superAdmin || !superAdmin.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive account' });
    }

    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Generate JWT token for super admin
function generateToken(superAdminId) {
  return jwt.sign(
    { id: superAdminId, type: 'super_admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// ==================== AUTH ROUTES ====================

// Super Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const superAdmin = await SuperAdmin.findByEmail(email);

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!superAdmin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const isValidPassword = await SuperAdmin.verifyPassword(password, superAdmin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    await SuperAdmin.updateLastLogin(superAdmin.id);

    const token = generateToken(superAdmin.id);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        created_at: superAdmin.created_at,
        last_login: superAdmin.last_login
      }
    });

  } catch (error) {
    console.error('Super Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get current super admin info
router.get('/me', authenticateSuperAdmin, async (req, res) => {
  res.json({
    success: true,
    superAdmin: req.superAdmin
  });
});

// Update super admin profile (name/email)
router.put('/me', authenticateSuperAdmin, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    params.push(req.superAdmin.id);

    await pool.query(
      `UPDATE super_admin SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await SuperAdmin.findById(req.superAdmin.id);

    // Log the action
    await AuditLog.create({
      actionType: 'UPDATE',
      entityType: 'SUPER_ADMIN',
      entityId: updated.id,
      entityName: updated.name || updated.email,
      performedById: req.superAdmin.id,
      performedByType: 'SUPER_ADMIN',
      performedByName: req.superAdmin.name,
      oldValues: { name: req.superAdmin.name, email: req.superAdmin.email },
      newValues: { name: updated.name, email: updated.email },
      description: 'Updated super admin profile',
      ipAddress: req.ip
    });

    res.json({ success: true, superAdmin: updated });
  } catch (error) {
    console.error('Error updating super admin profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update super admin password
router.put('/me/password', authenticateSuperAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    // fetch hash
    const [rows] = await pool.query(
      'SELECT password_hash FROM super_admin WHERE id = ?',
      [req.superAdmin.id]
    );
    const record = rows[0];
    if (!record) {
      return res.status(404).json({ success: false, message: 'Super admin not found' });
    }

    const valid = await bcrypt.compare(currentPassword, record.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE super_admin SET password_hash = ? WHERE id = ?',
      [passwordHash, req.superAdmin.id]
    );

    // Log the action (do not store password)
    await AuditLog.create({
      actionType: 'UPDATE',
      entityType: 'SUPER_ADMIN',
      entityId: req.superAdmin.id,
      entityName: req.superAdmin.name || req.superAdmin.email,
      performedById: req.superAdmin.id,
      performedByType: 'SUPER_ADMIN',
      performedByName: req.superAdmin.name,
      description: 'Updated super admin password',
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating super admin password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== ADMIN CRUD ROUTES ====================

// Get all admins
router.get('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const [admins] = await pool.query(
      'SELECT id, email, name, is_active, created_at, last_login FROM admin_users ORDER BY created_at DESC'
    );
    res.json({ success: true, admins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single admin
router.get('/admins/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    res.json({ success: true, admin });
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new admin
router.post('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if email already exists
    const existing = await Admin.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const newAdmin = await Admin.create(email, password, name);

    // Log the action
    await AuditLog.create({
      actionType: 'CREATE',
      entityType: 'ADMIN',
      entityId: newAdmin.id,
      entityName: newAdmin.name || newAdmin.email,
      performedById: req.superAdmin.id,
      performedByType: 'SUPER_ADMIN',
      performedByName: req.superAdmin.name,
      newValues: { email, name },
      description: `Created new admin: ${newAdmin.email}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: newAdmin
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update admin
router.put('/admins/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, password, is_active } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const oldValues = { email: admin.email, name: admin.name, is_active: admin.is_active };
    const updates = [];
    const params = [];

    if (email && email !== admin.email) {
      // Check if new email already exists
      const existing = await Admin.findByEmail(email);
      if (existing && existing.id !== parseInt(id)) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
      updates.push('email = ?');
      params.push(email);
    }

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    params.push(id);
    await pool.query(
      `UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedAdmin = await Admin.findById(id);

    // Log the action
    await AuditLog.create({
      actionType: 'UPDATE',
      entityType: 'ADMIN',
      entityId: parseInt(id),
      entityName: updatedAdmin.name || updatedAdmin.email,
      performedById: req.superAdmin.id,
      performedByType: 'SUPER_ADMIN',
      performedByName: req.superAdmin.name,
      oldValues,
      newValues: { email: updatedAdmin.email, name: updatedAdmin.name, is_active: updatedAdmin.is_active },
      description: `Updated admin: ${updatedAdmin.email}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: updatedAdmin
    });

  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete admin
router.delete('/admins/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    await pool.query('DELETE FROM admin_users WHERE id = ?', [id]);

    // Log the action
    await AuditLog.create({
      actionType: 'DELETE',
      entityType: 'ADMIN',
      entityId: parseInt(id),
      entityName: admin.name || admin.email,
      performedById: req.superAdmin.id,
      performedByType: 'SUPER_ADMIN',
      performedByName: req.superAdmin.name,
      oldValues: { email: admin.email, name: admin.name },
      description: `Deleted admin: ${admin.email}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== AUDIT LOG ROUTES ====================

// Get all audit logs (returns all logs for client-side pagination)
router.get('/simple-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { entityType, actionType, employeeNumber, startDate, endDate, performedById, performedByName } = req.query;

    const filters = {
      entityType,
      actionType,
      employeeNumber: employeeNumber || null,
      startDate: startDate || null,
      endDate: endDate || null,
      performedById: performedById || null,
      performedByName: performedByName || null
    };

    // Get all logs without server-side pagination
    const logs = await AuditLog.findAll({
      page: 1,
      limit: 10000, // Large number to get all logs
      ...filters
    });

    res.json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all audit logs
router.get('/audit-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, entityType, actionType, employeeNumber, startDate, endDate, performedById, performedByName } = req.query;

    const filters = {
      entityType,
      actionType,
      employeeNumber: employeeNumber || null,
      startDate: startDate || null,
      endDate: endDate || null,
      performedById: performedById || null,
      performedByName: performedByName || null
    };

    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;

    const logs = await AuditLog.findAll({
      page: parsedPage,
      limit: parsedLimit,
      ...filters
    });

    const total = await AuditLog.count(filters);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get recent activity
router.get('/recent-activity', authenticateSuperAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const activity = await AuditLog.getRecentActivity(parseInt(limit));
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete single audit log
router.delete('/audit-logs/:id', authenticateSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if log exists
    const [existing] = await pool.query('SELECT * FROM audit_logs WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    // Delete the log
    await pool.query('DELETE FROM audit_logs WHERE id = ?', [id]);

    res.json({ success: true, message: 'Audit log deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit log:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete multiple audit logs
router.delete('/audit-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { ids, startDate, endDate, deleteAll } = req.body;

    let deletedCount = 0;

    if (deleteAll) {
      // Delete all logs
      const [result] = await pool.query('DELETE FROM audit_logs');
      deletedCount = result.affectedRows;
    } else if (startDate && endDate) {
      // Delete logs within date range
      const [result] = await pool.query(
        'DELETE FROM audit_logs WHERE created_at BETWEEN ? AND ?',
        [startDate, endDate]
      );
      deletedCount = result.affectedRows;
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Delete specific logs by IDs
      const placeholders = ids.map(() => '?').join(',');
      const [result] = await pool.query(
        `DELETE FROM audit_logs WHERE id IN (${placeholders})`,
        ids
      );
      deletedCount = result.affectedRows;
    } else {
      return res.status(400).json({ success: false, message: 'No logs specified for deletion' });
    }

    res.json({ success: true, message: `${deletedCount} audit log(s) deleted successfully`, deletedCount });
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateSuperAdmin, async (req, res) => {
  try {
    // Get admin count
    const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM admin_users');

    // Get employee count
    const [employeeCount] = await pool.query('SELECT COUNT(*) as count FROM employees');

    // Get today's activity count
    const [todayActivity] = await pool.query(
      'SELECT COUNT(*) as count FROM audit_logs WHERE DATE(created_at) = CURDATE()'
    );

    // Get action breakdown for last 7 days
    const [actionBreakdown] = await pool.query(`
      SELECT action_type, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY action_type
    `);

    res.json({
      success: true,
      stats: {
        totalAdmins: adminCount[0].count,
        totalEmployees: employeeCount[0].count,
        todayActivity: todayActivity[0].count,
        actionBreakdown
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
