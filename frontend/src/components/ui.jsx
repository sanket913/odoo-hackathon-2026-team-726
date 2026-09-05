import { Children, cloneElement, forwardRef, isValidElement, useEffect, useId, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, X, Users, FileText, Clock, CalendarDays, Wallet, ShieldCheck, BarChart3, Inbox, CircleAlert } from 'lucide-react'
import clsx from 'clsx'

export function Button({ variant = 'primary', size = 'md', className, as: As = 'button', ...props }) {
  return <As className={clsx('o_button', `o_button_${variant}`, `o_button_${size}`, className)} {...props} />
}
export function Card({ className, ...props }) {
  return <div className={clsx('o_card', className)} {...props} />
}
export function CardHeader({ className, ...props }) {
  return <div className={clsx('o_card_header', className)} {...props} />
}
export function CardBody({ className, ...props }) {
  return <div className={clsx('o_card_body', className)} {...props} />
}
export function Badge({ tone = 'default', className, children }) {
  return <span className={clsx('o_badge', `o_badge_${tone}`, className)}>{children}</span>
}
export function statusTone(status) {
  const map = {
    Active: 'success', Approved: 'success', Paid: 'success', Present: 'success', Computed: 'info',
    Validated: 'info', Draft: 'muted', 'To Approve': 'warning', Pending: 'warning', Late: 'warning',
    'Half-day': 'warning', Overtime: 'info', Expired: 'muted', Refused: 'danger', Rejected: 'danger',
    Absent: 'danger', 'Missing Checkout': 'danger',
  }
  return map[status] || 'default'
}
export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx('o_input', className)} {...props} />
})
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return <select ref={ref} className={clsx('o_input', className)} {...props}>{children}</select>
})
export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={clsx('o_input', className)} {...props} />
})
export function Label({ className, ...props }) {
  return <label className={clsx('o_label', className)} {...props} />
}
export function FieldError({ children, id }) {
  if (!children) return null
  return <p id={id} role="alert" className="mt-1 text-xs text-danger">{children}</p>
}
export function Field({ label, error, required, children }) {
  const id = useId()
  let controlId = id
  let linked = false
  const controls = Children.map(children, (child) => {
    if (!isValidElement(child) || linked || ![Input, Select, Textarea, 'input', 'select', 'textarea'].includes(child.type)) return child
    linked = true
    controlId = child.props.id || id
    return cloneElement(child, { id: controlId, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : child.props['aria-describedby'] })
  })
  return <div><Label htmlFor={controlId}>{label} {required && <span className="text-danger">*</span>}</Label>{controls}<FieldError id={`${id}-error`}>{error}</FieldError></div>
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="pp-feedback pp-feedback-loading flex flex-col items-center justify-center gap-2 py-16 text-muted" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="pp-feedback flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="pp-feedback-icon"><Inbox size={24} aria-hidden="true" /></span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="pp-feedback pp-feedback-error flex flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
      <span className="pp-feedback-icon"><CircleAlert size={24} aria-hidden="true" /></span>
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    const focusable = () => [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length)
    ;(focusable()[0] || dialog).focus()
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current() }
      if (event.key !== 'Tab') return
      const elements = focusable()
      const first = elements[0], last = elements[elements.length - 1]
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    dialog.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; dialog.removeEventListener('keydown', onKey); previous?.focus() }
  }, [open])
  if (!open) return null
  return <div className="o_modal_backdrop">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={clsx('o_modal', wide && 'o_modal_wide')}>
      <div className="o_modal_header"><h3 id={titleId}>{title}</h3><button type="button" aria-label="Close dialog" onClick={onClose} className="o_button o_button_ghost"><X size={16} /></button></div>
      <div className="o_modal_body">{children}</div>
    </div>
  </div>
}

const routeLabels = { employees: 'Employees', contracts: 'Contracts', attendance: 'Attendance', schedules: 'Working Schedules', 'time-off': 'Time Off', requests: 'Requests', allocations: 'Allocations', types: 'Types', payroll: 'Payroll', payruns: 'Payruns', payslips: 'Payslips', 'salary-structures': 'Salary Structures', 'salary-rules': 'Salary Rules', dashboard: 'Dashboard', admin: 'Administration', users: 'Users', reports: 'Reports', new: 'New', edit: 'Edit', departments: 'Departments', 'audit-logs': 'Audit Logs' }
export function PageHeader({ title, description, actions }) {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const ModuleIcon = ({ employees: Users, departments: Users, contracts: FileText, attendance: Clock, schedules: Clock, 'time-off': CalendarDays, payroll: Wallet, admin: ShieldCheck, reports: BarChart3 })[parts[0]] || FileText
  return <div className="o_control_panel">
    <div className="o_control_panel_heading">
      <nav aria-label="Breadcrumb" className="o_breadcrumbs">
        {parts.map((part, index) => {
          const label = routeLabels[part] || `Record ${part}`
          const path = '/' + parts.slice(0, index + 1).join('/')
          const canLink = index < parts.length - 1 && !['/payroll', '/time-off', '/admin'].includes(path)
          return <span key={path} className="inline-flex items-center gap-1">{index > 0 && <ChevronRight size={11} />}{canLink ? <Link to={path}>{label}</Link> : <span aria-current={index === parts.length - 1 ? 'page' : undefined}>{label}</span>}</span>
        })}
      </nav>
      <div className="pp-page-title"><span className="pp-page-icon"><ModuleIcon size={23} aria-hidden="true" /></span><h1>{title}</h1></div>
      {description && <p className="o_control_panel_description">{description}</p>}
    </div>
    {actions && <div className="o_control_panel_actions">{actions}</div>}
  </div>
}

export function StatusBar({ value, steps, label = 'Workflow status' }) {
  const visibleSteps = steps.includes(value) ? steps : [...steps, value]
  return <ol className="o_statusbar" aria-label={label}>{visibleSteps.map((step, index) => <li key={step} className="o_status_step" aria-current={value === step ? 'step' : undefined}>{index > 0 && <ChevronRight size={12} aria-hidden="true" />}{step}</li>)}</ol>
}

export function SmartButton({ icon: Icon, label, count, active, onClick }) {
  return <button type="button" className="o_smart_button" aria-pressed={active} onClick={onClick}><Icon size={20} className="text-primary" /><span><span className="o_smart_value block">{count}</span><span className="text-xs text-muted">{label}</span></span></button>
}
