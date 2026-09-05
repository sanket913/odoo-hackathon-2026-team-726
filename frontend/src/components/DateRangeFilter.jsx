import { Input } from './ui'

export function DateRangeFilter({ from, to, onFrom, onTo }) {
  return <div className="pp-filter-dates">
    <label className="pp-filter-date">From<Input type="date" value={from} onChange={e => onFrom(e.target.value)} /></label>
    <label className="pp-filter-date">To<Input type="date" value={to} onChange={e => onTo(e.target.value)} /></label>
  </div>
}
