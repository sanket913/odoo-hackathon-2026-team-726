import { FilterToolbar } from './FilterToolbar'
import { useState, useId } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input, Button } from './ui'

export function useListSearch(rows, fields) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLocaleLowerCase()
  const filtered = term ? rows.filter(row => fields.some(field => String(row[field] ?? '').toLocaleLowerCase().includes(term))) : rows
  return { search, setSearch, filtered }
}

export function ListSearch({ value, onChange, label = 'Search records', paginated = false, children }) {
  const id = useId()
  return <FilterToolbar>
    <div className="pp-filter-field pp-filter-search"><label className="o_label" htmlFor={id}>{label}</label><div className="pp-filter-search-input"><Search size={16} aria-hidden="true" /><Input id={id} type="search" aria-label={label} placeholder={label} value={value} onChange={event => onChange(event.target.value)} /></div></div>
    {children}
    {paginated && <p className="pp-filter-note">Search applies to the current page.</p>}
  </FilterToolbar>
}

export function ListPagination({ pagination, page, onChange }) {
  if (!pagination) return null
  const total = pagination.total ?? 0
  const pages = Math.max(1, pagination.totalPages || 1)
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const limit = pagination.limit
  return <nav aria-label="List pagination" className="pp-pagination">
    <span className="pp-pagination-summary">{limit ? `Showing ${total ? (page - 1) * limit + 1 : 0} to ${Math.min(page * limit, total)} of ${total}` : `${total} records`}</span>
    <div className="pp-pagination-pages">
      <Button type="button" variant="outline" size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={15} /><span className="pp-pagination-word">Previous</span></Button>
      {start > 1 && <span className="pp-pagination-gap" aria-hidden="true">...</span>}
      {Array.from({ length: Math.min(5, pages) }, (_, index) => start + index).map(number => <Button type="button" key={number} variant={page === number ? 'primary' : 'outline'} size="sm" aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined} onClick={() => onChange(number)}>{number}</Button>)}
      {start + 4 < pages && <span className="pp-pagination-gap" aria-hidden="true">...</span>}
      <Button type="button" variant="outline" size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}><span className="pp-pagination-word">Next</span><ChevronRight size={15} /></Button>
    </div>
    <span className="pp-pagination-summary">Page {page} of {pages}</span>
  </nav>
}
