import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Users, FileText, Clock, CalendarDays, Wallet, LayoutDashboard, Settings, ClipboardList, BarChart3, ChevronRight, Layers3 } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'
import { PERMISSIONS } from '../lib/permissions/permissions'
import { OdooTopBar } from './OdooTopBar'

const navItems = [
  { to: '/employees', label: 'Employees', icon: Users, permission: PERMISSIONS.EMPLOYEE_READ_SELF },
  { to: '/contracts', label: 'Contracts', icon: FileText, permission: PERMISSIONS.CONTRACT_READ },
  { to: '/attendance', label: 'Attendance', icon: Clock, permission: PERMISSIONS.ATTENDANCE_READ_SELF },
]

const timeOffItems = [
  { to: '/time-off/requests', label: 'Requests' },
  { to: '/time-off/allocations', label: 'Allocations', permission: PERMISSIONS.TIMEOFF_READ_ALL },
  { to: '/time-off/types', label: 'Types' },
]

const payrollItems = [
  { to: '/payroll/payruns', label: 'Payruns', permission: PERMISSIONS.PAYRUN_READ },
  { to: '/payroll/payslips', label: 'Payslips', permission: PERMISSIONS.PAYSLIP_READ_SELF },
  { to: '/payroll/salary-structures', label: 'Salary Structures', permission: PERMISSIONS.SALARY_STRUCTURE_READ },
  { to: '/payroll/salary-rules', label: 'Salary Rules', permission: PERMISSIONS.SALARY_RULE_READ },
]

export function Layout() {
  const { user, logout, hasAnyPermission } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const visibleNav = navItems.filter(i => !i.permission || hasAnyPermission([i.permission]))
  const canSeeDashboard = hasAnyPermission([PERMISSIONS.DASHBOARD_READ])
  const canSeeAdmin = hasAnyPermission([PERMISSIONS.USER_MANAGE])
  const handleLogout = async () => { await logout(); navigate('/login') }
  useEffect(() => { setMobileOpen(false); setNotifOpen(false) }, [pathname])
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = event => { if (event.key === 'Escape') { setMobileOpen(false); document.querySelector('[aria-controls="app-navigation"]')?.focus() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])
  const context = pathname.startsWith('/payroll') ? 'Payroll' : pathname.startsWith('/time-off') ? 'Time Off' : pathname.startsWith('/admin') ? 'Administration' : pathname.startsWith('/schedules') ? 'Working Schedules' : pathname.split('/')[1]?.replace(/^./, c => c.toUpperCase())
  const renderLink = (item, Icon = item.icon || FileText) => <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `o_nav_link${isActive ? ' active' : ''}`}><span className="pp-sidebar-icon"><Icon size={16} aria-hidden="true" /></span><span className="pp-sidebar-label">{item.label}</span><ChevronRight size={12} className="pp-sidebar-arrow" aria-hidden="true" /></NavLink>
  return <div className="o_app min-h-screen bg-background">
    <a href="#main-content" className="o_skip_link">Skip to content</a>
    <OdooTopBar user={user} context={context} mobileOpen={mobileOpen} onToggleMenu={() => setMobileOpen(v => !v)} notifOpen={notifOpen} onToggleNotifications={() => setNotifOpen(v => !v)} onLogout={handleLogout} />
    {mobileOpen && <button type="button" tabIndex={-1} className="o_sidebar_backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside id="app-navigation" className={`o_sidebar${mobileOpen ? ' is_open' : ''}`}>
      <div className="pp-sidebar-heading"><Layers3 size={19} aria-hidden="true" /><div><strong>Workspace</strong><span>People, connected.</span></div></div>
      <nav aria-label="Main navigation">
        {canSeeDashboard && renderLink({ to: '/payroll/dashboard', label: 'Dashboard' }, LayoutDashboard)}
        <p className="o_nav_section">People</p>
        {visibleNav.map(item => renderLink(item))}
        {renderLink({ to: '/departments', label: 'Departments' }, Users)}
        {hasAnyPermission([PERMISSIONS.SCHEDULE_READ]) && renderLink({ to: '/schedules', label: 'Working Schedules' }, Clock)}
        <p className="o_nav_section">Time Off</p>
        {timeOffItems.filter(item => !item.permission || hasAnyPermission([item.permission])).map(item => renderLink(item, CalendarDays))}
        {payrollItems.some(i => !i.permission || hasAnyPermission([i.permission])) && <p className="o_nav_section">Payroll</p>}
        {payrollItems.filter(i => !i.permission || hasAnyPermission([i.permission])).map(item => renderLink(item, item.label === 'Payruns' ? ClipboardList : Wallet))}
        {(canSeeDashboard || canSeeAdmin) && <p className="o_nav_section">Reporting & configuration</p>}
        {canSeeDashboard && renderLink({ to: '/reports', label: 'Reports' }, BarChart3)}
        {canSeeAdmin && renderLink({ to: '/admin/audit-logs', label: 'Audit Logs' }, ClipboardList)}
        {canSeeAdmin && renderLink({ to: '/admin/users', label: 'Users & Roles' }, Settings)}
      </nav>
    </aside>
    <main id="main-content" tabIndex={-1} className="o_content" data-workspace={pathname.split('/')[1]}><Outlet /></main>
  </div>
}
