import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RequireAuth, RequirePermission } from './RequireAuth'

const mockUseAuth = vi.fn()
vi.mock('../lib/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderWithGuard(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/employees" element={<div>Employees Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth route guard', () => {
  it('redirects unauthenticated users to /login', () => {
    mockUseAuth.mockReturnValue({ user: null, initializing: false })
    renderWithGuard(['/employees'])
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders the protected route once authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, full_name: 'Test User' }, initializing: false })
    renderWithGuard(['/employees'])
    expect(screen.getByText('Employees Page')).toBeInTheDocument()
  })

  it('shows a loading state while auth is initializing', () => {
    mockUseAuth.mockReturnValue({ user: null, initializing: true })
    renderWithGuard(['/employees'])
    expect(screen.getByText(/Loading PeoplePay360/i)).toBeInTheDocument()
  })
})

describe('RequirePermission', () => {
  it('blocks rendering when the user lacks the permission', () => {
    mockUseAuth.mockReturnValue({ hasAnyPermission: () => false })
    render(
      <RequirePermission permission="payrun.validate">
        <div>Secret Payroll Content</div>
      </RequirePermission>
    )
    expect(screen.queryByText('Secret Payroll Content')).not.toBeInTheDocument()
    expect(screen.getByText(/Access restricted/i)).toBeInTheDocument()
  })

  it('renders children when the user has the permission', () => {
    mockUseAuth.mockReturnValue({ hasAnyPermission: () => true })
    render(
      <RequirePermission permission="payrun.validate">
        <div>Secret Payroll Content</div>
      </RequirePermission>
    )
    expect(screen.getByText('Secret Payroll Content')).toBeInTheDocument()
  })
})
