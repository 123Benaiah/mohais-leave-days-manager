-- Create super_admin table
CREATE TABLE IF NOT EXISTS super_admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  entity_name VARCHAR(255),
  performed_by_id INT,
  performed_by_type VARCHAR(50),
  performed_by_name VARCHAR(255),
  old_values JSON,
  new_values JSON,
  description TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action_type (action_type),
  INDEX idx_entity_type (entity_type),
  INDEX idx_performed_by (performed_by_id),
  INDEX idx_created_at (created_at)
);

-- Insert default super admin user (password: 'superadmin123' - change after first login)
-- Password is hashed with bcrypt
INSERT IGNORE INTO super_admin (email, name, password_hash)
VALUES (
  'superadmin@stalliongroup.co.zw',
  'Super Administrator',
  '$2a$10$r3aRHLmB8d1qL7bLJdZ9VO9k.bmX3e8KJzG6r3r2J3x9XQj8XqKq'
);
