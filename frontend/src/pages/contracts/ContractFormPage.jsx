import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { contractSchema } from '../../schemas/contractSchema'
import { contractService } from '../../lib/api/services/contractService'
import { employeeService } from '../../lib/api/services/employeeService'
import { masterDataService } from '../../lib/api/services/masterDataService'
import { salaryService } from '../../lib/api/services/salaryService'
import { scheduleService } from '../../lib/api/services/scheduleService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, PageHeader, LoadingState } from '../../components/ui'

function numOrNull(v) { return v === '' || v === undefined ? null : Number(v) }

export default function ContractFormPage() {
  const { contractId } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = !!contractId
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: contract, isLoading } = useQuery({
    queryKey: queryKeys.contract(contractId), queryFn: () => contractService.get(contractId), enabled: isEdit,
  })
  const { data: employeesPage } = useQuery({ queryKey: queryKeys.employees({ limit: 500 }), queryFn: () => employeeService.list({ limit: 500 }) })
  const { data: departments = [] } = useQuery({ queryKey: queryKeys.departments, queryFn: masterDataService.departments })
  const { data: positions = [] } = useQuery({ queryKey: queryKeys.jobPositions, queryFn: masterDataService.jobPositions })
  const { data: structures = [] } = useQuery({ queryKey: queryKeys.salaryStructures({}), queryFn: () => salaryService.structures() })
  const { data: schedulesPage } = useQuery({ queryKey: queryKeys.schedules({}), queryFn: () => scheduleService.list({ limit: 50 }) })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      employee_id: searchParams.get('employeeId') || '', reference: '', start_date: '', end_date: '',
      wage: '', department_id: '', job_position_id: '', salary_structure_id: '', working_schedule_id: '', status: 'Active',
    },
  })

  useEffect(() => {
    if (contract) {
      reset({
        employee_id: contract.employee_id, reference: contract.reference, start_date: contract.start_date,
        end_date: contract.end_date || '', wage: contract.wage, department_id: contract.department_id ?? '',
        job_position_id: contract.job_position_id ?? '', salary_structure_id: contract.salary_structure_id ?? '',
        working_schedule_id: contract.working_schedule_id ?? '', status: contract.status,
      })
    }
  }, [contract, reset])

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        ...values,
        employee_id: Number(values.employee_id),
        wage: Number(values.wage),
        end_date: values.end_date || null,
        department_id: numOrNull(values.department_id),
        job_position_id: numOrNull(values.job_position_id),
        salary_structure_id: numOrNull(values.salary_structure_id),
        working_schedule_id: numOrNull(values.working_schedule_id),
      }
      if (isEdit) delete payload.employee_id
      return isEdit ? contractService.update(contractId, payload) : contractService.create(payload)
    },
    onSuccess: (result) => {
      invalidateAfter(queryClient, 'contract:mutated')
      toast.success(isEdit ? 'Contract updated' : 'Contract created')
      navigate(`/contracts/${result.id}`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="o_form_view mx-auto max-w-2xl">
      <PageHeader title={isEdit ? 'Edit Contract' : 'New Contract'} />
      <Card className="o_form_sheet">
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee" required error={errors.employee_id?.message}>
              <Select {...register('employee_id')} disabled={isEdit}>
                <option value="">Select employee</option>
                {(employeesPage?.items || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label="Reference" required error={errors.reference?.message}>
              <Input {...register('reference')} placeholder="CTR-2026-001" />
            </Field>
            <Field label="Start date" required error={errors.start_date?.message}>
              <Input type="date" {...register('start_date')} />
            </Field>
            <Field label="End date (leave blank if ongoing)">
              <Input type="date" {...register('end_date')} />
            </Field>
            <Field label="Wage (monthly)" required error={errors.wage?.message}>
              <Input type="number" step="0.01" {...register('wage')} placeholder="45000.00" />
            </Field>
            <Field label="Status" required>
              <Select {...register('status')}>
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </Select>
            </Field>
            <Field label="Salary structure">
              <Select {...register('salary_structure_id')}>
                <option value="">Select structure</option>
                {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Working schedule">
              <Select {...register('working_schedule_id')}>
                <option value="">Select schedule</option>
                {(schedulesPage?.items || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
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
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/contracts" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save Contract'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
