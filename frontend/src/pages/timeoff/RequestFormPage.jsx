import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { employeeService } from '../../lib/api/services/employeeService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { Button, Card, Field, Input, Select, Textarea, PageHeader } from '../../components/ui'

export default function RequestFormPage() {
  const { hasPermission, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canSelectAnyEmployee = hasPermission(PERMISSIONS.TIMEOFF_APPROVE)

  const { data: employeesPage } = useQuery({
    queryKey: queryKeys.employees({ limit: 500 }), queryFn: () => employeeService.list({ limit: 500 }), enabled: canSelectAnyEmployee,
  })
  const { data: types = [] } = useQuery({ queryKey: queryKeys.timeOffTypes({}), queryFn: () => timeOffService.types({ active: true }) })

  const [employeeId, setEmployeeId] = useState(user?.employee_id || '')
  const [typeId, setTypeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => timeOffService.createRequest({
      employee_id: Number(employeeId || user?.employee_id), time_off_type_id: Number(typeId),
      from_date: fromDate, to_date: toDate, reason,
    }),
    onSuccess: () => {
      invalidateAfter(queryClient, 'timeoff:mutated')
      toast.success('Time off request submitted')
      navigate('/time-off/requests')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title="New Time Off Request" />
      <Card className="o_form_sheet">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          {mutation.isError && <p role="alert" className="text-sm text-danger">{getErrorMessage(mutation.error)}</p>}
          {canSelectAnyEmployee && (
            <Field label="Employee" required>
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                <option value="">Select employee</option>
                {(employeesPage?.items || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Time off type" required>
            <Select value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
              <option value="">Select type</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From" required>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
            </Field>
            <Field label="To" required>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
            </Field>
          </div>
          <Field label="Reason">
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason for HR" />
          </Field>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/time-off/requests" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Submitting…' : 'Submit Request'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
