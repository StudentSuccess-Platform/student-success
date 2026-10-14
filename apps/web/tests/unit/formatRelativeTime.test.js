import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '../../src/utils/formatRelativeTime'

const NOW = new Date('2026-10-10T15:00:00.000Z')

describe('formatRelativeTime', () => {
  it('returns "Just now" for timestamps under a minute old', () => {
    const timestamp = new Date(NOW.getTime() - 30 * 1000).toISOString()
    expect(formatRelativeTime(timestamp, NOW)).toBe('Just now')
  })

  it('formats minutes, pluralizing correctly', () => {
    const oneMinute = new Date(NOW.getTime() - 60 * 1000).toISOString()
    const tenMinutes = new Date(NOW.getTime() - 10 * 60 * 1000).toISOString()

    expect(formatRelativeTime(oneMinute, NOW)).toBe('1 minute ago')
    expect(formatRelativeTime(tenMinutes, NOW)).toBe('10 minutes ago')
  })

  it('formats hours, pluralizing correctly', () => {
    const oneHour = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString()
    const twoHours = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString()

    expect(formatRelativeTime(oneHour, NOW)).toBe('1 hour ago')
    expect(formatRelativeTime(twoHours, NOW)).toBe('2 hours ago')
  })

  it('returns "Yesterday" for a one-day-old timestamp', () => {
    const yesterday = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(yesterday, NOW)).toBe('Yesterday')
  })

  it('formats multi-day timestamps', () => {
    const threeDaysAgo = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeDaysAgo, NOW)).toBe('3 days ago')
  })
})
