import { describe, expect, it } from 'vitest'
import { STATUS_FILTERS, isEditable, statusBadgeClass, statusLabel } from '../../../src/components/teacher/reports/reportStatus'

describe('reportStatus', () => {
  it('labels every status', () => {
    expect(statusLabel('draft')).toBe('Draft')
    expect(statusLabel('pending_review')).toBe('Pending review')
    expect(statusLabel('published')).toBe('Published')
    expect(statusLabel('something_else')).toBe('something_else')
  })

  it('uses a success badge only for published and a warning badge for pending review', () => {
    expect(statusBadgeClass('published')).toBe('teacher-badge teacher-badge--success')
    expect(statusBadgeClass('pending_review')).toBe('teacher-badge teacher-badge--warning')
    expect(statusBadgeClass('draft')).toBe('teacher-badge')
  })

  it('only drafts and pending reports can be changed', () => {
    expect(isEditable('draft')).toBe(true)
    expect(isEditable('pending_review')).toBe(true)
    expect(isEditable('published')).toBe(false)
  })

  it('offers a filter for every status plus all', () => {
    expect(STATUS_FILTERS.map((f) => f.value)).toEqual(['all', 'draft', 'pending_review', 'published'])
  })
})
