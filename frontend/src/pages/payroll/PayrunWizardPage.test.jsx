import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PayrunWizardPage from './PayrunWizardPage'
import { payrollService } from '../../lib/api/services/payrollService'

vi.mock('../../lib/api/services/payrollService', () => ({
  payrollService: {
    wizardEligibility: vi.fn(),
    createPayrun: vi.fn(),
  },
}))
vi.mock('../../lib/api/services/salaryService', () => ({
  salaryService: { structures: vi.fn().mockResolvedValue([{ id: 1, name: 'Regular Salary' }]) },
}))
vi.mock('../../lib/api/services/masterDataService', () => ({
  masterDataService: { departments: vi.fn().mockResolvedValue([]) },
}))

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PayrunWizardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PayrunWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders step 1 fields and never calls createPayrun on mount', () => {
    renderWizard()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
    expect(payrollService.createPayrun).not.toHaveBeenCalled()
  })

  it('does not create a Payrun merely by resolving eligibility (step 1 -> step 2 boundary)', () => {
    // The eligibility endpoint and the create endpoint are distinct calls;
    // rendering step 1 must never touch createPayrun.
    renderWizard()
    expect(payrollService.wizardEligibility).not.toHaveBeenCalled()
    expect(payrollService.createPayrun).not.toHaveBeenCalled()
  })

  it('keeps eligibility separate from creation and submits only selected eligible employees', async () => {
    payrollService.wizardEligibility.mockResolvedValue([
      { employee_id: 1, name: 'Eligible employee', eligible: true, wage: 1000 },
      { employee_id: 2, name: 'Ineligible employee', eligible: false, reason: 'No active contract' },
    ])
    payrollService.createPayrun.mockResolvedValue({ id: 42 })
    renderWizard()
    await screen.findByRole('option', { name: 'Regular Salary' })
    fireEvent.change(screen.getByLabelText(/Salary structure/), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Period start/), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText(/Period end/), { target: { value: '2026-09-30' } })
    fireEvent.click(screen.getByText('Continue'))
    await screen.findByText('Step 2 of 2')
    expect(payrollService.createPayrun).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Select Ineligible employee')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Select Eligible employee'))
    expect(screen.getByRole('button', { name: 'Create Payrun (0)' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Select Eligible employee'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Payrun (1)' }))
    await waitFor(() => expect(payrollService.createPayrun).toHaveBeenCalledWith({
      salary_structure_id: 1, period_start: '2026-09-01', period_end: '2026-09-30', department_id: null, employee_ids: [1],
    }))
  })
})
