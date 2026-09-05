import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AttendanceHoursSummary } from './AttendanceHoursSummary'

describe('Single-pair attendance breakdown', () => {
  it('distinguishes elapsed time, scheduled breaks and net work', () => {
    render(<AttendanceHoursSummary record={{ check_out: '2026-09-07T12:30:00Z', gross_hours: '9', break_hours: '1', worked_hours: '8', break_allowance_hours: '1', break_source: 'Scheduled' }} />)
    expect(screen.getByText('9.00 h')).toBeInTheDocument()
    expect(screen.getByText('1.00 h')).toBeInTheDocument()
    expect(screen.getByText('8.00 h')).toBeInTheDocument()
    expect(screen.getByText(/not a measured break/)).toBeInTheDocument()
  })
  it('explains that checkout ends the day rather than starting a break', () => {
    render(<AttendanceHoursSummary record={{ check_in: '2026-09-07T03:30:00Z', break_source: 'Scheduled', break_allowance_hours: '1' }} />)
    expect(screen.getByText(/not when starting a break/)).toBeInTheDocument()
    expect(screen.queryByText('Net working time')).not.toBeInTheDocument()
  })
})
