import { apiClient } from '../client'
import { unwrapData } from '../normalizers'

export const authService = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }).then(unwrapData),
  me: () => apiClient.get('/auth/me').then(unwrapData),
  refresh: () => apiClient.post('/auth/refresh', {}).then(unwrapData),
  logout: () => apiClient.post('/auth/logout', {}).then(unwrapData),
}
