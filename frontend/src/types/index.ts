export type DocumentStatus = 'processing' | 'ready' | 'error'

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface Document {
  id: string
  name: string
  size: number
  uploadedAt: string
  status: DocumentStatus
  fileUrl?: string  
  chunks?: number  
}

export interface UploadResponse {
  document: Document
  message: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}


export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
}

export interface Column {
  id: TaskStatus
  title: string
  tasks: Task[]
}