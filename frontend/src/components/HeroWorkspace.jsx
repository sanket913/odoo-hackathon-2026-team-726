import { useEffect, useRef } from 'react'
import { Users, Clock3, Wallet, ArrowUpRight, Check, Layers3 } from 'lucide-react'
import '../styles/hero-workspace.css'

const panels = [
  { title: 'People', caption: 'Every great team starts here.', Icon: Users, target: 'hr', lines: ['Employee profiles', 'Connected contracts'], tone: 'people' },
  { title: 'Everyday work', caption: 'A little more flow in every day.', Icon: Clock3, target: 'attendance', lines: ['Attendance & schedules', 'Time off & balances'], tone: 'work' },
  { title: 'Payday', caption: 'Bring the whole month together.', Icon: Wallet, target: 'payroll', lines: ['Payruns & salary rules', 'Payslips & payment status'], tone: 'pay' },
]

export function HeroWorkspace() {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const update = () => {
      frame = 0
      const bounds = node.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight * .65)))
      const spread = motion.matches ? 1 : .35 + .65 * progress
      node.style.setProperty('--deck-spread', spread)
      node.style.setProperty('--deck-angle', `${motion.matches ? 0 : 12 * (1 - progress)}deg`)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const reset = () => { node.style.setProperty('--pointer-x', '0deg'); node.style.setProperty('--pointer-y', '0deg') }
    const move = event => {
      if (motion.matches || event.pointerType !== 'mouse') return
      const bounds = node.getBoundingClientRect()
      node.style.setProperty('--pointer-y', `${(event.clientX - bounds.left - bounds.width / 2) / bounds.width * 5}deg`)
      node.style.setProperty('--pointer-x', `${-(event.clientY - bounds.top - bounds.height / 2) / bounds.height * 4}deg`)
    }
    const changed = () => { reset(); schedule() }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerleave', reset)
    motion.addEventListener('change', changed)
    update()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerleave', reset)
      motion.removeEventListener('change', changed)
    }
  }, [])
  return <div ref={ref} className="pp-hero-workspace" aria-label="Explore your connected workspace">
    <div className="pp-deck-orbit" aria-hidden="true" />
    <div className="pp-workspace-deck">
      {panels.map(({ title, caption, Icon, target, lines, tone }, index) => <a href={`#${target}`} key={target} className={`pp-deck-card pp-deck-${tone}`} style={{ '--direction': index - 1 }}>
        <div className="pp-deck-card-top"><span className="pp-deck-icon"><Icon size={24} /></span><span className="pp-deck-index">0{index + 1}</span><ArrowUpRight size={16} /></div>
        <h2>{title}</h2><p>{caption}</p>
        <div className="pp-deck-lines">{lines.map(line => <span key={line}><Check size={13} />{line}</span>)}</div>
        <span className="pp-deck-edge" aria-hidden="true" />
      </a>)}
    </div>
    <div className="pp-deck-signature"><Layers3 size={16} /><span>One workspace. A better workday.</span></div>
  </div>
}
