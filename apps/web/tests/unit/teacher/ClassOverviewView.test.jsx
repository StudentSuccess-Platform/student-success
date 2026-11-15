import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClassOverviewView from '../../../src/pages/teacher/ClassOverviewView'

const sampleData = {
  classInfo: {
    id: '507f1f77bcf86cd799439011',
    name: 'Algebra II',
    period: 'Period 2',
    room: 'Room 104',
    studentCount: 28,
  },
  isDemoData: true,
  stats: { averageGrade: 82, attendanceRate: 96, studentsNeedingIntervention: 1 },
  performanceTrend: [
    { label: 'Week 1', value: 76 },
    { label: 'Week 2', value: 79 },
  ],
  interventions: [
    {
      id: '1',
      name: 'Marcus Lee',
      className: 'Algebra II',
      reason: 'Grade below 65%',
      severity: 'high',
    },
  ],
  assignments: [
    { id: '1', title: 'Chapter 4 Quiz', dueDate: 'Nov 6', status: 'upcoming' },
  ],
  recentActivity: [
    {
      id: '1',
      description: '12 new submissions for Factoring Worksheet',
      timestamp: new Date().toISOString(),
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

function renderView(props) {
  return render(
    <MemoryRouter>
      <ClassOverviewView data={null} isLoading={false} error={null} {...props} />
    </MemoryRouter>
  )
}

describe('ClassOverviewView', () => {
  it('shows a loading state and renders no content while isLoading is true', () => {
    renderView({ isLoading: true })

    expect(screen.getByText(/loading class overview/i)).toBeInTheDocument()
    expect(screen.queryByText('Algebra II')).not.toBeInTheDocument()
  })

  it('shows an error state and renders no content when error is set', () => {
    renderView({ error: new Error('Network error') })

    expect(screen.getByText(/couldn't load this class/i)).toBeInTheDocument()
    expect(screen.queryByText('Algebra II')).not.toBeInTheDocument()
  })

  it('shows a not-found state with a link back to My Classes when data is null', () => {
    renderView({ data: null })

    expect(screen.getByText(/class not found/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /back to my classes/i })
    ).toHaveAttribute('href', '/teacher/classes')
  })

  it('renders the class header, stats, trend, interventions, assignments, and activity', () => {
    renderView({ data: sampleData })

    expect(screen.getByRole('heading', { name: 'Algebra II' })).toBeInTheDocument()
    expect(
      screen.getByText('Period 2 · Room 104 · 28 students enrolled')
    ).toBeInTheDocument()
    expect(screen.getByText('Enrolled Students')).toBeInTheDocument()
    expect(screen.getByText('Marcus Lee')).toBeInTheDocument()
    expect(screen.getByText('Chapter 4 Quiz')).toBeInTheDocument()
    expect(
      screen.getByText('12 new submissions for Factoring Worksheet')
    ).toBeInTheDocument()
    expect(screen.getAllByText('Coming Soon')).toHaveLength(3)
  })

  it('shows a demo-data banner when the overview content is demonstration data', () => {
    renderView({ data: sampleData })

    expect(screen.getByText(/demo data/i)).toBeInTheDocument()
  })

  it('does not show a demo-data banner once the content is no longer flagged as demo data', () => {
    renderView({ data: { ...sampleData, isDemoData: false } })

    expect(screen.queryByText(/demo data/i)).not.toBeInTheDocument()
  })

  it("renders each section's own empty state when its data array is empty", () => {
    renderView({
      data: { ...sampleData, interventions: [], assignments: [], recentActivity: [] },
    })

    expect(
      screen.getByText(/no students currently need intervention/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/no assignments yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument()
  })
})
