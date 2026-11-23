import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ParentSupportPlan from '../../../src/pages/parent/ParentSupportPlan'
import { getChildren, getChildSupportPlans } from '../../../src/services/parentApi'

// SCRUM-148 AC #1/#3: renders from GET /parent/children/:studentId/support-plans and handles the
// "no active plan" empty state. Framed, like SCRUM-149's ParentPrivacyAccess suite, around the
// same property: every id `getChildSupportPlans` is called with must come from the real
// GET /parent/children response, never a constructed or guessed one, including across a child
// switch (which must also clear the previous child's plans rather than showing stale data).

vi.mock('../../../src/services/parentApi', () => ({
  getChildren: vi.fn(),
  getChildSupportPlans: vi.fn(),
}))

const plan = (overrides = {}) => ({
  id: 'p1',
  classId: 'c1',
  className: 'Algebra I',
  title: 'Strengthen fraction skills',
  rationale: 'Practice fraction models with a teacher twice each week.',
  source: 'teacher',
  teacher: 'Dr. Maya Chen',
  publishedAt: '2025-11-12T18:00:00.000Z',
  active: true,
  items: [
    { id: 'i1', title: 'Fraction drills', description: 'Ten problems daily', status: 'done' },
    { id: 'i2', title: 'Ask a question in class', description: null, status: 'todo' },
  ],
  ...overrides,
})

function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ParentSupportPlan', () => {
  it('shows the current plan with its class, publish date, teacher, goal, progress and recommendation', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildSupportPlans.mockResolvedValue({ plans: [plan()] })

    render(<ParentSupportPlan />)

    const card = await screen.findByRole('article', { name: 'Algebra I support plan' })
    expect(getChildSupportPlans).toHaveBeenCalledWith('s1', null)
    expect(within(card).getByRole('heading', { name: 'Algebra I' })).toBeInTheDocument()
    expect(within(card).getByText('Published on Nov 12, 2025')).toBeInTheDocument()
    expect(within(card).getByText('Recommended by Dr. Maya Chen')).toBeInTheDocument()
    expect(within(card).getByText('Strengthen fraction skills')).toBeInTheDocument()
    expect(within(card).getByText('1 of 2 activities completed')).toBeInTheDocument()
    expect(within(card).getByText('Practice fraction models with a teacher twice each week.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /earlier plans/i })).not.toBeInTheDocument()
  })

  it('shows one card per class for multiple current plans', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildSupportPlans.mockResolvedValue({
      plans: [plan(), plan({ id: 'p2', classId: 'c2', className: 'Geometry', title: 'Learn proofs' })],
    })

    render(<ParentSupportPlan />)

    expect(await screen.findByRole('article', { name: 'Algebra I support plan' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Geometry support plan' })).toBeInTheDocument()
  })

  it('keeps earlier plans out of sight until the parent asks, then labels them', async () => {
    const user = userEvent.setup()
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildSupportPlans.mockResolvedValue({
      plans: [plan(), plan({ id: 'old', title: 'Old goal', publishedAt: '2025-10-01T18:00:00.000Z', active: false })],
    })

    render(<ParentSupportPlan />)

    await screen.findByText('Strengthen fraction skills')
    expect(screen.queryByText('Old goal')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Show earlier plans (1)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)

    expect(screen.getByText('Old goal')).toBeInTheDocument()
    expect(screen.getByText('Earlier plan')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide earlier plans' }))
    expect(screen.queryByText('Old goal')).not.toBeInTheDocument()
  })

  it('shows the "no active plan" empty state when the linked child has no plans at all', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildSupportPlans.mockResolvedValue({ plans: [] })

    render(<ParentSupportPlan />)

    expect(await screen.findByText(/doesn't currently have an approved support plan/i)).toBeInTheDocument()
  })

  it('shows the empty state alongside a populated history toggle when nothing is current', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildSupportPlans.mockResolvedValue({ plans: [plan({ active: false })] })

    render(<ParentSupportPlan />)

    expect(await screen.findByText(/doesn't currently have an approved support plan/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show earlier plans (1)' })).toBeInTheDocument()
  })

  it('displays a request error for the support-plans fetch', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildSupportPlans.mockRejectedValue(new Error('Unable to load your support plans (500)'))

    render(<ParentSupportPlan />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your support plans (500)')
  })

  it('displays an error when the linked-children request fails, and never requests any support plans', async () => {
    getChildren.mockRejectedValue(new Error('Network error'))

    render(<ParentSupportPlan />)

    await waitFor(() =>
      expect(screen.getByText(/couldn't load your linked students/i)).toBeInTheDocument()
    )
    expect(getChildSupportPlans).not.toHaveBeenCalled()
  })

  it('shows the "no students linked" state and never requests any support plans for a parent with zero linked children', async () => {
    getChildren.mockResolvedValue({ children: [] })

    render(<ParentSupportPlan />)

    await waitFor(() =>
      expect(screen.getByText(/no students are linked to your account/i)).toBeInTheDocument()
    )
    expect(getChildSupportPlans).not.toHaveBeenCalled()
  })

  it('issues no support-plans request until the real children list resolves, then uses exactly that id', async () => {
    const childrenDeferred = deferred()
    getChildren.mockReturnValue(childrenDeferred.promise)
    getChildSupportPlans.mockResolvedValue({ plans: [plan()] })

    render(<ParentSupportPlan />)

    expect(getChildSupportPlans).not.toHaveBeenCalled()

    childrenDeferred.resolve({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })

    await waitFor(() => expect(getChildSupportPlans).toHaveBeenCalledTimes(1))
    expect(getChildSupportPlans).toHaveBeenCalledWith('s1', null)
  })

  it('selecting a different linked child requests exactly that child\'s real id and clears the previous child\'s plans', async () => {
    const user = userEvent.setup()
    const realChildren = [
      { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
      { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
    ]
    getChildren.mockResolvedValue({ children: realChildren })
    getChildSupportPlans.mockImplementation((id) =>
      Promise.resolve({ plans: [plan({ id: `${id}-plan`, className: id === 's1' ? 'Algebra I' : 'Biology' })] })
    )

    render(<ParentSupportPlan />)
    await screen.findByRole('article', { name: 'Algebra I support plan' })

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')

    // The previous child's plan must disappear, not linger alongside the new one.
    expect(screen.queryByRole('article', { name: 'Algebra I support plan' })).not.toBeInTheDocument()
    await screen.findByRole('article', { name: 'Biology support plan' })

    const knownIds = new Set(realChildren.map((c) => c.id))
    const requestedIds = getChildSupportPlans.mock.calls.map(([id]) => id)
    expect(requestedIds.length).toBeGreaterThan(0)
    for (const id of requestedIds) {
      expect(knownIds.has(id)).toBe(true)
    }
  })

  it('rapid switching across every linked child never requests an id outside the known set', async () => {
    const user = userEvent.setup()
    const realChildren = [
      { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
      { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
      { id: 's3', name: 'Noah Patel', gradeLevel: 3 },
    ]
    getChildren.mockResolvedValue({ children: realChildren })
    getChildSupportPlans.mockReturnValue(new Promise(() => {}))

    render(<ParentSupportPlan />)
    await screen.findByLabelText(/viewing/i)

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')
    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Noah Patel')
    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Liam Patel')

    const knownIds = new Set(realChildren.map((c) => c.id))
    const requestedIds = getChildSupportPlans.mock.calls.map(([id]) => id)
    expect(requestedIds.length).toBeGreaterThanOrEqual(3)
    for (const id of requestedIds) {
      expect(knownIds.has(id)).toBe(true)
    }
  })
})
