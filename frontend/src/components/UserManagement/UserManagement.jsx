import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './UserManagement.css'

const UserManagement = ({ onBack }) => {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
    isActive: true
  })

  const [formErrors, setFormErrors] = useState({})

  // Department options based on role
  const departments = {
    admin: ['IT', 'Management'],
manager: ['Sales', 'Marketing', 'Production', 'Quality Control', 'HR', 'Finance', 'Logistics'],
    it: ['IT Support', 'Network', 'Development', 'Security'],
    user: ['Sales', 'Marketing', 'Production', 'Quality Control', 'HR', 'Finance', 'Logistics']
  }

  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'it', label: 'IT Staff' },
    { value: 'user', label: 'Regular User' }
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  const getAuthHeader = () => {
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')

    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  }


  const fetchUsers = async () => {

    try {

      const response = await axios.get(
        "http://localhost:5000/api/admin/users",
        getAuthHeader()
      )

      setUsers(response.data.users)

    } catch (error) {

      console.error(error)
      setError("Failed to load users")

    } finally {

      setIsLoading(false)

    }

  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!formData.department) {
      newErrors.department = 'Department is required'
    }

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Reset department when role changes
    if (name === 'role') {
      setFormData(prev => ({ ...prev, department: '' }))
    }

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await axios.post(
        'http://localhost:5000/api/admin/users',
        {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
          department: formData.department,
          is_active: formData.isActive
        },
        getAuthHeader()
      )

      setSuccess('User created successfully!')
      setUsers(prev => [response.data.user, ...prev])
      setShowModal(false)
      resetForm()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      department: '',
      isActive: true
    })
    setFormErrors({})
  }

  const openModal = () => {
    resetForm()
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'role-admin'
      case 'manager': return 'role-manager'
      case 'it': return 'role-it'
      default: return 'role-user'
    }
  }

  const getRoleLabel = (role) => {
    const found = roles.find(r => r.value === role)
    return found ? found.label : role
  }

  const [currentUserRole, setCurrentUserRole] = useState('')

  useEffect(() => {
    // Get current user role
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUserRole(payload.role || 'user')
      } catch (e) {
        console.error('Error decoding token')
      }
    }
    fetchUsers()
  }, [])

  // ... (keep all existing functions: getAuthHeader, fetchUsers, validateForm, handleChange, handleSubmit, resetForm, openModal, closeModal, getRoleBadgeClass, getRoleLabel)

  // New functions for actions
  const [actionModal, setActionModal] = useState({ show: false, type: '', user: null })
  const [actionData, setActionData] = useState({})

  const openActionModal = (type, user) => {
    setActionModal({ show: true, type, user })
    if (type === 'reset-password') {
      setActionData({ password: 'TempPass123!' })
    }
  }

  const closeActionModal = () => {
    setActionModal({ show: false, type: '', user: null })
    setActionData({})
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await axios.put(
        `http://localhost:5000/api/admin/users/${actionModal.user.id}`,
        {
          name: actionData.name || actionModal.user.name,
          role: actionData.role || actionModal.user.role,
          department: actionData.department || actionModal.user.department,
          is_active: actionData.isActive !== undefined ? actionData.isActive : actionModal.user.is_active
        },
        getAuthHeader()
      )
      setSuccess('User updated successfully!')
      fetchUsers()
      closeActionModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const response = await axios.put(
        `http://localhost:5000/api/admin/users/${actionModal.user.id}/password`,
        { password: actionData.password },
        getAuthHeader()
      )
      setSuccess(`Password reset! New password: ${response.data.message.match(/"(.+?)"/)?.[1] || actionData.password}`)
      fetchUsers()
      closeActionModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    setIsSubmitting(true)
    try {
      await axios.delete(
        `http://localhost:5000/api/admin/users/${actionModal.user.id}`,
        getAuthHeader()
      )
      setSuccess('User deleted successfully!')
      fetchUsers()
      closeActionModal()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAdmin = currentUserRole === 'admin'

  return (
    <div className="user-management">
      <header className="um-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Dashboard
        </button>
        <h1>User Management</h1>
        {isAdmin && (
          <button className="add-user-btn" onClick={openModal}>
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            Add New User
          </button>
        )}
      </header>

      {error && (
        <div className="um-alert um-alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="um-alert um-alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <div className="um-content">
        {isLoading ? (
          <div className="um-loading">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="um-empty">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <p>No users found</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Created</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="user-name">{user.name}</td>
                  <td className="user-email">{user.email}</td>
                  <td>
                    <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="user-dept">{user.department || '-'}</td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="user-date">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </td>
                  {isAdmin && (
                    <td className="user-actions">
                      <div className="action-buttons">
                        <button className="action-btn edit-btn" data-tooltip="✏️ Edit User" onClick={() => openActionModal('edit', user)} title="Edit">
                          ✏️
                        </button>
                        <button className="action-btn reset-btn" data-tooltip="🔑 Reset Password" onClick={() => openActionModal('reset-password', user)} title="Reset Password">
                          🔑
                        </button>


                        <button className={`action-btn status-btn ${user.is_active ? 'deactivate-btn' : 'status-btn'}`} data-tooltip={user.is_active ? "🔒 Disable User" : "✅ Enable User"} onClick={() => openActionModal('toggle-status', user)} title={user.is_active ? 'Deactivate' : 'Activate'}>
                          {user.is_active ? '🔒' : '✅'}
                        </button>
                        <button className="action-btn delete-btn" data-tooltip="🗑️ Delete User" onClick={() => openActionModal('delete', user)} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {
        showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New User</h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>

              <form onSubmit={handleSubmit} className="user-form">
  <div className="form-row">
    <div className="form-group">
      <label>Name</label>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
      />
    </div>
  </div>

  <div className="form-row">
    <div className="form-group">
      <label>Email</label>
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
      />
    </div>
  </div>

  <div className="form-row">
    <div className="form-group">
      <label>Password</label>
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
      />
    </div>
  </div>

  <div className="form-row two-col">
    <div className="form-group">
      <label>Role</label>
      <select name="role" value={formData.role} onChange={handleChange}>
        {roles.map(role => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>

    <div className="form-group">
      <label>Department</label>
      <select
        name="department"
        value={formData.department}
        onChange={handleChange}
      >
        <option value="">Select department</option>
        {departments[formData.role]?.map(dept => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
    </div>
  </div>

  <div className="form-row">
    <div className="form-group checkbox-group">
      <label>
        <input
          type="checkbox"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
        />
        Active Account
      </label>
    </div>
  </div>

  <div className="form-actions">
    <button type="button" className="btn-cancel" onClick={closeModal}>
      Cancel
    </button>

    <button type="submit" className="btn-submit" disabled={isSubmitting}>
      {isSubmitting ? 'Creating...' : 'Create User'}
    </button>
  </div>
</form>

            </div>
          </div>
        )
      }

      {/* Action Modals */}
      {
        actionModal.show && (
          <div className="modal-overlay" onClick={closeActionModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{actionModal.type === 'edit' ? 'Edit User' : actionModal.type === 'reset-password' ? 'Reset Password' : actionModal.type === 'toggle-status' ? (actionModal.user.is_active ? 'Deactivate User' : 'Activate User') : 'Delete User'}</h2>
                <button className="modal-close" onClick={closeActionModal}>×</button>
              </div>
              {actionModal.type === 'edit' && (
                <form onSubmit={handleEditUser} className="user-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        name="name"
                        value={actionData.name || actionModal.user.name}
                        onChange={(e) => setActionData({ ...actionData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row two-col">
                    <div className="form-group">
                      <label>Role</label>
                      <select name="role" value={actionData.role || actionModal.user.role} onChange={(e) => setActionData({ ...actionData, role: e.target.value })}>
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <select name="department" value={actionData.department || actionModal.user.department} onChange={(e) => setActionData({ ...actionData, department: e.target.value })}>
                        <option value="">Select department</option>
                        {departments[actionData.role || actionModal.user.role]?.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group checkbox-group">
                      <label>
                        <input type="checkbox" name="isActive" checked={actionData.isActive !== undefined ? actionData.isActive : actionModal.user.is_active} onChange={(e) => setActionData({ ...actionData, isActive: e.target.checked })} />
                        <span className="checkbox-custom"></span>
                        Active Account
                      </label>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={closeActionModal}>Cancel</button>
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>Update User</button>
                  </div>
                </form>
              )}
              {actionModal.type === 'reset-password' && (
                <form onSubmit={handleResetPassword} className="user-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="text"
                        value={actionData.password}
                        onChange={(e) => setActionData({ ...actionData, password: e.target.value })}
                        placeholder="TempPass123!"
                      />
                      <small className="field-help">User will receive this password. They should change it on first login.</small>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={closeActionModal}>Cancel</button>
                    <button type="submit" className="btn-submit reset-btn" disabled={isSubmitting}>Reset Password</button>
                  </div>
                </form>
              )}
              {actionModal.type === 'toggle-status' && (
                <div className="user-form">
                  <p>Are you sure you want to {actionModal.user.is_active ? 'deactivate' : 'activate'} user "{actionModal.user.name}" ({actionModal.user.email})?</p>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={closeActionModal}>Cancel</button>
                    <button type="button" className="btn-submit status-btn" onClick={() => {
                      const newStatus = !actionModal.user.is_active
                      axios.put(`http://localhost:5000/api/admin/users/${actionModal.user.id}`, { is_active: newStatus }, getAuthHeader()).then(() => {
                        setSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`)
                        fetchUsers()
                        closeActionModal()
                      }).catch(err => setError(err.response?.data?.message || 'Failed to update status'))
                    }} disabled={isSubmitting}>
                      {actionModal.user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              )}
              {actionModal.type === 'delete' && (
                <div className="user-form">
                  <p>Are you sure you want to <strong>permanently delete</strong> user "{actionModal.user.name}" ({actionModal.user.email})?</p>
                  <p className="delete-warning">This action cannot be undone. All data associated with this user will be lost.</p>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={closeActionModal}>Cancel</button>
                    <button type="button" className="btn-submit delete-btn" onClick={handleDeleteUser} disabled={isSubmitting}>
                      Delete User
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

    </div >
  )
}

export default UserManagement

