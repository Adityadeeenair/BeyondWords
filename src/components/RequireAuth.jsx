import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap any page in this to force the person to be logged in before seeing it.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="page-loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  return children
}
