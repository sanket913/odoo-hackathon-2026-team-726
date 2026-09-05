import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { timeOffService } from '../lib/api/services/timeOffService'
import { useAuth } from '../lib/auth/AuthContext'
import { PERMISSIONS } from '../lib/permissions/permissions'
import { invalidateAfter } from '../lib/invalidation'
import { getErrorMessage } from '../lib/api/normalizers'
import { Button } from './ui'

export function RequestActions({ request }) {
  const { hasPermission } = useAuth()
  const client = useQueryClient()
  const decision = useMutation({ mutationFn: approve => approve ? timeOffService.approveRequest(request.id, '') : timeOffService.refuseRequest(request.id, ''), onSuccess: () => { invalidateAfter(client, 'timeoff:mutated'); toast.success('Request updated') }, onError: error => toast.error(getErrorMessage(error)) })
  if (request.status !== 'To Approve' || !hasPermission(PERMISSIONS.TIMEOFF_APPROVE)) return null
  return <div className="flex gap-2"><Button size="sm" variant="success" disabled={decision.isPending} onClick={() => decision.mutate(true)}>Approve</Button><Button size="sm" variant="outline" disabled={decision.isPending} onClick={() => decision.mutate(false)}>Refuse</Button></div>
}
