import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def update_manager():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
        cursor = conn.cursor()
        
        # Update manager's department to match IT staff
        cursor.execute("UPDATE users SET department = 'IT Support' WHERE email = 'manager@technoceram.com'")
        
        conn.commit()
        print("Updated manager department to 'IT Support'")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_manager()
