import { apiClient } from '../client'
import { unwrapPage, unwrapData, unwrapList } from '../normalizers'

export const userService = {
  list: (params) => apiClient.get('/users', { params }).then(unwrapPage),
  get: (id) => apiClient.get(`/users/${id}`).then(unwrapData),
  create: (payload) => apiClient.post('/users', payload).then(unwrapData),
  update: (id, payload) => apiClient.patch(`/users/${id}`, payload).then(unwrapData),
  updateRoles: (id, role_names) => apiClient.patch(`/users/${id}/roles`, { role_names }).then(unwrapData),
  roles: () => apiClient.get('/roles').then(unwrapList),
  permissions: () => apiClient.get('/permissions').then(unwrapList),
}
