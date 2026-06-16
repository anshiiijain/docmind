// import client from './client'

// ─── Types ───────────────────────────────────────────────
export interface TaskStatusData {
  status: string
  count: number
}

export interface DocsOverTimeData {
  month: string
  docs: number
}

export interface FileTypeData {
  name: string
  value: number
}

// ─── Mock data (remove when backend is ready) ────────────
export const tasksByStatus: TaskStatusData[] = [
  { status: 'To do',       count: 8  },
  { status: 'In progress', count: 5  },
  { status: 'Done',        count: 12 },
]

export const docsOverTime: DocsOverTimeData[] = [
  { month: 'Jan', docs: 2  },
  { month: 'Feb', docs: 5  },
  { month: 'Mar', docs: 4  },
  { month: 'Apr', docs: 9  },
  { month: 'May', docs: 7  },
  { month: 'Jun', docs: 14 },
]

export const fileTypes: FileTypeData[] = [
  { name: 'PDF',  value: 12 },
  { name: 'DOCX', value: 6  },
  { name: 'TXT',  value: 4  },
  { name: 'CSV',  value: 3  },
]

// ─── Real API calls (uncomment when backend is ready) ────

// export async function getTasksByStatus(): Promise<TaskStatusData[]> {
//   const response = await client.get('/analytics/tasks-by-status')
//   return response.data
// }

// export async function getDocsOverTime(): Promise<DocsOverTimeData[]> {
//   const response = await client.get('/analytics/docs-over-time')
//   return response.data
// }

// export async function getFileTypes(): Promise<FileTypeData[]> {
//   const response = await client.get('/analytics/file-types')
//   return response.data
// }