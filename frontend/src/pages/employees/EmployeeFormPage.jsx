import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { employeeSchema } from '../../schemas/employeeSchema'
import { employeeService } from '../../lib/api/services/employeeService'
import { masterDataService } from '../../lib/api/services/masterDataService'
import { scheduleService } from '../../lib/api/services/scheduleService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, PageHeader, LoadingState } from '../../components/ui'

function toEmptyOrNumber(v) {
  return v === '' || v === undefined || v === null ? null : Number(v)
}

export default function EmployeeFormPage() {
  const { employeeId } = useParams()
  const isEdit = !!employeeId
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: employee, isLoading } = useQuery({
    queryKey: queryKeys.employee(employeeId),
    queryFn: () => employeeService.get(employeeId),
    enabled: isEdit,
  })
  const { data: departments = [] } = useQuery({ queryKey: queryKeys.departments, queryFn: masterDataService.departments })
  const { data: positions = [] } = useQuery({ queryKey: queryKeys.jobPositions, queryFn: masterDataService.jobPositions })
  const { data: types = [] } = useQuery({ queryKey: queryKeys.employeeTypes, queryFn: masterDataService.employeeTypes })
  const { data: schedulesPage } = useQuery({ queryKey: queryKeys.schedules({}), queryFn: () => scheduleService.list({ limit: 50 }) })
  const { data: managersPage } = useQuery({ queryKey: queryKeys.employees({ limit: 500 }), queryFn: () => employeeService.list({ limit: 500 }) })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', email: '', phone: '', department_id: '', job_position_id: '', manager_id: '', employee_type_id: '', working_schedule_id: '', bank_account: '' },
  })

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name, email: employee.email, phone: employee.phone || '',
        department_id: employee.department_id ?? '', job_position_id: employee.job_position_id ?? '',
        manager_id: employee.manager_id ?? '', employee_type_id: employee.employee_type_id ?? '',
        working_schedule_id: employee.working_schedule_id ?? '', bank_account: employee.bank_account || '',
      })
    }
  }, [employee, reset])

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        ...values,
        department_id: toEmptyOrNumber(values.department_id),
        job_position_id: toEmptyOrNumber(values.job_position_id),
        manager_id: toEmptyOrNumber(values.manager_id),
        employee_type_id: toEmptyOrNumber(values.employee_type_id),
        working_schedule_id: toEmptyOrNumber(values.working_schedule_id),
        phone: values.phone || null,
        bank_account: values.bank_account || null,
      }
      return isEdit ? employeeService.update(employeeId, payload) : employeeService.create(payload)
    },
    onSuccess: (result) => {
      invalidateAfter(queryClient, 'employee:mutated', { employeeId })
      toast.success(isEdit ? 'Employee updated' : 'Employee created')
      navigate(`/employees/${result.id}`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isEdit && isLoading) return <LoadingState />

  const managers = (managersPage?.items || []).filter((m) => String(m.id) !== String(employeeId))

  return (
    <div className="o_form_view mx-auto max-w-2xl">
      <PageHeader title={isEdit ? 'Edit Employee' : 'New Employee'} />
      <Card className="o_form_sheet">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Jane Doe" />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <Input type="email" {...register('email')} placeholder="jane@peoplepay360.com" />
            </Field>
            <Field label="Phone">
              <Input {...register('phone')} placeholder="+91 9xxxxxxxxx" />
            </Field>
            <Field label="Bank account">
              <Input {...register('bank_account')} placeholder="Account number" />
            </Field>
            <Field label="Department">
              <Select {...register('department_id')}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Job position">
              <Select {...register('job_position_id')}>
                <option value="">Select job position</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Employee type">
              <Select {...register('employee_type_id')}>
                <option value="">Select type</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Working schedule">
              <Select {...register('working_schedule_id')}>
                <option value="">Select schedule</option>
                {(schedulesPage?.items || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Manager">
              <Select {...register('manager_id')}>
                <option value="">No manager</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to={isEdit ? `/employees/${employeeId}` : '/employees'} variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save Employee'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
