import { apiClient } from '../client'
import { unwrapPage, unwrapData, unwrapList } from '../normalizers'

export const employeeService = {
  list: async (params = {}) => {
    const requested = params.limit || 20
    const first = await apiClient.get('/employees', { params: { ...params, limit: Math.min(requested, 100) } }).then(unwrapPage)
    if (requested <= 100) return first
    const items = [...first.items]
    for (let page = (params.page || 1) + 1; page <= first.pagination.totalPages && items.length < requested; page++) {
      const next = await apiClient.get('/employees', { params: { ...params, page, limit: 100 } }).then(unwrapPage)
      items.push(...next.items)
    }
    return { ...first, items: items.slice(0, requested) }
  },
  get: (id) => apiClient.get(`/employees/${id}`).then(unwrapData),
  create: (payload) => apiClient.post('/employees', payload).then(unwrapData),
  update: (id, payload) => apiClient.patch(`/employees/${id}`, payload).then(unwrapData),
  archive: (id) => apiClient.post(`/employees/${id}/archive`).then(unwrapData),
  contracts: (id) => apiClient.get(`/employees/${id}/contracts`).then(unwrapList),
  attendance: (id) => apiClient.get(`/employees/${id}/attendance`).then(unwrapList),
  timeOff: (id) => apiClient.get(`/employees/${id}/time-off`).then(unwrapList),
  allocations: (id) => apiClient.get(`/employees/${id}/allocations`).then(unwrapList),
}
