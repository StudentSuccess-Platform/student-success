import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TeacherDashboard from '../../../src/pages/teacher/Dashboard'
import { getDashboard } from '../../../src/services/teacherApi'
import {
  interventions,
  recentActivity,
  statsSummary,
} from '../../../src/pages/teacher/dashboardMockData'

vi.mock('../../../src/services/teacherApi', async () => {
  const mock = await import('../../../src/pages/teacher/dashboardMockData')
  return {
    getDashboard: vi.fn(() =>
      Promise.resolve({
        summary: mock.statsSummary,
        performanceTrend: mock.performanceTrend,
        attendanceOverview: mock.attendanceOverview,
        interventions: mock.interventions,
        recentActivity: mock.recentActivity,
      })
    ),
    getClasses: vi.fn(),
  }
})

const loaded = () =>
  screen.findByRole('heading', { name: 'Academic Performance Trends' })

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

describe('TeacherDashboard', () => {
  it('renders the page heading and summary stats from the API', async () => {
    const { container } = render(<TeacherDashboard />)
    await loaded()
    const statGrid = within(container.querySelector('.stat-card-grid'))

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(statGrid.getByText(String(statsSummary.totalClasses))).toBeInTheDocument()
    expect(statGrid.getByText(String(statsSummary.totalStudents))).toBeInTheDocument()
    expect(
      statGrid.getByText(String(statsSummary.studentsNeedingIntervention))
    ).toBeInTheDocument()
    expect(statGrid.getByText(`${statsSummary.averageAttendance}%`)).toBeInTheDocument()
  })

  it('renders all four dashboard sections', async () => {
    render(<TeacherDashboard />)
    await loaded()

    expect(
      screen.getByRole('heading', { name: 'Academic Performance Trends' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Attendance Overview' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Students Needing Intervention' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Recent Activity & Pending Actions' })
    ).toBeInTheDocument()
  })

  it('lists every student flagged for intervention', async () => {
    render(<TeacherDashboard />)
    await loaded()

    for (const student of interventions) {
      expect(screen.getByText(student.name)).toBeInTheDocument()
    }
  })

  it('logs the activity id when an activity action button is clicked', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const actionableItem = recentActivity.find((item) => item.actionLabel)

    render(<TeacherDashboard />)
    await loaded()

    await user.click(screen.getByRole('button', { name: actionableItem.actionLabel }))

    expect(consoleSpy).toHaveBeenCalledWith(
      'Activity action triggered:',
      actionableItem.id
    )

    consoleSpy.mockRestore()
  })

  it('shows a loading message, then an error message when the request fails', async () => {
    getDashboard.mockImplementationOnce(() => Promise.reject(new Error('boom')))

    render(<TeacherDashboard />)

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
    expect(
      await screen.findByText(/couldn.t load dashboard data/i)
    ).toBeInTheDocument()
  })
})
