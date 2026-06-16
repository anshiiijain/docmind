interface Props {
  onUpload:        (file: File) => void
  uploading:       boolean
  uploadProgress?: number
}

export default function UploadButton({ onUpload, uploading, uploadProgress }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  function getLabel() {
    if (!uploading) return 'Upload Document'
    if (uploadProgress && uploadProgress > 0 && uploadProgress < 100) {
      return `Uploading ${uploadProgress}%`
    }
    return 'Processing...'
  }

  return (
    <label className={`cursor-pointer inline-flex items-center gap-2
                       bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors
                       ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
      {uploading && (
        <svg className="animate-spin h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {getLabel()}
      <input
        type="file"
        className="hidden"
        onChange={handleChange}
        accept=".pdf,.txt"
        disabled={uploading}
      />
    </label>
  )
}