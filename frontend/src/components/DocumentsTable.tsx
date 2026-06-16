import type { Document } from '@/types'

interface Props {
  documents: Document[]
  onDelete: (id: string) => void
}
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')  return '📕'
  if (ext === 'doc' || ext === 'docx') return '📘'
  if (ext === 'txt')  return '📄'
  if (ext === 'csv')  return '📊'
  return '📁'
}
function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

const statusStyles = {
  ready:      'bg-green-50 text-green-700',
  processing: 'bg-yellow-50 text-yellow-700',
  error:      'bg-red-50 text-red-700',
}

export default function DocumentsTable({ documents, onDelete }: Props) {
  if (documents.length === 0) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">📄</div>
      <p className="font-medium">No documents yet</p>
      <p className="text-sm mt-1">Upload your first document to get started</p>
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-3 text-xs font-semibold text-gray-400
                           uppercase tracking-wide">Name</th>
            <th className="pb-3 text-xs font-semibold text-gray-400
                           uppercase tracking-wide">Size</th>
            <th className="pb-3 text-xs font-semibold text-gray-400
                           uppercase tracking-wide">Uploaded</th>
            <th className="pb-3 text-xs font-semibold text-gray-400
                           uppercase tracking-wide">Status</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id}
              className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 font-medium text-gray-800">
                <span className="mr-2">{getFileIcon(doc.name)}</span>
                {doc.name}
              </td>
              <td className="py-3 text-gray-500">
                {formatSize(doc.size)}
              </td>
              <td className="py-3 text-gray-500">
                {formatDate(doc.uploadedAt)}
              </td>
              <td className="py-3">
                <span className={`text-xs px-2 py-1 rounded-full
                  font-medium ${statusStyles[doc.status]}`}>
                  {doc.status}
                </span>
              </td>
              <td className="py-3 text-right flex items-center justify-end gap-3">
                {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-xs">
                    Download
                    </a>
                )}
                <button onClick={() => onDelete(doc.id)}
                    className="text-gray-400 hover:text-red-500 text-xs">
                    Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}