function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

export function endFromDays(start, days) {
  const date = parseDate(start)
  const amount = Number(days)
  if (!date || !amount || amount < 0 || !Number.isFinite(amount) || amount * 2 !== Math.floor(amount * 2)) return ''
  date.setUTCDate(date.getUTCDate() + Math.ceil(amount) - 1)
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() <= 9999 ? date.toISOString().slice(0, 10) : ''
}

export function daysFromDates(start, end) {
  const from = parseDate(start), to = parseDate(end)
  return from && to && to >= from ? String((to - from) / 86400000 + 1) : ''
}
