import { useAuth } from '../../lib/auth/AuthContext'
import { PERMISSIONS } from '../../lib/permissions/permissions'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, AlertTriangle } from 'lucide-react'
import { payrollService } from '../../lib/api/services/payrollService'
import { queryKeys } from '../../lib/queryKeys'
import { getErrorMessage } from '../../lib/api/normalizers'
import { Button, Card, CardHeader, CardBody, PageHeader, LoadingState, ErrorState, Badge, statusTone, StatusBar } from '../../components/ui'

export default function PayslipDetailPage() {
  const { payslipId } = useParams()
  const { hasPermission } = useAuth()
  const [downloading, setDownloading] = useState(false)

  const { data: payslip, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payslip(payslipId), queryFn: () => payrollService.getPayslip(payslipId),
  })

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await payrollService.downloadPayslipPdf(payslipId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip-${payslipId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) return <LoadingState />
  if (isError || !payslip) return <ErrorState onRetry={refetch} message="Could not load payslip." />

  return (
    <div className="o_form_view mx-auto max-w-3xl">
      <PageHeader
        title={`Payslip — ${payslip.employee_name}`}
        description={`${payslip.period_start} → ${payslip.period_end}`}
        actions={
          <>
            <Badge tone={statusTone(payslip.status)}>{payslip.status}</Badge>
            <Button onClick={handleDownload} disabled={downloading}>
              <Download size={15} /> {downloading ? 'Preparing…' : 'Download PDF'}
            </Button>
          </>
        }
      />
      <StatusBar value={payslip.status} steps={['Draft', 'Computed', 'Validated', 'Paid']} />

      {(payslip.warning_messages || []).length > 0 && (
        <div className="mb-4 space-y-2">
          {payslip.warning_messages.map((w, idx) => (
            <div key={idx} className={`flex items-start gap-2 rounded border p-3 text-sm ${w.severity === 'blocking' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-warning/40 bg-warning/10 text-warning'}`}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      <Card className="mb-4">
        <CardHeader>Summary</CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Item label="Employee" value={<Link className="text-primary hover:underline" to={`/employees/${payslip.employee_id}`}>{payslip.employee_name}</Link>} />
          {hasPermission(PERMISSIONS.PAYRUN_READ) && <Item label="Payrun" value={<Link className="text-primary hover:underline" to={`/payroll/payruns/${payslip.payrun_id}`}>Payrun #{payslip.payrun_id}</Link>} />}
          <Item label="Worked days" value={payslip.worked_days} />
          <Item label="Basic" value={`₹${Number(payslip.basic_amount).toLocaleString()}`} />
          <Item label="Gross" value={`₹${Number(payslip.gross_amount).toLocaleString()}`} />
          <Item label="Net" value={`₹${Number(payslip.net_amount).toLocaleString()}`} bold />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>Computation breakdown</CardHeader>
        <CardBody className="p-0">
          <div className="o_list_view table-wrap border-0">
            <table className="o_list_table pp-table">
              <thead><tr><th>Seq</th><th>Rule</th><th>Code</th><th>Category</th><th>Amount</th></tr></thead>
              <tbody>
                {payslip.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.sequence}</td><td>{l.name}</td><td>{l.code}</td>
                    <td><Badge tone="muted">{l.category}</Badge></td>
                    <td className="font-medium text-foreground">₹{Number(l.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function Item({ label, value, bold }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 ${bold ? 'text-lg font-semibold text-primary' : 'font-medium text-foreground'}`}>{value}</p>
    </div>
  )
}
