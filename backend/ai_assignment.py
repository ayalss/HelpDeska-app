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

def get_best_it_agent(ticket_category=None, priority=None):
    """AI Logic: Find best IT agent based on workload"""     
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get all IT agents
    cursor.execute("""
        SELECT id, name, email, department, specialization
        FROM users 
        WHERE role = 'it' AND is_active = TRUE
        ORDER BY id
    """)
    it_agents = cursor.fetchall()
    
    if not it_agents:
        cursor.close()
        conn.close()
        return None
    
    # Get workload for each IT agent (open/in_progress tickets)
    best_agent = None
    lowest_workload = float('inf')
    
    for agent in it_agents:
        cursor.execute("""
            SELECT COUNT(*) as open_tickets
            FROM tickets t
            WHERE t.assigned_to = %s 
            AND t.status IN ('open', 'in_progress')
        """, (agent['id'],))
        workload = cursor.fetchone()['open_tickets']
        
        # Prefer specialists if category matches
        score = workload
        if ticket_category and agent['specialization'] and ticket_category.lower() in agent['specialization'].lower():
            score -= 0.5  # Bonus for specialist
        
        if score < lowest_workload:
            lowest_workload = score
            best_agent = agent
    
    cursor.close()
    conn.close()
    return best_agent

def is_ai_assignment_enabled():
    """Check if AI assignment is enabled by manager"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute("SELECT ai_assignment_enabled FROM system_settings LIMIT 1")
    setting = cursor.fetchone()
    
    cursor.close()
    conn.close()
    return setting['ai_assignment_enabled'] if setting else False

def enable_ai_assignment(enabled=True):
    """Manager toggle AI assignment"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO system_settings (ai_assignment_enabled) 
        VALUES (%s) 
        ON CONFLICT (id) DO UPDATE SET ai_assignment_enabled = %s
    """, (enabled, enabled))
    
    conn.commit()
    cursor.close()
    conn.close()
    return True
