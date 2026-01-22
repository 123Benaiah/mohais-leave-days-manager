-- Create database
CREATE DATABASE IF NOT EXISTS mohais_days;

-- Use the database
USE mohais_days;

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  total_days INT NOT NULL DEFAULT 150,
  used_days INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_remaining_days (total_days, used_days)
);