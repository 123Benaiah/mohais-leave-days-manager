import mysql.connector
import json
import random
from datetime import datetime, timedelta

# Database config
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '11111111',
    'database': 'mohais_days'
}

def create_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        return None

def generate_mock_logs(count=400):
    actions = ['CREATE', 'UPDATE', 'DELETE', 'ADD_DAYS', 'SUBTRACT_DAYS', 'SET_DAYS']
    entity_types = ['EMPLOYEE', 'ADMIN']
    admin_names = ['System Administrator', 'John Doe', 'Jane Smith', 'Benaiah Lushomo']

    logs = []

    for i in range(count):
        action = random.choice(actions)
        entity_type = random.choice(entity_types)

        # Create random date within last 30 days
        days_ago = random.randint(0, 30)
        created_at = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))

        # Mock values
        old_values = {
            'used_days': random.randint(0, 50),
            'employee_number': f'EMP{random.randint(1000, 9999)}',
            'name': f'Employee {random.randint(1, 100)}'
        }

        new_values = old_values.copy()
        if action == 'ADD_DAYS':
            days = random.randint(1, 10)
            new_values['used_days'] += days
            description = f"Added {days} days"
        elif action == 'SUBTRACT_DAYS':
            days = random.randint(1, 10)
            new_values['used_days'] -= days
            description = f"Subtracted {days} days"
        elif action == 'SET_DAYS':
            new_values['used_days'] = random.randint(0, 100)
            description = f"Set days to {new_values['used_days']}"
        elif action == 'UPDATE':
            new_values['name'] = f"Updated {old_values['name']}"
            description = "Updated employee details"
        else:
            description = f"Performed {action}"

        log = (
            action,
            entity_type,
            random.randint(1, 100), # entity_id
            old_values['name'],     # entity_name
            random.randint(1, 5),   # performed_by_id
            'ADMIN',                # performed_by_type
            random.choice(admin_names), # performed_by_name
            json.dumps(old_values),
            json.dumps(new_values),
            description,
            f"192.168.1.{random.randint(1, 255)}", # ip_address
            created_at
        )
        logs.append(log)

    return logs

def main():
    conn = create_connection()
    if not conn:
        return

    cursor = conn.cursor()

    try:
        # Create table if not exists (in case it wasn't created yet)
        create_table_sql = """
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
        )
        """
        cursor.execute(create_table_sql)
        print("Ensured audit_logs table exists.")

        # Generate and insert logs
        logs = generate_mock_logs(400)

        insert_sql = """
        INSERT INTO audit_logs
        (action_type, entity_type, entity_id, entity_name, performed_by_id, performed_by_type, performed_by_name, old_values, new_values, description, ip_address, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        print("Inserting 400 mock logs...")
        cursor.executemany(insert_sql, logs)
        conn.commit()

        print(f"Successfully inserted {cursor.rowcount} audit logs.")

        # Verify count
        cursor.execute("SELECT COUNT(*) FROM audit_logs")
        count = cursor.fetchone()[0]
        print(f"Total audit logs in DB: {count}")

    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
