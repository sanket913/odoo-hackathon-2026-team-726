import { ListSearch, useListSearch } from '../../components/ListSearch'
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { payrollService } from '../../lib/api/services/payrollService'
import { salaryService } from '../../lib/api/services/salaryService'
import { masterDataService } from '../../lib/api/services/masterDataService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, PageHeader, StatusBar, ErrorState } from '../../components/ui'

export default function PayrunWizardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)

  const [salaryStructureId, setSalaryStructureId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [departmentId, setDepartmentId] = useState('')

  const [selected, setSelected] = useState(new Set())

  // eligibility participates in centralized mutation invalidation.
  const scope = { salary_structure_id: Number(salaryStructureId), period_start: periodStart,
    period_end: periodEnd, department_id: departmentId ? Number(departmentId) : null }
  const eligibilityKey = ['payruns', 'eligibility', scope]
  const eligibilityQuery = useQuery({ queryKey: eligibilityKey,
    queryFn: () => payrollService.wizardEligibility(scope), enabled: step === 2, staleTime: 30000 })
  const eligibility = eligibilityQuery.data || []
  useEffect(() => {
    if (eligibilityQuery.data) setSelected(previous => new Set([...previous].filter(id => eligibilityQuery.data.some(row => row.employee_id === id && row.eligible))))
  }, [eligibilityQuery.data])

  const { data: structures = [] } = useQuery({ queryKey: queryKeys.salaryStructures({}), queryFn: () => salaryService.structures({ active: true }) })
  const { data: departments = [] } = useQuery({ queryKey: queryKeys.departments, queryFn: masterDataService.departments })

  const eligibilityMutation = useMutation({
    mutationFn: () => queryClient.fetchQuery({ queryKey: eligibilityKey, queryFn: () => payrollService.wizardEligibility(scope), staleTime: 0 }),
    onSuccess: (results) => {
      setSelected(new Set(results.filter((r) => r.eligible).map((r) => r.employee_id)))
      setStep(2)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const createMutation = useMutation({
    mutationFn: () => payrollService.createPayrun({
      salary_structure_id: Number(salaryStructureId), period_start: periodStart, period_end: periodEnd,
      department_id: departmentId ? Number(departmentId) : null, employee_ids: Array.from(selected),
    }),
    onSuccess: (payrun) => {
      invalidateAfter(queryClient, 'payrun:mutated', { payrunId: payrun.id })
      toast.success('Payrun created')
      navigate(`/payroll/payruns/${payrun.id}`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const { search, setSearch, filtered } = useListSearch(eligibility, ['name', 'department_name', 'employee_type_name'])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="o_form_view mx-auto max-w-3xl">
      <PageHeader title="New Payrun" description={`Step ${step} of 2`} />
      {step === 2 && eligibilityQuery.isError && <ErrorState message="Could not refresh eligible employees." onRetry={eligibilityQuery.refetch} />}
      <StatusBar value={step === 1 ? '1. Period & structure' : '2. Select employees'} steps={['1. Period & structure', '2. Select employees']} label="Payrun creation steps" />

      {step === 1 && (
        <Card className="o_form_sheet">
          <form
            onSubmit={(e) => { e.preventDefault(); eligibilityMutation.mutate() }}
            className="space-y-4"
          >
            <Field label="Salary structure" required>
              <Select value={salaryStructureId} onChange={(e) => setSalaryStructureId(e.target.value)} required>
                <option value="">Select structure</option>
                {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Period start" required>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
              </Field>
              <Field label="Period end" required>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
              </Field>
            </div>
            <Field label="Department (optional filter)">
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button as={Link} to="/payroll/payruns" variant="outline" type="button">Cancel</Button>
              <Button type="submit" disabled={eligibilityMutation.isPending}>
                {eligibilityMutation.isPending ? 'Checking eligibility…' : 'Continue'} <ArrowRight size={15} />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 2 && (
        <Card className="o_form_sheet">
          <p className="mb-3 text-sm text-muted">
            {selected.size} of {eligibility.length} employee(s) selected for {periodStart} → {periodEnd}.
          </p>
          <ListSearch value={search} onChange={setSearch} label="Search eligible employees" />
          <div className="o_list_view table-wrap">
            <table className="o_list_table pp-table">
              <thead>
                <tr><th></th><th>Employee</th><th>Department</th><th>Employee Type</th><th>Contract</th><th>Wage</th><th>Eligibility</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.employee_id} className={!row.eligible ? 'opacity-50' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name}`}
                        disabled={!row.eligible}
                        checked={selected.has(row.employee_id)}
                        onChange={() => toggle(row.employee_id)}
                      />
                    </td>
                    <td className="font-medium text-foreground">{row.name}</td>
                    <td>{row.department_name || '—'}</td>
                    <td>{row.employee_type_name || '—'}</td>
                    <td>{row.contract_id ? `#${row.contract_id}` : '—'}</td>
                    <td>{row.wage ? `₹${Number(row.wage).toLocaleString()}` : '—'}</td>
                    <td>
                      {row.eligible ? (
                        <span className="text-xs text-success">Eligible</span>
                      ) : (
                        <span className="text-xs text-danger" title={row.reason}>Ineligible — {row.reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || selected.size === 0 || eligibilityQuery.isFetching || eligibilityQuery.isError}
            >
              {createMutation.isPending ? 'Creating…' : `Create Payrun (${selected.size})`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
