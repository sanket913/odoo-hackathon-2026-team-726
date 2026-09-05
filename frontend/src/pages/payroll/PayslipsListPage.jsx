import { PayslipDownload } from '../../components/PayslipDownload'
import { StatusBadge } from '../../components/ui'
import { FilterField } from '../../components/FilterToolbar'
import { DateRangeFilter } from '../../components/DateRangeFilter'
import { ListSearch, ListPagination } from '../../components/ListSearch'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { payrollService } from '../../lib/api/services/payrollService'
import { queryKeys } from '../../lib/queryKeys'
import { Card, Select, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function PayslipsListPage() {
  const [search, setSearchValue] = useState('')
  const setSearch = value => { setSearchValue(value); setPage(1) }
  // employee smart-button drilldown.
  const [searchParams] = useSearchParams()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const params = { date_from: dateFrom || undefined, date_to: dateTo || undefined, search: search || undefined, page, status: status || undefined, limit: 20, employee_id: searchParams.get('employee_id') || undefined }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payslips(params), queryFn: () => payrollService.listPayslips(params),
  })
  const payslips = data?.items || []


  const filtered = payslips

  return (
    <div>
      <PageHeader title="Payslips" description="All payslips generated across payruns." />



      <ListSearch value={search} onChange={setSearch} label="Search payslips" paginated={false}>
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
      {isError && <ErrorState onRetry={refetch} message="Could not load payslips." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No payslips yet" />}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Employee</th><th>Warnings</th><th>Period</th><th>Basic</th><th>Gross</th><th>Net</th><th>Status</th><th>PDF</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/payroll/payslips/${p.id}`}>{p.employee_name}</Link></td>
                  <td>{(p.warning_messages || []).length ? <Badge tone="warning">{p.warning_messages.length} warning(s)</Badge> : '\u2014'}</td>
                  <td>{p.period_start} → {p.period_end}</td>
                  <td>₹{Number(p.basic_amount).toLocaleString()}</td>
                  <td>₹{Number(p.gross_amount).toLocaleString()}</td>
                  <td className="font-medium text-foreground">₹{Number(p.net_amount).toLocaleString()}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{p.status === 'Paid' ? <PayslipDownload payslip={p} /> : <span className="text-xs text-muted">Available after payment</span>}</td>
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
