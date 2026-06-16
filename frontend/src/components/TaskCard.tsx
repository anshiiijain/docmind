import type { Task } from '@/types'

interface Props {
  task: Task
  onDelete: (id: string) => void
}

const priorityStyles = {
  high:   'bg-red-950/50 text-red-400',
  medium: 'bg-amber-950/50 text-amber-400',
  low:    'bg-s3 text-ink-subtle',
}

export default function TaskCard({ task, onDelete }: Props) {
  return (
    <div className="bg-s2 border border-hairline rounded-md
                    p-3 mb-2 group hover:border-hairline-strong transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink leading-snug">
          {task.title}
        </p>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-ink-tertiary
                     hover:text-red-400 text-xs transition-opacity">
          ✕
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-ink-subtle mt-1">{task.description}</p>
      )}
      <span className={`inline-block text-xs px-2 py-0.5 rounded-pill
                        font-medium mt-2 ${priorityStyles[task.priority]}`}>
        {task.priority}
      </span>
    </div>
  )
}