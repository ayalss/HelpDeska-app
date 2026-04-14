import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import random

load_dotenv()

AI_ENABLED = False

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def is_ai_assignment_enabled():
    global AI_ENABLED
    return AI_ENABLED

def enable_ai_assignment(enabled: bool):
    global AI_ENABLED
    AI_ENABLED = enabled
    print(f"[AI TOGGLE] AI assignment {'ENABLED' if enabled else 'DISABLED'}")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO system_settings (id, ai_assignment_enabled) VALUES (1, %s) ON CONFLICT (id) DO UPDATE SET ai_assignment_enabled = %s", (enabled, enabled))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[AI ERROR] Toggle DB update failed: {e}")

def get_best_it_agent(ticket_category=None, priority=None):
    if not is_ai_assignment_enabled():
        return None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                u.id, u.name,
                COALESCE(workload.cnt, 0) as workload
            FROM users u
            LEFT JOIN (SELECT assigned_to, COUNT(*) as cnt FROM tickets WHERE status IN ('open', 'in_progress') GROUP BY assigned_to) workload ON u.id = workload.assigned_to
            WHERE u.role = 'it' AND u.is_active = TRUE
        """)
        
        agents = cursor.fetchall()
        cursor.close()
        conn.close()

        if not agents:
            return None

        # Sort agents by workload first, then add some randomness for ties
        agents.sort(key=lambda agent: (agent['workload'], random.random()))
        
        best = agents[0]
        return {'id': best['id'], 'name': best['name']}

    except Exception as e:
        print(f"[AI ERROR] get_best_it_agent failed: {e}")
        return None

def auto_assign_unassigned_tickets():
    print("[AI] Assigning all unassigned tickets...")
    if not is_ai_assignment_enabled():
        return

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT id, ticket_number, category, priority FROM tickets WHERE assigned_to IS NULL")
        unassigned = cursor.fetchall()

        for ticket in unassigned:
            best_agent = get_best_it_agent(ticket['category'], ticket['priority'])
            if best_agent:
                cursor.execute(
                    "UPDATE tickets SET assigned_to = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (best_agent['id'], ticket['id'])
                )
                conn.commit() # Commit after each edit to ensure get_best_it_agent sees updated workload
                print(f"[AI] Ticket {ticket['id']} assigned to {best_agent['name']}")

                try:
                    from notifications import create_notification
                    create_notification(
                        user_id=best_agent['id'],
                        title="New Ticket Assigned",
                        message=f"You have been assigned ticket {ticket['ticket_number']} by AI",
                        notification_type='info',
                        link='/assigned-tickets'
                    )
                    print(f"[AI NOTIFY] Ticket {ticket['ticket_number']} assigned to {best_agent['name']}")
                except Exception as e:
                    print(f"[AI NOTIFY ERROR] {e}")
            else:
                print("[AI WARNING] No IT agent available")

    except Exception as e:
        print(f"[AI ERROR] auto_assign_unassigned_tickets failed: {e}")
    finally:
        cursor.close()
        conn.close()
