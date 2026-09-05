import { useState } from 'react'
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
import { Button, Card, CardBody, Textarea, PageHeader, LoadingState, ErrorState, Badge, statusTone, StatusBar } from '../../components/ui'

export default function RequestDetailPage() {
  const { requestId } = useParams()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')

  const { data: request, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.request(requestId), queryFn: () => timeOffService.getRequest(requestId),
  })

  const approveMutation = useMutation({
    mutationFn: () => timeOffService.approveRequest(requestId, comment),
    onSuccess: () => { invalidateAfter(queryClient, 'timeoff:mutated'); toast.success('Request approved') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
  const refuseMutation = useMutation({
    mutationFn: () => timeOffService.refuseRequest(requestId, comment),
    onSuccess: () => { invalidateAfter(queryClient, 'timeoff:mutated'); toast.success('Request refused') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return <LoadingState />
  if (isError || !request) return <ErrorState onRetry={refetch} message="Could not load request." />

  const canDecide = hasPermission(PERMISSIONS.TIMEOFF_APPROVE) && request.status === 'To Approve'

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title={`${request.time_off_type_name} — ${request.employee_name}`} actions={<Badge tone={statusTone(request.status)}>{request.status}</Badge>} />
      <StatusBar value={request.status} steps={['To Approve', request.status === 'Refused' ? 'Refused' : 'Approved']} />
      <Card>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted">From</p><p className="font-medium text-foreground">{request.from_date}</p></div>
            <div><p className="text-xs text-muted">To</p><p className="font-medium text-foreground">{request.to_date}</p></div>
            <div><p className="text-xs text-muted">Duration</p><p className="font-medium text-foreground">{request.duration_days} day(s)</p></div>
          </div>
          {request.reason && (
            <div><p className="text-xs text-muted">Reason</p><p className="text-sm text-foreground">{request.reason}</p></div>
          )}
          {request.hr_comment && (
            <div><p className="text-xs text-muted">HR comment</p><p className="text-sm text-foreground">{request.hr_comment}</p></div>
          )}

          {canDecide && (
            <div className="border-t border-border pt-3">
              <Textarea rows={2} placeholder="Optional comment for the employee…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="mt-3 flex gap-2">
                <Button variant="success" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                  <Check size={15} /> Approve
                </Button>
                <Button variant="danger" onClick={() => refuseMutation.mutate()} disabled={refuseMutation.isPending}>
                  <X size={15} /> Refuse
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
