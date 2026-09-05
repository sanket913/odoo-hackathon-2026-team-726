import { apiClient } from '../client'
import { unwrapPage } from '../normalizers'

export const auditService = {
  list: params => apiClient.get('/audit-logs', { params }).then(unwrapPage),
  employee: (id, params) => apiClient.get(`/employees/${id}/audit-log`, { params }).then(unwrapPage),
}
