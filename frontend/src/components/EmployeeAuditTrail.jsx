import { ListPagination } from './ListSearch'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditService } from '../lib/api/services/auditService'
import { Button, LoadingState, ErrorState } from './ui'

export function AuditPagination({ page, pagination, onPage }) {
  return <ListPagination pagination={pagination} page={page} onChange={onPage} />
}

export default function EmployeeAuditHistory({ employeeId }) {
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['employees', employeeId, 'audit-log', page], queryFn: () => auditService.employee(employeeId, { page, limit: 20 }) })
  if (query.isPending) return <LoadingState />
  if (query.isError) return <ErrorState message="Could not load employee change history." onRetry={query.refetch} />
  return <div className="mt-4">
    <p className="mb-3 text-sm text-muted">Recorded field changes, newest first. Times are shown as stored by the server.</p>
    {!query.data.items.length ? <p className="py-6 text-muted">No employee changes recorded yet.</p> : <div className="table-wrap"><table className="pp-table"><thead><tr><th>When</th><th>Changed by</th><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{query.data.items.map(row => <tr key={row.id}><td>{row.changed_at?.replace('T', ' ')}</td><td>User #{row.changed_by}</td><td>{row.field_name.replaceAll('_', ' ')}</td><td className="max-w-xs break-words whitespace-pre-wrap">{row.old_value ?? '—'}</td><td className="max-w-xs break-words whitespace-pre-wrap">{row.new_value ?? '—'}</td></tr>)}</tbody></table></div>}
    <AuditPagination page={page} pagination={query.data.pagination} onPage={setPage} />
  </div>
}

export function EmployeeAuditTrail({ employeeId }) {
  return <EmployeeAuditHistory key={employeeId} employeeId={employeeId} />
}
