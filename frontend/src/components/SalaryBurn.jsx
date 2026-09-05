import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../lib/api/services/dashboardService'
import { Card, CardHeader, CardBody, LoadingState, ErrorState } from './ui'

// Live Salary Burn
export function SalaryBurn({ departmentId, employeeTypeId }) {
  const params = { department_id: departmentId || undefined, employee_type_id: employeeTypeId || undefined }
  const query = useQuery({ queryKey: ['dashboard', 'salary-burn-live', params],
    queryFn: () => dashboardService.salaryBurn(params), refetchInterval: 30000 })
  return <Card className="pp-burn mb-4"><CardHeader>Total Monthly Salary Burn <span className="pp-burn-live">Live contracts</span></CardHeader><CardBody>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Could not load live salary burn." onRetry={query.refetch} /> : <>
      <div className="pp-burn-summary"><span className="pp-burn-eyebrow">YOUR MONTHLY COMMITMENT</span><p className="mb-1 text-xl font-semibold">INR {Number(query.data.total_monthly_burn).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
      <p className="mb-3 text-xs text-muted">Current active contracts today. Department and employee type filters apply.</p>
      <span className="pp-burn-note">People at the heart of every number.</span></div>
      <div className="pp-burn-allocation"><h3>Where your investment goes</h3>{query.data.dept_burn.map((row, index) => <div className="pp-burn-department" key={row.department_id ?? 'unassigned'}><div><span>{row.department_name ?? 'Unassigned'}</span><strong>INR {Number(row.monthly_burn).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div><div className="pp-burn-track" aria-hidden="true"><span style={{ width: (Number(query.data.total_monthly_burn) > 0 ? Math.min(100, Math.max(0, Number(row.monthly_burn) / Number(query.data.total_monthly_burn) * 100)) : 0) + '%', background: ['#c6a6df', '#98c9bd', '#e2bd82', '#a6b8df'][index % 4] }} /></div></div>)}</div>
      {!query.data.dept_burn.length && <p className="text-sm text-muted">No active contracts for these filters.</p>}
    </>}
  </CardBody></Card>
}
