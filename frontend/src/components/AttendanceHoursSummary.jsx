export function AttendanceHoursSummary({ record }) {
  if (!record) return null
  const hours = value => `${Number(value || 0).toFixed(2)} h`
  return <div className="rounded border border-border bg-white p-3 text-sm" aria-live="polite">
    {record.check_out ? <div className="grid grid-cols-3 gap-3">
      <div><p className="text-xs text-muted">Total time on site</p><strong>{hours(record.gross_hours ?? record.worked_hours)}</strong></div>
      <div><p className="text-xs text-muted">Break deducted</p><strong>{hours(record.break_hours)}</strong></div>
      <div><p className="text-xs text-muted">Net working time</p><strong>{hours(record.worked_hours)}</strong></div>
    </div> : <p>One check-in and one checkout per day. Check out when you finish your day, not when starting a break.</p>}
    <p className="mt-2 text-xs text-muted">{record.break_source === 'Scheduled'
      ? `Scheduled break: ${hours(record.break_allowance_hours)}. Deducted at checkout after at least ${record.break_threshold_hours || 6} hours on site. This is an allowance, not a measured break.`
      : record.break_source === 'HR correction' ? 'Break duration was corrected by HR.' : 'Historical record: no break deduction was recorded.'}</p>
  </div>
}
