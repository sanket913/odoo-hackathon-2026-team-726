import { endFromDays, daysFromDates } from '../../lib/allocationDates'
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
  const [calculation, setCalculation] = useState('automatic')
  const [driver, setDriver] = useState('days')
  const dateError = validFrom && validTo && validTo < validFrom ? 'End date must be on or after the start date.' : ''
  const changeDays = value => {
    setAllocated(value)
    setDriver('days')
    if (calculation === 'automatic') setValidTo(endFromDays(validFrom, value))
  }
  const changeStart = value => {
    setValidFrom(value)
    if (calculation !== 'automatic') return
    if (driver === 'days' && allocated) setValidTo(endFromDays(value, allocated))
    else setAllocated(daysFromDates(value, validTo))
  }
  const changeEnd = value => {
    setValidTo(value)
    setDriver('dates')
    if (calculation === 'automatic') setAllocated(daysFromDates(validFrom, value))
  }
  const changeCalculation = value => {
    setCalculation(value)
    if (value === 'automatic') {
      if (allocated && validFrom) { setDriver('days'); setValidTo(endFromDays(validFrom, allocated)) }
      else { setDriver('dates'); setAllocated(daysFromDates(validFrom, validTo)) }
    }
  }

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
        <form onSubmit={(e) => { e.preventDefault(); if (!dateError && Number(allocated) > 0 && !mutation.isPending) mutation.mutate() }} className="space-y-4">
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
          <Field label="Date calculation">
            <Select value={calculation} onChange={e => changeCalculation(e.target.value)}><option value="automatic">Calculate days and dates automatically</option><option value="independent">Set days and validity independently</option></Select>
          </Field>
          <p className="text-xs text-muted" id="allocation-calculation-help">{calculation === 'automatic' ? 'Enter days and a start date to calculate the end date, or enter both dates to calculate days. Both dates and weekends count. A half-day amount uses the last calendar date without rounding your allowance.' : 'Use this for a leave allowance valid over a longer period, such as 12 days available throughout the year.'}</p>
          <Field label="Days allocated" required>
            <Input type="number" step="0.5" min="0.5" aria-describedby="allocation-calculation-help" value={allocated} onChange={(e) => changeDays(e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valid from" required>
              <Input type="date" value={validFrom} onChange={(e) => changeStart(e.target.value)} required />
            </Field>
            <Field label="Valid to" required error={dateError}>
              <Input type="date" min={validFrom || undefined} value={validTo} onChange={(e) => changeEnd(e.target.value)} required />
            </Field>
          </div>
          {allocated && validFrom && validTo && !dateError && <p className="rounded-lg border border-border bg-background p-3 text-sm" role="status">{allocated} day(s) allocated. Valid {validFrom} to {validTo}.</p>}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/time-off/allocations" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Create Allocation'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
