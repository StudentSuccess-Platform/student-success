
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudentDashboard from '../../../src/pages/student/Dashboard'
import { studentDashboardData } from '../../../src/pages/student/StudentMockData'

const { getStudentDashboard } = vi.hoisted(() => ({
  getStudentDashboard: vi.fn(),
}))

// Mock the useAuth hook to provide a test user and token
vi.mock('../../../src/state/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'stu-001',
      firstName: 'Liam',
      lastName: 'Patel',
      email: 'student@example.test',
      roles: ['student'],
    },
    token: 'mock-student-token',
    isAuthenticated: true,
    loading: false,
  }),
}))

vi.mock('../../../src/services/studentApi', () => ({
  getStudentDashboard,
}))

// Test dashboard content without depending on chart dimensions.
vi.mock('../../../src/components/common/PerformanceTrendChart', () => ({
  default: () => <div data-testid="performance-chart" />,
}))

describe('StudentDashboard', () => {
  beforeEach(() => {
    getStudentDashboard.mockReset()
    getStudentDashboard.mockResolvedValue(studentDashboardData)
  })

  it('loads dashboard data with the auth token and displays summary statistics', async () => {
    const { container } = render(<StudentDashboard />)

    expect(
      await screen.findByRole('heading', { name: /good morning, liam/i })
    ).toBeInTheDocument()
    expect(getStudentDashboard).toHaveBeenCalledWith('mock-student-token')

    const stats = within(container.querySelector('.stat-card-grid'))

    expect(await stats.findByText('84%')).toBeInTheDocument()
    expect(await stats.findByText('94%')).toBeInTheDocument()
  })

  it('displays all student subjects', async () => {
    render(<StudentDashboard />)

    for (const course of studentDashboardData.grades) {
      expect(await screen.findByText(course.subject)).toBeInTheDocument()
    }
  })

  it('displays academic goals', async () => {
    render(<StudentDashboard />)

    for (const goal of studentDashboardData.goals) {
      expect(await screen.findByText(goal.title)).toBeInTheDocument()
    }
  })

  it('displays teacher feedback', async () => {
    render(<StudentDashboard />)

    expect(
      await screen.findByText(studentDashboardData.teacherFeedback.message)
    ).toBeInTheDocument()
  })

  it('displays the approved support plan', async () => {
    render(<StudentDashboard />)

    for (const activity of studentDashboardData.supportPlan.activities) {
      expect(await screen.findByText(activity.title)).toBeInTheDocument()
    }
  })

  it('does not display an unapproved support plan', async () => {
    const testData = {
      ...studentDashboardData,
      supportPlan: {
        ...studentDashboardData.supportPlan,
        status: 'pending',
      },
    }
    getStudentDashboard.mockResolvedValueOnce(testData)

    render(<StudentDashboard />)

    await screen.findByRole('heading', { name: /good morning, liam/i })
    expect(
      screen.queryByText(testData.supportPlan.activities[0].title)
    ).not.toBeInTheDocument()
  })

  it('renders the performance chart component', async () => {
    render(<StudentDashboard />)

    await screen.findByRole('heading', { name: /good morning, liam/i })
    expect(
      screen.getByTestId('performance-chart')
    ).toBeInTheDocument()
  })
})
