const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class SuperAdmin {
  // Find super admin by email
  static async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id, email, name, password_hash, is_active, created_at, last_login FROM super_admin WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  // Find super admin by ID
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, email, name, is_active, created_at, last_login FROM super_admin WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Verify password
  static async verifyPassword(plainPassword, hash) {
    return await bcrypt.compare(plainPassword, hash);
  }

  // Update last login timestamp
  static async updateLastLogin(superAdminId) {
    await pool.query(
      'UPDATE super_admin SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [superAdminId]
    );
  }

  // Update password
  static async updatePassword(superAdminId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE super_admin SET password_hash = ? WHERE id = ?',
      [passwordHash, superAdminId]
    );
    return true;
  }
}

module.exports = SuperAdmin;
