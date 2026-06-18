import type { Task, TaskStatus, TaskPriority } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function getTasks(status?: TaskStatus): Promise<Task[]> {
  const url = status ? `${API}/tasks?status=${status}` : `${API}/tasks`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch tasks')
  return res.json()
}

export async function createTask(
  task: Omit<Task, 'id' | 'createdAt'>
): Promise<Task> {
  const res = await fetch(`${API}/tasks`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(task),
  })
  if (!res.ok) throw new Error('Failed to create task')
  return res.json()
}

export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id' | 'createdAt'>>
): Promise<Task> {
  const res = await fetch(`${API}/tasks/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update task')
  return res.json()
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${API}/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete task')
}
