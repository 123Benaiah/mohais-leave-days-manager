const pool = require('./config/database');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function createAdmin() {
  try {
    const email = 'admin@mohais.com';
    const name = 'Mohais Admin';
    const plainPassword = 'SuperPass123!';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Check if exists
    const [existing] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log(`Admin with email ${email} already exists (ID: ${existing[0].id})`);
      return;
    }

    // Insert
    const [result] = await pool.query(
      `INSERT INTO admin_users (email, name, password_hash, is_active, created_at)
       VALUES (?, ?, ?, true, CURRENT_TIMESTAMP)`,
      [email, name, passwordHash]
    );

    console.log(`✅ Admin created successfully! ID: ${result.insertId}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔐 Password: ${plainPassword} (hashed)`);
    console.log('\n🚀 Login now: POST /admin/auth/login with { "email": "' + email + '", "password": "' + plainPassword + '" }');
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table admin_users does not exist.');
    }
  } finally {
    // Don't end pool here as it's shared
  }
}

createAdmin();