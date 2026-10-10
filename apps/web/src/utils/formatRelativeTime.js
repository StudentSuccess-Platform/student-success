const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Formats an ISO 8601 timestamp as a short relative time string
 * (e.g. "10 minutes ago", "Yesterday"), relative to `now`.
 *
 * @param {string} isoTimestamp
 * @param {Date} [now]
 * @returns {string}
 */
export function formatRelativeTime(isoTimestamp, now = new Date()) {
  const diffMs = now.getTime() - new Date(isoTimestamp).getTime()

  if (diffMs < MINUTE) return 'Just now'

  if (diffMs < HOUR) {
    const minutes = Math.round(diffMs / MINUTE)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (diffMs < DAY) {
    const hours = Math.round(diffMs / HOUR)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.round(diffMs / DAY)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}
