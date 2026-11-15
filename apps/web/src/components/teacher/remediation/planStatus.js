// Status labels, badge classes, allowed actions and step-text helpers for remediation plans.

const STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending review',
  approved: 'Approved',
  published: 'Published',
  rejected: 'Rejected',
}

const BADGE_MODIFIERS = {
  pending_review: 'warning',
  approved: 'success',
  published: 'success',
  rejected: 'danger',
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status
}

export function statusBadgeClass(status) {
  const modifier = BADGE_MODIFIERS[status]
  return modifier ? `teacher-badge teacher-badge--${modifier}` : 'teacher-badge'
}

// draft and pending_review: edit, approve, reject. approved: publish, reject. published and rejected: read only.
export function allowedActions(status) {
  if (status === 'draft' || status === 'pending_review') return ['edit', 'approve', 'reject']
  if (status === 'approved') return ['publish', 'reject']
  return []
}

// One step per non-empty line.
export function parseSteps(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function stepsToItems(text) {
  return parseSteps(text).map((title) => ({ title }))
}

export function itemsToStepsText(items = []) {
  return items.map((item) => item.title).join('\n')
}
