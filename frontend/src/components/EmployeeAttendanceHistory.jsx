import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { attendanceService } from '../lib/api/services/attendanceService'
import { queryKeys } from '../lib/queryKeys'
import { Badge, Button, LoadingState, ErrorState, statusTone } from './ui'
import '../styles/employee-attendance.css'

const time = value => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'

export function EmployeeAttendanceHistory({ employeeId }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [status, setStatus] = useState('')
  const params = { employee_id: employeeId, page, limit, status: status || undefined }
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.attendance(params), queryFn: () => attendanceService.list(params) })
  const rows = data?.items || []
  const total = data?.pagination?.total || 0
  const pages = Math.max(1, data?.pagination?.totalPages || 1)
  const firstPage = Math.max(1, Math.min(page - 2, pages - 4))

  return <section className="pp-employee-attendance" aria-label="Attendance history">
    <header className="pp-history-heading">
      <span className="pp-history-icon"><Clock size={22} aria-hidden="true" /></span>
      <div><h2>Attendance history</h2><p>Your daily timeline, all in one place.</p></div>
      {data && !isError && <span className="pp-history-count">{total} records</span>}
    </header>
    <div className="pp-history-controls">
      <label>Status<select aria-label="Status" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option>{['Present', 'Late', 'Absent', 'Overtime', 'Missing Checkout', 'Half-day'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Rows per page<select aria-label="Rows per page" value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1) }}>{[5, 10, 20].map(value => <option key={value} value={value}>{value} rows</option>)}</select></label>
      <p>Newest first <span aria-hidden="true">/</span> Select a date for details</p>
    </div>
    {isLoading ? <LoadingState /> : isError ? <ErrorState message="Could not load attendance history." onRetry={refetch} /> : rows.length === 0 ? <div className="pp-history-empty"><Clock size={28} aria-hidden="true" /><h3>No attendance records</h3><p>{status ? 'Try another status to see more records.' : 'Your attendance will appear here after check-in.'}</p>{status && <Button variant="outline" onClick={() => { setStatus(''); setPage(1) }}>Clear filter</Button>}</div> : <div className="table-wrap o_list_view border-0">
      <table className="o_list_table pp-table"><thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Net hours</th><th>Status</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
        <td><Link to={`/attendance/${row.id}`} className="pp-history-date">{new Date(`${row.date}T00:00:00`).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</Link><small>{new Date(`${row.date}T00:00:00`).toLocaleDateString([], { weekday: 'long' })}</small></td>
        <td>{time(row.check_in)}</td><td>{row.check_in && !row.check_out ? <span className="text-primary">In progress</span> : time(row.check_out)}</td>
        <td><strong>{row.check_out ? `${Number(row.worked_hours).toFixed(2)} h` : '--'}</strong></td><td><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
      </tr>)}</tbody></table>
    </div>}
    {data && !isError && !isLoading && <footer className="pp-history-footer"><span>Showing {total ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total}</span><nav aria-label="Attendance pagination">
      <Button variant="outline" size="sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></Button>
      {Array.from({ length: Math.min(5, pages) }, (_, index) => firstPage + index).map(number => <Button key={number} variant={page === number ? 'primary' : 'outline'} size="sm" aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</Button>)}
      <Button variant="outline" size="sm" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></Button>
    </nav><span>Page {page} of {pages}</span></footer>}
  </section>
}
