from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import get_db_connection, app
from ai_assignment import is_ai_assignment_enabled, enable_ai_assignment, get_best_it_agent
from psycopg2.extras import RealDictCursor

# Manager AI Control Endpoints
@app.route('/api/admin/ai-toggle', methods=['POST'])
@jwt_required()
def toggle_ai_assignment():
    try:
        current_email = get_jwt_identity()
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or user['role'] not in ['admin', 'manager']:
            return jsonify({'message': 'Manager/Admin access required'}), 403
        
        data = request.get_json()
        enabled = data.get('enabled', False)
        
        enable_ai_assignment(enabled)
        return jsonify({'message': 'AI assignment toggled', 'enabled': enabled})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/ai-assign/<int:ticket_id>', methods=['POST'])
@jwt_required()
def ai_assign_ticket(ticket_id):
    try:
        current_email = get_jwt_identity()
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or user['role'] not in ['admin', 'manager']:
            return jsonify({'message': 'Manager/Admin access required'}), 403
        
        # Get ticket category/priority
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT category, priority FROM tickets WHERE id = %s", (ticket_id,))
        ticket = cursor.fetchone()
        cursor.close()
        
        if not ticket:
            return jsonify({'message': 'Ticket not found'}), 404
        
        best_agent = get_best_it_agent(ticket['category'], ticket['priority'])
        if best_agent:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE tickets SET assigned_to = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (best_agent['id'], ticket_id)
            )
            conn = get_db_connection()
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'message': f'AI assigned to {best_agent["name"]}'})
        return jsonify({'message': 'No available IT agents'})
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route('/api/admin/ai-status', methods=['GET'])
@jwt_required()
def get_ai_status():
    try:
        current_email = get_jwt_identity()
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or user['role'] not in ['admin', 'manager']:
            return jsonify({'message': 'Manager/Admin access required'}), 403
        
        enabled = is_ai_assignment_enabled()
        return jsonify({'ai_enabled': enabled})
    except Exception as e:
        return jsonify({'message': str(e)}), 500
