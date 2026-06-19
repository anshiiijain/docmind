const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Login failed')
  }
  return res.json() // { token, user }
}

export async function apiRegister(name: string, email: string, password: string) {
  const res = await fetch(`${API}/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Registration failed')
  }
  return res.json() // { token, user }
}

export async function apiGetMe(token: string) {
  const res = await fetch(`${API}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Token invalid')
  return res.json() // { id, name, email, createdAt }
}
