import { apiClient } from '../client'
import { unwrapList, unwrapData } from '../normalizers'

export const masterDataService = {
  departments: () => apiClient.get('/departments').then(unwrapList),
  createDepartment: (name) => apiClient.post('/departments', { name }).then(unwrapData),
  jobPositions: () => apiClient.get('/job-positions').then(unwrapList),
  createJobPosition: (name) => apiClient.post('/job-positions', { name }).then(unwrapData),
  employeeTypes: () => apiClient.get('/employee-types').then(unwrapList),
  createEmployeeType: (name) => apiClient.post('/employee-types', { name }).then(unwrapData),
}
