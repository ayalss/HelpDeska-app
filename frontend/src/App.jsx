import React, { useState, useEffect } from 'react'
import Login from './components/Login/Login'
import Dashboard from './components/Dashboard/Dashboard'
import UserManagement from './components/UserManagement/UserManagement'
import CreateTicket from './components/CreateTicket/CreateTicket'
import MyTickets from './components/MyTickets/MyTickets'
import MyAssignedTickets from './components/MyAssignedTickets/MyAssignedTickets'
import AdminTickets from './components/AdminTickets/AdminTickets'
import AdminDashboard from './components/AdminDashboard/AdminDashboard'
import './App.css'

function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showCreateTicket, setShowCreateTicket] = useState(false)
  const [showMyTickets, setShowMyTickets] = useState(false)
  const [showMyAssignedTickets, setShowMyAssignedTickets] = useState(false)
  const [showAdminTickets, setShowAdminTickets] = useState(false)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)

  useEffect(() => {
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')

    if (token) {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setShowUserManagement(false)
    setShowCreateTicket(false)
    setShowMyTickets(false)
    setShowMyAssignedTickets(false)
    setShowAdminTickets(false)
    setShowAdminDashboard(false)

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  return (
    <div className="app">
      {isAuthenticated ? (
        showUserManagement ? (
          <UserManagement onBack={() => setShowUserManagement(false)} />
        ) : showCreateTicket ? (
          <CreateTicket 
            onBack={() => setShowCreateTicket(false)} 
            onTicketCreated={() => setShowCreateTicket(false)}
          />
        ) : showMyTickets ? (
          <MyTickets onBack={() => setShowMyTickets(false)} />
        ) : showMyAssignedTickets ? (
          <MyAssignedTickets onBack={() => setShowMyAssignedTickets(false)} />
        ) : showAdminTickets ? (
          <AdminTickets onBack={() => setShowAdminTickets(false)} />
        ) : showAdminDashboard ? (
          <AdminDashboard onBack={() => setShowAdminDashboard(false)} />
        ) : (
          <Dashboard
            onLogout={handleLogout}
            onNavigateToUserManagement={() => setShowUserManagement(true)}
            onNavigateToCreateTicket={() => setShowCreateTicket(true)}
            onNavigateToMyTickets={() => setShowMyTickets(true)}
            onNavigateToMyAssignedTickets={() => setShowMyAssignedTickets(true)}
            onNavigateToAdminTickets={() => setShowAdminTickets(true)}
            onNavigateToAdminDashboard={() => setShowAdminDashboard(true)}
          />
        )
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  )
}

export default App
