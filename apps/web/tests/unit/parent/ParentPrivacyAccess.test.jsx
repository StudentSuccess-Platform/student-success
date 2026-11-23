import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ParentDashboard from '../../../src/pages/parent/ParentDashboard'
import { getChildren, getChildDashboard } from '../../../src/services/parentApi'

// SCRUM-149 AC #3: "A frontend test confirms the UI never constructs a request using a
// student ID the parent wasn't given by GET /parent/children." This file is framed
// specifically around that property — every id `getChildDashboard` is ever called with,
// across loading, selection, and error/unauthorized states, must be a member of the set
// the backend actually returned. It does not re-test UX behavior already covered by
// ParentDashboard.test.jsx (stale-data-on-switch, rapid-switch correctness), and does not
// duplicate the backend's own 404/scoping tests (student-views.test.js, support-plans.test.js)
// — this is the frontend half of that same guarantee.

vi.mock('../../../src/state/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', firstName: 'Priya', lastName: 'Patel', roles: ['parent'] },
    token: 'mock-parent-token',
    loading: false,
  }),
}))

vi.mock('../../../src/services/parentApi', () => ({
  getChildren: vi.fn(),
  getChildDashboard: vi.fn(),
}))

vi.mock('../../../src/components/common/PerformanceTrendChart', () => ({
  default: () => <div data-testid="performance-chart" />,
}))

const dashboardFor = (id, firstName) => ({
  student: { id, firstName, term: 'Fall 2026' },
  summary: { currentGrade: 84, attendance: 94 },
  grades: [],
  performanceTrend: [],
  goals: [],
  teacherFeedback: null,
  feedbackHistory: [],
  supportPlan: null,
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

describe('Parent Portal — never requests a student ID outside GET /parent/children (SCRUM-149)', () => {
  it('initial load: issues no dashboard request until the real children list resolves, then uses exactly that id', async () => {
    const childrenDeferred = deferred()
    getChildren.mockReturnValue(childrenDeferred.promise)
    getChildDashboard.mockResolvedValue(dashboardFor('s1', 'Liam'))

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>,
    )

    // Still loading: nothing has been requested with any id yet.
    expect(getChildDashboard).not.toHaveBeenCalled()

    childrenDeferred.resolve({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })

    await waitFor(() => expect(getChildDashboard).toHaveBeenCalledTimes(1))
    expect(getChildDashboard).toHaveBeenCalledWith('s1', null)
  })

  it('selecting a different linked child requests exactly that child\'s real id, never a constructed one', async () => {
    const user = userEvent.setup()
    const realChildren = [
      { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
      { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
    ]
    getChildren.mockResolvedValue({ children: realChildren })
    getChildDashboard.mockImplementation((id) => Promise.resolve(dashboardFor(id, 'X')))

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>,
    )
    await screen.findByLabelText(/viewing/i)

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')
    await waitFor(() => expect(getChildDashboard).toHaveBeenCalledWith('s2', null))

    // Every call ever made must resolve to a member of the real, backend-returned set.
    const knownIds = new Set(realChildren.map((c) => c.id))
    const requestedIds = getChildDashboard.mock.calls.map(([id]) => id)
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
    // Never resolves — we only care what ids were requested, not the UI settling.
    getChildDashboard.mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>,
    )
    await screen.findByLabelText(/viewing/i)

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')
    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Noah Patel')
    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Liam Patel')

    const knownIds = new Set(realChildren.map((c) => c.id))
    const requestedIds = getChildDashboard.mock.calls.map(([id]) => id)
    expect(requestedIds.length).toBeGreaterThanOrEqual(3)
    for (const id of requestedIds) {
      expect(knownIds.has(id)).toBe(true)
    }
  })

  it('error state: when the linked-children request fails, no dashboard request is ever attempted', async () => {
    getChildren.mockRejectedValue(new Error('Network error'))

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByText(/couldn't load your linked students/i)).toBeInTheDocument()
    )
    expect(getChildDashboard).not.toHaveBeenCalled()
  })

  it('unauthorized-access state: a parent with zero linked children never triggers a dashboard request for any id', async () => {
    getChildren.mockResolvedValue({ children: [] })

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByText(/no students are linked to your account/i)).toBeInTheDocument()
    )
    expect(getChildDashboard).not.toHaveBeenCalled()
  })
})
