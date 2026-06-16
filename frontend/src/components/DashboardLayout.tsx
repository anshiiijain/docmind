import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { path: '/dashboard',  label: 'Dashboard' },
  { path: '/documents',  label: 'Documents'  },
  { path: '/chat',       label: 'Chat'       },
  { path: '/analytics',  label: 'Analytics'  },
  { path: '/tasks',      label: 'Tasks'      },
]

export default function DashboardLayout({
  children
}: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-canvas">
      <aside className="w-56 bg-s1 border-r border-hairline flex flex-col">
        <div className="p-6 border-b border-hairline">
          <span className="font-semibold tracking-tight text-ink">DocMind</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${location.pathname === item.path
                  ? 'bg-s2 text-primary'
                  : 'text-ink-subtle hover:bg-s2 hover:text-ink'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-hairline">
          <button
            onClick={logout}
            className="text-sm text-ink-subtle hover:text-ink transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-s1 border-b border-hairline px-6 py-4 flex items-center justify-end">
          <span className="text-sm text-ink-muted">
            {user?.name ?? 'User'}
          </span>
        </header>
        <main className="flex-1 overflow-auto bg-canvas">
          {children}
        </main>
      </div>
    </div>
  )
}