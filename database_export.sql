-- FTMS Database Schema Export
-- File Tracking Management System
-- Generated: February 13, 2026
-- Compatible with: MySQL 8.0+

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================
-- DROP TABLES (if they exist)
-- ============================================
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `file_attachments`;
DROP TABLE IF EXISTS `file_movements`;
DROP TABLE IF EXISTS `files`;
DROP TABLE IF EXISTS `unit_heads`;
DROP TABLE IF EXISTS `department_heads`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `positions`;
DROP TABLE IF EXISTS `units`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `cache_locks`;
DROP TABLE IF EXISTS `cache`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `failed_jobs`;

-- ============================================
-- CORE TABLES
-- ============================================

-- Departments Table
CREATE TABLE `departments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `location` VARCHAR(255) NULL,
    `is_registry` BOOLEAN DEFAULT FALSE,
    `has_units` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_is_registry` (`is_registry`),
    INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Units Table
CREATE TABLE `units` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_registry` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
    INDEX `idx_department_id` (`department_id`),
    INDEX `idx_is_registry` (`is_registry`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Positions Table
CREATE TABLE `positions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `position_code` VARCHAR(50) UNIQUE NULL,
    `position_type` ENUM('director', 'assistant_director', 'supervisor', 'staff', 'support') DEFAULT 'staff',
    `position_level` INT DEFAULT 3,
    `employment_type` ENUM('permanent', 'contract', 'temporary', 'intern') DEFAULT 'permanent',
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX `idx_position_type` (`position_type`),
    INDEX `idx_position_level` (`position_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employees Table
CREATE TABLE `employees` (
    `employee_number` VARCHAR(20) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `email_verified_at` TIMESTAMP NULL,
    `password` VARCHAR(255) NOT NULL,
    `remember_token` VARCHAR(100) NULL,
    `is_admin` BOOLEAN DEFAULT FALSE,
    `is_registry_head` BOOLEAN DEFAULT FALSE,
    `is_active` BOOLEAN DEFAULT TRUE,
    `department_id` BIGINT UNSIGNED NULL,
    `unit_id` BIGINT UNSIGNED NULL,
    `position_id` BIGINT UNSIGNED NULL,
    `created_by` VARCHAR(20) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `employees`(`employee_number`) ON DELETE SET NULL,
    INDEX `idx_department_id` (`department_id`),
    INDEX `idx_unit_id` (`unit_id`),
    INDEX `idx_position_id` (`position_id`),
    INDEX `idx_is_admin` (`is_admin`),
    INDEX `idx_is_active` (`is_active`),
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Department Heads Table
CREATE TABLE `department_heads` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `position_id` BIGINT UNSIGNED NOT NULL,
    `effective_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE CASCADE,
    INDEX `idx_department_id` (`department_id`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unit Heads Table
CREATE TABLE `unit_heads` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `unit_id` BIGINT UNSIGNED NOT NULL,
    `position_id` BIGINT UNSIGNED NOT NULL,
    `effective_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE CASCADE,
    INDEX `idx_unit_id` (`unit_id`),
    INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Files Table
CREATE TABLE `files` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `file_number` VARCHAR(50) UNIQUE NOT NULL,
    `old_file_number` VARCHAR(50) NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `title` VARCHAR(500) NULL,
    `priority` ENUM('normal', 'urgent', 'very_urgent') DEFAULT 'normal',
    `confidentiality` ENUM('public', 'confidential', 'secret') DEFAULT 'public',
    `status` ENUM('at_registry', 'in_transit', 'received', 'under_review', 'action_required', 'completed', 'returned_to_registry', 'archived', 'merged') DEFAULT 'at_registry',
    `current_holder_employee_number` VARCHAR(20) NULL,
    `registered_by_employee_number` VARCHAR(20) NOT NULL,
    `due_date` DATE NULL,
    `is_copy` BOOLEAN DEFAULT FALSE,
    `parent_file_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL,
    
    FOREIGN KEY (`current_holder_employee_number`) REFERENCES `employees`(`employee_number`) ON DELETE SET NULL,
    FOREIGN KEY (`registered_by_employee_number`) REFERENCES `employees`(`employee_number`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL,
    INDEX `idx_file_number` (`file_number`),
    INDEX `idx_status` (`status`),
    INDEX `idx_priority` (`priority`),
    INDEX `idx_current_holder` (`current_holder_employee_number`),
    INDEX `idx_due_date` (`due_date`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- File Attachments Table
CREATE TABLE `file_attachments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `file_id` BIGINT UNSIGNED NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_size` INT UNSIGNED NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `uploaded_by_employee_number` VARCHAR(20) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by_employee_number`) REFERENCES `employees`(`employee_number`) ON DELETE CASCADE,
    INDEX `idx_file_id` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- File Movements Table
CREATE TABLE `file_movements` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `file_id` BIGINT UNSIGNED NOT NULL,
    `sender_employee_number` VARCHAR(20) NOT NULL,
    `intended_receiver_employee_number` VARCHAR(20) NOT NULL,
    `actual_receiver_employee_number` VARCHAR(20) NULL,
    `movement_status` ENUM('sent', 'delivered', 'received', 'acknowledged', 'rejected') DEFAULT 'sent',
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `received_at` TIMESTAMP NULL,
    `delivery_method` ENUM('internal_messenger', 'hand_carry', 'courier', 'email') DEFAULT 'hand_carry',
    `sender_comments` TEXT NULL,
    `receiver_comments` TEXT NULL,
    `hand_carried_by` VARCHAR(100) NULL,
    `sla_days` INT DEFAULT 3,
    `is_overdue` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`sender_employee_number`) REFERENCES `employees`(`employee_number`) ON DELETE CASCADE,
    FOREIGN KEY (`intended_receiver_employee_number`) REFERENCES `employees`(`employee_number`) ON DELETE CASCADE,
    FOREIGN KEY (`actual_receiver_employee_number`) REFERENCES `employees`(`employee_number`) ON DELETE SET NULL,
    INDEX `idx_file_id` (`file_id`),
    INDEX `idx_sender` (`sender_employee_number`),
    INDEX `idx_intended_receiver` (`intended_receiver_employee_number`),
    INDEX `idx_actual_receiver` (`actual_receiver_employee_number`),
    INDEX `idx_movement_status` (`movement_status`),
    INDEX `idx_sent_at` (`sent_at`),
    INDEX `idx_is_overdue` (`is_overdue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs Table
CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_employee_number` VARCHAR(20) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` BIGINT UNSIGNED NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`user_employee_number`) REFERENCES `employees`(`employee_number`) ON DELETE CASCADE,
    INDEX `idx_user_employee_number` (`user_employee_number`),
    INDEX `idx_action` (`action`),
    INDEX `idx_entity_type` (`entity_type`),
    INDEX `idx_entity_id` (`entity_id`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LARAVEL SYSTEM TABLES
-- ============================================

-- Cache Table
CREATE TABLE `cache` (
    `key` VARCHAR(255) PRIMARY KEY,
    `value` MEDIUMTEXT NOT NULL,
    `expiration` INT NOT NULL,
    INDEX `idx_expiration` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cache Locks Table
CREATE TABLE `cache_locks` (
    `key` VARCHAR(255) PRIMARY KEY,
    `owner` VARCHAR(255) NOT NULL,
    `expiration` INT NOT NULL,
    INDEX `idx_expiration` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions Table
CREATE TABLE `sessions` (
    `id` VARCHAR(128) PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `payload` LONGTEXT NOT NULL,
    `last_activity` INT NOT NULL,
    
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_last_activity` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Reset Tokens Table
CREATE TABLE `password_reset_tokens` (
    `email` VARCHAR(255) PRIMARY KEY,
    `token` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP NULL,
    
    INDEX `idx_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jobs Table (for queues)
CREATE TABLE `jobs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `queue` VARCHAR(255) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL,
    `reserved_at` INT UNSIGNED NULL,
    `available_at` INT UNSIGNED NOT NULL,
    `created_at` INT UNSIGNED NOT NULL,
    
    INDEX `idx_queue_reserved` (`queue`, `reserved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Failed Jobs Table
CREATE TABLE `failed_jobs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `uuid` VARCHAR(255) UNIQUE NOT NULL,
    `connection` TEXT NOT NULL,
    `queue` TEXT NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `exception` LONGTEXT NOT NULL,
    `failed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX `idx_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA (Optional - Remove in production)
-- ============================================

-- Insert sample departments
INSERT INTO `departments` (`name`, `location`, `is_registry`, `has_units`) VALUES
('Registry Department', 'Main Building', TRUE, FALSE),
('Human Resources', 'Annex A', FALSE, TRUE),
('Finance Department', 'Annex B', FALSE, TRUE),
('Administration', 'Main Building', FALSE, TRUE);

-- Insert sample units
INSERT INTO `units` (`department_id`, `name`, `is_registry`) VALUES
(2, 'Recruitment Unit', FALSE),
(2, 'Training Unit', FALSE),
(3, 'Accounts Unit', FALSE),
(3, 'Budget Unit', FALSE),
(4, 'General Services', FALSE);

-- Insert sample positions
INSERT INTO `positions` (`title`, `position_code`, `position_type`, `position_level`, `employment_type`) VALUES
('Director', 'DIR001', 'director', 1, 'permanent'),
('Assistant Director', 'ADIR001', 'assistant_director', 2, 'permanent'),
('Supervisor', 'SUP001', 'supervisor', 3, 'permanent'),
('Staff Officer', 'STF001', 'staff', 4, 'permanent'),
('Support Staff', 'SUPT001', 'support', 5, 'permanent'),
('Registry Head', 'REG001', 'director', 1, 'permanent'),
('Registry Clerk', 'REG002', 'staff', 4, 'permanent');

-- Insert sample employees (password: bcrypt hash of 'Moha@2024')
INSERT INTO `employees` (`employee_number`, `name`, `email`, `password`, `is_admin`, `is_registry_head`, `department_id`, `position_id`, `is_active`) VALUES
('REGHEAD001', 'Registry Head', 'registry@moha.gov', '$2y$12$abcdefghijklmnopqrstu', FALSE, TRUE, 1, 6, TRUE),
('EMP001', 'John Doe', 'john@moha.gov', '$2y$12$abcdefghijklmnopqrstu', FALSE, FALSE, 2, 4, TRUE),
('EMP002', 'Jane Smith', 'jane@moha.gov', '$2y$12$abcdefghijklmnopqrstu', FALSE, FALSE, 3, 4, TRUE),
('EMP003', 'Bob Johnson', 'bob@moha.gov', '$2y$12$abcdefghijklmnopqrstu', FALSE, FALSE, 4, 4, TRUE),
('EMP004', 'Alice Williams', 'alice@moha.gov', '$2y$12$abcdefghijklmnopqrstu', FALSE, FALSE, 2, 4, TRUE),
('EMP005', 'Charlie Brown', 'charlie@moha.gov', '$2y$12$abcdefghijklmnopqrstu', FALSE, FALSE, 3, 4, TRUE);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- END OF SQL DUMP
-- ============================================
