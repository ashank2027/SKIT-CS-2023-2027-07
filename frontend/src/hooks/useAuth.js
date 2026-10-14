/**
 * useAuth — Custom hook for accessing authentication context.
 * Provides user, token, login, logout, and isAuthenticated.
 * Use this instead of importing AuthContext + useContext directly.
 */
import { useContext } from 'react'
import { AuthContext } from '../App'

export default function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthContext.Provider')
  }
  return context
}
