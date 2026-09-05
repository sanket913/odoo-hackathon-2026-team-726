import { FilterField } from '../../components/FilterToolbar'
import { DateRangeFilter } from '../../components/DateRangeFilter'
import { RequestActions } from '../../components/RequestActions'
import { ListSearch, ListPagination } from '../../components/ListSearch'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'

import { StatusBadge, Button, Card, Select, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function RequestsListPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearchValue] = useState('')
  const setSearch = value => { setSearchValue(value); setPage(1) }
  const { hasPermission } = useAuth()
  const [status, setStatus] = useState('')
  const params = { date_from: dateFrom || undefined, date_to: dateTo || undefined, page, limit: 20, search: search || undefined, status: status || undefined }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.requests(params), queryFn: () => timeOffService.requests(params),
  })


  const filtered = data?.items || []

  return (
    <div>
      <PageHeader
        title="Time Off Requests"
        description="Submit and track leave requests through a simple approval flow."
        actions={<Button as={Link} to="/time-off/requests/new"><Plus size={15} /> New Request</Button>}
      />



      <ListSearch value={search} onChange={setSearch} label="Search requests" paginated={false}>
        <FilterField label="Status"><Select aria-label="Filter by status" className="max-w-[200px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="To Approve">To Approve</option>
          <option value="Approved">Approved</option>
          <option value="Refused">Refused</option>
        </Select></FilterField>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={value => { setDateFrom(value); setPage(1) }} onTo={value => { setDateTo(value); setPage(1) }} />
      </ListSearch>
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load requests." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No time off requests" />}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/time-off/requests/${r.id}`}>{r.employee_name}</Link></td>
                  <td>{r.time_off_type_name}</td>
                  <td>{r.from_date}</td><td>{r.to_date}</td><td>{r.duration_days}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><RequestActions request={r} /></td>
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
