import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedLayout from './components/ProtectedLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './lib/auth'
import Admin from './pages/Admin'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import GroupPage from './pages/GroupPage'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Play from './pages/Play'
import Rankings from './pages/Rankings'
import Signup from './pages/Signup'

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function Authed({ children }) {
  return (
    <ProtectedRoute>
      <ProtectedLayout>{children}</ProtectedLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
          <Route path="/dashboard" element={<Authed><Dashboard /></Authed>} />
          <Route path="/play" element={<Authed><Play /></Authed>} />
          <Route path="/group/:groupId" element={<Authed><GroupPage /></Authed>} />
          <Route path="/admin" element={<Authed><Admin /></Authed>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
