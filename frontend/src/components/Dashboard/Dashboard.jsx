import React, { useState, useEffect } from 'react'
import './Dashboard.css'

const Dashboard = ({ onLogout, onNavigateToUserManagement, onNavigateToCreateTicket, onNavigateToMyTickets, onNavigateToMyAssignedTickets, onNavigateToAdminTickets, onNavigateToAdminDashboard }) => {

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  const storedUser =
    localStorage.getItem('user') ||
    sessionStorage.getItem('user')

  const user = storedUser ? JSON.parse(storedUser) : {}

  // Roles that can see notifications UI: admin, manager, staff, it, and user
  const isNotificationRole = ['admin', 'staff', 'it'].includes(user.role || '')

  // Admin only can access admin features
  const isAdminOrManager = user.role === 'admin'

  // IT Staff can see their assigned tickets (check for both 'staff' and 'it' roles)
  const isStaff = user.role === 'staff' || user.role === 'it'

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      fetchNotifications()
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      fetchNotifications()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const formatNotificationTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4CAF50" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        )
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#FF9800" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#2196F3" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        )
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="company-logo-small">
            <img src="/logo.png" alt="Technoceram Logo" className="logo-img-small" />
          </div>
          <h1 className="header-title">Technoceram Help Desk</h1>
        </div>
        <div className="header-right">
          {isNotificationRole && (
            <div className="notification-container">
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button className="mark-all-read" onClick={markAllAsRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="no-notifications">No notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                          onClick={() => markAsRead(notif.id)}
                        >
                          <div className="notification-icon">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">{notif.title}</div>
                            <div className="notification-message">{notif.message}</div>
                            <div className="notification-time">{formatNotificationTime(notif.created_at)}</div>
                          </div>
                          {!notif.is_read && <div className="unread-dot"></div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="user-info">
            <span className="user-name">{user.name || 'User'}</span>
            <button onClick={onLogout} className="logout-btn">
              <svg viewBox="0 0 24 24" className="logout-icon">
                <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Welcome to Technoceram Help Desk</h2>
          <p>Your gateway to technical support and assistance</p>
        </div>

        <div className="dashboard-grid">
          {isAdminOrManager && (
            <>
              <div className="dashboard-card admin-card" onClick={onNavigateToUserManagement}>
                <div className="card-icon admin-icon">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </div>
                <h3>User Management</h3>
                <p>Manage user accounts and permissions</p>
              </div>

              <div className="dashboard-card admin-card" onClick={onNavigateToAdminTickets}>
                <div className="card-icon admin-icon">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <h3>All Tickets</h3>
                <p>View and manage all tickets</p>
              </div>

              <div className="dashboard-card admin-card" onClick={onNavigateToAdminDashboard}>
                <div className="card-icon admin-icon">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                  </svg>
                </div>
                <h3>Admin Dashboard</h3>
                <p>Team performance and statistics</p>
              </div>
            </>
          )}

          <div className="dashboard-card" onClick={onNavigateToCreateTicket}>
            <div className="card-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <h3>Create Ticket</h3>
            <p>Submit a new support request</p>
          </div>

          <div className="dashboard-card" onClick={onNavigateToMyTickets}>
            <div className="card-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <h3>My Tickets</h3>
            <p>View your submitted tickets</p>
          </div>

          {isStaff && (
            <div className="dashboard-card staff-card" onClick={onNavigateToMyAssignedTickets}>
              <div className="card-icon staff-icon">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <h3>Assigned Tickets</h3>
              <p>Tickets assigned to you</p>
            </div>
          )}

         
        </div>
      </main>
    </div>
  )
}

export default Dashboard

