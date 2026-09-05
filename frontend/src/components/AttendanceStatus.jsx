import { MapPin, PencilLine, Info } from 'lucide-react'
import { Badge, StatusBadge } from './ui'

export function AttendanceStatus({ record }) {
  if (!record) return null
  const location = { OUTSIDE: 'Outside zone', INSIDE: 'Inside zone' }[record.location_tag] || record.location_tag
  return <div className="pp-status-detail">
    <div className="pp-status-tags">
      <StatusBadge status={record.status} />
      {location && <Badge className="pp-status-context"><MapPin size={12} aria-hidden="true" />{location}</Badge>}
      {record.is_manual_correction && <Badge tone="info" className="pp-status-context"><PencilLine size={12} aria-hidden="true" />Corrected</Badge>}
    </div>
    {record.auto_status_note && <p className="pp-status-note"><Info size={13} aria-hidden="true" /><span>{record.auto_status_note}</span></p>}
  </div>
}
