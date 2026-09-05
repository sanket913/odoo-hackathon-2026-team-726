import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { salaryService } from '../../lib/api/services/salaryService'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, Field, Input, Select, PageHeader, LoadingState } from '../../components/ui'

export default function SalaryRuleFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: structures = [] } = useQuery({ queryKey: queryKeys.salaryStructures({}), queryFn: () => salaryService.structures() })
  const { data: rule, isLoading } = useQuery({ queryKey: queryKeys.salaryRule(id), queryFn: () => salaryService.getRule(id), enabled: isEdit })

  const [structureId, setStructureId] = useState(searchParams.get('structureId') || '')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('Allowance')
  const [sequence, setSequence] = useState(10)
  const [computationType, setComputationType] = useState('Fixed')
  const [fixedAmount, setFixedAmount] = useState('0')
  const [percentage, setPercentage] = useState('')
  const [baseRuleCode, setBaseRuleCode] = useState('')
  const [formulaText, setFormulaText] = useState('')

  useEffect(() => {
    if (rule) {
      setStructureId(rule.structure_id); setName(rule.name); setCode(rule.code); setCategory(rule.category)
      setSequence(rule.sequence); setComputationType(rule.computation_type)
      setFixedAmount(rule.fixed_amount ?? '0'); setPercentage(rule.percentage ?? '')
      setBaseRuleCode(rule.base_rule_code || ''); setFormulaText(rule.formula_text || '')
    }
  }, [rule])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name, category, sequence: Number(sequence), computation_type: computationType,
        fixed_amount: computationType === 'Fixed' ? Number(fixedAmount || 0) : 0,
        percentage: computationType === 'Percentage' ? Number(percentage) : null,
        base_rule_code: computationType === 'Percentage' ? baseRuleCode.toUpperCase() : null,
        formula_text: computationType === 'Formula' ? formulaText : null,
      }
      if (isEdit) return salaryService.updateRule(id, payload)
      return salaryService.createRule({ ...payload, structure_id: Number(structureId), code: code.toUpperCase() })
    },
    onSuccess: (result) => {
      invalidateAfter(queryClient, 'salary:mutated')
      toast.success(isEdit ? 'Rule updated' : 'Rule created')
      navigate(`/payroll/salary-structures/${result.structure_id}`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="o_form_view mx-auto max-w-xl">
      <PageHeader title={isEdit ? 'Edit Salary Rule' : 'New Salary Rule'} />
      <Card className="o_form_sheet">
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
          {mutation.isError && <p role="alert" className="text-sm text-danger">{getErrorMessage(mutation.error)}</p>}
          {!isEdit && (
            <Field label="Salary structure" required>
              <Select value={structureId} onChange={(e) => setStructureId(e.target.value)} required>
                <option value="">Select structure</option>
                {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={isEdit} required /></Field>
            <Field label="Category" required>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Basic">Basic</option>
                <option value="Allowance">Allowance</option>
                <option value="Gross">Gross</option>
                <option value="Deduction">Deduction</option>
                <option value="Net">Net</option>
              </Select>
            </Field>
            <Field label="Sequence" required><Input type="number" value={sequence} onChange={(e) => setSequence(e.target.value)} required /></Field>
          </div>

          <Field label="Computation type" required>
            <Select value={computationType} onChange={(e) => setComputationType(e.target.value)}>
              <option value="Fixed">Fixed</option>
              <option value="Percentage">Percentage</option>
              <option value="Formula">Formula</option>
            </Select>
          </Field>

          {computationType === 'Fixed' && (
            <Field label="Fixed amount" required>
              <Input type="number" step="0.01" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} required />
            </Field>
          )}
          {computationType === 'Percentage' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Percentage" required>
                <Input type="number" step="0.001" value={percentage} onChange={(e) => setPercentage(e.target.value)} required />
              </Field>
              <Field label="Base rule code" required>
                <Input value={baseRuleCode} onChange={(e) => setBaseRuleCode(e.target.value.toUpperCase())} placeholder="BASIC" required />
              </Field>
            </div>
          )}
          {computationType === 'Formula' && (
            <Field label="Formula" required>
              <Input value={formulaText} onChange={(e) => setFormulaText(e.target.value)} placeholder="BASIC + HRA + CONV" required /><p className="text-xs text-muted mt-2">Available: WAGE, WORKED_DAYS, WORKED_HOURS, PERIOD_DAYS, SCHEDULED_DAYS, SCHEDULED_HOURS, OVERTIME_HOURS, UNPAID_DAYS, and earlier rule codes. Unpaid days use calendar days; schedule totals exclude breaks.</p>
              <p className="mt-1 text-xs text-muted">Only + − × ÷, parentheses, and known rule codes are allowed.</p>
            </Field>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button as={Link} to="/payroll/salary-rules" variant="outline" type="button">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save Rule'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
