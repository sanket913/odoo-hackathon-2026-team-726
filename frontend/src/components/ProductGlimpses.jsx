import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Users, Clock3, CalendarDays, Wallet, Check } from 'lucide-react'
import '../styles/product-glimpses.css'

const chapters = [
  { key: 'people', label: 'Meet your people', Icon: Users, title: 'A great first day.', accent: 'Everything in place.', description: 'Bring someone new into the team, with the details that make every next step easier.', points: ['Employee profiles', 'Connected contracts', 'One shared record'], note: 'From a new face to part of the team', tone: 'plum' },
  { key: 'attendance', label: 'Follow the everyday', Icon: Clock3, title: 'Small moments.', accent: 'A clearer workday.', description: 'Check in, keep track and finish the day. Give your people a simple view of their time at work.', points: ['Quick check-in', 'Personal attendance', 'Working schedules'], note: 'The everyday, all accounted for', tone: 'teal' },
  { key: 'leave', label: 'Make room for time off', Icon: CalendarDays, title: 'A little time away.', accent: 'All taken care of.', description: 'Turn a request into a clear decision, with leave balances that follow along.', points: ['Leave requests', 'HR approvals', 'Updated balances'], note: 'Requested. Reviewed. Ready to go.', tone: 'gold' },
  { key: 'payroll', label: 'Bring it all to payday', Icon: Wallet, title: 'All the details.', accent: 'One confident payday.', description: 'Move from calculated salaries to reviewed payroll and paid payslips, one clear step at a time.', points: ['Compute & review', 'Validate & mark paid', 'Download payslips'], note: 'From the first day to every payday', tone: 'plum' },
]

export function ProductGlimpses() {
  const section = useRef(null)

  useEffect(() => {
    const node = section.current
    const rows = [...node.querySelectorAll('.pp-glimpse')]
    const videos = rows.map(row => row.querySelector('video'))
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const compact = window.matchMedia('(max-width: 760px)')
    const visible = new Set()
    let frame = 0
    const canAnimate = () => !motion.matches
    const update = () => {
      frame = 0
      const animated = canAnimate() && !compact.matches
      node.classList.toggle('has-glimpse-motion', animated)
      rows.forEach(row => {
        const top = row.getBoundingClientRect().top
        const progress = animated ? Math.max(0, Math.min(1, (window.innerHeight * .92 - top) / (window.innerHeight * .52))) : 1
        row.style.setProperty('--glimpse-reveal', progress)
      })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const syncPlayback = () => {
      const autoPlay = canAnimate() && !navigator.connection?.saveData
      videos.forEach(video => {
        if (autoPlay && visible.has(video) && !document.hidden) video.play().catch(() => {})
        else video.pause()
      })
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= .35) visible.add(entry.target)
        else visible.delete(entry.target)
      })
      syncPlayback()
    }, { threshold: .35 }) : null
    videos.forEach(video => observer?.observe(video))
    const preferencesChanged = () => { schedule(); syncPlayback() }
    motion.addEventListener('change', preferencesChanged)
    compact.addEventListener('change', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', syncPlayback)
    update()
    return () => {
      observer?.disconnect()
      cancelAnimationFrame(frame)
      videos.forEach(video => video.pause())
      motion.removeEventListener('change', preferencesChanged)
      compact.removeEventListener('change', schedule)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', syncPlayback)
    }
  }, [])

  return <section ref={section} id="glimpses" className="pp-glimpses" aria-labelledby="glimpses-title">
    <div className="pp-container">
      <div className="pp-glimpses-heading">
        <div><p className="pp-eyebrow">A CLOSER LOOK AT YOUR WORKDAY</p>
          <h2 id="glimpses-title">Less imagining.<br /><em>More seeing it happen.</em></h2>
          <p>A few moments inside PeoplePay360. One beautifully connected flow.</p>
        </div>
      </div>
      <div className="pp-glimpses-story">
        {chapters.map(({ key, label, Icon, title, accent, description, points, note, tone }, index) => <article key={key} className={`pp-glimpse pp-glimpse-${tone}${index % 2 ? ' pp-glimpse-reverse' : ''}`} aria-labelledby={`glimpse-${key}-title`}>
          <div className="pp-glimpse-copy">
            <div className="pp-glimpse-chapter"><span className="pp-glimpse-number">{String(index + 1).padStart(2, '0')}</span><span className="pp-glimpse-chapter-label"><Icon size={18} aria-hidden="true" />{label}</span></div>
            <h3 id={`glimpse-${key}-title`}>{title}<br /><em>{accent}<svg className="pp-glimpse-scribble" viewBox="0 0 400 18" preserveAspectRatio="none" aria-hidden="true"><path d="M4 11 Q185 -1 395 8 M25 17 Q200 7 376 14" /></svg></em></h3>
            <p>{description}</p>
            <ul>{points.map(point => <li key={point}><Check size={15} aria-hidden="true" />{point}</li>)}</ul>
            <Link to="/login" className="pp-glimpse-link">Step inside <span><ArrowUpRight size={19} aria-hidden="true" /></span></Link>
          </div>
          <figure className="pp-glimpse-visual">
            <div className="pp-glimpse-orbit" aria-hidden="true" />
            <div className="pp-glimpse-window">
              <div className="pp-glimpse-chrome"><span className="pp-glimpse-dots" aria-hidden="true"><i /><i /><i /></span><span>PeoplePay360 <span className="pp-glimpse-chrome-divider">/</span> {label}</span><span className="pp-glimpse-demo">Demo preview</span></div>
              <video src={`/previews/${key}.mp4`} poster={`/previews/${key}.webp`} width="1280" height="720" muted loop playsInline controls preload="none" aria-label={`${label}: ${description}`} />
            </div>
            <figcaption><span className="pp-glimpse-caption-icon"><Icon size={18} aria-hidden="true" /></span><span><small>ONE CONNECTED WORKDAY</small><strong>{note}</strong></span><Check size={16} className="pp-glimpse-caption-check" aria-hidden="true" /></figcaption>
          </figure>
        </article>)}
      </div>
      <div className="pp-glimpses-ending"><span className="pp-glimpses-ending-line" /><p>Your people. Your everyday. <strong>Your next chapter.</strong></p><span className="pp-glimpses-ending-line" /></div>
    </div>
  </section>
}
