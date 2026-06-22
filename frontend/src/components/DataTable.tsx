import { useState, type ReactNode } from 'react'
import clsx from 'clsx'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => number | string
}

export function DataTable<T>({ columns, rows, rowKey, checkbox = false }:
  { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; checkbox?: boolean }) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [asc, setAsc] = useState(true)
  const sorted = [...rows]
  const col = columns.find((c) => c.key === sortKey)
  if (col?.sortValue) {
    sorted.sort((a, b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b)
      return (av < bv ? -1 : av > bv ? 1 : 0) * (asc ? 1 : -1)
    })
  }
  const onSort = (c: Column<T>) => {
    if (!c.sortValue) return
    if (sortKey === c.key) setAsc(!asc)
    else { setSortKey(c.key); setAsc(true) }
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr>
            {checkbox && <th className="w-8 border-b border-[#eef0f3] p-2.5" />}
            {columns.map((c) => (
              <th key={c.key} onClick={() => onSort(c)}
                className={clsx('border-b border-[#eef0f3] p-2.5 text-left text-[11px] font-semibold text-muted', c.sortValue && 'cursor-pointer select-none')}>
                {c.header}{c.sortValue && sortKey === c.key ? (asc ? ' ↑' : ' ↓') : c.sortValue ? ' ↕' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className="odd:bg-white even:bg-[#fafbfc] hover:bg-[#f1f4fb]">
              {checkbox && <td className="border-b border-[#f4f5f7] p-2.5"><input type="checkbox" /></td>}
              {columns.map((c) => <td key={c.key} className="border-b border-[#f4f5f7] p-2.5">{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
