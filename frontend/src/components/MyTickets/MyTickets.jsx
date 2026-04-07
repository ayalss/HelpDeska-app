import React, { useState, useEffect } from 'react'
import './MyTickets.css'

const MyTickets = ({ onBack }) => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllTickets, setShowAllTickets] = useState(false)

  const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}')
const isAdminOrManager = user.role === 'admin'
  // Don't show internal comments to regular users - only admins/managers can see all comments
  const canViewAllComments = isAdminOrManager

  useEffect(() => {
    fetchTickets()
  }, [showAllTickets])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      
      // Build URL with query parameter for all tickets
      const url = showAllTickets ? '/api/tickets?all=true' : '/api/tickets'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      } else {
        setError('Failed to load tickets')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#4CAF50'
      case 'in_progress': return '#2196F3'
      case 'resolved': return '#9E9E9E'
      case 'closed': return '#757575'
      default: return '#9E9E9E'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f44336'
      case 'medium': return '#ff9800'
      case 'low': return '#4CAF50'
      default: return '#9E9E9E'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="my-tickets">
      <header className="my-tickets-header">
        <div className="header-left">
          <button onClick={onBack} className="back-btn">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1>{showAllTickets ? 'All Tickets' : 'My Tickets'}</h1>
        </div>
        <div className="header-right">
          {isAdminOrManager && (
            <button 
              onClick={() => setShowAllTickets(!showAllTickets)} 
              className="toggle-btn"
            >
              {showAllTickets ? 'Show My Tickets' : 'Show All Tickets'}
            </button>
          )}
          <button onClick={fetchTickets} className="refresh-btn">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <main className="my-tickets-main">
        {loading ? (
          <div className="loading">Loading tickets...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="#9E9E9E" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <h3>No tickets found</h3>
            <p>You haven't created any tickets yet.</p>
          </div>
        ) : (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-header">
                  <span className="ticket-number">{ticket.ticket_number}</span>
                  <span 
                    className="ticket-status" 
                    style={{ backgroundColor: getStatusColor(ticket.status) }}
                  >
                    {ticket.status}
                  </span>
                </div>
                <h3 className="ticket-title">{ticket.title}</h3>
                <p className="ticket-description">
                  {ticket.description && ticket.description.length > 150 
                    ? ticket.description.substring(0, 150) + '...'
                    : ticket.description}
                </p>
                <div className="ticket-meta">
                  <span className="ticket-category">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {ticket.category || 'Uncategorized'}
                  </span>
                  <span 
                    className="ticket-priority"
                    style={{ color: getPriorityColor(ticket.priority) }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM6.5 13C4.01 13 2 15.01 2 17.5S4.01 22 6.5 22 11 19.99 11 17.5 8.99 13 6.5 13zm0 7C4.01 20 2 18.01 2 15.5S4.01 11 6.5 11 11 12.99 11 15.5 8.99 20 6.5 20z"/>
                    </svg>
                    {ticket.priority}
                  </span>
                  <span className="ticket-date">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    {formatDate(ticket.created_at)}
                  </span>
                </div>
                {ticket.anydesk_number && (
                  <div className="ticket-anydesk">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                    </svg>
                    AnyDesk: {ticket.anydesk_number}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyTickets

