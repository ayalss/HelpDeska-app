import React, { useState } from 'react'
import axios from 'axios'
import './CreateTicket.css'

const CreateTicket = ({ onBack, onTicketCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    anydesk_number: ''
  })
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState('')

  const categories = [
    { value: '', label: 'Select category' },
    { value: 'Hardware', label: 'Hardware Issue' },
    { value: 'Software', label: 'Software Problem' },
    { value: 'Network', label: 'Network Issue' },
    { value: 'Account', label: 'Account & Access' },
    { value: 'Printer', label: 'Printer Problems' },
    { value: 'Email', label: 'Email Issues' },
    { value: 'Other', label: 'Other' }
  ]

  const priorities = [
    { value: 'low', label: 'Low - Can wait' },
    { value: 'medium', label: 'Medium - Normal priority' },
    { value: 'high', label: 'High - Urgent' },
    { value: 'critical', label: 'Critical - Emergency' }
  ]

  const getAuthHeader = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    return {
      'Authorization': `Bearer ${token}`
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files)
    setFiles(newFiles)
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setServerError('')
    setSuccess('')

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title.trim())
      formDataToSend.append('description', formData.description.trim())
      formDataToSend.append('category', formData.category)
      formDataToSend.append('priority', formData.priority)
      formDataToSend.append('anydesk_number', formData.anydesk_number.trim())

      files.forEach(file => {
        formDataToSend.append('attachments', file)
      })

      const response = await axios.post(
        'http://localhost:5000/api/tickets',
        formDataToSend,
        {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      setSuccess(`Ticket #${response.data.ticket.ticket_number} created successfully!`)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        anydesk_number: ''
      })
      setFiles([])

      // Notify parent component if callback exists
      if (onTicketCreated) {
        onTicketCreated(response.data.ticket)
      }

    } catch (error) {
      if (error.response?.data?.message) {
        setServerError(error.response.data.message)
      } else {
        setServerError('Failed to create ticket. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-ticket">
      <header className="ct-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
        <h1>Create New Ticket</h1>
      </header>

      <div className="ct-content">
        {serverError && (
          <div className="ct-alert ct-alert-error">
            {serverError}
            <button onClick={() => setServerError('')}>×</button>
          </div>
        )}

        {success && (
          <div className="ct-alert ct-alert-success">
            {success}
            <button onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-section">
            <h3>Ticket Details</h3>
            
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Brief summary of the issue"
                className={errors.title ? 'error' : ''}
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your issue in detail. Include any error messages you've seen."
                rows={6}
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={errors.category ? 'error' : ''}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                {errors.category && <span className="field-error">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  {priorities.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Remote Support (Optional)</h3>
            <p className="section-description">
              If you need remote assistance, please provide your AnyDesk number
            </p>
            
            <div className="form-group">
              <label htmlFor="anydesk_number">
                <svg viewBox="0 0 24 24" className="anydesk-icon">
                  <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                </svg>
                AnyDesk Number
              </label>
              <input
                type="text"
                id="anydesk_number"
                name="anydesk_number"
                value={formData.anydesk_number}
                onChange={handleChange}
                placeholder="e.g., 123 456 789"
              />
              <span className="input-hint">Found in the AnyDesk window title or settings</span>
            </div>
          </div>

          <div className="form-section">
            <h3>Attachments (Optional)</h3>
            <p className="section-description">
              Upload screenshots or images of the error
            </p>
            
            <div className="file-upload-area">
              <input
                type="file"
                id="attachments"
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf,.txt,.log"
                className="file-input"
              />
              <label htmlFor="attachments" className="file-label">
                <svg viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <span>Click to upload or drag and drop</span>
                <span className="file-types">PNG, JPG, GIF, PDF, TXT, LOG (max 10MB each)</span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="file-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <svg viewBox="0 0 24 24" className="file-icon">
                        <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      <div className="file-details">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <button type="button" className="remove-file" onClick={() => removeFile(index)}>
                      <svg viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onBack}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-small"></span>
                  Creating...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTicket

