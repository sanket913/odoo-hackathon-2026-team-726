import { FilterField } from '../../components/FilterToolbar'
import { ListSearch, useListSearch } from '../../components/ListSearch'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { salaryService } from '../../lib/api/services/salaryService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, Select, PageHeader, LoadingState, EmptyState, ErrorState, Badge } from '../../components/ui'

export default function SalaryRulesListPage() {
  const { hasPermission } = useAuth()
  const [structureId, setStructureId] = useState('')
  const { data: structures = [] } = useQuery({ queryKey: queryKeys.salaryStructures({}), queryFn: () => salaryService.structures() })
  const { data: rules = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.salaryRules({ structureId }), queryFn: () => salaryService.rules(structureId ? { structure_id: structureId } : {}),
  })

  const { search, setSearch, filtered } = useListSearch(rules, ['name', 'code', 'category'])

  return (
    <div>
      <PageHeader
        title="Salary Rules"
        description="Fixed, percentage, or formula-driven components that build each payslip."
        actions={
          hasPermission(PERMISSIONS.SALARY_RULE_MANAGE) && (
            <Button as={Link} to="/payroll/salary-rules/new"><Plus size={15} /> New Rule</Button>
          )
        }
      />


      <ListSearch value={search} onChange={setSearch} label="Search rules" paginated={false}>
        <FilterField label="Salary structure"><Select aria-label="Filter by salary structure" className="max-w-[220px]" value={structureId} onChange={(e) => setStructureId(e.target.value)}>
          <option value="">All structures</option>
          {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select></FilterField>
        
      </ListSearch>
      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} message="Could not load salary rules." />}
      {!isLoading && !isError && filtered.length === 0 && <EmptyState title="No salary rules found" />}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Seq</th><th>Name</th><th>Code</th><th>Category</th><th>Structure</th><th>Computation</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.sequence}</td>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/payroll/salary-rules/${r.id}`}>{r.name}</Link></td>
                  <td>{r.code}</td>
                  <td><Badge tone="muted">{r.category}</Badge></td>
                  <td><Link className="text-primary hover:underline" to={`/payroll/salary-structures/${r.structure_id}`}>{structures.find(structure => structure.id === r.structure_id)?.name || `#${r.structure_id}`}</Link></td>
                  <td>{r.computation_type}</td>
                  <td><Badge tone={r.active ? 'success' : 'default'}>{r.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
