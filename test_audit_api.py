import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000/api/super-admin"
LOGIN_URL = f"{BASE_URL}/login"
LOGS_URL = f"{BASE_URL}/audit-logs"

def login():
    creds = {
        "email": "superadmin@stalliongroup.co.zw",
        "password": "superadmin123"
    }
    try:
        response = requests.post(LOGIN_URL, json=creds)
        if response.status_code == 200:
            token = response.json().get('token')
            print(f"Login successful. Token obtained.")
            return token
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Error logging in: {e}")
        return None

def fetch_logs(token, params=None):
    headers = {
        "Authorization": f"Bearer {token}"
    }
    try:
        response = requests.get(LOGS_URL, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            logs = data.get('logs', [])
            total = data.get('pagination', {}).get('total', 0)
            print(f"Fetched {len(logs)} logs (Total: {total})")
            return logs
        else:
            print(f"Fetch failed: {response.text}")
            return []
    except Exception as e:
        print(f"Error fetching logs: {e}")
        return []

def main():
    print("--- Testing Audit Logs API ---")

    # 1. Login
    token = login()
    if not token:
        # Try with existing admin if superadmin fails (fallback)
        print("Trying admin login...")
        # Note: In real scenario we'd need valid creds.
        # Assuming the database has the default superadmin from setup script.
        return

    # 2. Fetch All
    print("\n1. Fetching all logs (limit 10)...")
    fetch_logs(token, {"limit": 10})

    # 3. Filter by Date
    print("\n3. Testing Date Filter (Past 7 days)...")
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    fetch_logs(token, {"startDate": seven_days_ago})

    print("\n4. Testing Performed By Name (Benaiah)...")
    fetch_logs(token, {"performedByName": "Benaiah"})

    print("\n5. Testing Employee Number Filter (Mock EMP1234)...")
    fetch_logs(token, {"employeeNumber": "EMP1234"})

    print("\n3. Testing Action Type Filter (CREATE)...")
    fetch_logs(token, {"actionType": "CREATE"})

if __name__ == "__main__":
    main()
