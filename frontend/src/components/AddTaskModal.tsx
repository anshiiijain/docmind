import { useState } from 'react'
import type { TaskPriority, TaskStatus } from '@/types'

interface Props {
  onClose: () => void
  onAdd: (title: string, priority: TaskPriority, status: TaskStatus) => void
}

export default function AddTaskModal({ onClose, onAdd }: Props) {
  const [title, setTitle]       = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus]     = useState<TaskStatus>('todo')
  const [error, setError]       = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    onAdd(title.trim(), priority, status)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-s1 border border-hairline rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink">New task</h2>
          <button onClick={onClose}
            className="text-ink-tertiary hover:text-ink text-xl transition-colors">
            ✕
          </button>
        </div>
        {error && (
          <div className="text-red-400 text-sm mb-3">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-s1 border border-hairline text-ink rounded-md
                       px-3 py-2 text-sm placeholder:text-ink-tertiary
                       focus:outline-none focus:ring-2 focus:ring-primary-focus/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-subtle mb-1 block">Priority</label>
              <select value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-s1 border border-hairline text-ink rounded-md
                           px-3 py-2 text-sm focus:outline-none focus:ring-2
                           focus:ring-primary-focus/50">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-subtle mb-1 block">Column</label>
              <select value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-s1 border border-hairline text-ink rounded-md
                           px-3 py-2 text-sm focus:outline-none focus:ring-2
                           focus:ring-primary-focus/50">
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-[14px] py-2 text-sm text-ink-subtle hover:text-ink transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-[14px] py-2 text-sm bg-primary hover:bg-primary-hover
                         text-white rounded-md font-medium transition-colors">
              Add task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}