const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

// Helper function to get admin info from request body
const getAdminInfo = (req) => {
  const { admin_id, admin_name, admin_type } = req.body;
  if (admin_id && admin_name) {
    return {
      id: admin_id,
      name: admin_name,
      type: admin_type || 'ADMIN'
    };
  }
  return null;
};

// Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.findAll();
    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create single employee
router.post('/', async (req, res) => {
  try {
    const employee = await Employee.create(req.body);

    // Log the action
    const adminInfo = getAdminInfo(req);
    if (adminInfo) {
      await AuditLog.create({
        actionType: 'CREATE',
        entityType: 'EMPLOYEE',
        entityId: employee.id,
        entityName: employee.name,
        performedById: adminInfo.id,
        performedByType: adminInfo.type,
        performedByName: adminInfo.name,
        newValues: { name: employee.name, employee_number: employee.employee_number, total_days: employee.total_days },
        description: `Created employee: ${employee.name}`,
        ipAddress: req.ip
      });
    }

    res.status(201).json(employee);
  } catch (err) {
    console.error('Error creating employee:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single employee
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.put('/:id', async (req, res) => {
  try {
    console.log('PUT /:id - Body:', req.body);
    console.log('PUT /:id - Params:', req.params);

    // Get old employee data for audit
    const oldEmployee = await Employee.findById(req.params.id);
    const oldValues = oldEmployee ? {
      name: oldEmployee.name,
      employee_number: oldEmployee.employee_number,
      total_days: oldEmployee.total_days,
      used_days: oldEmployee.used_days
    } : null;

    // Pass the request directly to Employee.update
    const employee = await Employee.update(req.params.id, req.body);

    // Log the action
    const adminInfo = getAdminInfo(req);
    if (adminInfo && oldValues) {
      const { action, days } = req.body;
      let actionType = 'UPDATE';
      let description = `Updated employee: ${employee.name}`;

      if (action === 'add') {
        actionType = 'ADD_DAYS';
        description = `Added ${days} days to ${employee.name}`;
      } else if (action === 'subtract') {
        actionType = 'SUBTRACT_DAYS';
        description = `Subtracted ${days} days from ${employee.name}`;
      } else if (action === 'set') {
        actionType = 'SET_DAYS';
        description = `Set used days to ${days} for ${employee.name}`;
      }

      await AuditLog.create({
        actionType,
        entityType: 'EMPLOYEE',
        entityId: employee.id,
        entityName: employee.name,
        performedById: adminInfo.id,
        performedByType: adminInfo.type,
        performedByName: adminInfo.name,
        oldValues,
        newValues: {
          name: employee.name,
          employee_number: employee.employee_number,
          total_days: employee.total_days,
          used_days: employee.used_days
        },
        description,
        ipAddress: req.ip
      });
    }

    res.json(employee);

  } catch (err) {
    console.error('Error updating employee:', err);

    // Return appropriate error
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    } else if (err.message.includes('Invalid') || err.message.includes('cannot exceed')) {
      return res.status(400).json({ message: err.message });
    } else {
      return res.status(500).json({ message: 'Server error' });
    }
  }
});

// Delete single employee
router.delete('/:id', async (req, res) => {
  try {
    // Get employee data before deletion for audit
    const employee = await Employee.findById(req.params.id);

    const result = await Employee.delete(req.params.id);

    // Log the action - get admin info from query params for DELETE
    const { admin_id, admin_name, admin_type } = req.query;
    if (admin_id && admin_name && employee) {
      await AuditLog.create({
        actionType: 'DELETE',
        entityType: 'EMPLOYEE',
        entityId: parseInt(req.params.id),
        entityName: employee.name,
        performedById: parseInt(admin_id),
        performedByType: admin_type || 'ADMIN',
        performedByName: admin_name,
        oldValues: {
          name: employee.name,
          employee_number: employee.employee_number,
          total_days: employee.total_days,
          used_days: employee.used_days
        },
        description: `Deleted employee: ${employee.name}`,
        ipAddress: req.ip
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Error deleting employee:', err);
    if (err.message.includes('not found')) {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Add multiple employees from file
router.post('/bulk', async (req, res) => {
  try {
    const { employees } = req.body;

    // Validate input
    if (!Array.isArray(employees)) {
      return res.status(400).json({ message: 'Invalid employees data' });
    }

    // Clear existing employees first
    await Employee.deleteAll();

    // Insert new employees
    await Employee.createMany(employees);

    // Get all employees to return
    const allEmployees = await Employee.findAll();
    res.json(allEmployees);
  } catch (err) {
    console.error('Error importing employees:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset all employees to default
router.post('/reset', async (req, res) => {
  try {
    await Employee.updateAll({ used_days: 0 });
    const employees = await Employee.findAll();
    res.json(employees);
  } catch (err) {
    console.error('Error resetting employees:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// One-time migration endpoint (remove after use)
router.post('/migrate-employee-number', async (req, res) => {
  try {
    const success = await Employee.migrateEmployeeNumber();
    if (success) {
      res.json({ success: true, message: 'Migration completed successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Migration failed' });
    }
  } catch (err) {
    console.error('Migration endpoint error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
