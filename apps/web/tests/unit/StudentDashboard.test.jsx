
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StudentDashboard from '../../src/pages/student/Dashboard'
import { studentDashboardData } from '../../src/pages/student/StudentMockData'

// Test dashboard content without depending on chart dimensions.
vi.mock('../../src/components/common/PerformanceTrendChart', () => ({
  default: () => <div data-testid="performance-chart" />,
}))

describe('StudentDashboard', () => {
  it('displays the student name and summary statistics', () => {
    const { container } = render(<StudentDashboard />)

    expect(
      screen.getByRole('heading', { name: /good morning, liam/i })
    ).toBeInTheDocument()

    const stats = within(container.querySelector('.stat-card-grid'))

    expect(stats.getByText('84%')).toBeInTheDocument()
    expect(stats.getByText('94%')).toBeInTheDocument()
    // expect(stats.getByText(/84%\s*\/\s*88%/)).toBeInTheDocument()
  })

  it('displays all student subjects', () => {
    render(<StudentDashboard />)

    for (const course of studentDashboardData.grades) {
      expect(screen.getByText(course.subject)).toBeInTheDocument()
    }
  })

  it('displays academic goals', () => {
    render(<StudentDashboard />)

    for (const goal of studentDashboardData.goals) {
      expect(screen.getByText(goal.title)).toBeInTheDocument()
    }
  })

  it('displays teacher feedback', () => {
    render(<StudentDashboard />)

    expect(
      screen.getByText(studentDashboardData.teacherFeedback.message)
    ).toBeInTheDocument()
  })

  it('displays the approved support plan', () => {
    render(<StudentDashboard />)

    for (const activity of studentDashboardData.supportPlan.activities) {
      expect(screen.getByText(activity.title)).toBeInTheDocument()
    }
  })

  it('does not display an unapproved support plan', () => {
    const testData = {
      ...studentDashboardData,
      supportPlan: {
        ...studentDashboardData.supportPlan,
        status: 'pending',
      },
    }

    render(<StudentDashboard data={testData} />)

    expect(
      screen.queryByText(/your approved learning support plan/i)
    ).not.toBeInTheDocument()
  })

  it('renders the performance chart component', () => {
    render(<StudentDashboard />)

    expect(
      screen.getByTestId('performance-chart')
    ).toBeInTheDocument()
  })
})
