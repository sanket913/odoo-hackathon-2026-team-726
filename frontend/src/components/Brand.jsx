import { Link } from 'react-router-dom'

export function Brand({ className = '', to = '/', inverse = false }) {
  return <Link to={to} className={`pp-brand ${className}`} aria-label="PeoplePay360 home">
    <img className="pp-brand-logo" src={`/brand/pp360-lockup-${inverse ? 'white-mono' : 'light'}.svg`} alt="PeoplePay360" width="340" height="64" />
  </Link>
}
