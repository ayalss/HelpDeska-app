import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def check_db():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "technoceram_helpdesk"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "2001")
        )
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        with open("notifs_debug.txt", "w", encoding="utf-8") as f:
            f.write("--- Recent Comments ---\n")
            cursor.execute("SELECT id, ticket_id, user_id, is_internal, created_at FROM ticket_comments ORDER BY created_at DESC LIMIT 5")
            for row in cursor.fetchall():
                f.write(f"{row}\n")
                
            f.write("\n--- Recent Notifications ---\n")
            cursor.execute("SELECT id, user_id, title, type, created_at FROM notifications ORDER BY created_at DESC LIMIT 10")
            for row in cursor.fetchall():
                f.write(f"{row}\n")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
