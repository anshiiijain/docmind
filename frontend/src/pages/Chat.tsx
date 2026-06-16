import { useState, useEffect, useRef } from 'react'
import { streamChat, getDocumentsFromBackend } from '@/api/documents'
import type { ChatMessage, Source } from '@/api/documents'
import toast from 'react-hot-toast'

export default function Chat() {
  const [messages,     setMessages]     = useState<ChatMessage[]>([])
  const [input,        setInput]        = useState('')
  const [isStreaming,  setIsStreaming]  = useState(false)
  const [documents,    setDocuments]    = useState<string[]>([])
  const [selectedDoc,  setSelectedDoc]  = useState<string | null>(null)

  // Ref to the abort controller so we can cancel streaming
  const abortRef = useRef<AbortController | null>(null)
  // Ref to bottom of message list for auto-scroll
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load document list for the selector dropdown
  useEffect(() => {
    getDocumentsFromBackend()
      .then(docs => setDocuments(docs.map(d => d.filename)))
      .catch(() => {}) // silently fail — chat still works without selector
  }, [])

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleStop() {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  async function handleSend() {
    const question = input.trim()
    if (!question || isStreaming) return

    // Add user message to chat immediately
    const userMessage: ChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    // Add empty assistant message that we'll fill in token by token
    const assistantMessage: ChatMessage = { role: 'assistant', content: '', sources: [] }
    setMessages(prev => [...prev, assistantMessage])

    // Build history to send (exclude the empty assistant message we just added)
    const history = messages.concat(userMessage)

    abortRef.current = streamChat(
      question,
      history,
      selectedDoc,
      {
        onToken: (token) => {
          // Append each token to the last message (the assistant one)
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + token,
            }
            return updated
          })
        },

        onSources: (sources) => {
          // Attach sources to the last message when they arrive
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              sources,
            }
            return updated
          })
        },

        onDone: () => {
          setIsStreaming(false)
        },

        onError: (msg) => {
          toast.error(msg)
          // Remove the empty assistant message on error
          setMessages(prev => {
            const updated = [...prev]
            if (updated[updated.length - 1].content === '') {
              updated.pop()
            }
            return updated
          })
          setIsStreaming(false)
        },
      }
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleClear() {
    if (isStreaming) handleStop()
    setMessages([])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto p-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
        <div className="flex items-center gap-3">

          {/* Document selector */}
          <select
            value={selectedDoc ?? ''}
            onChange={e => setSelectedDoc(e.target.value || null)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All documents</option>
            {documents.map(doc => (
              <option key={doc} value={doc}>{doc}</option>
            ))}
          </select>

          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-gray-500 font-medium">Ask anything about your documents</p>
            <p className="text-gray-400 text-sm mt-1">
              Upload a document first, then ask questions about it
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>

              {/* Message bubble */}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                {msg.content}
                {/* Blinking cursor while streaming this message */}
                {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse rounded-sm" />
                )}
              </div>

              {/* Sources panel — shown below assistant messages */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourcesPanel sources={msg.sources} />
              )}

            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents... (Enter to send)"
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50 disabled:bg-gray-50"
          />

          {isStreaming ? (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm
                         hover:bg-red-600 transition-colors font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm
                         hover:bg-blue-700 transition-colors font-medium
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Shift+Enter for new line · Enter to send
        </p>
      </div>

    </div>
  )
}

// ── Sources panel component ────────────────────────────────────────────────────

function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <div key={i}
              className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-700">
                  📄 {src.source}
                </span>
                <span className="text-gray-400">
                  Page {src.page} · {Math.round(src.relevance * 100)}% match
                </span>
              </div>
              <p className="text-gray-500 leading-relaxed line-clamp-3">
                {src.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}