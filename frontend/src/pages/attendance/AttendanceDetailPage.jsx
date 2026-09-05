import { AttendanceHoursSummary } from '../../components/AttendanceHoursSummary'
import { employeeService } from '../../lib/api/services/employeeService'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { attendanceService } from '../../lib/api/services/attendanceService'
import { queryKeys } from '../../lib/queryKeys'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, CardBody, PageHeader, LoadingState, ErrorState, Badge, statusTone } from '../../components/ui'

export default function AttendanceDetailPage() {
  const { attendanceId } = useParams()
  const { hasPermission } = useAuth()
  const { data: record, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.attendanceRecord(attendanceId), queryFn: () => attendanceService.get(attendanceId),
  })

  const { data: employee } = useQuery({ queryKey: queryKeys.employee(record?.employee_id), queryFn: () => employeeService.get(record.employee_id), enabled: !!record?.employee_id })

  if (isLoading) return <LoadingState />
  if (isError || !record) return <ErrorState onRetry={refetch} message="Could not load attendance record." />

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader
        title={`Attendance — ${record.date}`}
        description={record.employee_name}
        actions={
          hasPermission(PERMISSIONS.ATTENDANCE_CORRECT) && (
            <Button as={Link} to={`/attendance/${attendanceId}/edit`} variant="outline"><Pencil size={14} /> Correct</Button>
          )
        }
      />
      <div className="mb-4"><AttendanceHoursSummary record={record} /></div>
      <Card>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Item label="Department" value={employee?.department_name || '\u2014'} />
          <Item label="Manager" value={employee?.manager_name || '\u2014'} />
          <Item label="Check in" value={record.check_in ? new Date(record.check_in).toLocaleString() : '—'} />
          <Item label="Check out" value={record.check_out ? new Date(record.check_out).toLocaleString() : '—'} />
          <Item label="Location" value={record.location_tag || "Not captured"} />
          {record.auto_status_note && <Item label="Automatic status note" value={record.auto_status_note} />}
          <Item label="Net worked hours" value={record.worked_hours} />
          <Item label="Status" value={<Badge tone={statusTone(record.status)}>{record.status}</Badge>} />
          {record.is_manual_correction && <Item label="Correction reason" value={record.correction_reason || '—'} />}
        </CardBody>
      </Card>
    </div>
  )
}

function Item({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
