import { AttendanceStatus } from './AttendanceStatus'
import { AttendanceHoursSummary } from './AttendanceHoursSummary'
import { useSelfAttendance } from '../lib/useSelfAttendance'
import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'


import { useAuth } from '../lib/auth/AuthContext'





import { Button, Modal, Badge, LoadingState, ErrorState } from './ui'

export function AttendanceWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const { allowed, query, record, checkedIn, pending, mutation, today, canCheckIn, canCheckOut } = useSelfAttendance()
  useEffect(() => { if (!allowed) return; const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [allowed])
  if (!allowed) return null
  // The existing service records UTC timestamps without a zone suffix.
  const started = record?.check_in ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(record.check_in) ? record.check_in : `${record.check_in}Z`) : null
  const seconds = started ? Math.max(0, Math.floor((now - started) / 1000)) : 0
  const elapsed = `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return <>
    <button type="button" className="o_topbar_button" aria-label="My attendance" onClick={() => setOpen(true)}><Clock size={18} />{query.isSuccess && <span className={`h-2 w-2 rounded-full ${checkedIn ? 'bg-success' : 'bg-danger'}`} aria-label={checkedIn ? 'Checked in' : 'Not checked in'} />}</button>
    <Modal open={open} onClose={() => setOpen(false)} title="My attendance">
      <p className="mb-3 font-medium">{user.full_name}</p>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Could not load today's attendance." onRetry={query.refetch} /> : <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span>{record?.date || today}</span><Badge tone={checkedIn ? 'success' : 'muted'}>{checkedIn ? 'Checked in' : record?.check_out ? 'Checked out' : 'Not checked in'}</Badge></div>
        {checkedIn && <div><p className="o_label">Elapsed since check-in</p><p className="text-xl font-semibold tabular-nums">{elapsed}</p></div>}
        <AttendanceHoursSummary record={record} />
        <AttendanceStatus record={record} />
        {!record?.check_in && <Button variant="outline" disabled={!canCheckIn} onClick={() => mutation.mutate('location')}>Check In with location</Button>}
        {!record?.check_out && <Button className="w-full" disabled={checkedIn ? !canCheckOut : !canCheckIn} onClick={() => mutation.mutate(checkedIn ? 'out' : 'in')}>{pending ? 'Saving…' : checkedIn ? 'Check Out' : 'Check In'}</Button>}
        <Link to="/attendance" className="block text-primary hover:underline" onClick={() => setOpen(false)}>View attendance records</Link>
      </div>}
    </Modal>
  </>
}
