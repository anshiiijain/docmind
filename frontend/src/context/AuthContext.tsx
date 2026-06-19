import { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@/types'
import { apiGetMe } from '@/api/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [token,   setToken]   = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // On app load: if there's a saved token, validate it and restore user
  useEffect(() => {
    const saved = localStorage.getItem('token')
    if (!saved) { setLoading(false); return }
    apiGetMe(saved)
      .then(u => { setUser(u); setToken(saved) })
      .catch(() => { localStorage.removeItem('token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [])

  function login(user: User, token: string) {
    setUser(user)
    setToken(token)
    localStorage.setItem('token', token)
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, loading,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
