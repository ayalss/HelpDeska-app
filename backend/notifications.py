from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from psycopg2.extras import RealDictCursor

# =========================
# NOTIFICATIONS API
# =========================

def create_notification(user_id, title, message, notification_type='info', link=None):
    """Helper function to create a notification"""
    try:
        from app import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """INSERT INTO notifications (user_id, title, message, type, link)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, title, message, notification_type, link)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error creating notification: {e}")
        return False


def notify_managers(title, message, notification_type='info', link=None, exclude_user_id=None):
    """Notify all managers and admins, optionally excluding a specific user"""
    try:
        from app import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all managers and admins
        if exclude_user_id:
            cursor.execute("SELECT id FROM users WHERE role = 'admin' AND id != %s", (exclude_user_id,))
        else:
            cursor.execute("SELECT id FROM users WHERE role = 'admin'")
            
        recipients = cursor.fetchall()
        
        for recipient in recipients:
            cursor.execute(
                """INSERT INTO notifications (user_id, title, message, type, link)
                   VALUES (%s, %s, %s, %s, %s)""",
                (recipient[0], title, message, notification_type, link)
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error notifying managers/admins: {e}")
        return False


def register_notification_routes(app):
    """Register notification routes with the Flask app"""
    
    @app.route('/api/notifications', methods=['GET'])
    @jwt_required()
    def get_notifications():
        try:
            from app import get_db_connection
            current_email = get_jwt_identity()
            
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get current user
            cursor.execute("SELECT id FROM users WHERE email = %s", (current_email,))
            user = cursor.fetchone()
            
            if not user:
                cursor.close()
                conn.close()
                return jsonify({'message': 'User not found'}), 404
            
            user_id = user['id']
            
            # Get notifications
            cursor.execute(
                """SELECT id, title, message, type, is_read, link, created_at
                   FROM notifications 
                   WHERE user_id = %s
                   ORDER BY created_at DESC
                   LIMIT 50""",
                (user_id,)
            )
            notifications = cursor.fetchall()
            
            # Get unread count
            cursor.execute(
                "SELECT COUNT(*) as count FROM notifications WHERE user_id = %s AND is_read = FALSE",
                (user_id,)
            )
            unread_result = cursor.fetchone()
            unread_count = unread_result['count']
            
            cursor.close()
            conn.close()
            
            notifications_list = []
            for notif in notifications:
                notifications_list.append({
                    'id': notif['id'],
                    'title': notif['title'],
                    'message': notif['message'],
                    'type': notif['type'],
                    'is_read': notif['is_read'],
                    'link': notif['link'],
                    'created_at': notif['created_at'].isoformat() if notif['created_at'] else None
                })
            
            return jsonify({
                'notifications': notifications_list,
                'unread_count': unread_count
            }), 200
            
        except Exception as e:
            return jsonify({'message': f'Server error: {str(e)}'}), 500


    @app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
    @jwt_required()
    def mark_notification_read(notification_id):
        try:
            from app import get_db_connection
            current_email = get_jwt_identity()
            
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get current user
            cursor.execute("SELECT id FROM users WHERE email = %s", (current_email,))
            user = cursor.fetchone()
            
            if not user:
                cursor.close()
                conn.close()
                return jsonify({'message': 'User not found'}), 404
            
            # Mark notification as read
            cursor.execute(
                "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s RETURNING id",
                (notification_id, user['id'])
            )
            
            if cursor.fetchone() is None:
                cursor.close()
                conn.close()
                return jsonify({'message': 'Notification not found'}), 404
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'message': 'Notification marked as read'}), 200
            
        except Exception as e:
            return jsonify({'message': f'Server error: {str(e)}'}), 500


    @app.route('/api/notifications/read-all', methods=['PUT'])
    @jwt_required()
    def mark_all_notifications_read():
        try:
            from app import get_db_connection
            current_email = get_jwt_identity()
            
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get current user
            cursor.execute("SELECT id FROM users WHERE email = %s", (current_email,))
            user = cursor.fetchone()
            
            if not user:
                cursor.close()
                conn.close()
                return jsonify({'message': 'User not found'}), 404
            
            # Mark all as read
            cursor.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
                (user['id'],)
            )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'message': 'All notifications marked as read'}), 200
            
        except Exception as e:
            return jsonify({'message': f'Server error: {str(e)}'}), 500
