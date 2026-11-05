import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SupportPlan from '../../src/pages/student/SupportPlan'
import { studentDashboardData } from '../../src/pages/student/StudentMockData'

const { getStudentDashboard } = vi.hoisted(() => ({
  getStudentDashboard: vi.fn(),
}))

vi.mock('../../src/state/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-student-token' }),
}))

vi.mock('../../src/services/studentApi', () => ({
  getStudentDashboard,
}))

const dashboardWithPlan = (supportPlan) => ({
  supportPlan,
})

describe('StudentSupportPlan', () => {
  beforeEach(() => {
    getStudentDashboard.mockReset()
    getStudentDashboard.mockResolvedValue(
      dashboardWithPlan(studentDashboardData.supportPlan),
    )
  })

  it('fetches the signed-in student dashboard and displays its approved plan', async () => {
    render(<SupportPlan />)

    expect(await screen.findByText('Strengthen fraction skills')).toBeInTheDocument()
    expect(getStudentDashboard).toHaveBeenCalledWith('mock-student-token')

    for (const activity of studentDashboardData.supportPlan.activities) {
      expect(await screen.findByText(activity.title)).toBeInTheDocument()
    }
  })

  it('displays a message when no plan exists', async () => {
    getStudentDashboard.mockResolvedValueOnce(dashboardWithPlan(null))

    render(<SupportPlan />)

    expect(
      await screen.findByText(/don't currently have an approved support plan/i),
    ).toBeInTheDocument()
  })

  it('hides plans awaiting teacher approval', async () => {
    getStudentDashboard.mockResolvedValueOnce(
      dashboardWithPlan({
        ...studentDashboardData.supportPlan,
        status: 'pending_review',
      }),
    )

    render(<SupportPlan />)

    expect(
      await screen.findByText(/don't currently have an approved support plan/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Strengthen fraction skills')).not.toBeInTheDocument()
  })

  it('displays a request error', async () => {
    getStudentDashboard.mockRejectedValueOnce(new Error('Unable to load dashboard'))

    render(<SupportPlan />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load dashboard')
  })
})
