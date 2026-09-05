import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, Calculator, CheckCircle2, IndianRupee, Send } from 'lucide-react'
import { payrollService } from '../../lib/api/services/payrollService'
import { WarningBox } from '../../components/WarningBox'
import { queryKeys } from '../../lib/queryKeys'
import { invalidateAfter } from '../../lib/invalidation'
import { getErrorMessage } from '../../lib/api/normalizers'
import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { StatusBadge, Button, Card, PageHeader, LoadingState, ErrorState, Badge, StatusBar } from '../../components/ui'

export default function PayrunDetailPage() {
  const { payrunId } = useParams()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const { data: payrun, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payrun(payrunId), queryFn: () => payrollService.getPayrun(payrunId),
  })

  // Dynamic pre-generation warnings.
  const warnings = useQuery({ queryKey: ['payruns', payrunId, 'validation-warnings'], queryFn: () => payrollService.warnings(payrunId) })
  const blocksCompute = warnings.data?.employees.some(e => e.warnings.some(w => w.severity === 'blocking'))
  const computeMutation = useMutation({
    mutationFn: () => payrollService.compute(payrunId),
    onSuccess: () => { invalidateAfter(queryClient, 'payrun:mutated', { payrunId }); toast.success('Payrun computed') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
  const validateMutation = useMutation({
    mutationFn: () => payrollService.validate(payrunId),
    onSuccess: () => { invalidateAfter(queryClient, 'payrun:mutated', { payrunId }); toast.success('Payrun validated') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
  const markPaidMutation = useMutation({
    mutationFn: () => payrollService.markPaid(payrunId),
    onSuccess: () => { invalidateAfter(queryClient, 'payrun:mutated', { payrunId }); toast.success('Payrun marked paid') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
  const sendMutation = useMutation({
    mutationFn: () => payrollService.sendPayslips(payrunId),
    onSuccess: (result) => {
      invalidateAfter(queryClient, 'payrun:mutated', { payrunId })
      if (result.status === 'EMAIL_NOT_CONFIGURED') {
        toast.warning('SMTP is not configured in this environment — payslips were NOT emailed.')
      } else {
        toast.success(`Payslips sent to ${result.sent}/${result.total} employees`)
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  if (isLoading) return <LoadingState />
  if (isError || !payrun) return <ErrorState onRetry={refetch} message="Could not load payrun." />

  const anyWarnings = payrun.payslips.some((p) => (p.warning_messages || []).length > 0)
  const blockingWarnings = payrun.payslips.flatMap((p) => (p.warning_messages || []).filter((w) => w.severity === 'blocking'))

  return (
    <div className="o_form_view">
      <PageHeader
        title={payrun.name}
        description={`${payrun.period_start} → ${payrun.period_end} · ${payrun.salary_structure_name}`}
        actions={<StatusBadge status={payrun.status} />}
      />
      <StatusBar value={payrun.status} steps={['Draft', 'Computed', 'Validated', 'Paid']} />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        {hasPermission(PERMISSIONS.PAYRUN_COMPUTE) && payrun.status !== 'Validated' && payrun.status !== 'Paid' && (
          <Button variant="secondary" onClick={() => computeMutation.mutate()} disabled={computeMutation.isPending || warnings.isPending || warnings.isError || blocksCompute}>
            <Calculator size={15} /> Compute
          </Button>
        )}
        {hasPermission(PERMISSIONS.PAYRUN_VALIDATE) && payrun.status === 'Computed' && (
          <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>
            <CheckCircle2 size={15} /> Validate
          </Button>
        )}
        {hasPermission(PERMISSIONS.PAYRUN_MARK_PAID) && payrun.status === 'Validated' && (
          <Button variant="success" onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending}>
            <IndianRupee size={15} /> Mark Paid
          </Button>
        )}
        {hasPermission(PERMISSIONS.PAYRUN_SEND) && (payrun.status === 'Validated' || payrun.status === 'Paid') && (
          <Button variant="outline" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
            <Send size={15} /> Email Payslips
          </Button>
        )}
        <div className="ml-auto text-sm text-muted">
          Total net: <span className="font-semibold text-foreground">₹{Number(payrun.total_net).toLocaleString()}</span>
        </div>
      </Card>
      {warnings.isError && <ErrorState message="Could not load payroll checks." onRetry={warnings.refetch} />}
      {warnings.data && <WarningBox employees={warnings.data.employees} />}
      {anyWarnings && (
        <div className="mb-4 flex items-start gap-2 rounded border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {blockingWarnings.length > 0 ? `${blockingWarnings.length} blocking issue(s) must be resolved before validation.` : 'Some payslips have non-blocking warnings.'}
            </p>
          </div>
        </div>
      )}

      <div className="o_list_view table-wrap">
        <table className="o_list_table pp-table">
          <thead>
            <tr><th>Employee</th><th>Contract</th><th>Worked Days</th><th>Basic</th><th>Gross</th><th>Net</th><th>Status</th><th>Warnings</th><th>Payslip</th></tr>
          </thead>
          <tbody>
            {payrun.payslips.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-foreground"><Link className="hover:text-primary" to={`/payroll/payslips/${p.id}`}>{p.employee_name}</Link></td>
                <td>{p.contract_id ? `#${p.contract_id}` : '—'}</td>
                <td>{p.worked_days}</td>
                <td>₹{Number(p.basic_amount).toLocaleString()}</td>
                <td>₹{Number(p.gross_amount).toLocaleString()}</td>
                <td className="font-medium text-foreground">₹{Number(p.net_amount).toLocaleString()}</td>
                <td><StatusBadge status={p.status} /></td>
                <td>
                  {(p.warning_messages || []).length > 0 && (
                    <span title={p.warning_messages.map((w) => w.message).join('\n')}>
                      <span className="text-warning">{p.warning_messages.map(w => w.message).join('; ')}</span>
                    </span>
                  )}
                </td>
                <td><Link className="text-primary hover:underline" to={`/payroll/payslips/${p.id}`}>Open / PDF</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
