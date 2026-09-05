import { describe, it, expect } from 'vitest'
import { unwrapData, unwrapList, unwrapPage, getErrorMessage, getErrorFields } from './normalizers'

describe('response envelope normalizers', () => {
  it('unwraps a success data envelope', () => {
    expect(unwrapData({ data: { success: true, data: { id: 1 } } })).toEqual({ id: 1 })
  })

  it('unwraps a list envelope, defaulting to an empty array', () => {
    expect(unwrapList({ data: { success: true, data: [1, 2, 3] } })).toEqual([1, 2, 3])
    expect(unwrapList({ data: {} })).toEqual([])
  })

  it('unwraps a paginated envelope', () => {
    const result = unwrapPage({ data: { success: true, data: [{ id: 1 }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } })
    expect(result.items).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })

  it('extracts a human-readable error message', () => {
    const err = { response: { data: { error: { message: 'Validation failed', fields: { email: 'required' } } } } }
    expect(getErrorMessage(err)).toBe('Validation failed')
    expect(getErrorFields(err)).toEqual({ email: 'required' })
  })

  it('falls back to a generic error message', () => {
    expect(getErrorMessage({})).toBe('Something went wrong. Please try again.')
  })
})
