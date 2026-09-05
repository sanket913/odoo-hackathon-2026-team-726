import { FilterField } from '../../components/FilterToolbar'
import { DateRangeFilter } from '../../components/DateRangeFilter'
import { useState } from 'react'
import { ListSearch, ListPagination } from '../../components/ListSearch'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Select, Button, PageHeader, LoadingState, EmptyState, ErrorState, Badge, statusTone } from '../../components/ui'

export default function AllocationsListPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearchValue] = useState('')
  const setSearch = value => { setSearchValue(value); setPage(1) }
  const { hasPermission } = useAuth()
  const params = { status: status || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, page, limit: 20, search: search || undefined }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.allocations(params), queryFn: () => timeOffService.allocations(params),
  })


  const filtered = data?.items || []

  return (
    <div>
      <PageHeader
        title="Time Off Allocations"
        description="Leave balances granted to employees per time off type."
        actions={
          hasPermission(PERMISSIONS.TIMEOFF_ALLOCATE) && (
            <Button as={Link} to="/time-off/allocations/new"><Plus size={15} /> New Allocation</Button>
          )
        }
      />


      <ListSearch value={search} onChange={setSearch} label="Search allocations" paginated={false}>
        <FilterField label="Status"><Select aria-label="Allocation status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All statuses</option>{['Draft', 'Approved', 'Refused'].map(value => <option key={value}>{value}</option>)}</Select></FilterField>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={value => { setDateFrom(value); setPage(1) }} onTo={value => { setDateTo(value); setPage(1) }} />
      </ListSearch>
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load allocations." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No allocations yet" />}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Employee</th><th>Type</th><th>Allocated</th><th>Taken</th><th>Remaining</th><th>Valid</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/time-off/allocations/${a.id}`}>{a.employee_name}</Link></td>
                  <td>{a.time_off_type_name}</td>
                  <td>{a.allocated}</td><td>{a.taken}</td><td>{a.remaining}</td>
                  <td>{a.valid_from} → {a.valid_to}</td>
                  <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
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
