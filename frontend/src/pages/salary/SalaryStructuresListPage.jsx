import { ListSearch, useListSearch } from '../../components/ListSearch'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { salaryService } from '../../lib/api/services/salaryService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function SalaryStructuresListPage() {
  const { hasPermission } = useAuth()
  const { data: structures = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.salaryStructures({}), queryFn: () => salaryService.structures(),
  })

  const { search, setSearch, filtered } = useListSearch(structures, ['name', 'code'])

  return (
    <div>
      <PageHeader
        title="Salary Structures"
        description="Ordered collections of salary rules that drive payslip generation."
        actions={
          hasPermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE) && (
            <Button as={Link} to="/payroll/salary-structures/new"><Plus size={15} /> New Structure</Button>
          )
        }
      />
      <ListSearch value={search} onChange={setSearch} label="Search structures" paginated={false} />
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load salary structures." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No salary structures yet" />}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Name</th><th>Code</th><th>Rules</th><th>Contracts using</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/payroll/salary-structures/${s.id}`}>{s.name}</Link></td>
                  <td>{s.code}</td><td>{s.rules_count}</td><td>{s.employees_count}</td>
                  <td><Badge tone={s.active ? 'success' : 'default'}>{s.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
