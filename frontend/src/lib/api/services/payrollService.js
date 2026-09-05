import { apiClient } from '../client'
import { unwrapPage, unwrapData, unwrapBlob } from '../normalizers'

export const payrollService = {
  warnings: (id) => apiClient.get(`/payruns/${id}/validation-warnings`).then(unwrapData),
  wizardEligibility: (payload) => apiClient.post('/payruns/wizard/eligibility', payload).then(unwrapData),
  createPayrun: (payload) => apiClient.post('/payruns', payload).then(unwrapData),
  listPayruns: (params) => apiClient.get('/payruns', { params }).then(unwrapPage),
  getPayrun: (id) => apiClient.get(`/payruns/${id}`).then(unwrapData),
  compute: (id) => apiClient.post(`/payruns/${id}/compute`).then(unwrapData),
  validate: (id) => apiClient.post(`/payruns/${id}/validate`).then(unwrapData),
  markPaid: (id) => apiClient.post(`/payruns/${id}/mark-paid`).then(unwrapData),
  sendPayslips: (id) => apiClient.post(`/payruns/${id}/send-payslips`).then(unwrapData),

  listPayslips: (params) => apiClient.get('/payslips', { params }).then(unwrapPage),
  getPayslip: (id) => apiClient.get(`/payslips/${id}`).then(unwrapData),
  downloadPayslipPdf: (id) =>
    apiClient.get(`/payslips/${id}/pdf`, { responseType: 'blob' }).then(unwrapBlob),
}
