import { apiClient } from '../client'
import { unwrapList, unwrapData } from '../normalizers'

export const notificationService = {
  inbox: params => apiClient.get('/notifications', { params }).then(response => ({ items: response.data.data, pagination: response.data.pagination, unreadCount: response.data.unread_count })),
  list: (params) => apiClient.get('/notifications', { params }).then(unwrapList),
  markRead: (id) => apiClient.post(`/notifications/${id}/read`).then(unwrapData),
  markAllRead: () => apiClient.post('/notifications/read-all').then(unwrapData),
}
