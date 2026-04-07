import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

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
        
        cursor.execute("SELECT id, name, email, role, department FROM users")
        users = cursor.fetchall()
        
        with open("user_debug_report.txt", "w", encoding="utf-8") as f:
            f.write("--- User Data Report ---\n")
            for user in users:
                line = f"[{user['id']}] Name: '{user['name']}', Email: '{user['email']}', Role: '{user['role']}', Dept: '{user['department']}'\n"
                f.write(line)
            
        cursor.close()
        conn.close()
        print("Report written to user_debug_report.txt")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()
