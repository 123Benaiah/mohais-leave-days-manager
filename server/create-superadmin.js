const pool = require('./config/database');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function createSuperAdmin() {
  try {
    const email = 'superadmin@mohais.com';
    const name = 'Super Admin';
    const plainPassword = 'SuperPass123!';
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // Check if exists
    const [existing] = await pool.query('SELECT id FROM super_admin WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log(`Super admin with email ${email} already exists (ID: ${existing[0].id})`);
      return;
    }

    // Insert
    const [result] = await pool.query(
      `INSERT INTO super_admin (email, name, password_hash, is_active, created_at)
       VALUES (?, ?, ?, true, CURRENT_TIMESTAMP)`,
      [email, name, passwordHash]
    );

    console.log(`✅ Super admin created successfully! ID: ${result.insertId}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔐 Password: ${plainPassword} (hashed)`);
    console.log('\n🚀 Login now: POST /super-admin/login with { "email": "' + email + '", "password": "' + plainPassword + '" }');
    console.log('Token will have type: "super_admin" for dashboard exports.');
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table super_admin does not exist. Create it first.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('DB credentials issue. Check .env');
    }
  } finally {
    await pool.end();
  }
}

createSuperAdmin();