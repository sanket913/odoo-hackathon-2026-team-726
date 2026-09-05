import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { scheduleService } from '../../lib/api/services/scheduleService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, PageHeader, LoadingState } from '../../components/ui'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function defaultLines() {
  return DAYS.map((_, idx) => ({
    enabled: idx < 5, day_of_week: idx, start_time: '09:00', end_time: '18:00', break_hours: '1.00',
  }))
}

function lineDuration(line) {
  if (!line.enabled) return 0
  const [sh, sm] = line.start_time.split(':').map(Number)
  const [eh, em] = line.end_time.split(':').map(Number)
  const hours = (eh * 60 + em - (sh * 60 + sm)) / 60 - Number(line.break_hours || 0)
  return hours > 0 ? hours : 0
}

export default function ScheduleFormPage() {
  const { scheduleId } = useParams()
  const isEdit = !!scheduleId
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: schedule, isLoading } = useQuery({
    queryKey: queryKeys.schedule(scheduleId), queryFn: () => scheduleService.get(scheduleId), enabled: isEdit,
  })

  const [name, setName] = useState('')
  const [type, setType] = useState('Fixed')
  const [lines, setLines] = useState(defaultLines())
  const [error, setError] = useState('')

  useEffect(() => {
    if (schedule) {
      setName(schedule.name)
      setType(schedule.type)
      const byDay = Object.fromEntries(schedule.lines.map((l) => [l.day_of_week, l]))
      setLines(DAYS.map((_, idx) => byDay[idx]
        ? { enabled: true, day_of_week: idx, start_time: byDay[idx].start_time.slice(0, 5), end_time: byDay[idx].end_time.slice(0, 5), break_hours: String(byDay[idx].break_hours) }
        : { enabled: false, day_of_week: idx, start_time: '09:00', end_time: '18:00', break_hours: '1.00' }))
    }
  }, [schedule])

  const totalWeeklyHours = useMemo(() => lines.reduce((sum, l) => sum + lineDuration(l), 0).toFixed(2), [lines])

  const updateLine = (idx, field, value) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  const mutation = useMutation({
    mutationFn: () => {
      const activeLines = lines.filter((l) => l.enabled)
      const payload = {
        name, type,
        lines: activeLines.map((l) => ({
          day_of_week: l.day_of_week, start_time: l.start_time, end_time: l.end_time, break_hours: Number(l.break_hours),
        })),
      }
      return isEdit ? scheduleService.update(scheduleId, payload) : scheduleService.create(payload)
    },
    onSuccess: (result) => {
      invalidateAfter(queryClient, 'schedule:mutated')
      toast.success(isEdit ? 'Schedule updated' : 'Schedule created')
      navigate(`/schedules/${result.id}`)
    },
    onError: (err) => { setError(getErrorMessage(err)); toast.error(getErrorMessage(err)) },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const activeLines = lines.filter((l) => l.enabled)
    if (activeLines.length === 0) { setError('At least one working day is required.'); return }
    for (const l of activeLines) {
      if (l.end_time <= l.start_time) { setError('End time must be after start time for every enabled day.'); return }
      if (Number(l.break_hours) < 0) { setError('Break hours cannot be negative.'); return }
    }
    mutation.mutate()
  }

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="o_form_view mx-auto max-w-3xl">
      <PageHeader title={isEdit ? 'Edit Working Schedule' : 'New Working Schedule'} />
      <Card className="o_form_sheet">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Schedule name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fixed 9-6" required />
            </Field>
            <Field label="Type" required>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Fixed">Fixed</option>
                <option value="Flexible">Flexible</option>
              </Select>
            </Field>
          </div>

          <div className="o_list_view table-wrap">
            <table className="o_list_table pp-table">
              <thead>
                <tr><th></th><th>Day</th><th>Start</th><th>End</th><th>Break (hrs)</th><th>Duration</th></tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <input aria-label={`Enable ${DAYS[idx]}`} type="checkbox" checked={line.enabled} onChange={(e) => updateLine(idx, 'enabled', e.target.checked)} />
                    </td>
                    <td>{DAYS[idx]}</td>
                    <td><Input aria-label={`${DAYS[idx]} start time`} type="time" disabled={!line.enabled} value={line.start_time} onChange={(e) => updateLine(idx, 'start_time', e.target.value)} /></td>
                    <td><Input aria-label={`${DAYS[idx]} end time`} type="time" disabled={!line.enabled} value={line.end_time} onChange={(e) => updateLine(idx, 'end_time', e.target.value)} /></td>
                    <td><Input aria-label={`${DAYS[idx]} break hours`} type="number" step="0.25" min="0" disabled={!line.enabled} value={line.break_hours} onChange={(e) => updateLine(idx, 'break_hours', e.target.value)} /></td>
                    <td className="font-medium text-foreground">{lineDuration(line).toFixed(2)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded border border-border bg-white px-4 py-3">
            <span className="text-sm text-muted">Computed weekly hours</span>
            <span className="text-lg font-semibold text-primary">{totalWeeklyHours} hrs / week</span>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/schedules" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save Schedule'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
