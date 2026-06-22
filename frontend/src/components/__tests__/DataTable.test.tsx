import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable, type Column } from '../DataTable'

type Row = { name: string; pd: number }
const cols: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name },
  { key: 'pd', header: 'PD', render: (r) => r.pd, sortValue: (r) => r.pd },
]
const rows: Row[] = [{ name: 'B', pd: 2 }, { name: 'A', pd: 1 }]

describe('DataTable', () => {
  it('renders rows and sorts by a sortable column', async () => {
    render(<DataTable columns={cols} rows={rows} rowKey={(r) => r.name} />)
    expect(screen.getByText('B')).toBeInTheDocument()
    await userEvent.click(screen.getByText(/PD/))
    const cells = screen.getAllByRole('cell').map((c) => c.textContent)
    expect(cells[0]).toBe('A') // ascending after first click
  })
})
