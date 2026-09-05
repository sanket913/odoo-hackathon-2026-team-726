// dynamic data, failure feedback and synchronization regression tests.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { WarningBox } from './WarningBox'
import { SalaryBurn } from './SalaryBurn'
import EmployeeDetailPage from '../pages/employees/EmployeeDetailPage'
import { dashboardService } from '../lib/api/services/dashboardService'
import { employeeService } from '../lib/api/services/employeeService'
import { invalidateAfter } from '../lib/invalidation'

vi.mock('../lib/api/services/dashboardService', () => ({ dashboardService: { salaryBurn: vi.fn() } }))
vi.mock('../lib/api/services/employeeService', () => ({ employeeService: {
  get: vi.fn(), contracts: vi.fn().mockResolvedValue([]), attendance: vi.fn().mockResolvedValue([]),
  timeOff: vi.fn().mockResolvedValue([]), allocations: vi.fn().mockResolvedValue([]),
} }))
vi.mock('../lib/auth/AuthContext', () => ({ useAuth: () => ({ hasPermission: () => false }) }))
function wrapper(component) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/employees/1']}><Routes><Route path="/employees/:employeeId" element={component} /></Routes></MemoryRouter></QueryClientProvider>)
  return client
}
describe('unique integrations', () => {
  it('shows real warning messages with their employee and severity', () => {
    render(<WarningBox employees={[{employee_id:1,employee_name:'Alex',warnings:[{message:'No active contract',severity:'blocking'},{message:'Bank account missing',severity:'non-blocking'}]}]} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Alex: No active contract (blocks computation)')
    expect(screen.getByRole('alert')).toHaveTextContent('Bank account missing')
  })
  it('refreshes API salary burn after a contract mutation', async () => {
    dashboardService.salaryBurn.mockResolvedValueOnce({total_monthly_burn:1200,dept_burn:[{department_id:1,department_name:'HR',monthly_burn:1200}]})
      .mockResolvedValue({total_monthly_burn:1400,dept_burn:[{department_id:1,department_name:'HR',monthly_burn:1400}]})
    const client=wrapper(<SalaryBurn departmentId="1" />)
    await screen.findAllByText('INR 1,200.00')
    act(() => invalidateAfter(client,'contract:mutated'))
    await screen.findAllByText('INR 1,400.00')
    expect(dashboardService.salaryBurn).toHaveBeenCalledWith({department_id:'1',employee_type_id:undefined})
  })
  it('shows salary API failure instead of zero or mock totals', async () => {
    dashboardService.salaryBurn.mockRejectedValue(new Error('Unavailable'))
    wrapper(<SalaryBurn />)
    await screen.findByText('Could not load live salary burn.')
    expect(screen.queryByText('INR 0.00')).not.toBeInTheDocument()
  })
  it('uses backend smart-button visibility', async () => {
    employeeService.get.mockResolvedValue({id:1,name:'Alex',employee_code:'E1',visible_buttons:['my_profile','my_payslip']})
    wrapper(<EmployeeDetailPage />)
    await screen.findByRole('button',{name:'My Payslips'})
    expect(screen.getByRole('button',{name:'My Profile'})).toBeInTheDocument()
    expect(document.querySelectorAll('.o_smart_button')).toHaveLength(2)
  })
  it('invalidates allocation and employee balances after time off decisions', () => {
    const client={invalidateQueries:vi.fn()}
    invalidateAfter(client,'timeoff:mutated')
    for(const key of ['requests','allocations','employees','dashboard']) expect(client.invalidateQueries).toHaveBeenCalledWith({queryKey:[key]})
  })
})
