/**
 * Central response-envelope unwrappers. Every backend response follows:
 *   success: { success: true, data, [pagination] }
 *   error:   { success: false, error: { code, message, fields } }
 * Axios throws on non-2xx, so these helpers only need to unwrap the 2xx shape;
 * error shape is read from error.response.data by the caller / query error handling.
 */

export function unwrapData(response) {
  return response.data?.data
}

export function unwrapList(response) {
  return response.data?.data ?? []
}

export function unwrapPage(response) {
  return {
    items: response.data?.data ?? [],
    pagination: response.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  }
}

export function unwrapVoid(response) {
  return response.data?.success ?? false
}

export function unwrapBlob(response) {
  return response.data
}

export function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  )
}

export function getErrorFields(error) {
  return error?.response?.data?.error?.fields || {}
}
