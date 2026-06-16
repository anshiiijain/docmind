// frontend/src/api/documents.ts
// Points to your FastAPI backend running on port 8000

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Types matching what FastAPI actually returns ───────────────────────────────

export interface BackendDocument {
  filename: string      // FastAPI returns "filename", not "name"
  chunks: number        // FastAPI returns chunk count, not file size
}

export interface UploadResult {
  status: string
  filename: string
  chunks_stored: number
  pages?: number
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function getDocumentsFromBackend(): Promise<BackendDocument[]> {
  const res = await fetch(`${BASE_URL}/documents`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to fetch documents')
  }
  const data = await res.json()
  return data.documents   // FastAPI returns { documents: [...], total: N }
}

export async function uploadDocumentToBackend(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  /**
   * Uses XMLHttpRequest instead of fetch so we get upload progress events.
   * fetch doesn't support upload progress natively.
   */
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.detail || `Upload failed: ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.open('POST', `${BASE_URL}/upload`)
    xhr.send(formData)
  })
}

export async function deleteDocumentFromBackend(filename: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/documents/${encodeURIComponent(filename)}`,
    { method: 'DELETE' }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Delete failed')
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface Source {
  source: string
  page: string
  snippet: string
  relevance: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

export function streamChat(
  question: string,
  history: ChatMessage[],
  filename: string | null = null,
  callbacks: {
    onToken:   (token: string) => void
    onSources: (sources: Source[]) => void
    onDone:    () => void
    onError:   (msg: string) => void
  }
): AbortController {
  /**
   * Streams chat response token by token using SSE (Server-Sent Events).
   *
   * Why fetch and not EventSource?
   * EventSource only supports GET. We need POST to send the question + history.
   * fetch + ReadableStream gives us streaming over POST.
   *
   * Returns AbortController so the caller can cancel mid-stream
   * (e.g. user clicks Stop, or component unmounts).
   */
  const controller = new AbortController()

  // Convert our ChatMessage format to what FastAPI expects
  const historyForAPI = history.map(m => ({
    role: m.role,
    content: m.content,
  }))

  fetch(`${BASE_URL}/chat/stream`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      question,
      history:  historyForAPI,
      filename, // null = search all docs, string = search one doc
    }),
    signal: controller.signal,
  })
  .then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      callbacks.onError(err.detail || 'Chat request failed')
      return
    }

    const reader  = res.body!.getReader()
    const decoder = new TextDecoder()
    let   buffer  = '' // incomplete SSE lines accumulate here

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE messages are separated by \n\n
      const parts = buffer.split('\n\n')
      buffer = parts.pop()! // last part may be incomplete — keep in buffer

      for (const part of parts) {
        if (!part.startsWith('data: ')) continue

        const data = part.slice(6).trim() // strip "data: " prefix

        if (data === '[DONE]') {
          callbacks.onDone()
          return
        }

        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'token')   callbacks.onToken(parsed.content)
          if (parsed.type === 'sources') callbacks.onSources(parsed.sources)
          if (parsed.type === 'error')   callbacks.onError(parsed.message)
        } catch {
          // Ignore malformed lines
        }
      }
    }
  })
  .catch((err) => {
    if (err.name !== 'AbortError') {
      callbacks.onError(err.message || 'Network error')
    }
  })

  return controller
}