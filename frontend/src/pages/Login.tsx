import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('All fields required')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    login(
      { id: '1', name: 'Anshi Jain', email: form.email, createdAt: new Date().toISOString() },
      'mock-token'
    )
    toast.success('Welcome back!')
    navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="bg-s1 border border-hairline rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-ink mb-6">
          Welcome back
        </h1>
        {error && (
          <div className="bg-s2 border border-hairline text-red-400 text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className="w-full bg-s1 border border-hairline text-ink rounded-md
                       px-3 py-2 text-sm placeholder:text-ink-tertiary
                       focus:outline-none focus:ring-2 focus:ring-primary-focus/50" />
          <input type="password" placeholder="Password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            className="w-full bg-s1 border border-hairline text-ink rounded-md
                       px-3 py-2 text-sm placeholder:text-ink-tertiary
                       focus:outline-none focus:ring-2 focus:ring-primary-focus/50" />
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white
                       py-2 rounded-md text-sm font-medium transition-colors
                       disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-ink-subtle mt-4 text-center">
          No account?{' '}
          <Link to="/register" className="text-primary hover:text-primary-hover transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}