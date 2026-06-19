import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  // Wait for token validation before deciding to redirect
  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-ink-subtle text-sm">Loading...</div>
    </div>
  )

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
