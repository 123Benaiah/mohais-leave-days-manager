const pool = require('./config/database');
const dotenv = require('dotenv');

dotenv.config();

async function listUsers() {
  try {
    console.log('🔍 Checking Super Admins:');
    const [superAdmins] = await pool.query('SELECT id, email, name, is_active, created_at FROM super_admin ORDER BY id');
    console.table(superAdmins.map(u => ({ ID: u.id, Email: u.email, Name: u.name, Active: u.is_active ? 'Yes' : 'No', Created: u.created_at })));

    console.log('\n🔍 Checking Admins:');
    const [admins] = await pool.query('SELECT id, email, name, is_active, created_at FROM admin_users ORDER BY id');
    console.table(admins.map(u => ({ ID: u.id, Email: u.email, Name: u.name, Active: u.is_active ? 'Yes' : 'No', Created: u.created_at })));

    if (superAdmins.length === 0) console.log('❌ No super admins found.');
    if (admins.length === 0) console.log('❌ No admins found.');
  } catch (error) {
    console.error('❌ DB Error:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Table missing. Run migrations?');
    }
  } finally {
    await pool.end();
  }
}

listUsers();