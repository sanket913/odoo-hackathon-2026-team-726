import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { timeOffService } from '../../lib/api/services/timeOffService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, PageHeader, LoadingState } from '../../components/ui'

export default function TimeOffTypeFormPage() {
  const { typeId } = useParams()
  const isEdit = !!typeId
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: types = [], isLoading } = useQuery({ queryKey: queryKeys.timeOffTypes({}), queryFn: () => timeOffService.types({}) })
  const existing = isEdit ? types.find((t) => String(t.id) === String(typeId)) : null

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [unit, setUnit] = useState('Days')
  const [requiresAllocation, setRequiresAllocation] = useState(true)
  const [approvalRequired, setApprovalRequired] = useState(true)
  const [deductFromPayroll, setDeductFromPayroll] = useState(false)
  const [allowNegative, setAllowNegative] = useState(false)

  useEffect(() => {
    if (existing) {
      setName(existing.name); setCode(existing.code); setUnit(existing.unit)
      setRequiresAllocation(existing.requires_allocation); setApprovalRequired(existing.approval_required)
      setDeductFromPayroll(existing.deduct_from_payroll); setAllowNegative(existing.allow_negative)
    }
  }, [existing])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name, unit, requires_allocation: requiresAllocation, approval_required: approvalRequired,
        deduct_from_payroll: deductFromPayroll, allow_negative: allowNegative,
      }
      return isEdit ? timeOffService.updateType(typeId, payload) : timeOffService.createType({ ...payload, code })
    },
    onSuccess: () => {
      invalidateAfter(queryClient, 'timeoff:mutated')
      toast.success(isEdit ? 'Time off type updated' : 'Time off type created')
      navigate('/time-off/types')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title={isEdit ? 'Edit Time Off Type' : 'New Time Off Type'} />
      <Card className="o_form_sheet">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={isEdit} required />
            </Field>
          </div>
          <Field label="Unit">
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="Days">Days</option>
              <option value="Hours">Hours</option>
            </Select>
          </Field>
          <div className="space-y-2">
            <Toggle label="Requires allocation" checked={requiresAllocation} onChange={setRequiresAllocation} />
            <Toggle label="Approval required" checked={approvalRequired} onChange={setApprovalRequired} />
            <Toggle label="Deduct from payroll" checked={deductFromPayroll} onChange={setDeductFromPayroll} />
            <Toggle label="Allow negative balance" checked={allowNegative} onChange={setAllowNegative} />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/time-off/types" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save Type'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded border border-border bg-white px-3 py-2 text-sm">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
