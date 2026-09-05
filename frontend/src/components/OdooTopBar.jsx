import { NotificationCenter } from './NotificationCenter'

import { LogOut, Menu, X, Layers3, ChevronRight } from 'lucide-react'
import { Brand } from './Brand'
import { AttendanceWidget } from './AttendanceWidget'

export function OdooTopBar({ user, context, mobileOpen, onToggleMenu, notifOpen, onToggleNotifications, onLogout }) {
  return <header className="o_topbar">
    <button type="button" className="o_topbar_button o_mobile_toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="app-navigation" onClick={onToggleMenu}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
    <Brand to="/employees" className="o_brand" inverse />
    <div className="o_module_context pp-nav-context"><span className="pp-nav-context-icon"><Layers3 size={17} aria-hidden="true" /></span><div><span className="pp-nav-eyebrow">YOUR WORKSPACE</span><span className="pp-nav-module">{context}<ChevronRight size={12} aria-hidden="true" /></span></div></div>
    <div className="o_topbar_actions">
      <AttendanceWidget />
      <NotificationCenter user={user} open={notifOpen} onToggle={onToggleNotifications} />
      <div className="pp-nav-account"><span className="o_user_avatar" aria-hidden="true">{user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('')}</span><div className="pp-nav-identity"><span className="o_user_name">{user?.full_name}</span><span className="pp-nav-role" title={user?.roles?.join(', ')}>{user?.roles?.join(' / ')}</span></div></div>
      <button type="button" className="o_topbar_button pp-nav-logout" onClick={onLogout} aria-label="Logout" title="Sign out"><LogOut size={17} /><span className="hidden sm:inline text-xs">Logout</span></button>
    </div>
  </header>
}
