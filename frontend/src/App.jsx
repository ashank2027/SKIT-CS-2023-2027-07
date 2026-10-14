import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext, lazy, Suspense } from 'react'
import Layout from './components/Layout'

// Eagerly loaded — needed on first paint (public routes)
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

// Lazily loaded — code-split into separate chunks for smaller initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Emissions = lazy(() => import('./pages/Emissions'))
const Calculator = lazy(() => import('./pages/Calculator'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Forecast = lazy(() => import('./pages/Forecast'))
const Reports = lazy(() => import('./pages/Reports'))
const Profile = lazy(() => import('./pages/Profile'))

/** Fallback spinner shown while lazy chunks load */
function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="loader"></div>
    </div>
  )
}

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — lazy-loaded for code-splitting */}
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
      </Suspense>
    </AuthContext.Provider>
  )
}

export default App
