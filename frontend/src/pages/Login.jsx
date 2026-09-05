import { Brand } from '../components/Brand'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth/AuthContext'
import { Button, Input, Label } from '../components/ui'
import { getErrorMessage } from '../lib/api/normalizers'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Users, CalendarCheck2, Wallet, ShieldCheck, AlertCircle, LoaderCircle } from 'lucide-react'
import '../styles/login.css'
import '../styles/login-depth.css'
import '../styles/login-pass.css'

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
  const [signedIn, setSignedIn] = useState(false)
  const successRef = useRef(null)

  const from = location.state?.from?.pathname || '/employees'

  useEffect(() => {
    if (!signedIn) return
    successRef.current?.focus()
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 1700
    const timer = window.setTimeout(() => navigate(from, { replace: true }), delay)
    return () => window.clearTimeout(timer)
  }, [signedIn, navigate, from])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password)
      setSignedIn(true)
    } catch (err) {
      setError(err.code === 'ERR_NETWORK' || err.response?.status === 502
        ? "We couldn't reach PeoplePay360. Please check your connection and try again."
        : getErrorMessage(err))
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
      <div className="pp_auth_shell" {...(signedIn ? { inert: '' } : {})}>
        <section className="pp_auth_story" aria-label="About PeoplePay360">
          <Brand inverse />
          <div className="pp_auth_pass_intro">
            <span className="pp_auth_pass_eyebrow">YOUR WORKSPACE AWAITS</span>
            <h1>Your people.<br />Your place.<br /><em>All connected.</em></h1>
            <p>One sign-in to your everyday.<br />People, time and payroll, connected.</p>
          </div>
          <div className="pp_auth_pass_scene" aria-hidden="true">
            <div className="pp_auth_pass_halo" />
            <div className="pp_auth_pass_card">
              <div className="pp_auth_pass_slot" />
              <div className="pp_auth_pass_top"><span>PEOPLEPAY360</span><ShieldCheck size={18} /></div>
              <div className="pp_auth_pass_avatar"><Users size={35} strokeWidth={1.4} /></div>
              <strong>Your workspace pass</strong><span className="pp_auth_pass_subtitle">A better workday starts here</span>
              <div className="pp_auth_pass_services"><span><Users size={14} />People</span><span><CalendarCheck2 size={14} />Time</span><span><Wallet size={14} />Pay</span></div>
              <div className="pp_auth_pass_bottom"><span className="pp_auth_pass_barcode" /><LockKeyhole size={17} /></div>
            </div>
            <span className="pp_auth_pass_float"><LockKeyhole size={20} /></span>
          </div>
          <div className="pp_auth_pass_footer"><ShieldCheck size={15} /><span>Your role. Your access. Your workspace.</span></div>
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
              <Label htmlFor="login-password">Password</Label>
              <div className="pp_auth_password"><Input id="login-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" disabled={submitting} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
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
      {signedIn && <div className="pp_auth_success_backdrop">
        <div className="pp_auth_success" role="status" aria-live="polite" tabIndex={-1} ref={successRef}>
          <div className="pp_auth_success_medal" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M17 33 L27 43 L48 22" /></svg></div>
          <h2>Successfully signed in</h2>
          <p>Your workspace is ready.</p>
          <span className="pp_auth_success_progress" aria-hidden="true"><span /></span>
          <small>Opening your workspace...</small>
        </div>
      </div>}
      <footer className="pp_auth_footer">PeoplePay360 <span aria-hidden="true">·</span> People first. Every workday.</footer>
    </main>
  )
}
