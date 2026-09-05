import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PayslipDownload } from './PayslipDownload'

it('offers a PDF download only for paid payslips', () => {
  const { rerender } = render(<PayslipDownload payslip={{ id: 1, employee_name: 'Alex', status: 'Draft' }} />)
  for (const status of ['Draft', 'Computed', 'Validated']) {
    rerender(<PayslipDownload payslip={{ id: 1, employee_name: 'Alex', status }} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  }
  rerender(<PayslipDownload payslip={{ id: 1, employee_name: 'Alex', status: 'Paid' }} />)
  expect(screen.getByRole('button', { name: 'Download PDF for Alex, payslip 1' })).toBeEnabled()
})
