import { apiClient } from '../client'
import { unwrapData } from '../normalizers'

export const dashboardService = {
  // Live Salary Burn
  salaryBurn: (params) => apiClient.get('/dashboard/salary-burn-live', { params }).then(unwrapData),
  payroll: (params) => apiClient.get('/dashboard/payroll', { params }).then(unwrapData),
}
