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

const supportPlan = {
  ...studentDashboardData.supportPlan,
  goal: studentDashboardData.supportPlan.focus,
  teacher: 'Dr. Maya Chen',
  recommendations: ['Practice fraction models with a teacher twice each week.'],
  activities: studentDashboardData.supportPlan.activities.map((activity, index) => ({
    ...activity,
    status: index === 0 ? 'done' : 'todo',
  })),
}

describe('StudentSupportPlan', () => {
  beforeEach(() => {
    getStudentDashboard.mockReset()
    getStudentDashboard.mockResolvedValue({ supportPlan })
  })

  it('fetches and displays the remediation goal, activity progress, and recommendations', async () => {
    render(<SupportPlan />)

    expect(await screen.findByText('Remediation goal')).toBeInTheDocument()
    expect(screen.getByText('Strengthen fraction skills')).toBeInTheDocument()
    expect(screen.getByText('Recommended by Dr. Maya Chen')).toBeInTheDocument()
    expect(getStudentDashboard).toHaveBeenCalledWith('mock-student-token')

    for (const activity of studentDashboardData.supportPlan.activities) {
      expect(screen.getByText(activity.title)).toBeInTheDocument()
    }
    expect(screen.getByText('1 of 3 activities completed')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Support plan activities completed' }))
      .toHaveAttribute('value', '1')
    expect(screen.getByText('Practice fraction models with a teacher twice each week.'))
      .toBeInTheDocument()
  })

  it('displays a message when no plan exists', async () => {
    getStudentDashboard.mockResolvedValueOnce({ supportPlan: null })

    render(<SupportPlan />)

    expect(
      await screen.findByText(/don't currently have an approved support plan/i),
    ).toBeInTheDocument()
  })

  it('hides plans awaiting teacher approval', async () => {
    getStudentDashboard.mockResolvedValueOnce(
      { supportPlan: {
        ...supportPlan,
        status: 'pending_review',
      } },
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
