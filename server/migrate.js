const pool = require('./config/database');

async function migrateEmployeeNumber() {
  try {
    console.log('Starting employee_number migration...');

    // Step 1: Check if column exists
    console.log('Step 1: Checking if employee_number column exists...');
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'employee_number'`
    );

    if (columns.length === 0) {
      // Column doesn't exist, so add it
      await pool.query(`ALTER TABLE employees ADD COLUMN employee_number VARCHAR(20) UNIQUE AFTER id`);
      console.log('✓ Column added');
    } else {
      console.log('✓ Column already exists');
    }

    // Step 2: Update records with NULL or empty employee_number
    console.log('Step 2: Migrating employee numbers...');
    const [result] = await pool.query(
      `UPDATE employees SET employee_number = CONCAT('EMP', LPAD(id, 4, '0')) WHERE employee_number IS NULL OR employee_number = ''`
    );
    console.log(`✓ Updated ${result.affectedRows} rows`);

    // Step 3: Verify
    console.log('Step 3: Verifying migration...');
    const [rows] = await pool.query(`SELECT id, name, employee_number FROM employees WHERE employee_number IS NULL`);
    if (rows.length === 0) {
      console.log('✓ All records have employee numbers');
    } else {
      console.log(`⚠ ${rows.length} records still have NULL employee_number`);
    }

    console.log('\nMigration completed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Migration error:', err.message);
    console.error('SQL Code:', err.code);
    process.exit(1);
  }
}

migrateEmployeeNumber();
