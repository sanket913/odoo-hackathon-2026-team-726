import { FilterField } from '../../components/FilterToolbar'
import { DateRangeFilter } from '../../components/DateRangeFilter'
import { ListSearch, ListPagination } from '../../components/ListSearch'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { payrollService } from '../../lib/api/services/payrollService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, Select, PageHeader, LoadingState, EmptyState, ErrorState, Badge, statusTone } from '../../components/ui'

export default function PayrunsListPage() {
  const [search, setSearchValue] = useState('')
  const setSearch = value => { setSearchValue(value); setPage(1) }
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const { hasPermission } = useAuth()
  const [status, setStatus] = useState('')
  const params = { date_from: dateFrom || undefined, date_to: dateTo || undefined, search: search || undefined, page, status: status || undefined, limit: 20 }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payruns(params), queryFn: () => payrollService.listPayruns(params),
  })
  const payruns = data?.items || []


  const filtered = payruns

  return (
    <div>
      <PageHeader
        title="Payruns"
        description="Draft → Computed → Validated → Paid payroll processing cycles."
        actions={
          hasPermission(PERMISSIONS.PAYRUN_CREATE) && (
            <Button as={Link} to="/payroll/payruns/new"><Plus size={15} /> New Payrun</Button>
          )
        }
      />



      <ListSearch value={search} onChange={setSearch} label="Search payruns" paginated={false}>
        <FilterField label="Status"><Select aria-label="Filter by status" className="max-w-[200px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Computed">Computed</option>
          <option value="Validated">Validated</option>
          <option value="Paid">Paid</option>
        </Select></FilterField>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={value => { setDateFrom(value); setPage(1) }} onTo={value => { setDateTo(value); setPage(1) }} />
      </ListSearch>
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load payruns." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No payruns yet" description="Create one from the Payruns wizard." />}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Name</th><th>Period</th><th>Employees</th><th>Total Net</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/payroll/payruns/${p.id}`}>{p.name}</Link></td>
                  <td>{p.period_start} → {p.period_end}</td>
                  <td>{p.total_employees}</td>
                  <td>₹{Number(p.total_net).toLocaleString()}</td>
                  <td><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
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
