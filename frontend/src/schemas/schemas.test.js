import { describe, it, expect } from 'vitest'
import { employeeSchema } from './employeeSchema'
import { contractSchema } from './contractSchema'

describe('employeeSchema validation', () => {
  it('rejects a missing name and invalid email', () => {
    const result = employeeSchema.safeParse({ name: '', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts a minimally valid employee', () => {
    const result = employeeSchema.safeParse({ name: 'Jane Doe', email: 'jane@example.com' })
    expect(result.success).toBe(true)
  })
})

describe('contractSchema validation', () => {
  it('rejects a zero or negative wage', () => {
    const result = contractSchema.safeParse({
      employee_id: 1, reference: 'CTR-1', start_date: '2026-01-01', wage: 0, status: 'Active',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a missing employee_id', () => {
    const result = contractSchema.safeParse({
      employee_id: '', reference: 'CTR-1', start_date: '2026-01-01', wage: 1000, status: 'Active',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid contract payload', () => {
    const result = contractSchema.safeParse({
      employee_id: 1, reference: 'CTR-1', start_date: '2026-01-01', wage: 40000, status: 'Active',
    })
    expect(result.success).toBe(true)
  })
})
