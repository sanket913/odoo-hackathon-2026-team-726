import { useQuery } from '@tanstack/react-query'
import { Wallet, Layers3, ArrowUpRight } from 'lucide-react'
import { dashboardService } from '../lib/api/services/dashboardService'
import { LoadingState, ErrorState } from './ui'
import '../styles/salary-burn.css'

const money = value => `INR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const colors = ['#8b65ac', '#2c9188', '#cb9445', '#607ec0', '#b67194', '#729258', '#648b9c', '#9f7e64']

export function SalaryBurn({ departmentId, employeeTypeId }) {
  const params = { department_id: departmentId || undefined, employee_type_id: employeeTypeId || undefined }
  const query = useQuery({ queryKey: ['dashboard', 'salary-burn-live', params],
    queryFn: () => dashboardService.salaryBurn(params), refetchInterval: 30000 })
  const total = Number(query.data?.total_monthly_burn || 0)
  const departments = [...(query.data?.dept_burn || [])].sort((a, b) => Number(b.monthly_burn) - Number(a.monthly_burn))
  return <section className="pp-salary-overview" aria-label="Monthly salary burn">
    <header className="pp-salary-heading"><div><span className="pp-salary-heading-icon"><Wallet size={20} aria-hidden="true" /></span><div><h2>Total Monthly Salary Burn</h2><p>A clear view of your monthly salary commitment.</p></div></div><span className="pp-salary-live">{query.isError ? 'Update unavailable' : query.isLoading ? 'Loading contracts' : 'Live contracts'}</span></header>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Could not load live salary burn." onRetry={query.refetch} /> : <div className="pp-salary-layout">
      <div className="pp-salary-total"><div className="pp-salary-total-top"><span>MONTHLY COMMITMENT</span><Wallet size={24} aria-hidden="true" /></div><p className="pp-salary-amount">{money(total)}</p><p className="pp-salary-context">Based on active contracts today. Department and employee type filters apply.</p><div className="pp-salary-footnote"><Layers3 size={18} aria-hidden="true" /><span><strong>{departments.length}</strong> department{departments.length === 1 ? '' : 's'} in this view</span></div><span className="pp-salary-period">Current contract value / month</span></div>
      <div className="pp-salary-breakdown"><div className="pp-salary-breakdown-heading"><div><h3>Department allocation</h3><p>Monthly cost and share of total</p></div><ArrowUpRight size={20} aria-hidden="true" /></div>
        {departments.length ? <ul className="pp-salary-departments">{departments.map((row, index) => {
          const share = total > 0 ? Math.min(100, Math.max(0, Number(row.monthly_burn) / total * 100)) : 0
          return <li key={row.department_id ?? 'unassigned'} style={{ '--department-color': colors[index % colors.length] }}><div className="pp-salary-department-name"><span>{row.department_name ?? 'Unassigned'}</span><span className="pp-salary-share">{share.toFixed(1)}%</span></div><strong>{money(row.monthly_burn)}</strong><div className="pp-salary-bar" aria-hidden="true"><span style={{ width: `${share}%` }} /></div></li>
        })}</ul> : <p className="pp-salary-empty">No active contracts for these filters.</p>}
      </div>
    </div>}
  </section>
}
