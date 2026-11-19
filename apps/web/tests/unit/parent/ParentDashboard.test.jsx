import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ParentDashboard from '../../../src/pages/parent/ParentDashboard'
import { getChildren, getChildDashboard } from '../../../src/services/parentApi'

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
})
