import { apiClient } from '../client'
import { unwrapPage, unwrapData } from '../normalizers'

export const attendanceService = {
  selfStatus: () => apiClient.get('/attendance/self-status').then(unwrapData),
  list: (params) => apiClient.get('/attendance', { params }).then(unwrapPage),
  get: (id) => apiClient.get(`/attendance/${id}`).then(unwrapData),
  create: (payload) => apiClient.post('/attendance', payload).then(unwrapData),
  update: (id, payload) => apiClient.patch(`/attendance/${id}`, payload).then(unwrapData),
  // Attendance Geofence
  checkIn: (coordinates = {}) => apiClient.post('/attendance/check-in', coordinates).then(unwrapData),
  checkOut: () => apiClient.post('/attendance/check-out', {}).then(unwrapData),
}
