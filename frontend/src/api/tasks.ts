import type { Task } from '@/types'

export const mockTasks: Task[] = [
  { id:'1', title:'Set up project repo', status:'done',
    priority:'high', createdAt: new Date().toISOString() },
  { id:'2', title:'Build landing page', status:'done',
    priority:'high', createdAt: new Date().toISOString() },
  { id:'3', title:'Build auth pages', status:'in-progress',
    priority:'high', createdAt: new Date().toISOString() },
  { id:'4', title:'Build Kanban board', status:'in-progress',
    priority:'medium', createdAt: new Date().toISOString() },
  { id:'5', title:'Deploy to Vercel', status:'todo',
    priority:'medium', createdAt: new Date().toISOString() },
  { id:'6', title:'Build backend API', status:'todo',
    priority:'high', createdAt: new Date().toISOString() },
]

export async function getTasks(): Promise<Task[]> {
  await new Promise(r => setTimeout(r, 600))
  return mockTasks
}

export async function createTask(
  task: Omit<Task, 'id' | 'createdAt'>
): Promise<Task> {
  const newTask: Task = {
    ...task, id: String(Date.now()),
    createdAt: new Date().toISOString()
  }
  mockTasks.push(newTask)
  return newTask
}

export async function deleteTask(id: string): Promise<void> {
  const i = mockTasks.findIndex(t => t.id === id)
  if (i !== -1) mockTasks.splice(i, 1)
}