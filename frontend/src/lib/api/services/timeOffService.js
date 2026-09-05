import { apiClient } from '../client'
import { unwrapList, unwrapData, unwrapPage } from '../normalizers'

export const timeOffService = {
  types: (params) => apiClient.get('/time-off/types', { params }).then(unwrapList),
  createType: (payload) => apiClient.post('/time-off/types', payload).then(unwrapData),
  updateType: (id, payload) => apiClient.patch(`/time-off/types/${id}`, payload).then(unwrapData),

  allocations: (params) => apiClient.get('/time-off/allocations', { params }).then(unwrapPage),
  getAllocation: id => apiClient.get(`/time-off/allocations/${id}`).then(unwrapData),
  createAllocation: (payload) => apiClient.post('/time-off/allocations', payload).then(unwrapData),
  approveAllocation: (id) => apiClient.post(`/time-off/allocations/${id}/approve`).then(unwrapData),
  refuseAllocation: (id) => apiClient.post(`/time-off/allocations/${id}/refuse`).then(unwrapData),

  requests: (params) => apiClient.get('/time-off/requests', { params }).then(unwrapPage),
  getRequest: (id) => apiClient.get(`/time-off/requests/${id}`).then(unwrapData),
  createRequest: (payload) => apiClient.post('/time-off/requests', payload).then(unwrapData),
  approveRequest: (id, hr_comment) => apiClient.post(`/time-off/requests/${id}/approve`, { hr_comment }).then(unwrapData),
  refuseRequest: (id, hr_comment) => apiClient.post(`/time-off/requests/${id}/refuse`, { hr_comment }).then(unwrapData),
}
