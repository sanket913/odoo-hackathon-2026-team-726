import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { StatusBadge, Button, Card, CardBody, PageHeader, LoadingState, ErrorState, Badge, StatusBar } from '../../components/ui'

export default function AllocationDetailPage() {
  const { allocationId } = useParams()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const { data: allocation, isLoading, isError, refetch } = useQuery({
    queryKey: ['allocations', allocationId], queryFn: () => timeOffService.getAllocation(allocationId),
  })

  const approveMutation = useMutation({
    mutationFn: () => timeOffService.approveAllocation(allocationId),
    onSuccess: () => { invalidateAfter(queryClient, 'timeoff:mutated'); toast.success('Allocation approved') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
  const refuseMutation = useMutation({
    mutationFn: () => timeOffService.refuseAllocation(allocationId),
    onSuccess: () => { invalidateAfter(queryClient, 'timeoff:mutated'); toast.success('Allocation refused') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return <LoadingState />
  if (isError || !allocation) return <ErrorState onRetry={refetch} message="Could not load allocation." />

  const canDecide = hasPermission(PERMISSIONS.TIMEOFF_ALLOCATE) && allocation.status === 'Draft'

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title={`${allocation.time_off_type_name} — ${allocation.employee_name}`} actions={<StatusBadge status={allocation.status} />} />
      <StatusBar value={allocation.status} steps={['Draft', allocation.status === 'Refused' ? 'Refused' : 'Approved']} />
      <Card>
        <CardBody className="space-y-3">
          {allocation.name && <div><p className="o_label">Allocation name</p><p>{allocation.name}</p></div>}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-muted">Allocated</p><p className="font-medium text-foreground">{allocation.allocated}</p></div>
            <div><p className="text-xs text-muted">Taken</p><p className="font-medium text-foreground">{allocation.taken}</p></div>
            <div><p className="text-xs text-muted">Remaining</p><p className="font-medium text-foreground">{allocation.remaining}</p></div>
          </div>
          <div><p className="text-xs text-muted">Validity</p><p className="text-sm text-foreground">{allocation.valid_from} → {allocation.valid_to}</p></div>

          {canDecide && (
            <div className="flex gap-2 border-t border-border pt-3">
              <Button variant="success" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}><Check size={15} /> Approve</Button>
              <Button variant="danger" onClick={() => refuseMutation.mutate()} disabled={refuseMutation.isPending}><X size={15} /> Refuse</Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
