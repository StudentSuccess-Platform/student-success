import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardView from '../../src/pages/teacher/DashboardView'

const sampleData = {
  summary: {
    totalClasses: 6,
    totalStudents: 162,
    studentsNeedingIntervention: 8,
    averageAttendance: 94,
  },
  performanceTrend: [
    { label: 'Week 1', value: 78 },
    { label: 'Week 2', value: 80 },
  ],
  attendanceOverview: {
    overallRate: 94,
    classes: [{ name: 'Algebra II', rate: 96 }],
  },
  interventions: [
    {
      id: '1',
      name: 'Marcus Lee',
      className: 'Algebra II',
      reason: 'Grade below 65%',
      severity: 'high',
    },
  ],
  recentActivity: [
    {
      id: '1',
      description: '12 new assignment submissions in Algebra II',
      timestamp: new Date().toISOString(),
      actionLabel: 'Review',
    },
  ],
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 240,
    top: 0,
    left: 0,
    bottom: 240,
    right: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  })

  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
    }
    observe(target) {
      this.callback([{ target, contentRect: target.getBoundingClientRect() }])
    }
    unobserve() {}
    disconnect() {}
  }
})

describe('DashboardView', () => {
  it('shows a loading state and renders no content while isLoading is true', () => {
    render(
      <DashboardView
        data={null}
        isLoading
        error={null}
        onActivityAction={vi.fn()}
      />
    )

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
    expect(screen.queryByText('Total Classes')).not.toBeInTheDocument()
  })

  it('shows an error state and renders no content when error is set', () => {
    render(
      <DashboardView
        data={null}
        isLoading={false}
        error={new Error('Network error')}
        onActivityAction={vi.fn()}
      />
    )

    expect(screen.getByText(/couldn't load dashboard data/i)).toBeInTheDocument()
    expect(screen.queryByText('Total Classes')).not.toBeInTheDocument()
  })

  it('renders the full dashboard content when data is available', () => {
    render(
      <DashboardView
        data={sampleData}
        isLoading={false}
        error={null}
        onActivityAction={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Total Classes')).toBeInTheDocument()
    expect(screen.getByText('Marcus Lee')).toBeInTheDocument()
    expect(
      screen.getByText('12 new assignment submissions in Algebra II')
    ).toBeInTheDocument()
  })

  it('calls onActivityAction with the item id when an action button is clicked', async () => {
    const user = userEvent.setup()
    const onActivityAction = vi.fn()

    render(
      <DashboardView
        data={sampleData}
        isLoading={false}
        error={null}
        onActivityAction={onActivityAction}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Review' }))

    expect(onActivityAction).toHaveBeenCalledWith('1')
  })

  it('renders each section\'s own empty state when its data array is empty', () => {
    render(
      <DashboardView
        data={{
          ...sampleData,
          interventions: [],
          recentActivity: [],
        }}
        isLoading={false}
        error={null}
        onActivityAction={vi.fn()}
      />
    )

    expect(
      screen.getByText(/no students currently need intervention/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument()
  })
})
