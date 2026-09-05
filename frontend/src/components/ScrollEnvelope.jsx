import { useEffect, useRef } from 'react'
import { Mail } from 'lucide-react'

export function ScrollEnvelope({ children }) {
  const scene = useRef(null)
  useEffect(() => {
    const node = scene.current
    const card = node.querySelector('.pp-paper-cta')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let focused = false
    const clamp = value => Math.max(0, Math.min(1, value))
    const update = () => {
      frame = 0
      const height = card.offsetHeight
      const stageHeight = height * 1.25 + 40
      const enabled = !motion.matches
      const top = window.innerWidth <= 600 ? 90 : 110
      const fit = Math.min(1, Math.max(240, window.innerHeight - top - 45) / stageHeight)
      const visibleHeight = stageHeight * fit
      node.classList.toggle('is-animated', enabled)
      const bounds = node.getBoundingClientRect()
      const travel = Math.max(1, bounds.height - visibleHeight - top)
      const progress = focused || !enabled ? 1 : clamp((top - bounds.top) / travel)
      const smooth = value => value * value * (3 - 2 * value)
      const opening = smooth(clamp(progress / .22))
      const emerging = smooth(clamp((progress - .22) / .48))
      const presenting = smooth(clamp((progress - .72) / .18))
      const zooming = smooth(clamp((progress - .9) / .1))
      const maxZoom = Math.max(1, Math.min(1.14,
        (window.innerWidth - 40) / (card.offsetWidth * fit),
        (window.innerHeight - top - 45) / (height * fit)))
      const pocketTop = height * .65 + 30
      node.style.setProperty('--stage-height', `${visibleHeight}px`)
      node.style.setProperty('--canvas-height', `${stageHeight}px`)
      node.style.setProperty('--canvas-scale', `${fit}`)
      node.style.setProperty('--sticky-top', `${top}px`)
      node.style.setProperty('--pocket-top', `${pocketTop}px`)
      node.style.setProperty('--pocket-height', `${height * .6}px`)
      node.style.setProperty('--flap-angle', `${-180 * opening}deg`)
      node.style.setProperty('--letter-y', `${(pocketTop + 8) * (1 - emerging) + 15 * emerging * (1 - presenting)}px`)
      node.style.setProperty('--letter-scale', `${.55 + .45 * presenting + (maxZoom - 1) * zooming}`)
      node.style.setProperty('--envelope-opacity', `${1 - presenting}`)
      node.style.setProperty('--flap-layer', opening > .5 ? '0' : '4')

    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const focusIn = () => { focused = true; schedule() }
    const focusOut = event => { if (!node.contains(event.relatedTarget)) { focused = false; schedule() } }
    const resize = new ResizeObserver(schedule)
    resize.observe(card)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    motion.addEventListener('change', schedule)
    node.addEventListener('focusin', focusIn)
    node.addEventListener('focusout', focusOut)
    update()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      motion.removeEventListener('change', schedule)
      node.removeEventListener('focusin', focusIn)
      node.removeEventListener('focusout', focusOut)
    }
  }, [])
  return <div ref={scene} className="pp-envelope-scene">
    <div className="pp-envelope-stage">
      <div className="pp-envelope-canvas">
      <div className="pp-envelope-back" aria-hidden="true" />
      <div className="pp-envelope-flap" aria-hidden="true" />
      <div className="pp-envelope-letter">{children}</div>
      <div className="pp-envelope-front" aria-hidden="true"><span><Mail size={25} /><strong>A better workday, inside.</strong><small>Scroll to open</small></span></div>
      </div>
    </div>
  </div>
}
