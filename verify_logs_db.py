import mysql.connector
from datetime import datetime, timedelta

# Database config
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '11111111',
    'database': 'mohais_days'
}

def check_logs():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # 1. Check Total Count
        cursor.execute("SELECT COUNT(*) FROM audit_logs")
        total = cursor.fetchone()[0]
        print(f"Total Logs: {total}")

        # 2. Check Date Filter capability (SQL level)
        seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) FROM audit_logs WHERE created_at >= %s", (seven_days_ago,))
        recent_count = cursor.fetchone()[0]
        print(f"Logs in last 7 days: {recent_count}")

        # 3. Check Performed By Name filter
        name_filter = "Benaiah"
        cursor.execute("SELECT COUNT(*) FROM audit_logs WHERE performed_by_name LIKE %s", (f"%{name_filter}%",))
        benaiah_logs = cursor.fetchone()[0]
        print(f"Logs by Benaiah: {benaiah_logs}")

        cursor.close()
        conn.close()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

if __name__ == "__main__":
    check_logs()
