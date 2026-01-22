const pool = require('../config/database');
const crypto = require('crypto');

class PasswordResetToken {
  // Generate a secure random token
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
    }

  // Create a new reset token
  static async create(adminId, expiresInHours = 1) {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const [result] = await pool.query(
      'INSERT INTO password_reset_tokens (admin_id, token, expires_at) VALUES (?, ?, ?)',
      [adminId, token, expiresAt]
    );

    return {
      id: result.insertId,
      token: token,
      expiresAt: expiresAt
    };
  }

  // Find token by token string
  static async findByToken(token) {
    const [rows] = await pool.query(
      `SELECT prt.*, au.email, au.name
       FROM password_reset_tokens prt
       JOIN admin_users au ON prt.admin_id = au.id
       WHERE prt.token = ? AND prt.used = FALSE AND au.is_active = TRUE`,
      [token]
    );
    return rows[0];
  }

  // Check if token is valid (not expired and not used)
  static async isValid(token) {
    const tokenRecord = await this.findByToken(token);
    if (!tokenRecord) return false;

    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    return now < expiresAt;
  }

  // Mark token as used
  static async markAsUsed(token) {
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );
    return true;
  }

  // Mark token as used
  static async markAsUsed(token) {
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );
    return true;
  }

  // Clean up expired tokens
  static async cleanupExpiredTokens() {
    const [result] = await pool.query(
      'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP OR used = TRUE'
    );
    return result.affectedRows;
  }
}

module.exports = PasswordResetToken;
