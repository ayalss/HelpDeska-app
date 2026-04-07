import React, { useState } from 'react'
import axios from 'axios'
import './Login.css'

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setServerError('')

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        {
          email: formData.email,
          password: formData.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      const { token, user } = response.data

      if (token) {
        if (formData.rememberMe) {
          localStorage.setItem('token', token)
          localStorage.setItem('user', JSON.stringify(user))
        } else {
          sessionStorage.setItem('token', token)
          sessionStorage.setItem('user', JSON.stringify(user))
        }

        onLoginSuccess()
      }

    } catch (error) {
      if (error.response && error.response.data.message) {
        setServerError(error.response.data.message)
      } else {
        setServerError('Unable to connect to server.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="bg-pattern"></div>
        <div className="bg-gradient"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="company-logo">
              <img src="/logo.png" alt="Technoceram Logo" className="logo-img" />
            </div>
            <h1 className="company-name">TECHNOCERAM</h1>
            <p className="company-tagline">Help Desk Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {serverError && (
              <div className="error-message server-error">
                {serverError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={errors.email ? 'error' : ''}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={errors.password ? 'error' : ''}
                />
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-options">
              <label>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>© 2026 Technoceram. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
