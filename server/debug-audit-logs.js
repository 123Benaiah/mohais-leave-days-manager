const pool = require('./config/database');
const dotenv = require('dotenv');

dotenv.config();

async function debugAuditLogs() {
  try {
    console.log('🔍 Sample Audit Logs (LIMIT 5):');
    const [logs] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5');
    console.table(logs.map(log => ({
      id: log.id,
      action_type: log.action_type,
      entity_type: log.entity_type,
      entity_name: log.entity_name,
      performed_by_name: log.performed_by_name,
      description: log.description ? log.description.substring(0, 50) + '...' : null,
      created_at: log.created_at
    })));

    console.log('\n📊 Counts by entity_type:');
    const [counts] = await pool.query('SELECT entity_type, COUNT(*) as count FROM audit_logs GROUP BY entity_type');
    console.table(counts);

    console.log('\n🔢 Total logs:', logs.length);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugAuditLogs();