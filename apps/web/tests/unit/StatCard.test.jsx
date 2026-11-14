import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatCard from '../../src/components/common/StatCard'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard icon="icon.svg" label="Total Classes" value={6} />)

    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Total Classes')).toBeInTheDocument()
  })

  it('renders trend text only when provided', () => {
    const { rerender } = render(
      <StatCard icon="icon.svg" label="Total Students" value={162} />
    )
    expect(screen.queryByText(/this week/i)).not.toBeInTheDocument()

    rerender(
      <StatCard
        icon="icon.svg"
        label="Total Students"
        value={162}
        trend="+3 this week"
      />
    )
    expect(screen.getByText('+3 this week')).toBeInTheDocument()
  })

  it('applies the warning accent class when accent is "warning"', () => {
    const { container } = render(
      <StatCard
        icon="icon.svg"
        label="Need Intervention"
        value={8}
        accent="warning"
      />
    )

    expect(container.querySelector('.stat-card')).toHaveClass('stat-card--warning')
  })

  it('does not apply the warning class by default', () => {
    const { container } = render(
      <StatCard icon="icon.svg" label="Avg. Attendance" value="94%" />
    )

    expect(container.querySelector('.stat-card')).not.toHaveClass('stat-card--warning')
  })
})
