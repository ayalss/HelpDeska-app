import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import traceback

load_dotenv()

def check_users():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "technoceram_helpdesk"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "2001")
        )
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT id, name, email, role, department, is_active, created_at FROM users ORDER BY id")
        users = cursor.fetchall()
        
        with open("user_debug_report_enhanced.txt", "w", encoding="utf-8") as f:
            f.write("=== Enhanced User Data Report ===\n")
            f.write(f"Total users: {len(users)}\n")
            active_admins = len([u for u in users if u['role'] == 'admin' and u['is_active']])
            f.write(f"Active admins: {active_admins}\n\n")
            for user in users:
                f.write(f"ID:{user['id']} | Name:'{user['name']}' | Email:'{user['email']}' | Role:'{user['role']}' | Dept:'{user['department']}' | Active:{user['is_active']} | Created:{user['created_at']}\n")
        
        cursor.close()
        conn.close()
        print(f"Enhanced report saved to user_debug_report_enhanced.txt")
        print(f"Found {len(users)} users, {active_admins} active admins")
    except Exception as e:
        print(f"check_users ERROR: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    check_users()
