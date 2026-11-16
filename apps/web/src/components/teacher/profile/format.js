// Display helpers shared by the student profile tabs (plain functions, no components).

export function formatPercent(value) {
  return value === null || value === undefined ? '--' : `${value}%`
}

// Calendar days are shown in UTC: attendance dates are stored at noon UTC, so one day stays one date.
export function formatDay(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatLabel(value) {
  if (!value) return '--'
  return value.charAt(0).toUpperCase() + value.slice(1)
}
