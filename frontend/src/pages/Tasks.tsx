import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { getTasks, createTask, updateTask, deleteTask } from '@/api/tasks'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import TaskCard from '@/components/TaskCard'
import AddTaskModal from '@/components/AddTaskModal'
import toast from 'react-hot-toast'

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo',        title: 'To do'       },
  { id: 'in-progress', title: 'In progress' },
  { id: 'done',        title: 'Done'        },
]

const colAccent: Record<TaskStatus, string> = {
  'todo':        'border-t-hairline-strong',
  'in-progress': 'border-t-primary',
  'done':        'border-t-success',
}

export default function Tasks() {
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    getTasks()
      .then(data => setTasks(data))
      .catch(() => setError('Could not load tasks. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  function getCol(status: TaskStatus) {
    return tasks.filter(t => t.status === status)
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId &&
        destination.index === source.index) return

    const newStatus = destination.droppableId as TaskStatus

    // Optimistic update — feel instant
    setTasks(prev => prev.map(t =>
      t.id === draggableId ? { ...t, status: newStatus } : t
    ))

    try {
      await updateTask(draggableId, { status: newStatus })
      toast.success('Task moved')
    } catch {
      // Roll back on failure
      setTasks(prev => prev.map(t =>
        t.id === draggableId ? { ...t, status: source.droppableId as TaskStatus } : t
      ))
      toast.error('Failed to move task')
    }
  }

  async function handleAdd(title: string, priority: TaskPriority, status: TaskStatus) {
    try {
      const newTask = await createTask({ title, priority, status })
      setTasks(prev => [...prev, newTask])
      toast.success('Task created')
    } catch {
      toast.error('Failed to create task')
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this task? This cannot be undone.')
    if (!confirmed) return
    // Optimistic
    const previous = tasks
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await deleteTask(id)
      toast.success('Task deleted')
    } catch {
      setTasks(previous)
      toast.error('Failed to delete task')
    }
  }

  if (loading) return (
    <div className="p-8 grid grid-cols-3 gap-4">
      {[0,1,2].map(i => (
        <div key={i} className="bg-s1 rounded-lg p-3 border border-hairline animate-pulse"
          style={{ minHeight: 200 }} />
      ))}
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        {error}
        <button
          onClick={() => { setError(null); setLoading(true); getTasks().then(setTasks).catch(() => setError('Still failing.')).finally(() => setLoading(false)) }}
          className="ml-3 underline">
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Tasks</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-hover text-white
                     text-sm px-[14px] py-2 rounded-md font-medium transition-colors">
          + Add task
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map(col => (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-s1 rounded-lg p-3 border border-hairline border-t-2
                    ${colAccent[col.id]}
                    ${snapshot.isDraggingOver ? 'border-hairline-strong' : ''}`}
                  style={{ minHeight: 200 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium text-ink-subtle">{col.title}</h2>
                    <span className="text-xs bg-s3 text-ink-subtle px-2 py-0.5 rounded-pill">
                      {getCol(col.id).length}
                    </span>
                  </div>
                  {getCol(col.id).map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.85 : 1,
                          }}>
                          <TaskCard task={task} onDelete={handleDelete} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}
