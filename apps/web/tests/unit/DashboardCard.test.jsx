import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DashboardCard from '../../src/components/common/DashboardCard'

describe('DashboardCard', () => {
  it('renders the title and children', () => {
    render(
      <DashboardCard title="Attendance Overview">
        <p>Card content</p>
      </DashboardCard>
    )

    expect(
      screen.getByRole('heading', { name: 'Attendance Overview' })
    ).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders an action alongside the title', () => {
    render(
      <DashboardCard title="Recent Activity" action={<button>Refresh</button>}>
        <p>Feed</p>
      </DashboardCard>
    )

    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('renders without a header when no title or action is given', () => {
    const { container } = render(
      <DashboardCard>
        <p>Bare content</p>
      </DashboardCard>
    )

    expect(container.querySelector('.dashboard-card-header')).not.toBeInTheDocument()
    expect(screen.getByText('Bare content')).toBeInTheDocument()
  })
})
