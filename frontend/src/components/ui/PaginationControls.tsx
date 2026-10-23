import type { MouseEvent } from 'react'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './Pagination'
import type { PageMeta } from '@/lib/api.types'

interface PaginationControlsProps {
  meta: PageMeta
  onPage: (page: number) => void
  itemLabel?: string
}

export function PaginationControls({ meta, onPage, itemLabel = 'registros' }: PaginationControlsProps) {
  const firstItem = meta.total_items ? (meta.page - 1) * meta.limit + 1 : 0
  const lastItem = Math.min(meta.page * meta.limit, meta.total_items)
  const totalPages = Math.max(1, meta.total_pages)
  const pages = [...new Set([1, meta.page - 1, meta.page, meta.page + 1, totalPages])]
    .filter(page => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second)

  function navigate(event: MouseEvent<HTMLAnchorElement>, page: number) {
    event.preventDefault()
    if (page >= 1 && page <= totalPages && page !== meta.page) onPage(page)
  }

  return (
    <div className="pagination-controls">
      <p>Mostrando {firstItem}–{lastItem} de {meta.total_items} {itemLabel}</p>
      <span className="sr-only">Página {meta.page} de {totalPages}</span>
      <Pagination aria-label={`Paginação de ${itemLabel}`}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href={`?page=${meta.page - 1}`} aria-label="Anterior" aria-disabled={meta.page <= 1} onClick={event => navigate(event, meta.page - 1)} />
          </PaginationItem>
          {pages.map((page, index) => (
            <PaginationItem key={page} className="page-number">
              {index > 0 && page - pages[index - 1] > 1 && <PaginationEllipsis />}
              <PaginationLink href={`?page=${page}`} isActive={page === meta.page} aria-label={`Página ${page}`} onClick={event => navigate(event, page)}>{page}</PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext href={`?page=${meta.page + 1}`} aria-label="Próxima" aria-disabled={meta.page >= totalPages} onClick={event => navigate(event, meta.page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
