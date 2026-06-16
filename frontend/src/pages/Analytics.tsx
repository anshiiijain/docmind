import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { tasksByStatus, docsOverTime, fileTypes } from '@/api/analytics'

const PIE_COLORS = ['#5e6ad2', '#27a644', '#f59e0b', '#8a8f98']

const chartStyle = {
  tick:        { fontSize: 12, fill: '#8a8f98' },
  grid:        '#23252a',
  tooltip:     { backgroundColor: '#0f1011', border: '1px solid #23252a', color: '#f7f8f8' },
}

export default function Analytics() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-ink mb-8">
        Analytics
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-s1 rounded-lg border border-hairline p-6">
          <h2 className="text-sm font-medium text-ink-subtle mb-4">Tasks by status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tasksByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
              <XAxis dataKey="status" tick={chartStyle.tick} />
              <YAxis tick={chartStyle.tick} />
              <Tooltip contentStyle={chartStyle.tooltip} />
              <Bar dataKey="count" fill="#5e6ad2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-s1 rounded-lg border border-hairline p-6">
          <h2 className="text-sm font-medium text-ink-subtle mb-4">Docs over time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={docsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
              <XAxis dataKey="date" tick={chartStyle.tick} />
              <YAxis tick={chartStyle.tick} />
              <Tooltip contentStyle={chartStyle.tooltip} />
              <Line type="monotone" dataKey="docs"
                stroke="#5e6ad2" strokeWidth={2} dot={{ r: 4, fill: '#5e6ad2' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-s1 rounded-lg border border-hairline p-6 md:col-span-2">
          <h2 className="text-sm font-medium text-ink-subtle mb-4">File types breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={fileTypes} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={100} label>
                {fileTypes.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartStyle.tooltip} />
              <Legend formatter={(value) => (
                <span style={{ color: '#d0d6e0', fontSize: 12 }}>{value}</span>
              )} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}