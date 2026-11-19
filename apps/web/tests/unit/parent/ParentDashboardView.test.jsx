import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParentDashboardView from '../../../src/pages/parent/ParentDashboardView'

const sampleData = {
  student: { id: 's1', firstName: 'Liam', term: 'Fall 2026' },
  summary: { currentGrade: 84, attendance: 94 },
  grades: [{ id: 'c1', subject: 'Mathematics', grade: 78 }],
  performanceTrend: [
    { label: 'Week 1', value: 76 },
    { label: 'Week 2', value: 79 },
  ],
  goals: [{ id: 'g1', title: 'Improve fraction accuracy', progress: 60 }],
  teacherFeedback: null,
  feedbackHistory: [
    { id: 'f1', teacher: 'Dr. Maya Chen', date: '2026-09-18', message: 'Great persistence.' },
  ],
  supportPlan: null,
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
    <ParentDashboardView
      data={null}
      isLoading={false}
      error={null}
      parentFirstName="Priya"
      {...props}
    />
  )
}

describe('ParentDashboardView', () => {
  it('shows a loading state and renders no content while isLoading is true', () => {
    renderView({ isLoading: true })

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
    expect(screen.queryByText(/good morning/i)).not.toBeInTheDocument()
  })

  it('shows an error state and renders no content when error is set', () => {
    renderView({ error: new Error('Network error') })

    expect(screen.getByText(/couldn't load this dashboard/i)).toBeInTheDocument()
    expect(screen.queryByText(/good morning/i)).not.toBeInTheDocument()
  })

  it('shows a not-found message when data is null', () => {
    renderView({ data: null })

    expect(screen.getByText(/no linked student found/i)).toBeInTheDocument()
  })

  it("renders the parent greeting, the child's name, grades, trend, goals, and feedback from real data", () => {
    renderView({ data: sampleData })

    expect(screen.getByText(/good morning, priya/i)).toBeInTheDocument()
    expect(screen.getByText(/liam.*published academic progress/i)).toBeInTheDocument()
    expect(screen.getByText('84%')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('Improve fraction accuracy')).toBeInTheDocument()
    expect(screen.getByText('Great persistence.')).toBeInTheDocument()
  })

  it('never renders an Assignments or Support-plan-countdown stat card, since the API does not provide either', () => {
    renderView({ data: sampleData })

    expect(screen.queryByText(/^assignments$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/week \d of \d/i)).not.toBeInTheDocument()
  })

  it('shows empty-state messages when goals and feedback are both empty', () => {
    renderView({ data: { ...sampleData, goals: [], feedbackHistory: [] } })

    expect(screen.getByText(/no active goals yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no teacher feedback available yet/i)).toBeInTheDocument()
  })

  it('shows the support plan only when its status is approved or published', () => {
    const { rerender } = renderView({
      data: { ...sampleData, supportPlan: { status: 'draft', activities: [] } },
    })
    expect(screen.queryByText(/approved learning support plan/i)).not.toBeInTheDocument()

    rerender(
      <ParentDashboardView
        data={{
          ...sampleData,
          supportPlan: {
            status: 'approved',
            activities: [{ id: 'a1', title: 'Small-group instruction', schedule: 'Tue & Thu' }],
          },
        }}
        isLoading={false}
        error={null}
        parentFirstName="Priya"
      />
    )
    expect(screen.getByText(/approved learning support plan/i)).toBeInTheDocument()
    expect(screen.getByText('Small-group instruction')).toBeInTheDocument()
  })
})
