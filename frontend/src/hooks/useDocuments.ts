// frontend/src/hooks/useDocuments.ts
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { Document } from '@/types'
import {
  getDocumentsFromBackend,
  uploadDocumentToBackend,
  deleteDocumentFromBackend,
  type BackendDocument,
} from '@/api/documents'

/**
 * Converts what FastAPI returns into the Document shape your UI expects.
 *
 * FastAPI gives you:  { filename: "file.pdf", chunks: 42 }
 * Your UI expects:    { id, name, size, uploadedAt, status }
 *
 * For fields FastAPI doesn't provide (size, uploadedAt) we use sensible defaults.
 * Later you can store these in SQLite and return them from the backend.
 */
function backendDocToUIDoc(doc: BackendDocument): Document {
  return {
    id:         doc.filename,           // use filename as id (it's unique in ChromaDB)
    name:       doc.filename,
    size:       0,                      // FastAPI doesn't track size yet — show as 0
    uploadedAt: new Date().toISOString(), // FastAPI doesn't track date yet
    status:     'ready',                // if it's in ChromaDB, it's ready
    chunks:     doc.chunks,             // bonus field — your table can show this
  }
}

export function useDocuments() {
  const [documents, setDocuments]   = useState<Document[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      setLoading(true)
      setError(null)
      const backendDocs = await getDocumentsFromBackend()
      setDocuments(backendDocs.map(backendDocToUIDoc))
    } catch (err: any) {
      const msg = err.message || 'Failed to load documents'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function upload(file: File) {
    // Validate on the frontend before even hitting the backend
    const allowed = ['.pdf', '.txt']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(ext)) {
      toast.error(`Only PDF and TXT files allowed. Got: ${ext}`)
      return
    }

    const maxSizeMB = 50
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB`)
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)
      if (file.size > 5 * 1024 * 1024) {
        toast('Large file detected — this may take a few minutes ⏳', {
          duration: 8000,
          icon: '⏳'
        })
      }
      const result = await uploadDocumentToBackend(file, (pct) => {
        setUploadProgress(pct)
      })

      // Add the new document to the top of the list immediately
      // Don't re-fetch — that would cause a flash/reload
      const newDoc: Document = {
        id:         result.filename,
        name:       result.filename,
        size:       file.size,          // we have the real size from the File object
        uploadedAt: new Date().toISOString(),
        status:     'ready',
        chunks:     result.chunks_stored,
      }
      setDocuments(prev => [newDoc, ...prev])
      toast.success(`✅ ${result.filename} — ${result.chunks_stored} chunks stored`)

    } catch (err: any) {
      const msg = err.message || 'Upload failed'
      toast.error(msg)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function remove(id: string) {
    // id is the filename (see backendDocToUIDoc above)
    const filename = id
    const confirmed = window.confirm(`Delete "${filename}"?`)
    if (!confirmed) return

    try {
      await deleteDocumentFromBackend(filename)
      // Remove from local state immediately — no re-fetch needed
      setDocuments(prev => prev.filter(doc => doc.id !== id))
      toast.success('Document deleted')
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    }
  }

  return {
    documents,
    loading,
    error,
    uploading,
    uploadProgress,   // new — lets you show a progress bar
    upload,
    remove,
    refresh: fetchDocuments,  // expose this so other components can trigger a refetch
  }
}