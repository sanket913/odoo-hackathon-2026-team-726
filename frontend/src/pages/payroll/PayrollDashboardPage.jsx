import '../../styles/payroll-dashboard.css'
import { Wallet, FileText, IndianRupee, CalendarDays, Clock, Users, RotateCcw, ShieldCheck } from 'lucide-react'
import { SalaryBurn } from '../../components/SalaryBurn'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { dashboardService } from '../../lib/api/services/dashboardService'
import { masterDataService } from '../../lib/api/services/masterDataService'
import { queryKeys } from '../../lib/queryKeys'
import { Card, CardHeader, CardBody, Select, Input, PageHeader, LoadingState, ErrorState, Badge } from '../../components/ui'

function defaultPeriod() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  // keep the displayed payroll month in local calendar dates.
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), end: fmt(end) }
}

function KpiCard({ label, value, sub, icon: Icon = Users }) {
  return <Card className="o_kpi"><Icon size={36} className="o_kpi_icon" /><div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="o_kpi_value">{value}</p>{sub && <p className="text-xs text-muted">{sub}</p>}</div></Card>
}

export default function PayrollDashboardPage() {
  const period = defaultPeriod()
  const [periodStart, setPeriodStart] = useState(period.start)
  const [periodEnd, setPeriodEnd] = useState(period.end)
  const [departmentId, setDepartmentId] = useState('')
  const [employeeTypeId, setEmployeeTypeId] = useState('')

  const { data: departments = [] } = useQuery({ queryKey: queryKeys.departments, queryFn: masterDataService.departments })
  const { data: employeeTypes = [] } = useQuery({ queryKey: queryKeys.employeeTypes, queryFn: masterDataService.employeeTypes })

  const params = {
    period_start: periodStart, period_end: periodEnd,
    department_id: departmentId || undefined, employee_type_id: employeeTypeId || undefined,
  }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard(params), queryFn: () => dashboardService.payroll(params),
  })

  return (
    <div className="pp-payroll-dashboard">
      <PageHeader title="Payroll Dashboard" description="Payroll, attendance, and time off at a glance." />

      <Card className="o_search_panel pp-filter-toolbar pp-dashboard-filters">
        <div className="pp-filter-field">
          <label htmlFor="filter-period-start" className="o_label">Period start</label>
          <Input id="filter-period-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </div>
        <div className="pp-filter-field">
          <label htmlFor="filter-period-end" className="o_label">Period end</label>
          <Input id="filter-period-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>
        <div className="pp-filter-field">
          <label htmlFor="filter-department" className="o_label">Department</label>
          <Select id="filter-department" className="min-w-[160px]" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="pp-filter-field">
          <label htmlFor="filter-employee-type" className="o_label">Employee type</label>
          <Select id="filter-employee-type" className="min-w-[160px]" value={employeeTypeId} onChange={(e) => setEmployeeTypeId(e.target.value)}>
            <option value="">All types</option>
            {employeeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        <button className="pp-dashboard-reset" type="button" onClick={() => { setPeriodStart(period.start); setPeriodEnd(period.end); setDepartmentId(''); setEmployeeTypeId('') }}><RotateCcw size={13} /> Reset filters</button>
      </Card>
      <SalaryBurn departmentId={departmentId} employeeTypeId={employeeTypeId} />
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load dashboard data." />}

      {!isLoading && !isError && data && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={Wallet} label="Total Net Salary Paid" value={`₹${data.kpis.total_net_salary_paid.toLocaleString()}`} />
            <KpiCard icon={FileText} label="Payslips Generated" value={data.kpis.payslips_generated} />
            <KpiCard icon={IndianRupee} label="Average Salary" value={`₹${Math.round(data.kpis.average_salary).toLocaleString()}`} />
            <KpiCard icon={CalendarDays} label="Approved Time Off Days" value={data.time_off_overview.approved_days} sub="days in period" />
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={Clock} label="Attendance Health" value={`${data.kpis.attendance_health_pct}%`} />
            <KpiCard label="Present Today" value={data.kpis.present_today} />
            <KpiCard label="Late Today" value={data.kpis.late_today} />
            <KpiCard label="On Leave Today" value={data.kpis.on_leave_today} />
          </div>

          <Card className="mb-4"><CardHeader>Payslip Status</CardHeader><CardBody><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Object.entries(data.payslip_status || {}).map(([status, count]) => <div key={status} className="rounded-lg border border-border p-4"><span className="text-sm text-muted">{status}</span><strong className="block text-2xl mt-2">{count}</strong></div>)}</div></CardBody></Card>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>Salary Cost by Department</CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.charts.salary_cost_by_department}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--odoo-border)" />
                    <XAxis dataKey="department" stroke="var(--odoo-text-muted)" fontSize={12} />
                    <YAxis stroke="var(--odoo-text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'var(--odoo-white)', border: '1px solid var(--odoo-border)', fontSize: 12 }} />
                    <Bar isAnimationActive={false} dataKey="cost" fill="var(--odoo-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Monthly Net Salary Trend</CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.charts.monthly_net_salary_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--odoo-border)" />
                    <XAxis dataKey="month" stroke="var(--odoo-text-muted)" fontSize={12} />
                    <YAxis stroke="var(--odoo-text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'var(--odoo-white)', border: '1px solid var(--odoo-border)', fontSize: 12 }} />
                    <Area isAnimationActive={false} type="monotone" dataKey="net_salary" stroke="#916ba9" fill="#eee5f4" strokeWidth={3} dot={{ r: 3, fill: "#916ba9" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>Payroll Alerts</CardHeader>
              <CardBody className="max-h-64 space-y-2 overflow-y-auto">
                {data.payroll_alerts.length === 0 && <div className="pp-dashboard-clear"><ShieldCheck size={28} /><strong>You?re all clear</strong><p>No active payroll alerts.</p></div>}
                {data.payroll_alerts.map((a, idx) => (
                  <div key={idx} className="rounded border border-border p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{a.employee}</span>
                      <Badge tone={a.severity === 'blocking' ? 'danger' : 'warning'}>{a.severity}</Badge>
                    </div>
                    <p className="mt-1 text-muted">{a.message}</p>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Attendance Overview</CardHeader>
              <CardBody className="space-y-2 text-sm">
                <ResponsiveContainer width="100%" height={160}><BarChart data={Object.entries(data.attendance_overview.by_status).map(([status, count]) => ({ status, count }))}><CartesianGrid strokeDasharray="3 3" stroke="var(--odoo-border)" /><XAxis dataKey="status" fontSize={10} tickFormatter={status => status === 'Missing Checkout' ? 'Missing' : status} /><YAxis allowDecimals={false} width={28} fontSize={11} /><Tooltip /><Bar isAnimationActive={false} dataKey="count" fill="var(--odoo-secondary)" /></BarChart></ResponsiveContainer>
                {Object.entries(data.attendance_overview.by_status).map(([status, count]) => (
                  <Row key={status} label={status} value={count} />
                ))}
                <Row label="Manual Edits" value={data.attendance_overview.manual_edits} />
                <Row label="Coverage" value={`${data.attendance_overview.coverage_pct}%`} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>Time Off Overview</CardHeader>
              <CardBody className="space-y-2 text-sm">
                <Row label="Approved Requests" value={data.kpis.approved_time_off} />
                <Row label="Approved Days" value={data.time_off_overview.approved_days} />
                <Row label="Pending Requests" value={data.time_off_overview.pending_requests} />
                <Row label="Total Leave Balance" value={data.time_off_overview.leave_balance_total} />
              </CardBody>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>Department Breakdown</CardHeader>
            <CardBody className="p-0">
              <div className="o_list_view table-wrap border-0">
                <table className="o_list_table pp-table">
                  <thead><tr><th>Department</th><th>Headcount</th><th>Total Salary Expenditure</th></tr></thead>
                  <tbody>
                    {data.department_breakdown.map((d) => (
                      <tr key={d.department}>
                        <td className="font-medium text-foreground">{d.department}</td>
                        <td>{d.headcount}</td>
                        <td>₹{d.cost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
