const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class Admin {
  // Find admin by email
  static async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT id, email, name, password_hash, is_active, created_at, last_login FROM admin_users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  // Find admin by ID
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, email, name, is_active, created_at, last_login FROM admin_users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Create new admin user
  static async create(email, password, name = null) {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO admin_users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name]
    );
    return this.findById(result.insertId);
  }

  // Verify password
  static async verifyPassword(plainPassword, hash) {
    return await bcrypt.compare(plainPassword, hash);
  }

  // Update last login timestamp
  static async updateLastLogin(adminId) {
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [adminId]
    );
  }

  // Update password (with hashing)
  static async updatePassword(adminId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [passwordHash, adminId]
    );
    return true;
  }

  // Deactivate admin account
  static async deactivate(adminId) {
    await pool.query(
      'UPDATE admin_users SET is_active = FALSE WHERE id = ?',
      [adminId]
    );
    return true;
  }
}

module.exports = Admin;
