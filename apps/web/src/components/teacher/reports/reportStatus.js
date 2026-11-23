// Status labels, badge classes and the status filter for teacher progress reports (plain helpers, no components).

const STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending review',
  published: 'Published',
}

const BADGE_MODIFIERS = {
  pending_review: 'warning',
  published: 'success',
}

export const STATUS_FILTERS = [
  { value: 'all', label: 'All reports' },
  { value: 'draft', label: 'Drafts' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'published', label: 'Published' },
]

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status
}

export function statusBadgeClass(status) {
  const modifier = BADGE_MODIFIERS[status]
  return modifier ? `teacher-badge teacher-badge--${modifier}` : 'teacher-badge'
}

// A report that is not published can still be edited, published or deleted; a published one is read only.
export function isEditable(status) {
  return status === 'draft' || status === 'pending_review'
}
