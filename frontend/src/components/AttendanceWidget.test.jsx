import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AttendanceWidget } from './AttendanceWidget'
import { attendanceService } from '../lib/api/services/attendanceService'
import { currentCoordinates } from '../lib/geolocation'
vi.mock('../lib/geolocation', () => ({ currentCoordinates: vi.fn() }))

vi.mock('../lib/auth/AuthContext', () => ({ useAuth: () => ({ user: { employee_id: 1, full_name: 'Test Employee' }, hasPermission: () => true }) }))
vi.mock('../lib/api/services/attendanceService', () => ({ attendanceService: { selfStatus: vi.fn(), list: vi.fn(), checkIn: vi.fn(), checkOut: vi.fn() } }))
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AttendanceWidget /></MemoryRouter></QueryClientProvider>) }
beforeEach(() => { vi.clearAllMocks(); attendanceService.checkIn.mockResolvedValue({}); attendanceService.checkOut.mockResolvedValue({}) })
describe('Attendance popup uses existing actions', () => {
  it('sends coordinates only for location check-in and prevents checkout while locating', async () => {
    attendanceService.selfStatus.mockResolvedValue({ business_date: '2026-09-05', record: null })
    let resolveLocation
    currentCoordinates.mockImplementation(() => new Promise(resolve => { resolveLocation = resolve }))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'My attendance' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Check In with location' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled())
    expect(attendanceService.checkIn).not.toHaveBeenCalled()
    resolveLocation({ latitude: 12.5, longitude: 77.5 })
    await waitFor(() => expect(attendanceService.checkIn).toHaveBeenCalledWith({ latitude: 12.5, longitude: 77.5 }))
  })
  it('does not record attendance when location permission fails', async () => {
    attendanceService.selfStatus.mockResolvedValue({ business_date: '2026-09-05', record: null })
    currentCoordinates.mockRejectedValue(new Error('Location permission was denied'))
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'My attendance' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Check In with location' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check In', exact: true })).toBeEnabled())
    expect(attendanceService.checkIn).not.toHaveBeenCalled()
  })
  it('uses the server open shift even when its date differs from the browser date', async () => {
    attendanceService.selfStatus.mockResolvedValue({ business_date: '2026-09-06', record: { id: 8, date: '2026-09-05', check_in: '2026-09-05T17:00:00Z', check_out: null } })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'My attendance' }))
    expect(await screen.findByRole('button', { name: 'Check Out', exact: true })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Check In', exact: true })).not.toBeInTheDocument()
  })
  it('does not check in when opened; invokes check-in only when clicked', async () => {
    attendanceService.selfStatus.mockResolvedValue({ business_date: '2026-09-05', record: null })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'My attendance' }))
    const action = await screen.findByRole('button', { name: 'Check In', exact: true })
    expect(attendanceService.checkIn).not.toHaveBeenCalled()
    fireEvent.click(action)
    await waitFor(() => expect(attendanceService.checkIn).toHaveBeenCalledOnce())
    expect(attendanceService.checkOut).not.toHaveBeenCalled()
  })
  it('offers checkout for an open record and never starts a second check-in', async () => {
    const now = new Date()
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    attendanceService.selfStatus.mockResolvedValue({ business_date: date, record: { id: 7, employee_id: 1, date, check_in: new Date(now - 60000).toISOString(), check_out: null } })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'My attendance' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Check Out', exact: true }))
    await waitFor(() => expect(attendanceService.checkOut).toHaveBeenCalledOnce())
    expect(attendanceService.checkIn).not.toHaveBeenCalled()
  })
})
