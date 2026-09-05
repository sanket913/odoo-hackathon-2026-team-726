import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Users, FileCheck2, Clock3, CalendarDays, Wallet, Layers3, ReceiptText, SlidersHorizontal, ChartNoAxesCombined, Bell, ShieldCheck, GitBranch, Check, Menu, X } from 'lucide-react'
import { Brand } from '../components/Brand'
import '../styles/peoplepay-public.css'

const navigation = [['Product', 'product'], ['HR Management', 'hr'], ['Attendance', 'attendance'], ['Payroll', 'payroll'], ['Why PeoplePay360', 'why']]
const modules = [
  ['Employees', Users, 'hr', 'purple'], ['Contracts', FileCheck2, 'hr', 'teal'],
  ['Attendance', Clock3, 'attendance', 'amber'], ['Time Off', CalendarDays, 'attendance', 'purple'],
  ['Payroll', Wallet, 'payroll', 'teal'], ['Payruns', Layers3, 'payroll', 'purple'],
  ['Payslips', ReceiptText, 'payroll', 'amber'], ['Salary Rules', SlidersHorizontal, 'payroll', 'teal'],
  ['Dashboard', ChartNoAxesCombined, 'why', 'purple'], ['Notifications', Bell, 'why', 'amber'],
]

function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const toggle = useRef(null)
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    if (open) document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open])
  return <header className="pp-public-header"><div className="pp-public-nav pp-container">
    <Brand />
    <button ref={toggle} type="button" className="pp-menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav id="public-navigation" aria-label="Public navigation" className={open ? 'is-open' : ''}>
      <div className="pp-nav-links">{navigation.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>)}</div>
      <div className="pp-nav-access"><Link to="/login">Sign In</Link><a href="#product" className="pp-cta pp-cta-small" onClick={() => setOpen(false)}>Explore Platform <ArrowUpRight size={15} /></a></div>
    </nav>
  </div></header>
}

export default function PublicLandingPage() {
  return <div className="pp-public">
    <a className="o_skip_link" href="#main-content">Skip to content</a>
    <PublicNavbar />
    <main id="main-content">
      <section className="pp-hero pp-container" aria-labelledby="hero-title">
        <p className="pp-eyebrow"><span /> PEOPLE OPERATIONS, CONNECTED</p>
        <h1 id="hero-title">Your people. Your payroll. <br /><span className="pp-marker">One connected</span> platform.</h1>
        <p className="pp-hero-copy">Bring the everyday work of HR and payroll together. <br className="pp-desktop-break" /> Less switching. More clarity. More time for your people.</p>
        <div className="pp-hero-actions"><a className="pp-cta" href="#product">Explore PeoplePay360 <ArrowRight size={18} /></a><Link className="pp-cta pp-cta-secondary" to="/login">Sign In <ArrowUpRight size={18} /></Link></div>
        <p className="pp-hero-note"><ShieldCheck size={15} /> One workspace. Access that fits your role.</p>
        <div className="pp-connection" aria-label="Connected employee and payroll workflows">
          <span className="pp-connection-label">From the first day</span>
          <div><Users /><span>People</span></div><span className="pp-connection-line" aria-hidden="true" />
          <div><Clock3 /><span>Everyday work</span></div><span className="pp-connection-line" aria-hidden="true" />
          <div><Wallet /><span>Payday</span></div>
          <span className="pp-connection-label">To every payday</span>
        </div>
      </section>

      <section id="product" className="pp-modules pp-section" aria-labelledby="modules-title"><div className="pp-container">
        <div className="pp-section-heading"><p className="pp-eyebrow">THE WHOLE WORKDAY, IN ONE PLACE</p><h2 id="modules-title">Everything your workforce needs, <br /><em>connected.</em></h2><p>Familiar workflows. Shared information. A clearer view of what comes next.</p></div>
        <div className="pp-module-grid">{modules.map(([label, Icon, target, tone]) => <a key={label} href={`#${target}`} className={`pp-module pp-tone-${tone}`}><span className="pp-module-icon"><Icon size={30} strokeWidth={1.6} /></span><span>{label}</span><ArrowUpRight className="pp-module-arrow" size={13} aria-hidden="true" /></a>)}</div>
        <p className="pp-modules-note"><GitBranch size={15} /> Separate tasks. One connected employee lifecycle.</p>
      </div></section>

      <section className="pp-stories pp-container pp-section" aria-labelledby="stories-title">
        <div className="pp-section-heading"><p className="pp-eyebrow">BUILT AROUND THE WAY YOU WORK</p><h2 id="stories-title">A little less admin. <br />A lot more <span className="pp-underline">perspective.</span></h2></div>
        <div className="pp-story-grid">
          <article id="hr" className="pp-story"><span className="pp-story-index">01 / YOUR PEOPLE</span><Users size={29} /><h3>Start with a connected <br />employee record.</h3><p>Keep employee details and contracts together, with role-aware controls and a history of field changes.</p><ul><li><Check /> Employee profiles & contracts</li><li><Check /> Field-level audit trails</li></ul><Link to="/login">Open your workspace <ArrowUpRight size={16} /></Link></article>
          <article id="attendance" className="pp-story"><span className="pp-story-index">02 / THE EVERYDAY</span><Clock3 size={29} /><h3>Make each workday <br />easier to follow.</h3><p>Connect check-ins, working schedules and time off. See attendance notes and leave balances where they matter.</p><ul><li><Check /> Optional location check-in</li><li><Check /> Leave balance validation</li></ul><Link to="/login">Manage the everyday <ArrowUpRight size={16} /></Link></article>
          <article id="payroll" className="pp-story"><span className="pp-story-index">03 / PAYDAY</span><Wallet size={29} /><h3>Move from payroll <br />checks to payslips.</h3><p>Bring salary rules, period-valid contracts and payroll warnings into the same review and payment workflow.</p><ul><li><Check /> Payruns & salary rules</li><li><Check /> Payslips with verification QR</li></ul><Link to="/login">Explore payroll <ArrowUpRight size={16} /></Link></article>
        </div>
      </section>

      <section id="why" className="pp-why pp-section"><div className="pp-container pp-why-layout"><div><p className="pp-eyebrow">WHY PEOPLEPAY360</p><h2>See the connections. <br />Stay close to the details.</h2><p>A shared workspace for the people who run your workplace, with the detail to support their next decision.</p></div><div className="pp-values">
        <article><ChartNoAxesCombined /><div><h3>A view of what is happening</h3><p>Current salary burn, department costs and attendance insights, drawn from your records.</p></div></article>
        <article><ShieldCheck /><div><h3>The right access for each role</h3><p>Employee, HR and payroll responsibilities supported by existing permission controls.</p></div></article>
        <article><Bell /><div><h3>Keep the next step in sight</h3><p>Review payroll warnings, follow request decisions and check payment notification status.</p></div></article>
      </div></div></section>

      <section className="pp-workflow pp-container pp-section" aria-labelledby="workflow-title"><p className="pp-eyebrow">ONE CONTINUOUS WORKFLOW</p><h2 id="workflow-title">From joining day to payday.</h2><ol>{['Employee', 'Contract', 'Attendance & Leave', 'Payrun', 'Payslip', 'Mark Paid'].map((step, i) => <li key={step}><span>{String(i+1).padStart(2,'0')}</span><strong>{step}</strong>{i<5 && <ArrowRight size={17} aria-hidden="true" />}</li>)}</ol><p>Connected records support every step. Your team stays in control.</p></section>

      <section className="pp-final-cta pp-container"><span className="pp-eyebrow">READY WHEN YOU ARE</span><h2>Make workforce operations simpler.</h2><p>Your people, attendance and payroll. Together in one workspace.</p><Link className="pp-cta" to="/login">Open PeoplePay360 <ArrowRight size={18} /></Link><div className="pp-cta-orbit" aria-hidden="true" /></section>
    </main>
    <footer className="pp-public-footer pp-container"><div><Brand /><p>People first. Every workday.</p></div><nav aria-label="Footer navigation"><a href="#product">Product</a><a href="#why">Why PeoplePay360</a><a href="#payroll">Payroll</a><Link to="/login">Sign In</Link></nav><p className="pp-copyright">© {new Date().getFullYear()} PeoplePay360</p></footer>
  </div>
}
