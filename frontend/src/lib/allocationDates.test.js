import { describe, it, expect } from 'vitest'
import { endFromDays, daysFromDates } from './allocationDates'

describe('Inclusive allocation date calculation', () => {
  it('counts the start date and crosses month and year boundaries', () => {
    expect(endFromDays('2026-09-10', '5')).toBe('2026-09-14')
    expect(endFromDays('2026-12-31', '2')).toBe('2027-01-01')
    expect(daysFromDates('2028-02-28', '2028-03-01')).toBe('3')
    expect(daysFromDates('2026-09-10', '2026-09-10')).toBe('1')
  })
  it('supports half days without creating an extra calendar date', () => {
    expect(endFromDays('2026-09-10', '0.5')).toBe('2026-09-10')
    expect(endFromDays('2026-09-10', '1.5')).toBe('2026-09-11')
  })
  it('does not calculate invalid or incomplete input', () => {
    for (const value of ['', '0', '-1', 'NaN', '0.3']) expect(endFromDays('2026-09-10', value)).toBe('')
    expect(daysFromDates('2026-09-11', '2026-09-10')).toBe('')
    expect(daysFromDates('', '2026-09-10')).toBe('')
    expect(endFromDays('2026-02-30', '1')).toBe('')
  })
})
