import { Brand } from '../components/Brand'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../lib/auth/AuthContext'
import { Button, Input, Label } from '../components/ui'
import { getErrorMessage } from '../lib/api/normalizers'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Users, CalendarCheck2, Wallet, ShieldCheck, AlertCircle, LoaderCircle } from 'lucide-react'
import '../styles/login.css'

const DEMO_ACCOUNTS = [
  { label: 'Employee', email: 'employee@peoplepay360.com', password: 'Employee@123' },
  { label: 'HR Manager', email: 'hr.manager@peoplepay360.com', password: 'Hr@12345' },
  { label: 'HR Payroll User', email: 'payroll.user@peoplepay360.com', password: 'Payroll@123' },
  { label: 'HR Payroll Manager', email: 'payroll.manager@peoplepay360.com', password: 'Payroll@123' },
  { label: 'Admin', email: 'admin@peoplepay360.com', password: 'Admin@123' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const from = location.state?.from?.pathname || '/employees'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password)
      toast.success('Signed in successfully')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.code === 'ERR_NETWORK' || err.response?.status === 502
        ? "We couldn't reach PeoplePay360. Please check your connection and try again."
        : getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (account) => {
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  return (
    <main className="pp_auth">
      <Link to="/" className="pp_auth_back">← Back to PeoplePay360</Link>
      <div className="pp_auth_shell">
        <section className="pp_auth_story" aria-label="About PeoplePay360">
          <Brand inverse />
          <div className="pp_auth_story_body">
            <span className="pp_auth_eyebrow">A better everyday at work</span>
            <h1>Great work <br />starts with <br /><span>your people.</span></h1>
            <p>Less time on paperwork.<br />More time for the people who make it happen.</p>
            <div className="pp_auth_features">
              <div><span><Users size={19} /></span><div><strong>People, connected</strong><p>Employee records and contracts together.</p></div></div>
              <div><span><CalendarCheck2 size={19} /></span><div><strong>Every day, organised</strong><p>Attendance, schedules and time off.</p></div></div>
              <div><span><Wallet size={19} /></span><div><strong>Payroll, in focus</strong><p>From payruns to individual payslips.</p></div></div>
            </div>
          </div>
          <div className="pp_auth_story_footer"><span className="pp_auth_dot" />Your team's everyday workspace</div>
          <div className="pp_auth_rings" aria-hidden="true" />
        </section>

        <section className="pp_auth_form_panel" aria-labelledby="signin-title">
          <div className="pp_auth_form_heading"><span className="pp_auth_lock"><LockKeyhole size={22} /></span><span className="pp_auth_workspace">Workspace sign in</span></div>
          <h2 id="signin-title">Hello again<span>.</span></h2>
          <p className="pp_auth_intro">Good to have you here. Let’s get you signed in.</p>

          <form onSubmit={handleSubmit} className="pp_auth_form" aria-busy={submitting}>
            <div>
              <Label htmlFor="login-email">Email address</Label>
              <Input id="login-email" autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" disabled={submitting} />
            </div>
            <div>
              <Label htmlFor="login-password">Password</Label>              <div className="pp_auth_password"><Input id="login-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" disabled={submitting} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </div>
            {error && <div role="alert" className="pp_auth_error"><AlertCircle size={17} /><span>{error}</span></div>}
            <Button type="submit" className="pp_auth_submit" disabled={submitting}>
              {submitting ? <><LoaderCircle size={17} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={17} /></>}
            </Button>
          </form>

          <p className="pp_auth_help"><ShieldCheck size={16} />Accounts are managed by your administrator.</p>
          <div className="pp_auth_demo">
            <div className="pp_auth_demo_heading"><span>Explore a demo account</span><span className="pp_auth_dev_badge">Development</span></div>
            <p>Select a role to fill in its demo credentials.</p>
            <div className="pp_auth_demo_roles">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fillDemo(a)}
                  disabled={submitting}
                  aria-pressed={email === a.email}
                  className="pp_auth_demo_role"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
      <footer className="pp_auth_footer">PeoplePay360 <span aria-hidden="true">·</span> People first. Every workday.</footer>
    </main>
  )
}
