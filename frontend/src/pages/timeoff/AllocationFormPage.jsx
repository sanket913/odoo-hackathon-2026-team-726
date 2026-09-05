import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { employeeService } from '../../lib/api/services/employeeService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, PageHeader } from '../../components/ui'

export default function AllocationFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: employeesPage } = useQuery({ queryKey: queryKeys.employees({ limit: 500 }), queryFn: () => employeeService.list({ limit: 500 }) })
  const { data: types = [] } = useQuery({ queryKey: queryKeys.timeOffTypes({}), queryFn: () => timeOffService.types({ active: true }) })

  const [employeeId, setEmployeeId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [name, setName] = useState('')
  const [allocated, setAllocated] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')

  const mutation = useMutation({
    mutationFn: () => timeOffService.createAllocation({
      employee_id: Number(employeeId), time_off_type_id: Number(typeId), name,
      allocated: Number(allocated), valid_from: validFrom, valid_to: validTo,
    }),
    onSuccess: () => {
      invalidateAfter(queryClient, 'timeoff:mutated')
      toast.success('Allocation created (pending approval)')
      navigate('/time-off/allocations')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title="New Time Off Allocation" />
      <Card className="o_form_sheet">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          <Field label="Employee" required>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Select employee</option>
              {(employeesPage?.items || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Time off type" required>
            <Select value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
              <option value="">Select type</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Allocation name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Annual Leave Grant" />
          </Field>
          <Field label="Days allocated" required>
            <Input type="number" step="0.5" min="0" value={allocated} onChange={(e) => setAllocated(e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valid from" required>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
            </Field>
            <Field label="Valid to" required>
              <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} required />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/time-off/allocations" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Create Allocation'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
