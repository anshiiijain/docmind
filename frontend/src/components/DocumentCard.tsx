import type { Document } from '@/types'

interface Props {
  document: Document
  onDelete: (id: string) => void
}

const statusStyles = {
  ready:      'bg-green-100 text-green-800',
  processing: 'bg-yellow-100 text-yellow-800',
  error:      'bg-red-100 text-red-800',
}

export default function DocumentCard({ document, onDelete }: Props) {
  const sizeInKB = Math.round(document.size / 1024)
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4
                    flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{document.name}</p>
        <p className="text-sm text-gray-500 mt-1">{sizeInKB} KB</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium
                         ${statusStyles[document.status]}`}>
          {document.status}
        </span>
        <button
          onClick={() => onDelete(document.id)}
          className="text-sm text-red-500 hover:text-red-700">
          Delete
        </button>
      </div>
    </div>
  )
}