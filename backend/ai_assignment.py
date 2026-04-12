import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

# GLOBAL CACHE (simple toggle memory)
AI_ENABLED = False


def is_ai_assignment_enabled():
    global AI_ENABLED

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("SELECT ai_assignment_enabled FROM system_settings WHERE id = 1")
    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if row:
        AI_ENABLED = row["ai_assignment_enabled"]

    return AI_ENABLED

def auto_assign_unassigned_tickets():
    if not is_ai_assignment_enabled():
        return

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # get unassigned tickets
    cursor.execute("""
        SELECT id, category, priority
        FROM tickets
        WHERE assigned_to IS NULL
    """)
    tickets = cursor.fetchall()

    for t in tickets:
        best = get_best_it_agent(t["category"], t["priority"])

        if best:
            cursor.execute("""
                UPDATE tickets
                SET assigned_to = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (best["id"], t["id"]))

    conn.commit()
    cursor.close()
    conn.close()

def enable_ai_assignment(enabled: bool):
    global AI_ENABLED
    AI_ENABLED = enabled

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE system_settings
        SET ai_assignment_enabled = %s
        WHERE id = 1
    """, (enabled,))

    conn.commit()
    cursor.close()
    conn.close()

    return True


def get_best_it_agent(ticket_category=None, priority=None):
    # 🚨 block AI if disabled
    if not is_ai_assignment_enabled():
        return None

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT id, name, specialization
        FROM users
        WHERE role = 'it' AND is_active = TRUE
    """)

    agents = cursor.fetchall()

    best = None
    best_score = 999999

    for a in agents:
        cursor.execute("""
            SELECT COUNT(*) as cnt
            FROM tickets
            WHERE assigned_to = %s
            AND status IN ('open','in_progress')
        """, (a["id"],))

        workload = cursor.fetchone()["cnt"]

        score = workload

        if priority == "high":
            score += 1

        if ticket_category and a["specialization"]:
            if ticket_category.lower() in a["specialization"].lower():
                score -= 2

        if score < best_score:
            best_score = score
            best = a

    cursor.close()
    conn.close()

    return best
