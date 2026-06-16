interface Props {
  label: string
  value: number | string
  sub?: string
  color?: 'blue' | 'green' | 'amber' | 'gray'
}

const colorMap = {
  blue:  'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  gray:  'bg-gray-100 text-gray-500',
}

export default function StatCard({
  label, value, sub, color = 'gray'
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400
                    uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold mb-1
                    ${colorMap[color].split(' ')[1]}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-gray-400">{sub}</p>
      )}
    </div>
  )
}