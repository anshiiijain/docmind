import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white px-8 py-4 
                    flex items-center justify-between">
      <span className="font-bold text-lg">DocMind</span>
      <div className="flex items-center gap-6">
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
          Dashboard
        </Link>
        <Link to="/documents" className="text-sm text-gray-600 hover:text-gray-900">
          Documents
        </Link>
        <Link to="/analytics" className="text-sm text-gray-600 hover:text-gray-900">
          Analytics
        </Link>
      </div>
    </nav>
  )
}