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

    const existing = await Admin.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const newAdmin = await Admin.create(email, password, name);

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

// Get audit logs with pagination and filtering
router.get('/audit-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      entityType, 
      actionType, 
      employeeNumber, 
      startDate, 
      endDate, 
      adminName,
      employeeName,
      entityIds
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      entityType: entityType || null,
      actionType: actionType || null,
      employeeNumber: employeeNumber || null,
      startDate: startDate || null,
      endDate: endDate || null,
      adminName: adminName || null,
      employeeName: employeeName || null,
      entityIds: entityIds ? entityIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : null
    };

    const logs = await AuditLog.findAll(filters);
    const total = await AuditLog.count(filters);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get simple logs (no pagination for client-side filtering)
router.get('/simple-logs', authenticateSuperAdmin, async (req, res) => {
  try {
    const { 
      entityType, 
      actionType, 
      employeeNumber, 
      startDate, 
      endDate, 
      adminName,
      employeeName
    } = req.query;

    const filters = {
      page: 1,
      limit: 1000, // Get all logs for client-side filtering
      entityType: entityType || null,
      actionType: actionType || null,
      employeeNumber: employeeNumber || null,
      startDate: startDate || null,
      endDate: endDate || null,
      adminName: adminName || null,
      employeeName: employeeName || null
    };

    const logs = await AuditLog.findAll(filters);

    res.json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Error fetching simple logs:', error);
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

    const [existing] = await pool.query('SELECT * FROM audit_logs WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

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
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No logs specified for deletion' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.query(
      `DELETE FROM audit_logs WHERE id IN (${placeholders})`,
      ids
    );

    res.json({ 
      success: true, 
      message: `${result.affectedRows} audit log(s) deleted successfully`, 
      deletedCount: result.affectedRows 
    });
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateSuperAdmin, async (req, res) => {
  try {
    const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM admin_users');
    const [employeeCount] = await pool.query('SELECT COUNT(*) as count FROM employees');
    const [todayActivity] = await pool.query(
      'SELECT COUNT(*) as count FROM audit_logs WHERE DATE(created_at) = CURDATE()'
    );

    res.json({
      success: true,
      stats: {
        totalAdmins: adminCount[0].count,
        totalEmployees: employeeCount[0].count,
        todayActivity: todayActivity[0].count
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== REPORT GENERATION ROUTES ====================

// Generate audit log report
router.post('/audit-logs/report', authenticateSuperAdmin, async (req, res) => {
  try {
    const {
      format = 'pdf',
      entityIds,
      actionType,
      employeeNumber,
      startDate,
      endDate,
      adminName,
      employeeName
    } = req.body;

    const filters = {
      page: 1,
      limit: 10000,
      entityType: 'EMPLOYEE',
      actionType: actionType || null,
      employeeNumber: employeeNumber || null,
      startDate: startDate || null,
      endDate: endDate || null,
      adminName: adminName || null,
      employeeName: employeeName || null,
      entityIds: entityIds ? (Array.isArray(entityIds) ? entityIds : [entityIds]) : null
    };

    const logs = await AuditLog.findAll(filters);

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No audit logs found matching the specified criteria'
      });
    }

    // Simple CSV generation
    if (format.toLowerCase() === 'csv') {
      const headers = ['ID', 'Action', 'Entity', 'Employee', 'Admin', 'Changes', 'Date'];
      const csvRows = logs.map(log => [
        log.id,
        log.action_type,
        log.entity_type,
        log.entity_name,
        log.performed_by_name,
        log.description || 'No changes',
        new Date(log.created_at).toLocaleString()
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      return res.send(csvContent);
    }
    
    else if (format.toLowerCase() === 'pdf') {
  const PDFDocument = require('pdfkit');
  const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.pdf`;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`
  });

  const buffers = [];
  const doc = new PDFDocument();
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.send(pdfData);
  });

  // Title
  doc.fontSize(20).text('Audit Logs Report', 50, 50);

  let yPos = 100;

  // Headers
  const headers = ['ID', 'Action', 'Entity', 'Employee', 'Admin', 'Changes', 'Date'];
  doc.fontSize(12).font('Helvetica-Bold');
  headers.forEach((header, i) => {
    doc.text(header, 50 + i * 70, yPos);
  });
  yPos += 30;

  // Rows
  doc.font('Helvetica').fontSize(10);
  logs.forEach((log) => {
    if (yPos > 700) {
      doc.addPage();
      yPos = 80;
      // Re-print headers
      doc.fontSize(12).font('Helvetica-Bold');
      headers.forEach((header, i) => doc.text(header, 50 + i * 70, yPos));
      yPos += 30;
      doc.font('Helvetica').fontSize(10);
    }

    doc.text(log.id?.toString() || '', 50, yPos);
    doc.text(log.action_type || '', 120, yPos);
    doc.text(log.entity_type || '', 200, yPos);
    doc.text(log.entity_name || '', 270, yPos);
    doc.text(log.performed_by_name || '', 350, yPos);
    doc.text((log.description || 'No changes').substring(0, 40), 430, yPos);
    doc.text(new Date(log.created_at).toLocaleString(), 530, yPos);

    yPos += 25;
  });

  doc.end();
} 
    else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format specified. Use "pdf" or "csv".'
      });
    }

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
});

// Get employees for selection
router.get('/employees', authenticateSuperAdmin, async (req, res) => {
  try {
    const [employees] = await pool.query(
      'SELECT id, name, employee_number, email, department FROM employees ORDER BY name'
    );
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;