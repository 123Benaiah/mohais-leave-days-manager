const pool = require('../config/database');

class Employee {
  static async findAll() {
    const [rows] = await pool.query(`
      SELECT *, (total_days - used_days) as remaining_days
      FROM employees
      ORDER BY name ASC
    `);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT *, (total_days - used_days) as remaining_days FROM employees WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async create(data) {
    const { name, employee_number, total_days = 150, used_days = 0 } = data;
    const [result] = await pool.query(
      `INSERT INTO employees (name, employee_number, total_days, used_days) VALUES (?, ?, ?, ?)`,
      [name, employee_number, total_days, used_days]
    );
    const newId = result.insertId;
    return this.findById(newId);
  }

  static async createMany(employees) {
    const values = employees.map(emp => [
      emp.name,
      emp.employee_number || null,
      emp.total_days || 150,
      emp.used_days || 0
    ]);

    const [result] = await pool.query(
      'INSERT INTO employees (name, employee_number, total_days, used_days) VALUES ?',
      [values]
    );
    return result;
  }

 static async update(id, data) {
  console.log('Update called with:', { id, data });

  const { days, action, name, employee_number, total_days, used_days } = data;

  // Handle full employee update (edit action)
  if (action === 'update') {
    const [currentRows] = await pool.query(
      'SELECT * FROM employees WHERE id = ?',
      [id]
    );

    if (currentRows.length === 0) {
      throw new Error('Employee not found');
    }

    // Allow negative used_days for the edit modal
    if (parseInt(used_days) > parseInt(total_days)) {
      throw new Error(`Used days cannot exceed total days`);
    }

    await pool.query(
      'UPDATE employees SET name = ?, employee_number = ?, total_days = ?, used_days = ?, last_updated = NOW() WHERE id = ?',
      [name, employee_number || null, parseInt(total_days), parseInt(used_days), id]
    );

    return this.findById(id);
  }

  // Handle days operations (add, subtract, set)
  // Validate input
  if (days === undefined || days === null || days === '') {
    throw new Error('Days value is required');
  }

  const daysNum = parseInt(days, 10);

  if (isNaN(daysNum)) {
    throw new Error('Days must be a valid number');
  }

  // ALLOW NEGATIVE NUMBERS - Removed check for daysNum < 0

  if (!Number.isInteger(daysNum)) {
    throw new Error('Days must be a whole number');
  }

  if (!action || !['add', 'subtract', 'set'].includes(action)) {
    throw new Error('Invalid action. Must be "add", "subtract", or "set"');
  }

  // Get current employee
  const [currentRows] = await pool.query(
    'SELECT used_days, total_days FROM employees WHERE id = ?',
    [id]
  );

  if (currentRows.length === 0) {
    throw new Error('Employee not found');
  }

  const currentUsedDays = currentRows[0].used_days;
  const totalDays = currentRows[0].total_days;
  let newUsedDays;

  // Calculate new value
  switch (action) {
    case 'add':
      newUsedDays = currentUsedDays + daysNum;
      break;
    case 'subtract':
      newUsedDays = currentUsedDays - daysNum; // Allow negative values
      break;
    case 'set':
      newUsedDays = daysNum;
      break;
  }

  // REMOVED THIS VALIDATION to allow negative values
  // Only validate that we don't exceed total days
  if (newUsedDays > totalDays) {
    throw new Error(`Used days (${newUsedDays}) cannot exceed total days (${totalDays})`);
  }

  // Allow negative values - REMOVE or comment out this validation
  // if (newUsedDays < 0) {
  //   throw new Error(`Used days cannot be negative`);
  // }

  // Update database
  await pool.query(
    'UPDATE employees SET used_days = ?, last_updated = NOW() WHERE id = ?',
    [newUsedDays, id]
  );

  // Return updated employee
  return this.findById(id);
}

  static async delete(id) {
    const [currentRows] = await pool.query(
      'SELECT * FROM employees WHERE id = ?',
      [id]
    );

    if (currentRows.length === 0) {
      throw new Error('Employee not found');
    }

    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    return { success: true, message: 'Employee deleted successfully' };
  }
  static async updateAll(employee) {
    const { used_days = 0 } = employee;
    const [result] = await pool.query(
      'UPDATE employees SET used_days = ?, last_updated = NOW()',
      [used_days]
    );
    return result;
  }

  static async deleteAll() {
    const [result] = await pool.query('DELETE FROM employees');
    return result;
  }

  static async migrateEmployeeNumber() {
    try {
      await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_number VARCHAR(20) UNIQUE AFTER id`);
      await pool.query(`UPDATE employees SET employee_number = CONCAT('EMP', LPAD(id, 4, '0')) WHERE employee_number IS NULL OR employee_number = ''`);
      return true;
    } catch (err) {
      console.error('Migration error:', err);
      return false;
    }
  }
}

module.exports = Employee;
