import { NotificationCenter } from './NotificationCenter'

import { LogOut, Menu, X } from 'lucide-react'
import { Brand } from './Brand'
import { AttendanceWidget } from './AttendanceWidget'

export function OdooTopBar({ user, context, mobileOpen, onToggleMenu, notifOpen, onToggleNotifications, onLogout }) {
  return <header className="o_topbar">
    <button type="button" className="o_topbar_button o_mobile_toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="app-navigation" onClick={onToggleMenu}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
    <Brand to="/employees" className="o_brand" inverse />
    <span className="o_module_context">{context}</span>
    <div className="o_topbar_actions">
      <AttendanceWidget />
      <NotificationCenter user={user} open={notifOpen} onToggle={onToggleNotifications} />
      <span className="o_user_avatar" aria-hidden="true">{user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
      <span className="o_user_name" title={user?.roles?.join(', ')}>{user?.full_name}</span>
      <button type="button" className="o_topbar_button" onClick={onLogout} aria-label="Logout"><LogOut size={16} /><span className="hidden sm:inline text-xs">Logout</span></button>
    </div>
  </header>
}
