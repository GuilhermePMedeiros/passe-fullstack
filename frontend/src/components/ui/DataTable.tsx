import type { ReactNode } from 'react'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './table'
import { Skeleton } from './skeleton'

export interface TableColumn<T> {
  key: string
  label: ReactNode
  render: (row: T) => ReactNode
}

export function DataTable<T extends { id: number }>({ rows, columns, label, loading = false }: { rows: T[]; columns: TableColumn<T>[]; label: string; loading?: boolean }) {
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={`${label}: tabela com rolagem horizontal`}>
      <Table>
        <TableCaption className="sr-only">{label}</TableCaption>
        <TableHeader>
          <TableRow>{columns.map(column => <TableHead scope="col" key={column.key}>{column.label}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {loading && Array.from({ length: 10 }, (_, index) => (
            <TableRow key={`loading-${index}`} aria-hidden="true">
              {columns.map(column => (
                <TableCell key={column.key}>
                  {column.key === 'name' ? (
                    <div className="skeleton-identity"><Skeleton className="skeleton-avatar" /><Skeleton className="skeleton-name" /></div>
                  ) : <Skeleton className="skeleton-cell" />}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.map(row => (
            <TableRow key={row.id}>
              {columns.map(column => <TableCell key={column.key}>{column.render(row)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
