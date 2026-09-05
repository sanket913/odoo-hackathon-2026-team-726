import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Users, FileCheck2, Clock3, CalendarDays, Wallet, Layers3, ReceiptText, SlidersHorizontal, ChartNoAxesCombined, Bell, ShieldCheck, Check, Menu, X } from 'lucide-react'
import { Brand } from '../components/Brand'
import '../styles/peoplepay-public.css'
import '../styles/landing-paper.css'
import '../styles/workflow-journey.css'
import { HeroWorkspace } from '../components/HeroWorkspace'
import { ScrollEnvelope } from '../components/ScrollEnvelope'

const navigation = [['Product', 'product'], ['HR Management', 'hr'], ['Attendance', 'attendance'], ['Payroll', 'payroll'], ['Why PeoplePay360', 'why']]
const modules = [
  ['Employees', Users, 'hr', 'purple'], ['Contracts', FileCheck2, 'hr', 'teal'],
  ['Attendance', Clock3, 'attendance', 'amber'], ['Time Off', CalendarDays, 'attendance', 'purple'],
  ['Payroll', Wallet, 'payroll', 'teal'], ['Payruns', Layers3, 'payroll', 'purple'],
  ['Payslips', ReceiptText, 'payroll', 'amber'], ['Salary Rules', SlidersHorizontal, 'payroll', 'teal'],
  ['Dashboard', ChartNoAxesCombined, 'why', 'purple'], ['Notifications', Bell, 'why', 'amber'],
]

function ModuleShowcase() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.15 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`pp-module-grid pp-module-showcase${visible ? ' is-visible' : ''}`}>{modules.map(([label, Icon, target, tone], index) => <a key={label} href={`#${target}`} style={{ '--module-delay': `${index * 55}ms` }} className={`pp-module pp-tone-${tone}`}><span className="pp-module-icon"><Icon size={30} strokeWidth={1.6} /></span><span>{label}</span><ArrowUpRight className="pp-module-arrow" size={13} aria-hidden="true" /></a>)}</div>
}

function PublicNavbar() {
  const [open, setOpen] = useState(false)
  const toggle = useRef(null)
  useEffect(() => {
    const close = event => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    if (open) document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open])
  return <header className="pp-public-header"><div className="pp-public-nav pp-container">
    <Brand inverse />
    <button ref={toggle} type="button" className="pp-menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav id="public-navigation" aria-label="Public navigation" className={open ? 'is-open' : ''}>
      <div className="pp-nav-links">{navigation.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>)}</div>
      <div className="pp-nav-access"><Link to="/login">Sign In</Link><a href="#product" className="pp-cta pp-cta-small" onClick={() => setOpen(false)}>Explore Platform <ArrowUpRight size={15} /></a></div>
    </nav>
  </div></header>
}

export default function PublicLandingPage() {
  const workflowRef = useRef(null)
  useEffect(() => {
    const node = workflowRef.current
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const update = () => {
      frame = 0
      const enabled = !motion.matches && innerHeight >= 620
      node.classList.toggle('has-scroll-stage', enabled)
      const bounds = node.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, (100 - bounds.top) / Math.max(1, bounds.height - innerHeight)))
      const position = progress * 5
      node.style.setProperty('--journey-progress', progress)
      node.querySelectorAll('li').forEach((step, index) => {
        const distance = index - position
        step.style.setProperty('--card-x', `${distance * 82}px`)
        step.style.setProperty('--card-y', `${Math.abs(distance) * 19}px`)
        step.style.setProperty('--card-z', `${-Math.abs(distance) * 160}px`)
        step.style.setProperty('--card-turn', `${distance * -12}deg`)
        step.style.setProperty('--card-opacity', `${Math.max(0, 2.5 - Math.abs(distance))}`)
        step.style.zIndex = String(20 - Math.round(Math.abs(distance) * 3))
        step.classList.toggle('is-current', Math.round(position) === index)
      })

    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    motion.addEventListener('change', schedule)
    update()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); motion.removeEventListener('change', schedule) }
  }, [])
  const whyRef = useRef(null)
  const [whyVisible, setWhyVisible] = useState(false)
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setWhyVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setWhyVisible(true); observer.disconnect() }
    }, { threshold: 0.15 })
    observer.observe(whyRef.current)
    return () => observer.disconnect()
  }, [])
  const storiesRef = useRef(null)
  const [storiesVisible, setStoriesVisible] = useState(false)
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setStoriesVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStoriesVisible(true); observer.disconnect() }
    }, { threshold: 0.1 })
    observer.observe(storiesRef.current)
    return () => observer.disconnect()
  }, [])
  return <div className="pp-public">
    <a className="o_skip_link" href="#main-content">Skip to content</a>
    <PublicNavbar />
    <main id="main-content">
      <section className="pp-hero pp-container pp-hero-expressive" aria-labelledby="hero-title">
        <p className="pp-eyebrow"><span /> PEOPLE OPERATIONS, CONNECTED</p>
        <h1 id="hero-title">Your people. Your payroll.<br /><span className="pp-hero-hand">One connected<svg viewBox="0 0 480 25" preserveAspectRatio="none" aria-hidden="true"><path d="M5 17 Q205 -2 474 11 M22 23 Q250 8 447 18" /></svg></span> platform.</h1>
        <p className="pp-hero-copy">Bring the everyday work of HR and payroll together. <br className="pp-desktop-break" /> Less switching. More clarity. More time for your people.</p>
        <div className="pp-hero-actions"><span className="pp-hero-sidenote" aria-hidden="true">A better workday<br /><svg viewBox="0 0 95 40"><path d="M5 4 Q65 0 76 29 M63 23 L77 31 L83 17" /></svg></span><a className="pp-cta" href="#product">Explore PeoplePay360 <ArrowRight size={18} /></a><Link className="pp-cta pp-cta-secondary" to="/login">Sign In <ArrowUpRight size={18} /></Link></div>
        <p className="pp-hero-note"><ShieldCheck size={15} /> One workspace. Access that fits your role.</p>
        <HeroWorkspace />
      </section>

      <section id="product" className="pp-modules pp-section" aria-labelledby="modules-title"><div className="pp-container">
        <div className="pp-section-heading"><p className="pp-eyebrow">THE WHOLE WORKDAY, IN ONE PLACE</p><h2 id="modules-title">Everything your workforce needs, <br /><em>connected.</em></h2><p>Familiar workflows. Shared information. A clearer view of what comes next.</p></div>
        <ModuleShowcase />
      </div></section>

      <section className="pp-stories pp-container pp-section" aria-labelledby="stories-title">
        <div className="pp-section-heading"><p className="pp-eyebrow">BUILT AROUND THE WAY YOU WORK</p><h2 id="stories-title">A little less admin. <br />A lot more <span className="pp-underline">perspective.</span></h2></div>
        <div ref={storiesRef} className={`pp-story-grid pp-story-showcase${storiesVisible ? ' is-visible' : ''}`}>
          <article id="hr" className="pp-story"><span className="pp-story-index">01 / YOUR PEOPLE</span><Users size={29} /><h3>Start with a connected <br />employee record.</h3><p>Keep employee details and contracts together, with role-aware controls and a history of field changes.</p><ul><li><Check /> Employee profiles & contracts</li><li><Check /> Field-level audit trails</li></ul><Link to="/login">Open your workspace <ArrowUpRight size={16} /></Link></article>
          <article id="attendance" className="pp-story"><span className="pp-story-index">02 / THE EVERYDAY</span><Clock3 size={29} /><h3>Make each workday <br />easier to follow.</h3><p>Connect check-ins, working schedules and time off. See attendance notes and leave balances where they matter.</p><ul><li><Check /> Optional location check-in</li><li><Check /> Leave balance validation</li></ul><Link to="/login">Manage the everyday <ArrowUpRight size={16} /></Link></article>
          <article id="payroll" className="pp-story"><span className="pp-story-index">03 / PAYDAY</span><Wallet size={29} /><h3>Move from payroll <br />checks to payslips.</h3><p>Bring salary rules, period-valid contracts and payroll warnings into the same review and payment workflow.</p><ul><li><Check /> Payruns & salary rules</li><li><Check /> Payslips with verification QR</li></ul><Link to="/login">Explore payroll <ArrowUpRight size={16} /></Link></article>
        </div>
      </section>

      <section ref={whyRef} id="why" className={`pp-why pp-section pp-why-showcase${whyVisible ? ' is-visible' : ''}`}><div className="pp-container pp-why-layout"><div><p className="pp-eyebrow">WHY PEOPLEPAY360</p><h2>See the <span className="pp-why-script">connections.</span><br />Stay close to the details.</h2><p>A shared workspace for the people who run your workplace, with the detail to support their next decision.</p><a href="#product" className="pp-why-link">Explore the connected workspace <ArrowUpRight size={17} /></a></div><div className="pp-values">
        <article><ChartNoAxesCombined /><div><h3>A view of what is happening</h3><p>Current salary burn, department costs and attendance insights, drawn from your records.</p></div></article>
        <article><ShieldCheck /><div><h3>The right access for each role</h3><p>Employee, HR and payroll responsibilities supported by existing permission controls.</p></div></article>
        <article><Bell /><div><h3>Keep the next step in sight</h3><p>Review payroll warnings, follow request decisions and check payment notification status.</p></div></article>
      </div></div></section>

      <section ref={workflowRef} className="pp-workflow pp-container pp-section pp-workflow-showcase pp-journey" aria-labelledby="workflow-title">
        <div className="pp-journey-stage"><div className="pp-journey-heading">
        <p className="pp-eyebrow">ONE CONTINUOUS WORKFLOW</p>
        <h2 id="workflow-title">From joining day to <span className="pp-why-script">payday.</span></h2>
        <p className="pp-journey-intro">Every step brings your people and payroll closer together.</p><span className="pp-journey-cue">Scroll to follow the journey <ArrowRight size={16} /></span></div>
        <ol>{[
          ['Employee', Users, 'Bring your people onboard'],
          ['Contract', FileCheck2, 'Set the terms of work'],
          ['Attendance & Leave', Clock3, 'Track the everyday'],
          ['Payrun', Layers3, 'Calculate and review'],
          ['Payslip', ReceiptText, 'See the salary breakdown'],
          ['Mark Paid', Check, 'Complete the pay cycle'],
        ].map(([step, Icon, description], i) => <li key={step} style={{ '--step-delay': `${i * 90}ms` }}>
          <span className="pp-flow-number">{String(i + 1).padStart(2, '0')}</span>
          <div className="pp-flow-icon"><Icon size={25} strokeWidth={1.7} aria-hidden="true" /></div>
          <strong>{step}</strong><p className="pp-flow-description">{description}</p>
          {i < 5 && <ArrowRight className="pp-flow-arrow" size={16} aria-hidden="true" />}
        </li>)}</ol>
        <div className="pp-journey-meter" aria-hidden="true"><span /></div></div>
      </section>

      <ScrollEnvelope>
      <section className="pp-paper-cta pp-container" aria-labelledby="paper-cta-title">
        <div className="pp-paper-photo">
          <img src="/images/workplace-team.webp" alt="" loading="lazy" decoding="async" width="1536" height="1024" />
          <div className="pp-paper-caption"><span>PEOPLE FIRST. EVERY WORKDAY.</span><p>Good work starts<br />with your people.</p></div>
        </div>
        <div className="pp-paper-copy">
          <p className="pp-eyebrow">READY WHEN YOU ARE</p>
          <div className="pp-paper-icons" aria-hidden="true"><span><Users size={23} /></span><span><Clock3 size={23} /></span><span><Wallet size={23} /></span></div>
          <h2 id="paper-cta-title">Make workforce<br />operations <em>simpler.</em></h2>
          <p className="pp-paper-description">Your people, attendance and payroll.<br />Together in one workspace.</p>
          <Link className="pp-cta" to="/login">Open PeoplePay360 <ArrowRight size={18} /></Link>
        </div>
      </section>
      </ScrollEnvelope>
    </main>
    <footer className="pp-public-footer pp-container pp-footer-showcase">
      <div className="pp-footer-main">
        <div className="pp-footer-brand"><Brand /><p>People first. Every workday.</p><span>Your people, attendance and payroll.<br />Connected in one workspace.</span></div>
        <nav aria-label="Footer navigation" className="pp-footer-navigation">
          <div><h2>Explore</h2><a href="#product">Product <ArrowUpRight size={13} aria-hidden="true" /></a><a href="#why">Why PeoplePay360 <ArrowUpRight size={13} aria-hidden="true" /></a></div>
          <div><h2>Your workday</h2><a href="#hr">HR Management <ArrowUpRight size={13} aria-hidden="true" /></a><a href="#attendance">Attendance <ArrowUpRight size={13} aria-hidden="true" /></a><a href="#payroll">Payroll <ArrowUpRight size={13} aria-hidden="true" /></a></div>
          <div><h2>Your workspace</h2><Link className="pp-footer-signin" to="/login">Sign In <ArrowRight size={15} aria-hidden="true" /></Link><p>Pick up where you left off.</p></div>
        </nav>
      </div>
      <div className="pp-footer-bottom"><p className="pp-copyright">&copy; {new Date().getFullYear()} PeoplePay360</p><span><Layers3 size={13} aria-hidden="true" /> One connected workday.</span><a href="#hero-title">Back to top <ArrowUpRight size={14} aria-hidden="true" /></a></div>
    </footer>
  </div>
}
