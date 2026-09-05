import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { notificationService } from '../lib/api/services/notificationService'
import { getErrorMessage } from '../lib/api/normalizers'
import '../styles/notifications.css'

export function NotificationCenter({ user, open, onToggle }) {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const root = useRef(null)
  const bell = useRef(null)
  const client = useQueryClient()
  const navigate = useNavigate()
  const query = useInfiniteQuery({
    queryKey: ['notifications', user?.id, unreadOnly],
    queryFn: ({ pageParam }) => notificationService.inbox({ page: pageParam, limit: 20, unread_only: unreadOnly }),
    initialPageParam: 1,
    getNextPageParam: last => last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
    enabled: !!user?.id,
    refetchInterval: 30000,
  })
  const count = query.data?.pages[0]?.unreadCount ?? 0
  const notes = query.data?.pages.flatMap(page => page.items) ?? []
  const refresh = () => client.invalidateQueries({ queryKey: ['notifications', user?.id] })
  const read = useMutation({ mutationFn: notificationService.markRead, onSuccess: refresh, onError: error => toast.error(getErrorMessage(error)) })
  const readAll = useMutation({ mutationFn: notificationService.markAllRead, onSuccess: refresh, onError: error => toast.error(getErrorMessage(error)) })
  const busy = read.isPending || readAll.isPending
  useEffect(() => {
    if (!open) return
    const close = event => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') { onToggle(); bell.current?.focus() }
      } else if (!root.current?.contains(event.target)) onToggle()
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [open, onToggle])
  async function openNote(note) {
    if (!note.is_read) {
      try { await read.mutateAsync(note.id) } catch { return }
    }
    if (note.link?.startsWith('/') && !note.link.startsWith('//') && !note.link.includes('\\')) {
      onToggle()
      navigate(note.link)
    }
  }
  return <div className="relative" ref={root}>
    <button ref={bell} type="button" className="o_topbar_button" aria-label={`Notifications${count ? `, ${count} unread` : ''}`} aria-expanded={open} aria-controls="notifications-panel" onClick={onToggle}><Bell size={18} />{count > 0 && <span className="o_notification_count">{count > 99 ? '99+' : count}</span>}</button>
    {open && <section id="notifications-panel" aria-label="Notifications" className="o_notifications pp-notifications">
      <div className="pp-notification-header"><div><h2>Notifications</h2><p>{count ? `${count} unread updates` : "You're all caught up"}</p></div><button type="button" aria-label="Close notifications" onClick={() => { onToggle(); bell.current?.focus() }}><X size={18} /></button></div>
      <div className="pp-notification-toolbar"><div role="group" aria-label="Notification filter"><button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</button></div><button type="button" className="pp-read-all" disabled={!count || busy || query.isError} onClick={() => readAll.mutate()}><CheckCheck size={15} />{readAll.isPending ? 'Marking read...' : 'Mark all as read'}</button></div>
      <div className="pp-notification-list" aria-busy={query.isFetching || busy}>
        {query.isPending ? <p className="pp-notification-empty" role="status">Loading notifications...</p> : query.isError ? <div className="pp-notification-empty" role="alert"><p>Could not load notifications.</p><button type="button" onClick={() => query.refetch()}>Try again</button></div> : <>
          {!notes.length && <div className="pp-notification-empty"><CheckCheck size={28} /><strong>{unreadOnly ? 'All caught up' : 'No notifications yet'}</strong><p>{unreadOnly ? 'New unread updates will appear here.' : 'Your HR and payroll updates will appear here.'}</p></div>}
          {notes.map(note => <article key={note.id} className={`pp-notification-item ${note.is_read ? '' : 'is-unread'}`}>
            <button type="button" className="pp-notification-content" disabled={busy} onClick={() => openNote(note)}><span className="pp-notification-title">{!note.is_read && <span className="pp-unread-dot" aria-label="Unread" />}{note.title}</span><span className="pp-notification-body">{note.body}</span><span className="pp-notification-meta">{note.category || 'Update'}{note.created_at && <> · <time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></>}</span></button>
            {!note.is_read && <button type="button" className="pp-notification-read" aria-label={`Mark ${note.title} as read`} title="Mark as read" disabled={busy} onClick={() => read.mutate(note.id)}><Check size={16} /></button>}
          </article>)}
          {query.hasNextPage && <button type="button" className="pp-notification-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading...' : 'Load more'}</button>}
        </>}
      </div>
    </section>}
  </div>
}
