from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import timedelta
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from ai_assignment import is_ai_assignment_enabled, enable_ai_assignment, get_best_it_agent, auto_assign_unassigned_tickets


# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# =========================
# Configuration
# =========================
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'technoceram-secret-key-2024')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Enable CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize JWT
jwt = JWTManager(app)



# =========================
# Database Connection
# =========================
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )


# =========================
# Routes
# =========================

@app.route('/')
def index():
    return jsonify({
        'message': 'Welcome to Technoceram Help Desk API',
        'version': '1.0.0',
        'status': 'running'
    })

@app.route('/api/admin/ai-status', methods=['GET'])
@jwt_required()
def ai_status():
    try:
        return jsonify({
            "enabled": is_ai_assignment_enabled()
        })
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/api/admin/ai-toggle', methods=['POST'])
@jwt_required()
def toggle_ai():
    try:
        data = request.get_json()
        enabled = data.get("enabled")

        if enabled is None:
            return jsonify({"message": "Missing 'enabled' field"}), 400

        enable_ai_assignment(enabled)
        if enabled:
            auto_assign_unassigned_tickets()
        print(f"[AI] Toggle to {enabled}")

        return jsonify({
            "message": "AI assignment updated",
            "enabled": enabled
        }), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

# =========================
# LOGIN
# =========================
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        if not data:
            return jsonify({'message': 'No data provided'}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'message': 'Email and password are required'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute(
            "SELECT * FROM users WHERE email = %s AND is_active = TRUE",
            (email,)
        )

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({'message': 'Invalid email or password'}), 401

        if not check_password_hash(user['password_hash'], password):
            return jsonify({'message': 'Invalid email or password'}), 401

        access_token = create_access_token(
            identity=user['email'],
            additional_claims={
                'name': user['name'],
                'role': user['role']
            }
        )

        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role']
            }
        }), 200

    except Exception as e:
        print(f"CREATE_USER ERROR for email '{email}': {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# VERIFY TOKEN
# =========================
@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    try:
        current_email = get_jwt_identity()

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute(
            "SELECT id, email, name, role FROM users WHERE email = %s",
            (current_email,)
        )

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({'message': 'User not found'}), 404

        return jsonify({
            'valid': True,
            'user': user 
        }), 200

    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# LOGOUT
# =========================
@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logout successful'}), 200


# =========================
# ADMIN - CREATE USER
# =========================
@app.route('/api/admin/users', methods=['POST'])
@jwt_required()
def create_user():
    try:
        # Check if current user is admin
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user or current_user['role'] != 'admin':
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin access required'}), 403
        
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['email', 'password', 'name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400
        
        # Normalize email
        email = data.get('email', '').strip().lower()
        
        # Check if email already exists (case-insensitive)
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'Email already exists (case-insensitive)'}), 400
        
        # Hash password
        password_hash = generate_password_hash(data.get('password'))
        
        # Insert new user
        cursor.execute(
            """INSERT INTO users (email, password_hash, name, role, department, is_active)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, email, name, role, department, is_active""",
            (
                email,
                password_hash,
                data.get('name'),
                data.get('role', 'user'),
                data.get('department', ''),
                data.get('is_active', True)
            )
        )
        
        new_user = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': new_user['id'],
                'email': new_user['email'],
                'name': new_user['name'],
                'role': new_user['role'],
                'department': new_user['department'],
                'is_active': new_user['is_active']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================

# =========================
@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    try:
        # Check if current user is admin or manager
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user or current_user['role'] not in ['admin', 'manager']:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin or Manager access required'}), 403
        
        # Get all users
        cursor.execute(
            """SELECT id, email, name, role, department, is_active, created_at 
               FROM users ORDER BY created_at DESC"""
        )
        users = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Convert to list of dicts
        users_list = []
        for user in users:
            users_list.append({
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role'],
                'department': user['department'],
                'is_active': user['is_active'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None
            })
        
        return jsonify({'users': users_list}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# ADMIN - UPDATE USER
# =========================
@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user or current_user['role'] != 'admin':
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        # Fields to update
        update_fields = {}
        if 'name' in data:
            update_fields['name'] = data['name'].strip()
        if 'role' in data:
            update_fields['role'] = data['role']
        if 'department' in data:
            update_fields['department'] = data['department']
        if 'is_active' in data:
            update_fields['is_active'] = data['is_active']
        
        if not update_fields:
            cursor.close()
            conn.close()
            return jsonify({'message': 'No fields to update'}), 400
        
        # Build update query
        set_clause = ', '.join([f"{field} = %s" for field in update_fields.keys()])
        values = list(update_fields.values()) + [user_id]
        
        cursor.execute(
            f"UPDATE users SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id, email, name, role, department, is_active",
            values
        )
        
        updated_user = cursor.fetchone()
        if not updated_user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': updated_user
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# ADMIN - RESET USER PASSWORD
# =========================
@app.route('/api/admin/users/<int:user_id>/password', methods=['PUT'])
@jwt_required()
def reset_user_password(user_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user or current_user['role'] != 'admin':
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin access required'}), 403
        
        data = request.get_json()
        new_password = data.get('password', 'TempPass123!')
        
        password_hash = generate_password_hash(new_password)
        
        cursor.execute(
            "UPDATE users SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id, email, name",
            (password_hash, user_id)
        )
        
        result = cursor.fetchone()
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': f'Password reset to "{new_password}". User notified.',
            'user': result
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# ADMIN - DELETE USER
# =========================
@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user or current_user['role'] != 'admin':
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin access required'}), 403
        
        cursor.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# Error Handlers
# =========================
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500


# =========================
# USER - CREATE TICKET
# =========================
@app.route('/api/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current user
        cursor.execute("SELECT id, name, department FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Handle multipart form data
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        category = request.form.get('category', '').strip()
        priority = request.form.get('priority', 'medium').strip()
        anydesk_number = request.form.get('anydesk_number', '').strip()
        
        if not title:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Title is required'}), 400
        
        if not description:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Description is required'}), 400
        
        # Generate ticket number
        cursor.execute("SELECT COUNT(*) as count FROM tickets")
        count = cursor.fetchone()['count']
        ticket_number = f"TKT-{str(count + 1).zfill(5)}"
        
        # Insert ticket
        cursor.execute(
            """INSERT INTO tickets (ticket_number, title, description, category, priority, anydesk_number, user_id, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) 
               RETURNING id, ticket_number, title, description, category, priority, anydesk_number, status, created_at""",
            (ticket_number, title, description, category, priority, anydesk_number, current_user['id'], 'open')
        )
        
        ticket = cursor.fetchone()
        
        # Handle file uploads
        if 'attachments' in request.files:
            files = request.files.getlist('attachments')
            for file in files:
                if file and file.filename:
                    # Save file to uploads folder
                    upload_folder = os.path.join(os.getcwd(), 'uploads')
                    os.makedirs(upload_folder, exist_ok=True)
                    
                    filename = f"{ticket['id']}_{file.filename}"
                    file_path = os.path.join(upload_folder, filename)
                    file.save(file_path)
                    
                    # Insert attachment record
                    cursor.execute(
                        """INSERT INTO ticket_attachments (ticket_id, file_name, file_path, file_size, mime_type, uploaded_by)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (ticket['id'], file.filename, file_path, file.content_length, file.content_type, current_user['id'])
                    )
        
        conn.commit()
        
# AI Auto Assignment
        if is_ai_assignment_enabled():
            best_agent = get_best_it_agent(category, priority)
            if best_agent:
                cursor.execute(
                    "UPDATE tickets SET assigned_to = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (best_agent['id'], ticket['id'])
                )
                conn.commit()
                print(f"[AI] Ticket {ticket['ticket_number']} assigned to {best_agent['name']}")
                
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
                print("[AI ERROR] No best agent found")

        # Notify admins about new ticket
        try:
            from notifications import notify_managers
            notify_managers(
                'New Ticket Created',
                f"A new ticket has been created by {current_user['name']}: {ticket['ticket_number']}",
                'info',
                '/admin/tickets'
            )
        except Exception as e:
            print(f"Notification error: {e}")

        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Ticket created successfully',
            'ticket': {
                'id': ticket['id'],
                'ticket_number': ticket['ticket_number'],
                'title': ticket['title'],
                'description': ticket['description'],
                'category': ticket['category'],
                'priority': ticket['priority'],
                'anydesk_number': ticket['anydesk_number'],
                'status': ticket['status'],
                'created_at': ticket['created_at'].isoformat() if ticket['created_at'] else None
            }
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# USER - GET MY TICKETS
# =========================
@app.route('/api/tickets', methods=['GET'])
@jwt_required()
def get_my_tickets():
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current user
        cursor.execute("SELECT id, role, department FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Check if user wants all tickets (query parameter)
        show_all = request.args.get('all', 'false').lower() == 'true'
        
# Admin can see all tickets
        if current_user['role'] == 'admin':
            # Get all tickets with user info
            cursor.execute(
                """SELECT t.id, t.ticket_number, t.title, t.description, t.category, 
                          t.priority, t.anydesk_number, t.status, t.created_at, t.updated_at,
                          t.user_id, t.assigned_to,
                          u.name as user_name, u.email as user_email, u.department as user_department,
                          au.name as assigned_to_name
                   FROM tickets t
                   LEFT JOIN users u ON t.user_id = u.id
                   LEFT JOIN users au ON t.assigned_to = au.id
                   ORDER BY t.created_at DESC"""
            )
        # Staff/IT can see tickets assigned to them AND tickets they created
        elif current_user['role'] in ['staff', 'it']:
            cursor.execute(
                """SELECT t.id, t.ticket_number, t.title, t.description, t.category, 
                          t.priority, t.anydesk_number, t.status, t.created_at, t.updated_at,
                          t.user_id, t.assigned_to,
                          u.name as user_name, u.email as user_email, u.department as user_department,
                          au.name as assigned_to_name
                   FROM tickets t
                   LEFT JOIN users u ON t.user_id = u.id
                   LEFT JOIN users au ON t.assigned_to = au.id
                   WHERE t.user_id = %s OR t.assigned_to = %s
                   ORDER BY t.created_at DESC""",
                (current_user['id'], current_user['id'])
            )
        elif show_all:
            # Regular users can request all tickets too
            cursor.execute(
                """SELECT t.id, t.ticket_number, t.title, t.description, t.category, 
                          t.priority, t.anydesk_number, t.status, t.created_at, t.updated_at,
                          t.user_id, t.assigned_to,
                          u.name as user_name, u.email as user_email, u.department as user_department,
                          au.name as assigned_to_name
                   FROM tickets t
                   LEFT JOIN users u ON t.user_id = u.id
                   LEFT JOIN users au ON t.assigned_to = au.id
                   ORDER BY t.created_at DESC"""
            )
        else:
            # Get user's tickets only
            cursor.execute(
                """SELECT id, ticket_number, title, description, category, priority, anydesk_number, status, created_at, updated_at
                   FROM tickets WHERE user_id = %s ORDER BY created_at DESC""",
                (current_user['id'],)
            )
        
        tickets = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        tickets_list = []
        for ticket in tickets:
            if current_user['role'] == 'admin' or show_all:
                tickets_list.append({
                    'id': ticket['id'],
                    'ticket_number': ticket['ticket_number'],
                    'title': ticket['title'],
                    'description': ticket['description'],
                    'category': ticket['category'],
                    'priority': ticket['priority'],
                    'anydesk_number': ticket['anydesk_number'],
                    'status': ticket['status'],
                    'created_at': ticket['created_at'].isoformat() if ticket['created_at'] else None,
                    'updated_at': ticket['updated_at'].isoformat() if ticket['updated_at'] else None,
                    'user_id': ticket['user_id'],
                    'user_name': ticket['user_name'],
                    'user_email': ticket['user_email'],
                    'user_department': ticket['user_department'],
                    'assigned_to': ticket['assigned_to'],
                    'assigned_to_name': ticket['assigned_to_name']
                })
            else:
                tickets_list.append({
                    'id': ticket['id'],
                    'ticket_number': ticket['ticket_number'],
                    'title': ticket['title'],
                    'description': ticket['description'],
                    'category': ticket['category'],
                    'priority': ticket['priority'],
                    'anydesk_number': ticket['anydesk_number'],
                    'status': ticket['status'],
                    'created_at': ticket['created_at'].isoformat() if ticket['created_at'] else None,
                    'updated_at': ticket['updated_at'].isoformat() if ticket['updated_at'] else None
                })
        
        return jsonify({'tickets': tickets_list}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# Helper function to check if user is admin or manager
def is_admin_or_manager(cursor, email):
    cursor.execute("SELECT role FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    return user and user['role'] in ['admin', 'manager']


# =========================
# ADMIN - GET ALL TICKETS
# =========================
@app.route('/api/admin/tickets', methods=['GET'])
@jwt_required()
def get_all_tickets():
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if current user is admin or manager
        if not is_admin_or_manager(cursor, current_email):
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin or Manager access required'}), 403
        
        # Get all tickets with user info and assigned_to info
        cursor.execute(
            """SELECT t.id, t.ticket_number, t.title, t.description, t.category, 
                      t.priority, t.anydesk_number, t.status, t.created_at, t.updated_at, t.resolved_at,
                      t.user_id, t.assigned_to,
                      u.name as user_name, u.email as user_email,
                      au.name as assigned_to_name
               FROM tickets t
               LEFT JOIN users u ON t.user_id = u.id
               LEFT JOIN users au ON t.assigned_to = au.id
               ORDER BY t.created_at DESC"""
        )
        tickets = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        tickets_list = []
        for ticket in tickets:
            tickets_list.append({
                'id': ticket['id'],
                'ticket_number': ticket['ticket_number'],
                'title': ticket['title'],
                'description': ticket['description'],
                'category': ticket['category'],
                'priority': ticket['priority'],
                'anydesk_number': ticket['anydesk_number'],
                'status': ticket['status'],
                'created_at': ticket['created_at'].isoformat() if ticket['created_at'] else None,
                'updated_at': ticket['updated_at'].isoformat() if ticket['updated_at'] else None,
                'resolved_at': ticket['resolved_at'].isoformat() if ticket['resolved_at'] else None,
                'user_id': ticket['user_id'],
                'user_name': ticket['user_name'],
                'user_email': ticket['user_email'],
                'assigned_to': ticket['assigned_to'],
                'assigned_to_name': ticket['assigned_to_name']
            })
        
        return jsonify({'tickets': tickets_list}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# ADMIN - ASSIGN TICKET
# =========================
@app.route('/api/admin/tickets/<int:ticket_id>/assign', methods=['PUT'])
@jwt_required()
def assign_ticket(ticket_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if current user is admin or manager
        if not is_admin_or_manager(cursor, current_email):
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin or Manager access required'}), 403
        
        # Get request data
        data = request.get_json()
        assigned_to = data.get('assigned_to')
        
        # Update ticket assignment
        if assigned_to:
            cursor.execute(
                """UPDATE tickets SET assigned_to = %s, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = %s RETURNING id, ticket_number""",
                (assigned_to, ticket_id)
            )
            result = cursor.fetchone()
            ticket_number = result['ticket_number'] if result else None
        else:
            cursor.execute(
                """UPDATE tickets SET assigned_to = NULL, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = %s RETURNING id""",
                (ticket_id,)
            )
            result = cursor.fetchone()
            ticket_number = None
        
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Ticket not found'}), 404
        
        # If ticket is assigned to IT staff, notify them
        if assigned_to and ticket_number:
            try:
                from notifications import create_notification
                create_notification(
                    assigned_to,
                    'New Ticket Assigned',
                    f'You have been assigned a new ticket: {ticket_number}',
                    'info',
                    '/assigned-tickets'
                )
            except Exception as e:
                print(f"Notification error: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Ticket assigned successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# IT STAFF - UPDATE TICKET STATUS
# =========================
@app.route('/api/tickets/<int:ticket_id>/status', methods=['PUT'])
@jwt_required()
def update_ticket_status_staff(ticket_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current user
        cursor.execute("SELECT id, name, role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Only staff/IT can update status of their assigned tickets
        if current_user['role'] not in ['staff', 'it']:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Staff access required'}), 403
        
        # Get request data
        data = request.get_json()
        new_status = data.get('status')
        
        valid_statuses = ['open', 'in_progress', 'resolved', 'closed']
        if new_status not in valid_statuses:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Invalid status'}), 400
        
        # Check if ticket is assigned to this staff member
        cursor.execute(
            "SELECT id FROM tickets WHERE id = %s AND assigned_to = %s",
            (ticket_id, current_user['id'])
        )
        ticket = cursor.fetchone()
        
        if not ticket:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Ticket not found or not assigned to you'}), 404
        
        # Set resolved_at timestamp if status is resolved or closed
        resolved_at = 'CURRENT_TIMESTAMP' if new_status in ['resolved', 'closed'] else 'NULL'
        
        cursor.execute(
            f"""UPDATE tickets SET status = %s, resolved_at = {resolved_at}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = %s RETURNING id""",
            (new_status, ticket_id)
        )
        
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Ticket not found'}), 404
        
        conn.commit()

        # Notify requester about status update
        try:
            # Refresh cursor and fetch requester info
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT user_id, ticket_number FROM tickets WHERE id = %s", (ticket_id,))
            t_info = cursor.fetchone()
            if t_info:
                from notifications import create_notification
                create_notification(
                    t_info['user_id'],
                    'Ticket Status Updated',
                    f"Your ticket {t_info['ticket_number']} status has been changed to {new_status.replace('_', ' ')}",
                    'info',
                    '/my-tickets'
                )
        except Exception as e:
            print(f"Notification error in staff status update: {e}")

        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Status updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# ADMIN - UPDATE TICKET STATUS
# =========================
@app.route('/api/admin/tickets/<int:ticket_id>/status', methods=['PUT'])
@jwt_required()
def update_ticket_status(ticket_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if current user is admin or manager
        if not is_admin_or_manager(cursor, current_email):
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin or Manager access required'}), 403
        
        # Get request data
        data = request.get_json()
        new_status = data.get('status')
        
        valid_statuses = ['open', 'in_progress', 'resolved', 'closed']
        if new_status not in valid_statuses:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Invalid status'}), 400
        
        # Set resolved_at timestamp if status is resolved or closed
        resolved_at = 'CURRENT_TIMESTAMP' if new_status in ['resolved', 'closed'] else 'NULL'
        
        cursor.execute(
            f"""UPDATE tickets SET status = %s, resolved_at = {resolved_at}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = %s RETURNING id""",
            (new_status, ticket_id)
        )
        
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Ticket not found'}), 404
        
        conn.commit()

        # Notify requester about status update
        try:
            # Refresh cursor and fetch requester info
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT user_id, ticket_number FROM tickets WHERE id = %s", (ticket_id,))
            t_info = cursor.fetchone()
            if t_info:
                from notifications import create_notification
                create_notification(
                    t_info['user_id'],
                    'Ticket Status Updated',
                    f"Your ticket {t_info['ticket_number']} status has been changed to {new_status.replace('_', ' ')}",
                    'info',
                    '/my-tickets'
                )
        except Exception as e:
            print(f"Notification error in admin status update: {e}")

        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Status updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# ADMIN - GET STATISTICS
# =========================
@app.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check if current user is admin or manager
        if not is_admin_or_manager(cursor, current_email):
            cursor.close()
            conn.close()
            return jsonify({'message': 'Admin or Manager access required'}), 403
        
        # Get ticket counts by status
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
                SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
                AVG(CASE WHEN resolved_at IS NOT NULL THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 ELSE NULL END) as avg_resolution_hours
            FROM tickets
        """)
        stats = cursor.fetchone()
        
        # Get current user department for filtering if manager
        cursor.execute("SELECT role, department FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        # Base query for team performance (now only for role 'it')
        query = """
            SELECT 
                u.id as user_id,
                u.name,
                u.role,
                u.department,
                COUNT(t.id) as tickets_assigned,
                SUM(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as tickets_resolved,
                SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as tickets_in_progress,
                AVG(CASE WHEN t.resolved_at IS NOT NULL THEN EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600 ELSE NULL END) as avg_resolution_time
            FROM users u
            LEFT JOIN tickets t ON t.assigned_to = u.id
            WHERE u.role = 'it'
        """
        
        params = []
        if current_user['role'] == 'manager' and current_user['department']:
            query += " AND u.department = %s"
            params.append(current_user['department'])
            
        query += " GROUP BY u.id, u.name, u.role, u.department ORDER BY tickets_resolved DESC"
        
        cursor.execute(query, params)
        team_performance = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        team_list = []
        for member in team_performance:
            assigned = member['tickets_assigned'] or 0
            resolved = member['tickets_resolved'] or 0
            # Calculate resolution rate
            resolution_rate = round((resolved / assigned * 100), 1) if assigned > 0 else 0
            
            team_list.append({
                'user_id': member['user_id'],
                'name': member['name'],
                'role': member['role'],
                'department': member['department'],
                'tickets_assigned': assigned,
                'tickets_resolved': resolved,
                'tickets_in_progress': member['tickets_in_progress'] or 0,
                'resolution_rate': resolution_rate,
                'avg_resolution_time': float(member['avg_resolution_time']) if member['avg_resolution_time'] else 0
            })
        
        return jsonify({
            'totalTickets': stats['total'] or 0,
            'openTickets': stats['open_count'] or 0,
            'inProgressTickets': stats['in_progress_count'] or 0,
            'resolvedTickets': stats['resolved_count'] or 0,
            'closedTickets': stats['closed_count'] or 0,
            'avgResolutionTime': float(stats['avg_resolution_hours']) if stats['avg_resolution_hours'] else 0,
            'teamPerformance': team_list
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# IT STAFF - GET ASSIGNED TICKETS
# =========================
@app.route('/api/tickets/assigned', methods=['GET'])
@jwt_required()
def get_assigned_tickets():
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current user
        cursor.execute("SELECT id, name, role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Only staff (or IT) can view their assigned tickets
        if current_user['role'] not in ['staff', 'it']:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Staff access required'}), 403
        
        # Get tickets assigned to this staff member
        cursor.execute(
            """SELECT t.id, t.ticket_number, t.title, t.description, t.category, 
                      t.priority, t.anydesk_number, t.status, t.created_at, t.updated_at,
                      t.assigned_to,
                      u.name as user_name, u.email as user_email,
                      au.name as assigned_to_name
               FROM tickets t
               LEFT JOIN users u ON t.user_id = u.id
               LEFT JOIN users au ON t.assigned_to = au.id
               WHERE t.assigned_to = %s
               ORDER BY t.created_at DESC""",
            (current_user['id'],)
        )
        tickets = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        tickets_list = []
        for ticket in tickets:
            tickets_list.append({
                'id': ticket['id'],
                'ticket_number': ticket['ticket_number'],
                'title': ticket['title'],
                'description': ticket['description'],
                'category': ticket['category'],
                'priority': ticket['priority'],
                'anydesk_number': ticket['anydesk_number'],
                'status': ticket['status'],
                'created_at': ticket['created_at'].isoformat() if ticket['created_at'] else None,
                'updated_at': ticket['updated_at'].isoformat() if ticket['updated_at'] else None,
                'user_name': ticket['user_name'],
                'user_email': ticket['user_email'],
                'assigned_to': ticket['assigned_to'],
                'assigned_to_name': ticket['assigned_to_name']
            })
        
        return jsonify({'tickets': tickets_list}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# GET TICKET COMMENTS
# =========================
@app.route('/api/tickets/<int:ticket_id>/comments', methods=['GET'])
@jwt_required()
def get_ticket_comments(ticket_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current user
        cursor.execute("SELECT id, name, role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Get comments for this ticket
        if current_user['role'] in ['admin', 'manager', 'staff', 'it']:
            # Staff, IT, Managers, Admins can see internal comments
            cursor.execute(
                """SELECT tc.id, tc.comment, tc.is_internal, tc.created_at, 
                          u.name as user_name, u.role as user_role
                   FROM ticket_comments tc
                   LEFT JOIN users u ON tc.user_id = u.id
                   WHERE tc.ticket_id = %s
                   ORDER BY tc.created_at ASC""",
                (ticket_id,)
            )
        else:
            # Regular users can only see non-internal comments
            cursor.execute(
                """SELECT tc.id, tc.comment, tc.is_internal, tc.created_at, 
                          u.name as user_name, u.role as user_role
                   FROM ticket_comments tc
                   LEFT JOIN users u ON tc.user_id = u.id
                   WHERE tc.ticket_id = %s AND tc.is_internal = FALSE
                   ORDER BY tc.created_at ASC""",
                (ticket_id,)
            )
        comments = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        comments_list = []
        for comment in comments:
            comments_list.append({
                'id': comment['id'],
                'comment': comment['comment'],
                'is_internal': comment['is_internal'],
                'created_at': comment['created_at'].isoformat() if comment['created_at'] else None,
                'user_name': comment['user_name'],
                'user_role': comment['user_role']
            })
        
        return jsonify({'comments': comments_list}), 200
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# ADD TICKET COMMENT
# =========================
@app.route('/api/tickets/<int:ticket_id>/comments', methods=['POST'])
@jwt_required()
def add_ticket_comment(ticket_id):
    try:
        current_email = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get current user
        cursor.execute("SELECT id, name, role FROM users WHERE email = %s", (current_email,))
        current_user = cursor.fetchone()
        
        if not current_user:
            cursor.close()
            conn.close()
            return jsonify({'message': 'User not found'}), 404
        
        # Get request data
        data = request.get_json()
        comment_text = data.get('comment', '').strip()
        
        if not comment_text:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Comment is required'}), 400
        
        # Staff/IT comments are visible to manager/admin only (internal) if explicitly requested
        # Default to public (is_internal=False) so they notify the user
        is_internal = data.get('is_internal', False)
        
        # If the requester is a user, it's never internal
        if current_user['role'] == 'user':
            is_internal = False
        
        # Insert comment
        cursor.execute(
            """INSERT INTO ticket_comments (ticket_id, user_id, comment, is_internal)
               VALUES (%s, %s, %s, %s) 
               RETURNING id, comment, is_internal, created_at""",
            (ticket_id, current_user['id'], comment_text, is_internal)
        )
        
        new_comment = cursor.fetchone()
        
        conn.commit()

        # Send notifications for the new comment
        try:
            # Refresh cursor and fetch ticket details
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT user_id, assigned_to, ticket_number FROM tickets WHERE id = %s", (ticket_id,))
            ticket = cursor.fetchone()
            
            if ticket:
                from notifications import create_notification, notify_managers
                owner_id = ticket['user_id']
                assignee_id = ticket['assigned_to']
                is_comment_internal = new_comment['is_internal']
                
                # 1. Notify Owner (only if public comment and not by owner)
                if not is_comment_internal and current_user['id'] != owner_id:
                    create_notification(
                        owner_id,
                        'New Comment on Your Ticket',
                        f"A new comment was added to {ticket['ticket_number']} by {current_user['name']}",
                        'info',
                        '/my-tickets'
                    )
                
                # 2. Notify Assignee (if not the commenter)
                if assignee_id and current_user['id'] != assignee_id:
                    create_notification(
                        assignee_id,
                        'New Comment on Ticket',
                        f"A new { 'internal ' if is_comment_internal else ''}comment was added to {ticket['ticket_number']} by {current_user['name']}",
                        'info',
                        '/assigned-tickets'
                    )
                
                # 3. Notify Managers
                # Notify managers to keep them in the loop, but don't notify the manager who just commented.
                # If it's a regular user commenting, always notify managers.
                # If it's staff commenting, notify managers so they can monitor progress.
                if current_user['role'] not in ['manager', 'admin']:
                    notify_managers(
                        'New Comment Received',
                        f"User {current_user['name']} commented on ticket {ticket['ticket_number']}",
                        'info',
                        '/admin/tickets',
                        exclude_user_id=current_user['id']
                    )
                else:
                    # It's a manager/admin/staff commenting, we still want to notify OTHER managers.
                    # notify_managers sends to all managers/admins, so we'll need a custom query or just let it send
                    # For simplicity, if a manager comments, we won't notify all other managers to avoid spam,
                    # EXCEPT if to the assignee. But users reported managers aren't getting notified.
                    # Let's just use notify_managers for ALL comments, but the function might need to exclude the sender.
                    # For now, let's always notify managers if an IT staff or User comments.
                    if current_user['role'] in ['it', 'staff', 'user', 'manager', 'admin']:
                        notify_managers(
                            'New Comment Added',
                            f"{current_user['role'].capitalize()} {current_user['name']} commented on ticket {ticket['ticket_number']}",
                            'info',
                            '/admin/tickets',
                            exclude_user_id=current_user['id']
                        )
        except Exception as e:
            print(f"Notification error in comment: {e}")

        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Comment added successfully',
            'comment': {
                'id': new_comment['id'],
                'comment': new_comment['comment'],
                'is_internal': new_comment['is_internal'],
                'created_at': new_comment['created_at'].isoformat() if new_comment['created_at'] else None,
                'user_name': current_user['name'],
                'user_role': current_user['role']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500


# =========================
# Register Notification Routes
# =========================
from notifications import register_notification_routes
register_notification_routes(app)

# =========================
# Run Server
# =========================
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

    print(f"\n🚀 Technoceram Help Desk API")
    print(f"   Server running on http://localhost:{port}")
    print(f"   Debug mode: {debug}\n")

    app.run(host='0.0.0.0', port=port, debug=debug)
