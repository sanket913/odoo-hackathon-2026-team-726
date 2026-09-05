import { describe, it, expect } from 'vitest'
import { PERMISSIONS } from './permissions'

describe('permission visibility', () => {
  it('exposes distinct permission codes matching backend naming', () => {
    expect(PERMISSIONS.PAYRUN_VALIDATE).toBe('payrun.validate')
    expect(PERMISSIONS.EMPLOYEE_READ_ALL).toBe('employee.read_all')
    expect(new Set(Object.values(PERMISSIONS)).size).toBe(Object.values(PERMISSIONS).length)
  })
})
