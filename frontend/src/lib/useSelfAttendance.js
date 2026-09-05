import { useMutation, useQuery, useQueryClient, useIsMutating } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from './auth/AuthContext'
import { PERMISSIONS } from './permissions/permissions'
import { attendanceService } from './api/services/attendanceService'
import { currentCoordinates } from './geolocation'
import { invalidateAfter } from './invalidation'
import { getErrorMessage } from './api/normalizers'

export function useSelfAttendance() {
  const { user, hasPermission } = useAuth()
  const client = useQueryClient()
  const allowed = !!user?.employee_id && hasPermission(PERMISSIONS.ATTENDANCE_CREATE_SELF)
  const key = ['attendance', 'self-status', user?.employee_id]
  const query = useQuery({ queryKey: key, queryFn: attendanceService.selfStatus, enabled: allowed, refetchInterval: 30000, refetchOnWindowFocus: true })
  const record = query.data?.record
  const checkedIn = !!record?.check_in && !record.check_out
  const pending = useIsMutating({ mutationKey: ['attendance', 'self-action'] }) > 0
  const mutation = useMutation({
    mutationKey: ['attendance', 'self-action'],
    mutationFn: async action => action === 'out' ? attendanceService.checkOut() : attendanceService.checkIn(action === 'location' ? await currentCoordinates() : {}),
    onSuccess: async (saved, action) => {
      client.setQueryData(key, previous => ({ ...previous, record: saved }))
      invalidateAfter(client, 'attendance:mutated')
      await client.invalidateQueries({ queryKey: key })
      toast.success(action === 'out' && saved.worked_hours != null ? `Checked out: ${Number(saved.worked_hours).toFixed(2)} working hours; ${Number(saved.break_hours || 0).toFixed(2)} hours break deducted.` : action === 'out' ? 'Checked out' : 'Checked in')
    },
    onError: error => { toast.error(getErrorMessage(error)); client.invalidateQueries({ queryKey: key }) },
  })
  const ready = allowed && query.isSuccess && !query.isFetching && !pending
  return { allowed, query, record, checkedIn, pending, mutation, today: query.data?.business_date,
    canCheckIn: ready && !record?.check_in, canCheckOut: ready && checkedIn }
}
