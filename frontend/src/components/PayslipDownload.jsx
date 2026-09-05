import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { payrollService } from '../lib/api/services/payrollService'
import { getErrorMessage } from '../lib/api/normalizers'
import { Button } from './ui'

export function PayslipDownload({ payslip }) {
  const [pending, setPending] = useState(false)
  if (payslip.status !== 'Paid') return null
  const download = async () => {
    if (pending) return
    setPending(true)
    let url
    try {
      const blob = await payrollService.downloadPayslipPdf(payslip.id)
      url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payslip-${payslip.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      if (error?.response?.data instanceof Blob) {
        try { error.response.data = JSON.parse(await error.response.data.text()) } catch { /* Keep the original error if the response is not JSON. */ }
      }
      toast.error(getErrorMessage(error))
    } finally {
      if (url) URL.revokeObjectURL(url)
      setPending(false)
    }
  }
  return <Button variant="outline" size="sm" onClick={download} disabled={pending} aria-label={`Download PDF for ${payslip.employee_name}, payslip ${payslip.id}`}><Download size={14} aria-hidden="true" />{pending ? 'Preparing...' : 'Download PDF'}</Button>
}
