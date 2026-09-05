import { apiClient } from '../client'
import { unwrapPage, unwrapData } from '../normalizers'

export const contractService = {
  list: (params) => apiClient.get('/contracts', { params }).then(unwrapPage),
  get: (id) => apiClient.get(`/contracts/${id}`).then(unwrapData),
  create: (payload) => apiClient.post('/contracts', payload).then(unwrapData),
  update: (id, payload) => apiClient.patch(`/contracts/${id}`, payload).then(unwrapData),
  applicable: (employeeId, periodStart, periodEnd) =>
    apiClient
      .get('/contracts/applicable', { params: { employeeId, periodStart, periodEnd } })
      .then(unwrapData),
}
