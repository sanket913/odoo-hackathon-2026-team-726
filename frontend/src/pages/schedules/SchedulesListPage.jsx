import { FilterField } from '../../components/FilterToolbar'
import { useState } from 'react'
import { ListSearch, ListPagination, useListSearch } from '../../components/ListSearch'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { scheduleService } from '../../lib/api/services/scheduleService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Select, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function SchedulesListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { hasPermission } = useAuth()
  const [view, setView] = useState('list')
  const [status, setStatus] = useState('')
  const [columns, setColumns] = useState({ type: true, days: true, hours: true, status: true })
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.schedules({ page }), queryFn: () => scheduleService.list({ page, limit: 50 }),
  })
  const schedules = data?.items || []

  const { search, setSearch, filtered } = useListSearch(schedules.filter(row => !status || (status === 'active' ? row.active : !row.active)), ['name', 'type'])

  return (
    <div>
      <PageHeader
        title="Working Schedules"
        description="Weekly hours are calculated automatically from each day's start/end time and break."
        actions={
          hasPermission(PERMISSIONS.SCHEDULE_MANAGE) && (
            <Button as={Link} to="/schedules/new"><Plus size={15} /> New Schedule</Button>
          )
        }
      />
      <ListSearch value={search} onChange={setSearch} label="Search schedules" paginated={true}>
        <FilterField label="Status"><Select className="max-w-[180px]" aria-label="Schedule status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></Select></FilterField>
      <div className="pp-filter-actions pp-schedule-actions">
        <div className="flex gap-1" role="group" aria-label="Schedule view"><Button variant={view === 'list' ? 'primary' : 'outline'} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</Button><Button variant={view === 'calendar' ? 'primary' : 'outline'} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</Button></div>
        
        {view === 'list' && <details className="relative"><summary className="o_button o_button_outline cursor-pointer">Columns</summary><div className="absolute left-0 top-full z-10 min-w-[160px] rounded border border-border bg-white p-3 shadow-sm">{Object.entries({ type: 'Type', days: 'Days / Week', hours: 'Weekly Hours', status: 'Status' }).map(([key, label]) => <label key={key} className="mb-2 flex items-center gap-2"><input type="checkbox" checked={columns[key]} onChange={event => setColumns({ ...columns, [key]: event.target.checked })} />{label}</label>)}</div></details>}
      </div>
      </ListSearch>
      {!isLoading && !isError && filtered.length > 0 && view === 'calendar' && <div className="o_list_view"><table className="o_list_table"><thead><tr><th>Schedule</th>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <th key={day}>{day}</th>)}</tr></thead><tbody>{filtered.map(schedule => <tr key={schedule.id}><td><Link className="text-primary hover:underline" to={`/schedules/${schedule.id}`}>{schedule.name}</Link></td>{Array.from({ length: 7 }, (_, day) => <td key={day}>{schedule.lines.filter(line => line.day_of_week === day).map(line => <div key={line.id}>{line.start_time.slice(0, 5)} - {line.end_time.slice(0, 5)}<p className="text-xs text-muted">Break: {line.break_hours}h / {line.duration_hours}h</p></div>)}</td>)}</tr>)}</tbody></table></div>}
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load schedules." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No working schedules yet" />}
      {!isLoading && !isError && filtered.length > 0 && view === 'list' && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Name</th><th>Company</th>{columns.type && <th>Type</th>}{columns.days && <th>Days / Week</th>}{columns.hours && <th>Weekly Hours</th>}{columns.status && <th>Status</th>}</tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => navigate(`/schedules/${s.id}`)}>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/schedules/${s.id}`}>{s.name}</Link></td><td>{s.company || 'PeoplePay360'}</td>
                  {columns.type && <td>{s.type}</td>}
                  {columns.days && <td>{new Set((s.lines || []).map(line => line.day_of_week)).size}</td>}
                  {columns.hours && <td>{s.weekly_hours} hrs</td>}
                  {columns.status && <td><Badge tone={s.active ? 'success' : 'default'}>{s.active ? 'Active' : 'Inactive'}</Badge></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ListPagination pagination={data?.pagination} page={page} onChange={setPage} />
    </div>
  )
}
