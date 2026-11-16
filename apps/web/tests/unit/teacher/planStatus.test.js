import { describe, expect, it } from 'vitest'
import {
  allowedActions,
  itemsToStepsText,
  parseSteps,
  statusBadgeClass,
  statusLabel,
  stepsToItems,
} from '../../../src/components/teacher/remediation/planStatus'

describe('planStatus', () => {
  it('labels every remediation status', () => {
    expect(statusLabel('draft')).toBe('Draft')
    expect(statusLabel('pending_review')).toBe('Pending review')
    expect(statusLabel('approved')).toBe('Approved')
    expect(statusLabel('published')).toBe('Published')
    expect(statusLabel('rejected')).toBe('Rejected')
  })

  it('maps statuses to badge classes', () => {
    expect(statusBadgeClass('draft')).toBe('teacher-badge')
    expect(statusBadgeClass('pending_review')).toBe('teacher-badge teacher-badge--warning')
    expect(statusBadgeClass('approved')).toBe('teacher-badge teacher-badge--success')
    expect(statusBadgeClass('published')).toBe('teacher-badge teacher-badge--success')
    expect(statusBadgeClass('rejected')).toBe('teacher-badge teacher-badge--danger')
  })

  it('allows edit, approve and reject for draft and pending review plans', () => {
    expect(allowedActions('draft')).toEqual(['edit', 'approve', 'reject'])
    expect(allowedActions('pending_review')).toEqual(['edit', 'approve', 'reject'])
  })

  it('allows publish and reject for approved plans only', () => {
    expect(allowedActions('approved')).toEqual(['publish', 'reject'])
  })

  it('is read only for published and rejected plans', () => {
    expect(allowedActions('published')).toEqual([])
    expect(allowedActions('rejected')).toEqual([])
  })

  it('turns one non-empty line into one step', () => {
    expect(parseSteps('  Read chapter 3 \r\n\n\nPractice set\n   \n')).toEqual([
      'Read chapter 3',
      'Practice set',
    ])
    expect(stepsToItems('A\nB')).toEqual([{ title: 'A' }, { title: 'B' }])
  })

  it('joins item titles back into step text', () => {
    expect(itemsToStepsText([{ title: 'A' }, { title: 'B' }])).toBe('A\nB')
    expect(itemsToStepsText()).toBe('')
  })
})
