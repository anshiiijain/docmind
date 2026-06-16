import { createContext, useContext, useState } from 'react'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  )
  // To this — hardcode a fake token so you start as "logged in"
// const [token, setToken] = useState<string | null>(
//   localStorage.getItem('token') ?? 'mock-token'
// )

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
      user, token, login, logout,
      isAuthenticated: !!token
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