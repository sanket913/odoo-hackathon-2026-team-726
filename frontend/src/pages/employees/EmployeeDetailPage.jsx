import { EmployeeAttendanceHistory } from '../../components/EmployeeAttendanceHistory'
import { EmployeeAuditTrail } from '../../components/EmployeeAuditTrail'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { FileText, Clock, CalendarDays, Wallet, Pencil } from 'lucide-react'
import { employeeService } from '../../lib/api/services/employeeService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, CardHeader, CardBody, PageHeader, LoadingState, ErrorState, Badge, statusTone, SmartButton } from '../../components/ui'

export default function EmployeeDetailPage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canViewAllocations = hasPermission(PERMISSIONS.TIMEOFF_READ_ALL)
  const [tab, setTab] = useState('contracts')
  const [informationTab, setInformationTab] = useState('work')

  const { data: employee, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.employee(employeeId),
    queryFn: () => employeeService.get(employeeId),
  })

  const { data: contracts = [] } = useQuery({ queryKey: queryKeys.employeeContracts(employeeId), queryFn: () => employeeService.contracts(employeeId), enabled: !!employeeId })
  const { data: timeOff = [] } = useQuery({ queryKey: queryKeys.employeeTimeOff(employeeId), queryFn: () => employeeService.timeOff(employeeId), enabled: !!employeeId })
  const { data: allocations = [] } = useQuery({ queryKey: queryKeys.employeeAllocations(employeeId), queryFn: () => employeeService.allocations(employeeId), enabled: !!employeeId && canViewAllocations })

  if (isLoading) return <LoadingState />
  if (isError || !employee) return <ErrorState message="Could not load employee." onRetry={refetch} />

  return (
    <div className="o_form_view">
      <PageHeader
        title={employee.name}
        description={`${employee.employee_code} · ${employee.department_name || 'No department'} · ${employee.job_position_name || 'No position'}`}
        actions={
          hasPermission(PERMISSIONS.EMPLOYEE_UPDATE) && (
            <Button as={Link} to={`/employees/${employeeId}/edit`} variant="outline">
              <Pencil size={14} /> Edit
            </Button>
          )
        }
      />
      <div className="o_smart_buttons mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {employee.visible_buttons?.includes('contract') && <SmartButton icon={FileText} label="Contracts" count={contracts.length} color="text-primary" active={tab === 'contracts'} onClick={() => setTab('contracts')} />}
        {employee.visible_buttons?.includes('attendance') && <SmartButton icon={Clock} label="Attendance" count={employee.attendance_count ?? 0} color="text-success" active={tab === 'attendance'} onClick={() => setTab('attendance')} />}
        {employee.visible_buttons?.includes('timeoff') && <SmartButton icon={CalendarDays} label="Time Off" count={timeOff.length} color="text-warning" active={tab === 'timeoff'} onClick={() => setTab('timeoff')} />}
        {canViewAllocations && employee.visible_buttons?.includes('timeoff') && <SmartButton icon={Wallet} label="Allocations" count={allocations.length} color="text-primary" active={tab === 'allocations'} onClick={() => setTab('allocations')} />}
      </div>

      <div className="o_smart_buttons mb-4 flex flex-wrap gap-2">
        {[
          ['employee', 'Employees', '/employees'], ['payrun', 'Payruns', '/payroll/payruns'],
          ['rules', 'Salary Rules', '/payroll/salary-rules'], ['payslip', 'Payslips', `/payroll/payslips?employee_id=${employeeId}`],
          ['my_profile', 'My Profile', `/employees/${employeeId}`], ['my_payslip', 'My Payslips', `/payroll/payslips?employee_id=${employeeId}`],
        ].filter(([key]) => employee.visible_buttons?.includes(key)).map(([key, label, url]) =>
          <SmartButton key={key} icon={FileText} label={label} onClick={() => navigate(url)} />)}
      </div>
      {hasPermission(PERMISSIONS.EMPLOYEE_UPDATE) && <details className="mb-4 rounded border border-border bg-white p-4"><summary className="cursor-pointer font-semibold">Employee change history</summary><EmployeeAuditTrail employeeId={employeeId} /></details>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 self-start min-w-0">
          <CardHeader><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary" aria-hidden="true">{employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span><div>{employee.name}<p className="text-xs font-normal text-muted">{employee.job_position_name || 'Employee details'}</p></div></div></CardHeader>
          <div className="o_notebook" role="group" aria-label="Employee information"><button type="button" aria-pressed={informationTab === 'work'} onClick={() => setInformationTab('work')}>Work Information</button><button type="button" aria-pressed={informationTab === 'private'} onClick={() => setInformationTab('private')}>Private Information</button></div>
          <CardBody className="space-y-2 text-sm">
            <Row label="Email" value={employee.email} />
            {informationTab === 'private' && <Row label="Phone" value={employee.phone || '—'} />}
            {informationTab === 'work' && <Row label="Manager" value={employee.manager_name || '—'} />}
            {informationTab === 'work' && <Row label="Employee type" value={employee.employee_type_name || '—'} />}
            {informationTab === 'work' && <Row label="Working schedule" value={employee.working_schedule_name || '—'} />}
            {informationTab === 'private' && <Row label="Bank account" value={employee.bank_account || 'Not on file'} />}
            <Row label="Status" value={<Badge tone={employee.active ? 'success' : 'default'}>{employee.active ? 'Active' : 'Inactive'}</Badge>} />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 min-w-0">
          <div className="o_notebook" role="group" aria-label="Employee records">{[['contracts', 'Contracts'], ['attendance', 'Attendance'], ['timeoff', 'Time Off'], ['allocations', 'Allocations']].filter(([key]) => key !== 'allocations' || canViewAllocations).map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
          <CardBody className="p-0">
            {tab === 'contracts' && <ContractsMini contracts={contracts} />}
            {tab === 'attendance' && <EmployeeAttendanceHistory key={employeeId} employeeId={employeeId} />}
            {tab === 'timeoff' && <TimeOffMini rows={timeOff} />}
            {canViewAllocations && tab === 'allocations' && <AllocationsMini rows={allocations} />}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  )
}

function EmptyRow({ children }) {
  return <p className="p-6 text-center text-xs text-muted">{children}</p>
}

function ContractsMini({ contracts }) {
  if (contracts.length === 0) return <EmptyRow>No contracts on file.</EmptyRow>
  return (
    <div className="o_list_view table-wrap border-0">
      <table className="o_list_table pp-table">
        <thead><tr><th>Reference</th><th>Start</th><th>End</th><th>Wage</th><th>Status</th></tr></thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.id}>
              <td><Link className="hover:text-primary" to={`/contracts/${c.id}`}>{c.reference}</Link></td>
              <td>{c.start_date}</td><td>{c.end_date || 'Ongoing'}</td>
              <td>₹{Number(c.wage).toLocaleString()}</td>
              <td><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TimeOffMini({ rows }) {
  if (rows.length === 0) return <EmptyRow>No time off requests.</EmptyRow>
  return (
    <div className="o_list_view table-wrap border-0">
      <table className="o_list_table pp-table">
        <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><Link className="hover:text-primary" to={`/time-off/requests/${r.id}`}>{r.time_off_type_name}</Link></td>
              <td>{r.from_date}</td><td>{r.to_date}</td><td>{r.duration_days}</td>
              <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AllocationsMini({ rows }) {
  if (rows.length === 0) return <EmptyRow>No allocations.</EmptyRow>
  return (
    <div className="o_list_view table-wrap border-0">
      <table className="o_list_table pp-table">
        <thead><tr><th>Type</th><th>Allocated</th><th>Taken</th><th>Remaining</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{a.time_off_type_name}</td><td>{a.allocated}</td><td>{a.taken}</td><td>{a.remaining}</td>
              <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
