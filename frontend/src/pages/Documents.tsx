import { useState, useEffect } from 'react'
import { useDocuments } from '@/hooks/useDocuments'
import UploadButton from '@/components/UploadButton'
import DocumentsTable from '@/components/DocumentsTable'
import SkeletonRow from '@/components/SkeletonRow'

export default function Documents() {
  const {
  documents, loading, error, uploading, uploadProgress, upload, remove
} = useDocuments()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const filtered = documents.filter(doc =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  // Reset to page 1 whenever search changes
  useEffect(() => { setPage(1) }, [search])

  if (loading) return (
  <div className="p-8 max-w-4xl mx-auto">
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

  if (error) return (
    <div className="p-8 text-red-500">{error}</div>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <UploadButton onUpload={upload} uploading={uploading} uploadProgress={uploadProgress} />
      </div>

      <input
        type="text"
        placeholder="Search documents..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-lg
                   px-4 py-2 text-sm mb-4 focus:outline-none
                   focus:ring-2 focus:ring-blue-500"
      />

      {filtered.length === 0 && search ? (
        <p className="text-center py-16 text-gray-400">
          No documents match "{search}"
        </p>
      ) : documents.length === 0 ? (
        <p className="text-center py-16 text-gray-400">
          No documents yet. Upload your first one.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <DocumentsTable
            documents={paginated}
            onDelete={remove}
          />
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-gray-400">
              Page {page} of {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg
                           disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-gray-300 rounded-lg
                           disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}