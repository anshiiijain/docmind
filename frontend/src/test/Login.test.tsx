import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Login from '@/pages/Login'

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  )
}

test('renders login form with email and password fields', () => {
  renderLogin()
  expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sign in/i }))
    .toBeInTheDocument()
})

test('shows error when submitting empty form', async () => {
  renderLogin()
  await act(async () => {
    screen.getByRole('button', { name: /sign in/i }).click()
  })
  expect(await screen.findByText('All fields required'))
    .toBeInTheDocument()
})