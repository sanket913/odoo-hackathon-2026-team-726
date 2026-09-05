import { apiClient } from '../client'
import { unwrapPage, unwrapData } from '../normalizers'

export const scheduleService = {
  list: (params) => apiClient.get('/schedules', { params }).then(unwrapPage),
  get: (id) => apiClient.get(`/schedules/${id}`).then(unwrapData),
  create: (payload) => apiClient.post('/schedules', payload).then(unwrapData),
  update: (id, payload) => apiClient.patch(`/schedules/${id}`, payload).then(unwrapData),
}
