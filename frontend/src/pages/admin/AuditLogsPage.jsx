import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditService } from '../../lib/api/services/auditService'
import { AuditPagination } from '../../components/EmployeeAuditTrail'
import { Button, Card, PageHeader, Input, Field, Badge, LoadingState, ErrorState } from '../../components/ui'

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({})
  const query = useQuery({ queryKey: ['audit-logs', filters, page], queryFn: () => auditService.list({ ...filters, page, limit: 30 }) })
  return <div>
    <PageHeader title="Audit Logs" description="Review recorded actions, who performed them, and the details of each change." actions={<Button variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}>Refresh</Button>} />
    <Card className="o_search_panel pp-audit-filters mb-4">
      <form className="pp-filter-toolbar pp-filter-form" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setFilters({ entity_type: data.get('entity_type').trim() || undefined, action: data.get('action').trim().toUpperCase() || undefined }); setPage(1) }}>
        <Field label="Record type"><Input name="entity_type" placeholder="e.g. Payrun or TimeOffRequest" /></Field>
        <Field label="Action"><Input name="action" placeholder="e.g. APPROVE or MARK_PAID" /></Field>
        <Button type="submit">Apply filters</Button><Button type="reset" variant="outline" onClick={() => { setFilters({}); setPage(1) }}>Clear</Button>
      </form>
    </Card>
    <p className="mb-4 text-sm text-muted">Newest records first. Times are shown as stored by the server. Employee field changes are available inside each employee profile.</p>
    {query.isPending ? <LoadingState /> : query.isError ? <ErrorState message="Could not load audit logs." onRetry={query.refetch} /> : <Card className="p-4">
      {!query.data.items.length ? <p className="py-10 text-center text-muted">No recorded actions match these filters.</p> : <div className="table-wrap"><table className="pp-table"><thead><tr><th>When</th><th>Performed by</th><th>Record</th><th>Action</th><th>Details</th></tr></thead><tbody>{query.data.items.map(row => <tr key={row.id}>
        <td>{row.created_at?.replace('T', ' ')}</td><td>{row.actor_name || (row.actor_user_id ? `User #${row.actor_user_id}` : 'Actor not recorded')}</td><td>{row.entity_type} {row.entity_id ? `#${row.entity_id}` : ''}</td><td><Badge>{row.action.replaceAll('_', ' ')}</Badge></td>
        <td><details><summary className="cursor-pointer text-primary">View event #{row.id}</summary><div className="mt-3 space-y-3">{[['Before', row.before_data], ['After', row.after_data], ['Additional details', row.metadata]].map(([label, value]) => <div key={label}><p className="font-semibold">{label}</p><pre className="max-w-md whitespace-pre-wrap break-words text-xs">{value == null ? 'Not recorded' : JSON.stringify(value, null, 2)}</pre></div>)}</div></details></td>
      </tr>)}</tbody></table></div>}
      <AuditPagination page={page} pagination={query.data.pagination} onPage={setPage} />
    </Card>}
  </div>
}
