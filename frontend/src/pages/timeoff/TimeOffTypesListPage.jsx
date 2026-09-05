import { ListSearch, useListSearch } from '../../components/ListSearch'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function TimeOffTypesListPage() {
  const { hasPermission } = useAuth()
  const { data: types = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.timeOffTypes({}), queryFn: () => timeOffService.types({}),
  })

  const { search, setSearch, filtered } = useListSearch(types, ['name', 'code'])

  return (
    <div>
      <PageHeader
        title="Time Off Types"
        description="Configure leave types, allocation and approval rules."
        actions={
          hasPermission(PERMISSIONS.TIMEOFF_CONFIGURE) && (
            <Button as={Link} to="/time-off/types/new"><Plus size={15} /> New Type</Button>
          )
        }
      />
      <ListSearch value={search} onChange={setSearch} label="Search types" paginated={false} />
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load time off types." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No time off types configured" />}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Name</th><th>Code</th><th>Unit</th><th>Requires Allocation</th><th>Approval Required</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/time-off/types/${t.id}`}>{t.name}</Link></td>
                  <td>{t.code}</td><td>{t.unit}</td>
                  <td>{t.requires_allocation ? 'Yes' : 'No'}</td>
                  <td>{t.approval_required ? 'Yes' : 'No'}</td>
                  <td><Badge tone={t.active ? 'success' : 'default'}>{t.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
