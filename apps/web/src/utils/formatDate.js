const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Formats a date for display as a short calendar date, e.g. "Nov 23, 2026".
 * Accepts a full ISO timestamp (shown in the viewer's time zone) or a date-only string like "2026-09-18"
 * (shown as that calendar day, never shifted by the time zone). Anything that is not a valid date is
 * returned unchanged, so the page never shows "Invalid Date".
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return ''
  const dateOnly = DATE_ONLY.exec(value)
  const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
