const pool = require('../config/database');

class AuditLog {
  // Create audit log entry
  static async create({
    actionType,
    entityType,
    entityId,
    entityName,
    performedById,
    performedByType,
    performedByName,
    oldValues = null,
    newValues = null,
    description = null,
    ipAddress = null
  }) {
    const [result] = await pool.query(
      `INSERT INTO audit_logs
       (action_type, entity_type, entity_id, entity_name, performed_by_id, performed_by_type, performed_by_name, old_values, new_values, description, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actionType,
        entityType,
        entityId,
        entityName,
        performedById,
        performedByType,
        performedByName,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        description,
        ipAddress
      ]
    );
    return result.insertId;
  }

  // Get all audit logs with pagination - UPDATED with all filters
  static async findAll({
    page = 1,
    limit = 50,
    entityType = null,
    actionType = null,
    entityIds = null, // Support multiple entity IDs (for multi-employee reporting)
    employeeNumber = null,
    startDate = null,
    endDate = null,
    performedById = null,
    performedByName = null,
    employeeName = null,
    adminName = null
  }) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    // Support multiple entity IDs (e.g., multiple employees)
    if (entityIds && Array.isArray(entityIds) && entityIds.length > 0) {
      query += ` AND entity_id IN (${entityIds.join(',')})`;
    } else if (entityIds && typeof entityIds === 'number') {
      query += ' AND entity_id = ?';
      params.push(entityIds);
    }

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    if (startDate) {
      query += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    if (performedById) {
      query += ' AND performed_by_id = ?';
      params.push(performedById);
    }

    // Use adminName if provided, otherwise use performedByName for backward compatibility
    if (adminName) {
      query += ' AND performed_by_name LIKE ?';
      params.push(`%${adminName}%`);
    } else if (performedByName) {
      query += ' AND performed_by_name LIKE ?';
      params.push(`%${performedByName}%`);
    }

    if (employeeName) {
      query += ' AND entity_name LIKE ?';
      params.push(`%${employeeName}%`);
    }

    if (employeeNumber) {
      // Search in JSON fields for employee_number using MySQL JSON functions
      query += ` AND (
        (new_values IS NOT NULL AND (
          JSON_EXTRACT(new_values, '$.employee_number') LIKE ? OR
          JSON_UNQUOTE(JSON_EXTRACT(new_values, '$.employee_number')) LIKE ?
        )) OR
        (old_values IS NOT NULL AND (
          JSON_EXTRACT(old_values, '$.employee_number') LIKE ? OR
          JSON_UNQUOTE(JSON_EXTRACT(old_values, '$.employee_number')) LIKE ?
        ))
      )`;
      params.push(`%${employeeNumber}%`, `%${employeeNumber}%`, `%${employeeNumber}%`, `%${employeeNumber}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(query, params);

    // Parse JSON fields
    return rows.map(row => {
      try {
        return {
          ...row,
          old_values: row.old_values ?
            (typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values)
            : null,
          new_values: row.new_values ?
            (typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values)
            : null
        };
      } catch (e) {
        console.error('Error parsing JSON in audit log:', e);
        return {
          ...row,
          old_values: {},
          new_values: {}
        };
      }
    });
  }

  // Get audit logs for specific entity
  static async findByEntity(entityType, entityId) {
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
      [entityType, entityId]
    );

    return rows.map(row => {
      try {
        return {
          ...row,
          old_values: row.old_values ? JSON.parse(row.old_values) : null,
          new_values: row.new_values ? JSON.parse(row.new_values) : null
        };
      } catch (e) {
        return {
          ...row,
          old_values: {},
          new_values: {}
        };
      }
    });
  }

  // Get count for pagination - UPDATED with all filters
  static async count({
    entityType = null,
    entityIds = null, // Support multiple entity IDs (for multi-employee reporting)
    actionType = null,
    employeeNumber = null,
    startDate = null,
    endDate = null,
    performedById = null,
    performedByName = null,
    employeeName = null,
    adminName = null
  }) {
    let query = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const params = [];

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    // Support multiple entity IDs (e.g., multiple employees)
    if (entityIds && Array.isArray(entityIds) && entityIds.length > 0) {
      query += ` AND entity_id IN (${entityIds.join(',')})`;
    } else if (entityIds && typeof entityIds === 'number') {
      query += ' AND entity_id = ?';
      params.push(entityIds);
    }

    if (actionType) {
      query += ' AND action_type = ?';
      params.push(actionType);
    }

    if (startDate) {
      query += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    if (performedById) {
      query += ' AND performed_by_id = ?';
      params.push(performedById);
    }

    // Use adminName if provided, otherwise use performedByName for backward compatibility
    if (adminName) {
      query += ' AND performed_by_name LIKE ?';
      params.push(`%${adminName}%`);
    } else if (performedByName) {
      query += ' AND performed_by_name LIKE ?';
      params.push(`%${performedByName}%`);
    }

    if (employeeName) {
      query += ' AND entity_name LIKE ?';
      params.push(`%${employeeName}%`);
    }

    if (employeeNumber) {
      // Search in JSON fields for employee_number using MySQL JSON functions
      query += ` AND (
        (new_values IS NOT NULL AND (
          JSON_EXTRACT(new_values, '$.employee_number') LIKE ? OR
          JSON_UNQUOTE(JSON_EXTRACT(new_values, '$.employee_number')) LIKE ?
        )) OR
        (old_values IS NOT NULL AND (
          JSON_EXTRACT(old_values, '$.employee_number') LIKE ? OR
          JSON_UNQUOTE(JSON_EXTRACT(old_values, '$.employee_number')) LIKE ?
        ))
      )`;
      params.push(`%${employeeNumber}%`, `%${employeeNumber}%`, `%${employeeNumber}%`, `%${employeeNumber}%`);
    }

    const [rows] = await pool.query(query, params);
    return rows[0].total;
  }

  // Get recent activity summary
  static async getRecentActivity(limit = 10) {
    const [rows] = await pool.query(
      `SELECT
        action_type,
        entity_type,
        entity_name,
        performed_by_name,
        description,
        created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  // Simple method to get all logs (for debugging)
  static async getAll(limit = 100) {
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    
    return rows.map(row => {
      try {
        return {
          ...row,
          old_values: row.old_values ? 
            (typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values) 
            : null,
          new_values: row.new_values ? 
            (typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values) 
            : null
        };
      } catch (e) {
        return {
          ...row,
          old_values: {},
          new_values: {}
        };
      }
    });
  }
}

module.exports = AuditLog;