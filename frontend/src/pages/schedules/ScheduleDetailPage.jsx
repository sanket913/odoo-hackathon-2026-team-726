import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { scheduleService } from '../../lib/api/services/scheduleService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, PageHeader, LoadingState, ErrorState, Badge } from '../../components/ui'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ScheduleDetailPage() {
  const { scheduleId } = useParams()
  const { hasPermission } = useAuth()
  const { data: schedule, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.schedule(scheduleId), queryFn: () => scheduleService.get(scheduleId),
  })

  if (isLoading) return <LoadingState />
  if (isError || !schedule) return <ErrorState onRetry={refetch} message="Could not load schedule." />

  return (
    <div className="o_form_view mx-auto max-w-2xl">
      <PageHeader
        title={schedule.name}
        description={`${schedule.type} · ${schedule.weekly_hours} hours / week`}
        actions={
          hasPermission(PERMISSIONS.SCHEDULE_MANAGE) && (
            <Button as={Link} to={`/schedules/${scheduleId}/edit`} variant="outline"><Pencil size={14} /> Edit</Button>
          )
        }
      />
      <Card className="mb-4 flex flex-wrap items-center gap-4 p-4"><span>Days / week: <strong>{new Set(schedule.lines.map(line => line.day_of_week)).size}</strong></span><span>Hours / week: <strong>{schedule.weekly_hours}</strong></span><Badge tone={schedule.active ? 'success' : 'muted'}>{schedule.active ? 'Active' : 'Inactive'}</Badge></Card>
      <div className="o_list_view table-wrap">
        <table className="o_list_table pp-table">
          <thead><tr><th>Day</th><th>Start</th><th>End</th><th>Break</th><th>Duration</th></tr></thead>
          <tbody>
            {schedule.lines.map((l) => (
              <tr key={l.id}>
                <td>{DAYS[l.day_of_week]}</td>
                <td>{l.start_time}</td><td>{l.end_time}</td><td>{l.break_hours} hrs</td>
                <td className="font-medium text-foreground">{l.duration_hours} hrs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
