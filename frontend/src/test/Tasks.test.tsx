import { render, screen } from '@testing-library/react'
import DocumentsTable from '@/components/DocumentsTable'
import type { Document } from '@/types'

const mockDocs: Document[] = [
  { id:'1', name:'Report.pdf', size:204800,
    uploadedAt: new Date().toISOString(), status:'ready' },
  { id:'2', name:'Notes.docx', size:51200,
    uploadedAt: new Date().toISOString(), status:'processing' },
]

test('renders document list with filenames', () => {
  render(<DocumentsTable documents={mockDocs} onDelete={() => {}} />)
  expect(screen.getByText('Report.pdf')).toBeInTheDocument()
  expect(screen.getByText('Notes.docx')).toBeInTheDocument()
})

test('shows empty state when no documents', () => {
  render(<DocumentsTable documents={[]} onDelete={() => {}} />)
  expect(screen.getByText(/no documents yet/i)).toBeInTheDocument()
})