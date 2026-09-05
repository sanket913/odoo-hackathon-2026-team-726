import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, CardBody, PageHeader, LoadingState, ErrorState, Badge } from '../../components/ui'

export default function TimeOffTypeDetailPage() {
  const { typeId } = useParams()
  const { hasPermission } = useAuth()
  const { data: types = [], isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.timeOffTypes({}), queryFn: () => timeOffService.types({}) })
  const type = types.find((t) => String(t.id) === String(typeId))

  if (isLoading) return <LoadingState />
  if (isError || !type) return <ErrorState onRetry={refetch} message="Could not load time off type." />

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader
        title={type.name}
        description={`Code: ${type.code}`}
        actions={
          hasPermission(PERMISSIONS.TIMEOFF_CONFIGURE) && (
            <Button as={Link} to={`/time-off/types/${typeId}/edit`} variant="outline"><Pencil size={14} /> Edit</Button>
          )
        }
      />
      <Card>
        <CardBody className="grid grid-cols-2 gap-3 text-sm">
          <Item label="Unit" value={type.unit} />
          <Item label="Status" value={<Badge tone={type.active ? 'success' : 'default'}>{type.active ? 'Active' : 'Inactive'}</Badge>} />
          <Item label="Requires allocation" value={type.requires_allocation ? 'Yes' : 'No'} />
          <Item label="Approval required" value={type.approval_required ? 'Yes' : 'No'} />
          <Item label="Deduct from payroll" value={type.deduct_from_payroll ? 'Yes' : 'No'} />
          <Item label="Allow negative" value={type.allow_negative ? 'Yes' : 'No'} />
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
