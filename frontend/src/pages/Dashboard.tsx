import StatCard from '@/components/StatCard'
import { mockTasks } from '@/api/tasks'
import { useAuth } from '@/context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const doneTasks   = mockTasks.filter(t => t.status === 'done').length
  const inProgress  = mockTasks.filter(t => t.status === 'in-progress').length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-ink mb-2">
        Welcome back, {user?.name ?? 'there'}
      </h1>
      <p className="text-ink-subtle text-sm mb-8">
        Here's what's happening in your workspace today.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total tasks"   value={mockTasks.length} color="blue" />
        <StatCard label="In progress"   value={inProgress}       color="amber" />
        <StatCard label="Completed"     value={doneTasks}        color="green" sub="tasks done" />
        <StatCard label="Active users"  value={1}                color="gray"  sub="just you for now" />
      </div>

      <p className="text-sm text-ink-tertiary">
        Navigate using the sidebar to manage your documents,
        tasks, and analytics.
      </p>
    </div>
  )
}