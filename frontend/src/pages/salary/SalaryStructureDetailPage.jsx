import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { salaryService } from '../../lib/api/services/salaryService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, PageHeader, LoadingState, ErrorState, EmptyState, Badge } from '../../components/ui'

export default function SalaryStructureDetailPage() {
  const { id } = useParams()
  const { hasPermission } = useAuth()
  const { data: structure, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.salaryStructure(id), queryFn: () => salaryService.getStructure(id),
  })

  if (isLoading) return <LoadingState />
  if (isError || !structure) return <ErrorState onRetry={refetch} message="Could not load salary structure." />

  const canManage = hasPermission(PERMISSIONS.SALARY_STRUCTURE_MANAGE)

  return (
    <div className="o_form_view">
      <PageHeader
        title={structure.name}
        description={`Code: ${structure.code} · ${structure.rules_count} rule(s) · used by ${structure.employees_count} contract(s)`}
        actions={
          canManage && (
            <>
              <Button as={Link} to={`/payroll/salary-structures/${id}/edit`} variant="outline"><Pencil size={14} /> Edit</Button>
              <Button as={Link} to={`/payroll/salary-rules/new?structureId=${id}`}><Plus size={14} /> Add Rule</Button>
            </>
          )
        }
      />
      {structure.rules.length === 0 ? (
        <EmptyState title="No rules yet" description="Add salary rules to drive payslip generation for this structure." />
      ) : (
        <div className="o_list_view table-wrap">
          <table className="o_list_table pp-table">
            <thead><tr><th>Seq</th><th>Name</th><th>Code</th><th>Category</th><th>Computation</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>
              {structure.rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.sequence}</td>
                  <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/payroll/salary-rules/${r.id}`}>{r.name}</Link></td>
                  <td>{r.code}</td>
                  <td><Badge tone="muted">{r.category}</Badge></td>
                  <td>{r.computation_type}</td>
                  <td>
                    {r.computation_type === 'Fixed' && `₹${Number(r.fixed_amount).toLocaleString()}`}
                    {r.computation_type === 'Percentage' && `${r.percentage}% of ${r.base_rule_code}`}
                    {r.computation_type === 'Formula' && <code className="text-xs">{r.formula_text}</code>}
                  </td>
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
