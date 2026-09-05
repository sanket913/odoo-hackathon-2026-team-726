import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { attendanceService } from '../../lib/api/services/attendanceService'
import { employeeService } from '../../lib/api/services/employeeService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, Textarea, PageHeader, LoadingState } from '../../components/ui'

function toLocalInput(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AttendanceFormPage() {
  const { attendanceId } = useParams()
  const isEdit = !!attendanceId
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: record, isLoading } = useQuery({
    queryKey: queryKeys.attendanceRecord(attendanceId), queryFn: () => attendanceService.get(attendanceId), enabled: isEdit,
  })
  const { data: employeesPage } = useQuery({ queryKey: queryKeys.employees({ limit: 500 }), queryFn: () => employeeService.list({ limit: 500 }) })

  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [breakHours, setBreakHours] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (record) {
      setEmployeeId(record.employee_id)
      setDate(record.date)
      setCheckIn(toLocalInput(record.check_in))
      setCheckOut(toLocalInput(record.check_out))
      setReason(record.correction_reason || '')
      setBreakHours('')
    }
  }, [record])

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return attendanceService.update(attendanceId, {
          check_in: checkIn ? new Date(checkIn).toISOString() : null,
          check_out: checkOut ? new Date(checkOut).toISOString() : null,
          correction_reason: reason || null,
          ...(breakHours === '' ? {} : { break_hours: Number(breakHours) }),
        })
      }
      return attendanceService.create({
        employee_id: Number(employeeId), date,
        check_in: checkIn ? new Date(checkIn).toISOString() : null,
        check_out: checkOut ? new Date(checkOut).toISOString() : null,
      })
    },
    onSuccess: () => {
      invalidateAfter(queryClient, 'attendance:mutated')
      toast.success(isEdit ? 'Attendance corrected' : 'Attendance record created')
      navigate('/attendance')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title={isEdit ? 'Correct Attendance' : 'New Attendance Record'} />
      <Card className="o_form_sheet">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          {!isEdit && (
            <Field label="Employee" required>
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                <option value="">Select employee</option>
                {(employeesPage?.items || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
          )}
          {!isEdit && (
            <Field label="Date" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
          )}
          <Field label="Check in">
            <Input type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </Field>
          <Field label="Check out">
            <Input type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </Field>
          {isEdit && <Field label="Break duration override (hours)"><Input type="number" min="0" max="24" step="0.01" value={breakHours} onChange={e => setBreakHours(e.target.value)} placeholder="Leave blank to retain the current break policy" /><p className="mt-1 text-xs text-muted">Enter 0 for no break deduction. A correction reason is required.</p></Field>}
          {isEdit && (
            <Field label="Correction reason" required>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for this manual correction…" required />
            </Field>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/attendance" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
