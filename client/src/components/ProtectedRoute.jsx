import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center font-label-caps text-label-caps text-secondary">VERIFICANDO...</div>
  if (!admin) return <Navigate to="/admin/login" replace />
  return children
}
