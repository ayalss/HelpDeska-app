import React, { useState, useEffect } from 'react'
import './MyAssignedTickets.css'

const MyAssignedTickets = ({ onBack }) => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
  const currentUser = storedUser ? JSON.parse(storedUser) : {}

  useEffect(() => {
    fetchAssignedTickets()
  }, [])

  const fetchAssignedTickets = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      const response = await fetch('/api/tickets/assigned', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      } else {
        setError('Failed to load assigned tickets')
      }
    } catch (err) {
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (ticketId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  const handleTicketClick = async (ticket) => {
    setSelectedTicket(ticket)
    setComments([])
    setNewComment('')
    await fetchComments(ticket.id)
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setCommentLoading(true)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      const response = await fetch(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comment: newComment })
      })

      if (response.ok) {
        const data = await response.json()
        setComments(prevComments => [...prevComments, data.comment])
        setNewComment('')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setCommentLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    setStatusLoading(true)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      // IT staff should use the staff endpoint, not admin endpoint
      const response = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Update local ticket status
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null)
        // Refresh tickets list
        fetchAssignedTickets()
      }
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setStatusLoading(false)
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
    <div className="my-assigned-tickets">
      <header className="my-assigned-header">
        <div className="header-left">
          <button onClick={onBack} className="back-btn">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h1>My Assigned Tickets</h1>
        </div>
        <div className="header-right">
          <button onClick={fetchAssignedTickets} className="refresh-btn">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <main className="my-assigned-main">
        {loading ? (
          <div className="loading">Loading assigned tickets...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="#9E9E9E" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            <h3>No assigned tickets</h3>
            <p>You don't have any tickets assigned to you.</p>
          </div>
        ) : (
          <div className="tickets-content">
            <div className="tickets-list">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`ticket-card ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                  onClick={() => handleTicketClick(ticket)}
                >
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
                  <div className="ticket-meta">
                    <span className="ticket-user">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                      {ticket.user_name}
                    </span>
                    <span
                      className="ticket-priority"
                      style={{ color: getPriorityColor(ticket.priority) }}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {selectedTicket && (
              <div className="ticket-details">
                <div className="details-header">
                  <h2>{selectedTicket.ticket_number}</h2>
                  <span
                    className="ticket-status"
                    style={{ backgroundColor: getStatusColor(selectedTicket.status) }}
                  >
                    {selectedTicket.status}
                  </span>
                </div>

                {/* Status Action Buttons for IT Staff */}
                <div className="status-actions">
                  {selectedTicket.status === 'open' && (
                    <button
                      className="action-btn start-btn"
                      onClick={() => handleStatusUpdate('in_progress')}
                      disabled={statusLoading}
                    >
                      {statusLoading ? 'Starting...' : '▶ Start Work'}
                    </button>
                  )}
                  {selectedTicket.status === 'in_progress' && (
                    <button
                      className="action-btn resolve-btn"
                      onClick={() => handleStatusUpdate('resolved')}
                      disabled={statusLoading}
                    >
                      {statusLoading ? 'Resolving...' : '✓ Mark as Done'}
                    </button>
                  )}
                  {selectedTicket.status === 'resolved' && (
                    <button
                      className="action-btn close-btn"
                      onClick={() => handleStatusUpdate('closed')}
                      disabled={statusLoading}
                    >
                      {statusLoading ? 'Closing...' : '✕ Close Ticket'}
                    </button>
                  )}
                </div>

                <h3>{selectedTicket.title}</h3>

                <div className="details-info">
                  <div className="info-row">
                    <label>Requester:</label>
                    <span>{selectedTicket.user_name} ({selectedTicket.user_email})</span>
                  </div>
                  <div className="info-row">
                    <label>Category:</label>
                    <span>{selectedTicket.category || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>Priority:</label>
                    <span style={{ color: getPriorityColor(selectedTicket.priority) }}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="info-row">
                    <label>AnyDesk:</label>
                    <span>{selectedTicket.anydesk_number || '-'}</span>
                  </div>
                  <div className="info-row">
                    <label>Created:</label>
                    <span>{formatDate(selectedTicket.created_at)}</span>
                  </div>
                </div>

                <div className="description-section">
                  <label>Description:</label>
                  <p>{selectedTicket.description}</p>
                </div>

                <div className="comments-section">
                  <h4>Comments</h4>
                  <div className="comments-list">
                    {comments.length === 0 ? (
                      <p className="no-comments">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="comment">
                          <div className="comment-header">
                            <span className="comment-author">
                              {comment.user_name}
                              {comment.user_role === 'staff' && <span className="staff-badge">IT</span>}
                              {comment.user_role === 'manager' && <span className="manager-badge">Manager</span>}
                              {comment.user_role === 'admin' && <span className="admin-badge">Admin</span>}
                            </span>
                            <span className="comment-date">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="comment-text">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="add-comment">
                    <textarea
                      placeholder="Write a comment to the manager..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || commentLoading}
                    >
                      {commentLoading ? 'Sending...' : 'Send Comment'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyAssignedTickets

