const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function initAdminTables() {
  try {
    console.log('Initializing admin tables...\n');

    // Create admin_users table
    console.log('1. Creating admin_users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `);
    console.log('✓ admin_users table created');

    // Create password_reset_tokens table
    console.log('\n2. Creating password_reset_tokens table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ password_reset_tokens table created');

    // Create admin_user_sessions table (optional but useful)
    console.log('\n3. Creating admin_user_sessions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ admin_user_sessions table created');

    // Insert default admin user if not exists
    console.log('\n4. Checking for default admin user...');
    const [existingAdmin] = await pool.query(
      'SELECT id FROM admin_users WHERE email = ?',
      ['admin@stalliongroup.co.zw']
    );

    if (existingAdmin.length === 0) {
      const defaultPassword = 'admin123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      await pool.query(`
        INSERT INTO admin_users (email, password_hash, name)
        VALUES (?, ?, ?)
      `, [
        'admin@stalliongroup.co.zw',
        passwordHash,
        'System Administrator'
      ]);

      console.log('✓ Default admin user created:');
      console.log('  Email: admin@stalliongroup.co.zw');
      console.log('  Password: admin123');
      console.log('  ⚠️ CHANGE THIS PASSWORD AFTER FIRST LOGIN! ⚠️');
    } else {
      console.log('✓ Admin user already exists');
    }

    console.log('\n✅ Admin tables initialized successfully!');
    console.log('\nYou can now:');
    console.log('- Login at /admin/login');
    console.log('- Use password reset if needed');
    console.log('- Create additional admin users via the API');

  } catch (error) {
    console.error('Error initializing admin tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initAdminTables();
