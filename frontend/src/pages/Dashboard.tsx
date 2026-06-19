import { useState, useEffect } from 'react'
import { getTasks } from '@/api/tasks'
import type { Task } from '@/types'

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    getTasks().then(setTasks).catch(() => {})
  }, [])

  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total tasks"    value={tasks.length} color="blue" />
        <StatCard label="In progress"    value={inProgress}   color="yellow" />
        <StatCard label="Done"           value={doneTasks}    color="green" />
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-s1 border border-hairline rounded-lg p-4">
      <p className="text-sm text-ink-subtle">{label}</p>
      <p className="text-3xl font-semibold text-ink mt-1">{value}</p>
    </div>
  )
}
