export default function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[180, 60, 80, 60, 50].map((w, i) => (
        <td key={i} className="py-3">
          <div
            className="h-4 bg-gray-200 rounded animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  )
}