
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SupportPlan from '../../src/pages/student/SupportPlan'
import { studentDashboardData } from '../../src/pages/student/StudentMockData'

describe('StudentSupportPlan', () => {
  it('displays the approved remediation plan', () => {
    render(<SupportPlan />)

    expect(screen.getByText('Strengthen fraction skills'))
      .toBeInTheDocument()

    for (const activity of studentDashboardData.supportPlan.activities) {
      expect(screen.getByText(activity.title)).toBeInTheDocument()
    }
  })

  it('displays a message when no plan exists', () => {
    render(<SupportPlan plan={null} />)

    expect(
      screen.getByText(/don't currently have an approved support plan/i)
    ).toBeInTheDocument()
  })

  it('hides plans awaiting teacher approval', () => {
    const pendingPlan = {
      ...studentDashboardData.supportPlan,
      status: 'pending',
    }

    render(<SupportPlan plan={pendingPlan} />)

    expect(
      screen.queryByText('Strengthen fraction skills')
    ).not.toBeInTheDocument()
  })

  it('hides rejected plans', () => {
    const rejectedPlan = {
      ...studentDashboardData.supportPlan,
      status: 'rejected',
    }

    render(<SupportPlan plan={rejectedPlan} />)

    expect(
      screen.queryByText('Strengthen fraction skills')
    ).not.toBeInTheDocument()
  })
})
