import React, { useState, useEffect } from 'react'
import './AdminDashboard.css'

const AdminDashboard = ({ onBack }) => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    avgResolutionTime: 0,
    teamPerformance: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMaxTickets = () => {
    if (stats.teamPerformance.length === 0) return 1
    return Math.max(...stats.teamPerformance.map(t => t.tickets_resolved || 0), 1)
  }

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '-'
    if (hours < 1) return `${Math.round(hours * 60)} min`
    return `${hours.toFixed(1)} hrs`
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading statistics...</div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div className="header-left">
          <button onClick={onBack} className="back-btn">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h1>Admin Dashboard</h1>
        </div>
        <div className="header-right">
          <button onClick={fetchStats} className="refresh-btn">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <main className="admin-dashboard-main">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalTickets}</span>
              <span className="stat-label">Total Tickets</span>
            </div>
          </div>

          <div className="stat-card open">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.openTickets}</span>
              <span className="stat-label">Open</span>
            </div>
          </div>

          <div className="stat-card progress">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.inProgressTickets}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>

          <div className="stat-card resolved">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.resolvedTickets}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>

          <div className="stat-card closed">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.closedTickets}</span>
              <span className="stat-label">Closed</span>
            </div>
          </div>

          <div className="stat-card avg-time">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24">
                <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatHours(stats.avgResolutionTime)}</span>
              <span className="stat-label">Avg. Resolution Time</span>
            </div>
          </div>
        </div>

        {/* Team Performance Section */}
        <div className="team-performance-section">
          <h2>Team Performance (IT Staff)</h2>
          <div className="team-grid">
            {stats.teamPerformance && stats.teamPerformance.length > 0 ? (
              stats.teamPerformance.map((member, index) => (
                <div key={member.user_id || index} className="team-member-card">
                  <div className="member-header">
                    <div className="member-avatar">
                      {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="member-info">
                      <h3>{member.name || 'Unknown'}</h3>
                      <span className="member-dept">{member.department || 'General IT'}</span>
                    </div>
                  </div>
                  <div className="member-stats">
                    <div className="member-stat">
                      <span className="value">{member.tickets_assigned || 0}</span>
                      <span className="label">Total</span>
                    </div>
                    <div className="member-stat">
                      <span className="value">{member.tickets_in_progress || 0}</span>
                      <span className="label">Active</span>
                    </div>
                    <div className="member-stat">
                      <span className="value">{member.tickets_resolved || 0}</span>
                      <span className="label">Resolved</span>
                    </div>
                    <div className="member-stat">
                      <span className="value">{member.resolution_rate || 0}%</span>
                      <span className="label">Rate</span>
                    </div>
                  </div>
                  <div className="member-timing">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                    </svg>
                    <span>Avg. Response: {formatHours(member.avg_resolution_time)}</span>
                  </div>
                  <div className="member-progress">
                    <div className="progress-label">
                      <span>Resolution Progress</span>
                      <span>{member.resolution_rate || 0}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${member.resolution_rate || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-team-data">
                <svg viewBox="0 0 24 24" width="48" height="48">
                  <path fill="#9E9E9E" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                <p>No IT team performance data available for your department.</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <h2>Ticket Status Overview</h2>
          <div className="chart-container">
            <div className="chart-bars">
              <div className="chart-bar" style={{ '--height': `${stats.totalTickets > 0 ? (stats.openTickets / stats.totalTickets) * 100 : 0}%`, '--color': '#4CAF50' }}>
                <span className="bar-value">{stats.openTickets}</span>
                <span className="bar-label">Open</span>
              </div>
              <div className="chart-bar" style={{ '--height': `${stats.totalTickets > 0 ? (stats.inProgressTickets / stats.totalTickets) * 100 : 0}%`, '--color': '#2196F3' }}>
                <span className="bar-value">{stats.inProgressTickets}</span>
                <span className="bar-label">In Progress</span>
              </div>
              <div className="chart-bar" style={{ '--height': `${stats.totalTickets > 0 ? (stats.resolvedTickets / stats.totalTickets) * 100 : 0}%`, '--color': '#9E9E9E' }}>
                <span className="bar-value">{stats.resolvedTickets}</span>
                <span className="bar-label">Resolved</span>
              </div>
              <div className="chart-bar" style={{ '--height': `${stats.totalTickets > 0 ? (stats.closedTickets / stats.totalTickets) * 100 : 0}%`, '--color': '#757575' }}>
                <span className="bar-value">{stats.closedTickets}</span>
                <span className="bar-label">Closed</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard

