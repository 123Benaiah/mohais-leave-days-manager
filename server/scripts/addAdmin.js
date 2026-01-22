const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function addAdmin() {
  try {
    const email = 'benaiahlushomo@gmail.com';
    const password = '11111111';
    const name = 'Benaiah Lushomo';

    // Check if admin already exists
    const [existingAdmin] = await pool.query(
      'SELECT id FROM admin_users WHERE email = ?',
      [email]
    );

    if (existingAdmin.length > 0) {
      console.log(`✓ Admin with email ${email} already exists`);
      console.log(`  ID: ${existingAdmin[0].id}`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new admin
    const [result] = await pool.query(
      'INSERT INTO admin_users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name]
    );

    console.log('✅ New admin created successfully!');
    console.log(`  ID: ${result.insertId}`);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log('\nYou can now login with these credentials at: http://localhost:3000/admin/login');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding admin:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addAdmin();
