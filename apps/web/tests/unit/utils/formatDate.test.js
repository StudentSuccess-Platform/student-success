import { describe, expect, it } from 'vitest'
import { formatDate } from '../../../src/utils/formatDate'

describe('formatDate', () => {
  it('shows a date-only string as that calendar day, whatever the time zone', () => {
    expect(formatDate('2026-09-18')).toBe('Sep 18, 2026')
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
    expect(formatDate('2025-12-31')).toBe('Dec 31, 2025')
  })

  it('shows a full ISO timestamp as a short date, not the raw string', () => {
    const shown = formatDate('2026-11-23T18:44:58.089Z')
    expect(shown).toMatch(/^Nov 2[34], 2026$/) // 23rd, or the 24th ahead of UTC
    expect(shown).not.toMatch(/T\d{2}:/)
  })

  it('returns an empty string for a missing value', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
  })

  it('returns text that is not a date unchanged instead of "Invalid Date"', () => {
    expect(formatDate('not a date')).toBe('not a date')
  })
})
