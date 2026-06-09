import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stadium text-muted">
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
