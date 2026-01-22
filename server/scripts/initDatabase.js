const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
  let connection;
  
  try {
    // Connect without database specified (to create it)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '11111111'
    });

    console.log('Connected to MySQL server');

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, '../sql/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL by semicolons and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
          console.log('✓ Executed SQL statement');
        } catch (error) {
          console.log('⚠ Skipping statement that caused error:', error.message);
        }
      }
    }

    console.log('Database initialized successfully!');
    
    // Import employees
    await importEmployees(connection);
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
}

async function importEmployees(connection) {
  try {
    // First, let's check if we can read the file
    const filePath = path.join(__dirname, '../../../names-MOHAIS.txt');
    
    if (!fs.existsSync(filePath)) {
      console.log('⚠ Employee names file not found at:', filePath);
      console.log('Please place names-MOHAIS.txt in the project root folder');
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse names
    const lines = content.split('\n');
    const employees = lines
      .filter(line => line.trim() && !line.toLowerCase().includes('employee'))
      .map(name => [name.trim(), 150, 0])
      .filter(emp => emp[0].length > 0);

    console.log(`Found ${employees.length} employees to import`);

    // Insert employees into database
    if (employees.length > 0) {
      await connection.query('USE mohais_days');
      await connection.query('DELETE FROM employees'); // Clear existing
      await connection.query(
        'INSERT INTO employees (name, total_days, used_days) VALUES ?',
        [employees]
      );
      console.log(`✓ Successfully imported ${employees.length} employees`);
    }
    
  } catch (error) {
    console.error('Error importing employees:', error.message);
  }
}

initializeDatabase();