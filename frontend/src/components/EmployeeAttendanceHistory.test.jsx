import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EmployeeAttendanceHistory } from './EmployeeAttendanceHistory'
import { attendanceService } from '../lib/api/services/attendanceService'

vi.mock('../lib/api/services/attendanceService', () => ({ attendanceService: { list: vi.fn() } }))

describe('Employee attendance history', () => {
  it('requests employee-scoped pages and resets pagination when filters or page size change', async () => {
    attendanceService.list.mockImplementation(async params => ({ items: [{ id: params.page, date: '2026-09-04', check_in: '2026-09-04T08:00:00Z', check_out: '2026-09-04T17:00:00Z', worked_hours: 8, status: 'Present' }], pagination: { total: 57, totalPages: Math.ceil(57 / params.limit), limit: params.limit } }))
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><EmployeeAttendanceHistory employeeId="5" /></QueryClientProvider></MemoryRouter>)
    expect(await screen.findByText('Showing 1 to 10 of 57')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await screen.findByText('Showing 11 to 20 of 57')
    expect(attendanceService.list).toHaveBeenLastCalledWith(expect.objectContaining({ employee_id: '5', page: 2, limit: 10 }))
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Late' } })
    await waitFor(() => expect(attendanceService.list).toHaveBeenLastCalledWith(expect.objectContaining({ employee_id: '5', page: 1, status: 'Late' })))
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '20' } })
    await screen.findByText('Showing 1 to 20 of 57')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/attendance/1')
  })
})
