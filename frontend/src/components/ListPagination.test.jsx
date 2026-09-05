import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ListPagination } from './ListSearch'

describe('Shared pagination', () => {
  it('shows the correct record range and bounded navigation on the last page', () => {
    const onChange = vi.fn()
    render(<ListPagination pagination={{ total: 295, limit: 20, totalPages: 15 }} page={15} onChange={onChange} />)
    expect(screen.getByText('Showing 281 to 295 of 295')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Page 15' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Page 11' }))
    expect(onChange).toHaveBeenCalledWith(11)
  })
  it('handles empty results without offering invalid pages', () => {
    render(<ListPagination pagination={{ total: 0, limit: 20, totalPages: 0 }} page={1} onChange={vi.fn()} />)
    expect(screen.getByText('Showing 0 to 0 of 0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })
})
