import { AttendanceStatus } from '../../components/AttendanceStatus'
import { ListPagination } from '../../components/ListSearch'
import '../../styles/attendance.css'
import { AttendanceHoursSummary } from '../../components/AttendanceHoursSummary'
import { useSelfAttendance } from '../../lib/useSelfAttendance'
import { employeeService } from '../../lib/api/services/employeeService'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { LogIn, LogOut, Plus } from 'lucide-react'
import { attendanceService } from '../../lib/api/services/attendanceService'
import { queryKeys } from '../../lib/queryKeys'


import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { StatusBadge, Button, Card, Input, Select, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function AttendanceListPage() {
  const { hasPermission, hasRole } = useAuth()
  const self = useSelfAttendance()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const { data: employeePage } = useQuery({ queryKey: queryKeys.employees({ limit: 500 }), queryFn: () => employeeService.list({ limit: 500 }), enabled: hasPermission(PERMISSIONS.EMPLOYEE_READ_ALL) })
  const limit = 20

  const params = { search: search || undefined, status: status || undefined, employee_id: employeeId || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, page, limit }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.attendance(params), queryFn: () => attendanceService.list(params),
  })
  const rows = data?.items || []
  const pagination = data?.pagination

  const canCorrect = hasPermission(PERMISSIONS.ATTENDANCE_CORRECT)

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Check-in/out, worked hours, and exception tracking."
        actions={
          <>
            {self.allowed && (
              <>
                <Button variant="secondary" onClick={() => self.mutation.mutate('in')} disabled={!self.canCheckIn}>
                  <LogIn size={15} /> Check In
                </Button>
                <Button variant="outline" onClick={() => self.mutation.mutate('location')} disabled={!self.canCheckIn}>Check In with location</Button>
                <Button variant="secondary" onClick={() => self.mutation.mutate('out')} disabled={!self.canCheckOut}>
                  <LogOut size={15} /> Check Out
                </Button>
              </>
            )}
            {canCorrect && <Button as={Link} to="/attendance/new"><Plus size={15} /> Add Record</Button>}
          </>
        }
      />

      {self.allowed && <div className="mb-4" aria-live="polite">{self.query.isError ? <ErrorState message="Could not load your attendance status." onRetry={self.query.refetch} /> : <p className="text-xs text-muted">{self.pending ? 'Saving your attendance?' : self.query.isLoading ? 'Loading your attendance status?' : self.checkedIn ? 'You are checked in. Check out when your shift ends.' : self.record?.check_out ? 'You have completed your attendance for today.' : 'You have not checked in today.'}</p>}</div>}
      {self.allowed && self.record && <div className="mb-4"><AttendanceHoursSummary record={self.record} /></div>}
      <Card className="o_search_panel pp-attendance-filters mb-4" aria-label="Attendance filters">
        <div className="pp-attendance-filter-fields">
          {hasPermission(PERMISSIONS.EMPLOYEE_READ_ALL) && <div><label className="o_label" htmlFor="attendance-employee">Employee</label><Select id="attendance-employee" value={employeeId} onChange={event => { setEmployeeId(event.target.value); setPage(1) }}><option value="">All employees</option>{(employeePage?.items || []).map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</Select></div>}
          <div><label className="o_label" htmlFor="attendance-search">Search</label><Input id="attendance-search" aria-label="Search attendance" placeholder="Search employee name" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
          <div><label className="o_label" htmlFor="attendance-status">Status</label><Select id="attendance-status" aria-label="Attendance status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{['Present', 'Late', 'Absent', 'Overtime', 'Missing Checkout', 'Half-day'].map(value => <option key={value}>{value}</option>)}</Select></div>
        </div>
        <div className="pp-attendance-date-fields">
          <div>
            <label htmlFor="filter-from" className="o_label">From</label>
            <Input id="filter-from" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label htmlFor="filter-to" className="o_label">To</label>
            <Input id="filter-to" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
          </div>
          <div className="pp-attendance-date-actions">
            <Button variant="outline" onClick={() => { const date = new Date(); const today = self.today || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; setDateFrom(today); setDateTo(today); setPage(1) }}>Today</Button>
            {(dateFrom || dateTo) && <Button variant="outline" onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}>Clear dates</Button>}
          </div>
        </div>
      </Card>

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load attendance." />}
      {!isLoading && !isError && rows.length === 0 && <EmptyState title="No attendance records" />}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead>
              <tr><th>Date</th><th>Employee</th><th>Check In</th><th>Check Out</th><th>Net Worked Hours</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td><Link className="text-primary hover:underline" to={`/attendance/${a.id}`}>{a.date}</Link></td>
                  <td>{a.employee_name}</td>
                  <td>{a.check_in ? new Date(a.check_in).toLocaleString() : '—'}</td>
                  <td>{a.check_out ? new Date(a.check_out).toLocaleString() : '—'}</td>
                  <td>{a.worked_hours}</td>
                  <td>
                    <AttendanceStatus record={a} />
                  </td>
                  <td>
                    {canCorrect && <Link className="text-xs text-primary hover:underline" to={`/attendance/${a.id}/edit`}>Correct</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && <ListPagination pagination={pagination} page={page} onChange={setPage} />}
    </div>
  )
}
