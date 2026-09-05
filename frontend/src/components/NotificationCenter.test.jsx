import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationCenter } from './NotificationCenter'
import { notificationService } from '../lib/api/services/notificationService'

vi.mock('../lib/api/services/notificationService', () => ({ notificationService: { inbox: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() } }))
let notes
beforeEach(() => {
  vi.clearAllMocks()
  notes = [{ id: 1, title: 'Payslip ready', body: 'June payslip', is_read: false }, { id: 2, title: 'Leave approved', is_read: false }]
  notificationService.inbox.mockImplementation(async ({ unread_only }) => ({ items: notes.filter(n => !unread_only || !n.is_read), unreadCount: notes.filter(n => !n.is_read).length, pagination: { page: 1, totalPages: 1 } }))
  notificationService.markRead.mockImplementation(async id => { notes = notes.map(n => n.id === id ? { ...n, is_read: true } : n) })
  notificationService.markAllRead.mockImplementation(async () => { notes = notes.map(n => ({ ...n, is_read: true })) })
})
function Harness() {
  const [open, setOpen] = useState(true)
  return <NotificationCenter user={{ id: 7 }} open={open} onToggle={() => setOpen(v => !v)} />
}
function mount() { return render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><Harness /></QueryClientProvider></MemoryRouter>) }

describe('Notification read workflow', () => {
  it('updates the badge after individual and all-read actions', async () => {
    mount()
    await screen.findByRole('button', { name: 'Notifications, 2 unread' })
    fireEvent.click(screen.getByRole('button', { name: 'Mark Payslip ready as read' }))
    await screen.findByRole('button', { name: 'Notifications, 1 unread' })
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await screen.findByRole('button', { name: 'Notifications', exact: true })
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Unread', exact: true }))
    await screen.findByText('All caught up')
    expect(notificationService.markAllRead).toHaveBeenCalledOnce()
  })
  it('does not clear unread state when saving fails', async () => {
    notificationService.markAllRead.mockRejectedValue(new Error('Connection failed'))
    mount()
    await screen.findByRole('button', { name: 'Notifications, 2 unread' })
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
  })
})
