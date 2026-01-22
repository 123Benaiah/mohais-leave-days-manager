const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function createSuperAdminTables() {
  console.log('Creating Super Admin and Audit Log tables...');

  try {
    // Create super_admin table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `);
    console.log('✅ super_admin table created');

    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_type ENUM('CREATE', 'UPDATE', 'DELETE', 'ADD_DAYS', 'SUBTRACT_DAYS', 'SET_DAYS') NOT NULL,
        entity_type ENUM('EMPLOYEE', 'ADMIN') NOT NULL,
        entity_id INT NOT NULL,
        entity_name VARCHAR(255),
        performed_by_id INT NOT NULL,
        performed_by_type ENUM('ADMIN', 'SUPER_ADMIN') NOT NULL,
        performed_by_name VARCHAR(255),
        old_values JSON,
        new_values JSON,
        description TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_performer (performed_by_type, performed_by_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ audit_logs table created');

    // Check if default super admin exists
    const [existing] = await pool.query(
      'SELECT id FROM super_admin WHERE email = ?',
      ['superadmin@mohais.com']
    );

    if (existing.length === 0) {
      // Create default super admin
      const passwordHash = await bcrypt.hash('SuperAdmin@123', 10);
      await pool.query(
        'INSERT INTO super_admin (email, password_hash, name) VALUES (?, ?, ?)',
        ['superadmin@mohais.com', passwordHash, 'Super Administrator']
      );
      console.log('✅ Default super admin created');
      console.log('   Email: superadmin@mohais.com');
      console.log('   Password: SuperAdmin@123');
      console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
    } else {
      console.log('ℹ️  Super admin already exists');
    }

    console.log('\n🎉 Super Admin setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSuperAdminTables();
