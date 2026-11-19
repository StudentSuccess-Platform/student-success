import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ParentDashboard from '../../../src/pages/parent/ParentDashboard'
import { getChildren, getChildDashboard } from '../../../src/services/parentApi'

function deferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

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

const dashboard = {
  student: { id: 's1', firstName: 'Liam', term: 'Fall 2026' },
  summary: { currentGrade: 84, attendance: 94 },
  grades: [],
  performanceTrend: [],
  goals: [],
  teacherFeedback: null,
  feedbackHistory: [],
  supportPlan: null,
}

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ParentDashboard', () => {
  it("resolves the first linked child and renders that child's real dashboard", async () => {
    getChildren.mockResolvedValue({
      children: [
        { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
        { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
      ],
    })
    getChildDashboard.mockResolvedValue(dashboard)

    render(<ParentDashboard />)

    expect(await screen.findByText(/good morning, priya/i)).toBeInTheDocument()
    expect(screen.getByText(/liam.*published academic progress/i)).toBeInTheDocument()
    expect(getChildDashboard).toHaveBeenCalledWith('s1', null)
  })

  it('shows a dedicated message when no students are linked, without calling the dashboard endpoint', async () => {
    getChildren.mockResolvedValue({ children: [] })

    render(<ParentDashboard />)

    await waitFor(() =>
      expect(screen.getByText(/no students are linked to your account/i)).toBeInTheDocument()
    )
    expect(getChildDashboard).not.toHaveBeenCalled()
  })

  it('shows an error state when the linked-children request fails', async () => {
    getChildren.mockRejectedValue(new Error('Network error'))

    render(<ParentDashboard />)

    await waitFor(() =>
      expect(screen.getByText(/couldn't load your linked students/i)).toBeInTheDocument()
    )
  })

  it('does not render the child selector for a guardian with exactly one linked child', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel', gradeLevel: 8 }] })
    getChildDashboard.mockResolvedValue(dashboard)

    render(<ParentDashboard />)

    await screen.findByText(/good morning, priya/i)
    expect(screen.queryByLabelText(/viewing/i)).not.toBeInTheDocument()
  })

  it('switching children never shows the previous child\'s data while the new one loads', async () => {
    const user = userEvent.setup()
    getChildren.mockResolvedValue({
      children: [
        { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
        { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
      ],
    })

    const liamResponse = { ...dashboard, student: { id: 's1', firstName: 'Liam', term: 'Fall 2026' } }
    const mayaDeferred = deferred()
    getChildDashboard.mockImplementation((studentId) =>
      studentId === 's1' ? Promise.resolve(liamResponse) : mayaDeferred.promise
    )

    render(<ParentDashboard />)
    await screen.findByText(/liam.*published academic progress/i)

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')

    // Maya's request hasn't resolved yet — Liam's data must already be gone, replaced by loading.
    expect(screen.queryByText(/liam.*published academic progress/i)).not.toBeInTheDocument()
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()

    mayaDeferred.resolve({ ...dashboard, student: { id: 's2', firstName: 'Maya', term: 'Fall 2026' } })
    expect(await screen.findByText(/maya.*published academic progress/i)).toBeInTheDocument()
  })

  it('rapid switching only ever shows the last-selected child, regardless of response order', async () => {
    const user = userEvent.setup()
    getChildren.mockResolvedValue({
      children: [
        { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
        { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
        { id: 's3', name: 'Noah Patel', gradeLevel: 3 },
      ],
    })

    const responses = { s1: deferred(), s2: deferred(), s3: deferred() }
    getChildDashboard.mockImplementation((studentId) => responses[studentId].promise)

    render(<ParentDashboard />)
    await screen.findByLabelText(/viewing/i)

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')
    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Noah Patel')

    // Resolve out of order: the earlier (now-unmounted) requests must not win.
    responses.s2.resolve({ ...dashboard, student: { id: 's2', firstName: 'Maya', term: 'Fall 2026' } })
    responses.s1.resolve({ ...dashboard, student: { id: 's1', firstName: 'Liam', term: 'Fall 2026' } })
    responses.s3.resolve({ ...dashboard, student: { id: 's3', firstName: 'Noah', term: 'Fall 2026' } })

    expect(await screen.findByText(/noah.*published academic progress/i)).toBeInTheDocument()
    expect(screen.queryByText(/liam.*published academic progress/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/maya.*published academic progress/i)).not.toBeInTheDocument()
  })
})
