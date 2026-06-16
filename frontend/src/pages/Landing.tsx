import { Link } from 'react-router-dom'

const features = [
  {
    icon: '📄',
    title: 'Document chat',
    desc: 'Upload any PDF or doc and ask questions in plain English.'
  },
  {
    icon: '📊',
    title: 'ML analytics',
    desc: 'Get instant insights and summaries powered by machine learning.'
  },
  {
    icon: '✅',
    title: 'Task dashboard',
    desc: 'Manage your work and track progress all in one place.'
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-ink leading-tight">
          Your documents,<br />
          <span className="text-primary">powered by AI</span>
        </h1>
        <p className="mt-6 text-lg text-ink-subtle max-w-2xl mx-auto">
          Upload documents, chat with AI that understands
          them, and get ML-powered analytics — all in one place.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link to="/register"
            className="bg-primary hover:bg-primary-hover text-white
                       px-[14px] py-2 rounded-md text-sm font-medium transition-colors">
            Get started free
          </Link>
          <Link to="/login"
            className="bg-s1 border border-hairline text-ink
                       px-[14px] py-2 rounded-md text-sm font-medium
                       hover:bg-s2 transition-colors">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-hairline">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink text-center mb-12">
            Everything you need
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title}
                className="bg-s1 rounded-lg p-6 border border-hairline hover:border-hairline-strong transition-colors">
                <div className="text-2xl mb-4">{f.icon}</div>
                <h3 className="font-medium text-ink mb-2">{f.title}</h3>
                <p className="text-ink-subtle text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">DocMind</span>
          <span className="text-sm text-ink-tertiary">
            © {new Date().getFullYear()} All rights reserved
          </span>
        </div>
      </footer>
    </div>
  )
}