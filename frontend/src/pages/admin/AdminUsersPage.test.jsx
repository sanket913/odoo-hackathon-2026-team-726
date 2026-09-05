import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminUsersPage from './AdminUsersPage'
import { userService } from '../../lib/api/services/userService'

vi.mock('../../lib/auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 99 }, hasPermission: () => true }) }))
vi.mock('../../lib/api/services/userService', () => ({ userService: {
  list: vi.fn(), roles: vi.fn(), create: vi.fn(), update: vi.fn(), updateRoles: vi.fn(),
} }))
function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AdminUsersPage /></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => {
  vi.clearAllMocks()
  userService.list.mockResolvedValue({ items: [{ id: 1, full_name: 'Existing User', email: 'existing@example.com', roles: ['Employee'], is_active: true, employee_id: null }, { id: 99, full_name: 'Current Admin', email: 'admin@example.com', roles: ['Admin'], is_active: true }], pagination: { totalPages: 1 } })
  userService.roles.mockResolvedValue([{ id: 1, name: 'Employee' }, { id: 2, name: 'Admin' }])
  userService.create.mockResolvedValue({ id: 2 })
  userService.update.mockResolvedValue({ id: 1 })
})
describe('User management reference flows', () => {
  it('creates through the existing service with supported fields only', async () => {
    mount()
    await screen.findByText('Existing User')
    fireEvent.click(screen.getByRole('button', { name: 'New User', exact: true }))
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'New Person' } })
    fireEvent.change(screen.getByLabelText(/Work email/), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText(/Initial password/), { target: { value: 'TestOnly123' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Employee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create User', exact: true }))
    await waitFor(() => expect(userService.create).toHaveBeenCalledWith({ full_name: 'New Person', email: 'new@example.com', password: 'TestOnly123', role_names: ['Employee'] }))
  })
  it('edits account fields without changing roles or email and hides own role editing', async () => {
    mount()
    await screen.findByText('Existing User')
    expect(screen.getAllByRole('button', { name: 'Edit roles' })).toHaveLength(1)
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit user' })[0])
    expect(screen.getByLabelText(/Work email/)).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Updated User' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save User' }))
    await waitFor(() => expect(userService.update).toHaveBeenCalledWith(1, { full_name: 'Updated User', is_active: true }))
    expect(userService.updateRoles).not.toHaveBeenCalled()
  })
})
