import React, { useState, useEffect } from 'react'
import './AdminTickets.css'

const AdminTickets = ({ onBack }) => {
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [pendingAssignments, setPendingAssignments] = useState({})
  const [savingIds, setSavingIds] = useState(new Set())
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [isOn, setIsOn] = useState(false)

  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')
  const currentUser = storedUser ? JSON.parse(storedUser) : {}
  const canAssign = currentUser.role?.toLowerCase() === 'admin'

  useEffect(() => {
    fetchTickets()
    fetchUsers()
    fetchAIStatus()
  }, [])
const handleToggle = async () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    const newValue = !isOn

    setIsOn(newValue) // instant UI change

    const response = await fetch('/api/admin/ai-toggle', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enabled: newValue })
    })

    if (!response.ok) {
      // rollback if failed
      setIsOn(!newValue)
    }

  } catch (err) {
    console.error('Toggle error:', err)
  }
}

const fetchAIStatus = async () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    const response = await fetch('/api/admin/ai-status', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      setIsOn(data.enabled)
    }
  } catch (err) {
    console.error('Error loading AI status:', err)
  }
}

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      const response = await fetch('/api/admin/tickets', {
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()

        // Both Admin and Manager can assign tickets to IT Staff
        let itStaff
        if (canAssign) {
          // Both Admin and Manager can assign to staff
          itStaff = data.users.filter(u => u.role?.toLowerCase() === 'it')
        } else {
          // No one else can assign
          itStaff = []
        }

        setUsers(itStaff)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
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

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket)
    setComments([])
    setNewComment('')
    await fetchComments(ticket.id)
  }

  const handleCloseDetail = () => {
    setSelectedTicket(null)
    setComments([])
    setNewComment('')
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return

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
        setComments(prev => [...prev, data.comment])

        setNewComment('')
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setCommentLoading(false)
    }
  }

  const handleAssignmentChange = (ticketId, value) => {
    setPendingAssignments(prev => ({
      ...prev,
      [ticketId]: value
    }))
  }

  const handleSaveAssignment = async (ticketId) => {
    const assignedToId = pendingAssignments[ticketId]
    if (assignedToId === undefined) return // No change made

    setSavingIds(prev => new Set(prev).add(ticketId))

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      // Convert to integer if it's a valid value, otherwise null for unassigned
      let assignedTo = null
      if (assignedToId && assignedToId !== '') {
        assignedTo = parseInt(assignedToId, 10)
      }

      const response = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assigned_to: assignedTo })
      })

      if (response.ok) {
        // Clear pending assignment
        setPendingAssignments(prev => {
          const newState = { ...prev }
          delete newState[ticketId]
          return newState
        })
        fetchTickets() // Refresh the list
      }
    } catch (err) {
      console.error('Error assigning ticket:', err)
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(ticketId)
        return newSet
      })
    }
  }

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')

      const response = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchTickets() // Refresh the list
        // Also update selected ticket if it's the same
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, status: newStatus } : prev)
        }
      }
    } catch (err) {
      console.error('Error updating status:', err)
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

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="admin-tickets">
      <header className="admin-tickets-header">
        <div className="header-left">
          <button onClick={onBack} className="back-btn">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h1>All Tickets</h1>
        </div>
        <div className="header-right">
          <div className="filters">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button onClick={fetchTickets} className="refresh-btn">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            Refresh
          </button>
          <div className="ai-toggle-container">
  <div className="ai-text">
    <span className="ai-title">AI Assignment</span>
    <span className="ai-sub">
      {isOn ? 'Automatic assignment enabled' : 'Manual assignment only'}
    </span>
  </div>

  <div className="iphone-toggle" onClick={handleToggle}>
    <div className={`switch ${isOn ? 'on' : ''}`}>
      <div className="knob"></div>
    </div>
  </div>
</div>

        </div> 
        
      </header>

      <main className="admin-tickets-main">
        {loading ? (
          <div className="loading">Loading tickets...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredTickets.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="#9E9E9E" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            <h3>No tickets found</h3>
            <p>No tickets match the selected filters.</p>
          </div>
        ) : (
          <div className="tickets-table">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Title</th>
                  <th>User</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const pendingValue = pendingAssignments[ticket.id]
                  const hasPendingChange = pendingValue !== undefined
                  const isSaving = savingIds.has(ticket.id)

                  return (
                    <tr key={ticket.id}>
                      <td className="ticket-number">{ticket.ticket_number}</td>
                      <td className="ticket-title">{ticket.title}</td>
                      <td className="ticket-user">{ticket.user_name || '-'}</td>
                      <td className="ticket-assigned">
                        <div className="assignment-cell">
                          <select
                            value={hasPendingChange ? pendingValue : (ticket.assigned_to ? String(ticket.assigned_to) : '')}
                            onChange={(e) => handleAssignmentChange(ticket.id, e.target.value)}
                            disabled={!canAssign}
                          >
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                              <option key={user.id} value={String(user.id)}>
                                {user.role === 'it' ? 'IT - ' : user.role.toUpperCase() + ' - '}{user.name}
                              </option>
                            ))}
                          </select>
                          {canAssign && hasPendingChange && (
                            <button
                              className="save-btn"
                              onClick={() => handleSaveAssignment(ticket.id)}
                              disabled={isSaving}
                              title="Save assignment"
                            >
                              {isSaving ? '...' : '✓'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="ticket-priority" style={{ color: getPriorityColor(ticket.priority) }}>
                        {ticket.priority}
                      </td>
                      <td className="ticket-status">
                        <select
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                          style={{ backgroundColor: getStatusColor(ticket.status) }}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="ticket-date">{formatDate(ticket.created_at)}</td>
                      <td className="ticket-actions">
                        <button
                          className="view-btn"
                          title="View Details"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="modal-content ticket-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTicket.ticket_number}</h2>
              <button className="close-btn" onClick={handleCloseDetail}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>{selectedTicket.title}</h3>
                <div className="detail-grid">
                  <div className="detail-row">
                    <label>Status:</label>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedTicket.status) }}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div className="detail-row">
                    <label>Priority:</label>
                    <span style={{ color: getPriorityColor(selectedTicket.priority) }}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="detail-row">
                    <label>Requester:</label>
                    <span>{selectedTicket.user_name} ({selectedTicket.user_email})</span>
                  </div>
                  <div className="detail-row">
                    <label>Assigned To:</label>
                    <span>{selectedTicket.assigned_to_name || 'Unassigned'}</span>
                  </div>
                  <div className="detail-row">
                    <label>Category:</label>
                    <span>{selectedTicket.category || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <label>AnyDesk:</label>
                    <span>{selectedTicket.anydesk_number || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <label>Created:</label>
                    <span>{formatDate(selectedTicket.created_at)}</span>
                  </div>
                  {selectedTicket.updated_at && (
                    <div className="detail-row">
                      <label>Updated:</label>
                      <span>{formatDate(selectedTicket.updated_at)}</span>
                    </div>
                  )}
                  {selectedTicket.status === 'closed' && selectedTicket.resolved_at && (
                    <div className="detail-row closed-time">
                      <label>Closed:</label>
                      <span>{formatDate(selectedTicket.resolved_at)}</span>
                    </div>
                  )}
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
                            {comment.user_role === 'it' && <span className="it-badge">IT</span>}
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
                    placeholder="Write a comment..."
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
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTickets

