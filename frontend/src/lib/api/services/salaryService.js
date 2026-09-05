import { apiClient } from '../client'
import { unwrapList, unwrapData } from '../normalizers'

export const salaryService = {
  structures: (params) => apiClient.get('/salary-structures', { params }).then(unwrapList),
  getStructure: (id) => apiClient.get(`/salary-structures/${id}`).then(unwrapData),
  createStructure: (payload) => apiClient.post('/salary-structures', payload).then(unwrapData),
  updateStructure: (id, payload) => apiClient.patch(`/salary-structures/${id}`, payload).then(unwrapData),

  rules: (params) => apiClient.get('/salary-rules', { params }).then(unwrapList),
  getRule: (id) => apiClient.get(`/salary-rules/${id}`).then(unwrapData),
  createRule: (payload) => apiClient.post('/salary-rules', payload).then(unwrapData),
  updateRule: (id, payload) => apiClient.patch(`/salary-rules/${id}`, payload).then(unwrapData),
}
