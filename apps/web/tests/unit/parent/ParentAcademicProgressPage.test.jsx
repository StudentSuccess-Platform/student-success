import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ParentAcademicProgressPage from '../../../src/pages/parent/ParentAcademicProgressPage'
import { getChildren, getChildDashboard } from '../../../src/services/parentApi'

// SCRUM-153: a second entry point to the real GET /parent/children/:studentId/dashboard data
// (already proven by ParentDashboard/ParentDashboardView's own tests), reached from the
// Academic Progress sidebar route instead of Overview. Framed, like SCRUM-149's
// ParentPrivacyAccess suite, around the same privacy property: every id `getChildDashboard` is
// called with must come from the real GET /parent/children response, never a constructed one.

vi.mock('../../../src/services/parentApi', () => ({
  getChildren: vi.fn(),
  getChildDashboard: vi.fn(),
}))

vi.mock('../../../src/components/common/PerformanceTrendChart', () => ({
  default: () => <div data-testid="performance-chart" />,
}))

function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const dashboard = {
  student: { id: 's1', firstName: 'Liam', term: 'Fall 2026' },
  summary: { currentGrade: 84, attendance: 94 },
  grades: [{ id: 'g1', subject: 'Algebra I', grade: 86 }],
  performanceTrend: [],
  goals: [{ id: 'goal1', title: 'Finish homework on time', progress: 60 }],
  teacherFeedback: null,
  feedbackHistory: [
    { id: 'f1', teacher: 'Ms. Chen', date: '2025-11-01', message: 'Great improvement this week.' },
  ],
  supportPlan: null,
}

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ParentAcademicProgressPage', () => {
  it('renders the real page (not a placeholder), using exactly the first linked child\'s real id', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildDashboard.mockResolvedValue(dashboard)

    render(<ParentAcademicProgressPage />)

    expect(await screen.findByRole('heading', { name: 'Academic Progress' })).toBeInTheDocument()
    expect(screen.queryByText(/under construction/i)).not.toBeInTheDocument()
    await waitFor(() => expect(getChildDashboard).toHaveBeenCalledTimes(1))
    expect(getChildDashboard).toHaveBeenCalledWith('s1', null)
  })

  it('renders real grades, attendance, performance trend, goals, and teacher feedback', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildDashboard.mockResolvedValue(dashboard)

    render(<ParentAcademicProgressPage />)

    await screen.findByRole('heading', { name: 'Academic Progress' })
    expect(screen.getByText('84%')).toBeInTheDocument() // overall grade
    expect(screen.getByText('94%')).toBeInTheDocument() // attendance
    expect(screen.getByTestId('performance-chart')).toBeInTheDocument()
    expect(screen.getByText('Algebra I')).toBeInTheDocument()
    expect(screen.getByText('Finish homework on time')).toBeInTheDocument()
    expect(screen.getByText('Great improvement this week.')).toBeInTheDocument()
  })

  it('does not render the child selector for a guardian with exactly one linked child', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildDashboard.mockResolvedValue(dashboard)

    render(<ParentAcademicProgressPage />)

    await screen.findByRole('heading', { name: 'Academic Progress' })
    expect(screen.queryByLabelText(/viewing/i)).not.toBeInTheDocument()
  })

  it('shows a dedicated message when no students are linked, without calling the dashboard endpoint', async () => {
    getChildren.mockResolvedValue({ children: [] })

    render(<ParentAcademicProgressPage />)

    await waitFor(() =>
      expect(screen.getByText(/no students are linked to your account/i)).toBeInTheDocument()
    )
    expect(getChildDashboard).not.toHaveBeenCalled()
  })

  it('shows an error state when the linked-children request fails, and never calls the dashboard endpoint', async () => {
    getChildren.mockRejectedValue(new Error('Network error'))

    render(<ParentAcademicProgressPage />)

    await waitFor(() =>
      expect(screen.getByText(/couldn't load your linked students/i)).toBeInTheDocument()
    )
    expect(getChildDashboard).not.toHaveBeenCalled()
  })

  it('shows an error state when this child\'s academic progress request fails', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildDashboard.mockRejectedValue(new Error('Server error'))

    render(<ParentAcademicProgressPage />)

    expect(
      await screen.findByText(/couldn't load this child's academic progress/i)
    ).toBeInTheDocument()
  })

  it('issues no dashboard request until the real children list resolves, then uses exactly that id', async () => {
    const childrenDeferred = deferred()
    getChildren.mockReturnValue(childrenDeferred.promise)
    getChildDashboard.mockResolvedValue(dashboard)

    render(<ParentAcademicProgressPage />)

    expect(getChildDashboard).not.toHaveBeenCalled()

    childrenDeferred.resolve({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })

    await waitFor(() => expect(getChildDashboard).toHaveBeenCalledTimes(1))
    expect(getChildDashboard).toHaveBeenCalledWith('s1', null)
  })

  it('switching children loads the correct child\'s data and never shows the previous child\'s data while it loads', async () => {
    const user = userEvent.setup()
    getChildren.mockResolvedValue({
      children: [
        { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
        { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
      ],
    })

    const liamResponse = { ...dashboard, grades: [{ id: 'g1', subject: 'Liam Class', grade: 80 }] }
    const mayaDeferred = deferred()
    getChildDashboard.mockImplementation((studentId) =>
      studentId === 's1' ? Promise.resolve(liamResponse) : mayaDeferred.promise
    )

    render(<ParentAcademicProgressPage />)
    await screen.findByText('Liam Class')

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')

    // Maya's request hasn't resolved yet — Liam's data must already be gone, replaced by loading.
    expect(screen.queryByText('Liam Class')).not.toBeInTheDocument()
    expect(screen.getByText(/loading academic progress/i)).toBeInTheDocument()

    mayaDeferred.resolve({ ...dashboard, grades: [{ id: 'g2', subject: 'Maya Class', grade: 90 }] })
    expect(await screen.findByText('Maya Class')).toBeInTheDocument()

    const requestedIds = getChildDashboard.mock.calls.map(([id]) => id)
    for (const id of requestedIds) {
      expect(['s1', 's2']).toContain(id)
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
    getChildDashboard.mockReturnValue(new Promise(() => {}))

    render(<ParentAcademicProgressPage />)
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
})
