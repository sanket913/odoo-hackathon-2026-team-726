import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { salaryService } from '../../lib/api/services/salaryService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, CardBody, PageHeader, LoadingState, ErrorState, Badge } from '../../components/ui'

export default function SalaryRuleDetailPage() {
  const { id } = useParams()
  const { hasPermission } = useAuth()
  const { data: rule, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.salaryRule(id), queryFn: () => salaryService.getRule(id) })

  const { data: structure } = useQuery({ queryKey: queryKeys.salaryStructure(rule?.structure_id), queryFn: () => salaryService.getStructure(rule.structure_id), enabled: !!rule?.structure_id && hasPermission(PERMISSIONS.SALARY_STRUCTURE_READ) })

  if (isLoading) return <LoadingState />
  if (isError || !rule) return <ErrorState onRetry={refetch} message="Could not load salary rule." />

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader
        title={rule.name}
        description={`Code: ${rule.code} · Sequence ${rule.sequence}`}
        actions={
          hasPermission(PERMISSIONS.SALARY_RULE_MANAGE) && (
            <Button as={Link} to={`/payroll/salary-rules/${id}/edit`} variant="outline"><Pencil size={14} /> Edit</Button>
          )
        }
      />
      <Card>
        <CardBody className="grid grid-cols-2 gap-3 text-sm">
          <Item label="Salary structure" value={structure ? <Link className="text-primary hover:underline" to={`/payroll/salary-structures/${structure.id}`}>{structure.name}</Link> : `#${rule.structure_id}`} />
          <Item label="Category" value={<Badge tone="muted">{rule.category}</Badge>} />
          <Item label="Status" value={<Badge tone={rule.active ? 'success' : 'default'}>{rule.active ? 'Active' : 'Inactive'}</Badge>} />
          <Item label="Computation type" value={rule.computation_type} />
          {rule.computation_type === 'Fixed' && <Item label="Fixed amount" value={`₹${Number(rule.fixed_amount).toLocaleString()}`} />}
          {rule.computation_type === 'Percentage' && <Item label="Percentage" value={`${rule.percentage}% of ${rule.base_rule_code}`} />}
          {rule.computation_type === 'Formula' && <Item label="Formula" value={<code>{rule.formula_text}</code>} />}
        </CardBody>
      </Card>
    </div>
  )
}

function Item({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  )
}
