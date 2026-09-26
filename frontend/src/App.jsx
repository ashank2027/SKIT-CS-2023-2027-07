import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext } from 'react'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Emissions from './pages/Emissions'
import Calculator from './pages/Calculator'
import Analytics from './pages/Analytics'
import Forecast from './pages/Forecast'
import Reports from './pages/Reports'
import Profile from './pages/Profile'

export const AuthContext = createContext(null)

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ecoinsight_user')
    return stored ? JSON.parse(stored) : null
  })

  const [token, setToken] = useState(() => {
    return localStorage.getItem('ecoinsight_token') || null
  })

  const login = (userData, jwtToken) => {
    setUser(userData)
    setToken(jwtToken)
    localStorage.setItem('ecoinsight_user', JSON.stringify(userData))
    localStorage.setItem('ecoinsight_token', jwtToken)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('ecoinsight_user')
    localStorage.removeItem('ecoinsight_token')
  }

  const isAuthenticated = !!token

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/emissions" element={isAuthenticated ? <Emissions /> : <Navigate to="/login" />} />
          <Route path="/calculator" element={isAuthenticated ? <Calculator /> : <Navigate to="/login" />} />
          <Route path="/analytics" element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />} />
          <Route path="/forecast" element={isAuthenticated ? <Forecast /> : <Navigate to="/login" />} />
          <Route path="/reports" element={isAuthenticated ? <Reports /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default App
