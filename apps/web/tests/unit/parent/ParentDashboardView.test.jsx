import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
  teacherFeedback: { teacher: 'Dr. Maya Chen', date: '2026-09-18', message: 'Great persistence.' },
  feedbackHistory: [
    { id: 'f1', teacher: 'Dr. Maya Chen', date: '2026-09-18', message: 'Great persistence.' },
  ],
  supportPlan: null,
}

function view(props) {
  return (
    <MemoryRouter>
      <ParentDashboardView data={null} isLoading={false} error={null} parentFirstName="Priya" {...props} />
    </MemoryRouter>
  )
}

function renderView(props) {
  return render(view(props))
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

  it("renders the parent greeting, the child's name, headline stats, and a latest-feedback preview from real data", () => {
    renderView({ data: sampleData })

    expect(screen.getByText(/good morning, priya/i)).toBeInTheDocument()
    expect(screen.getByText(/liam.*published academic progress/i)).toBeInTheDocument()
    expect(screen.getByText('84%')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // active goals count
    expect(screen.getByText('Great persistence.')).toBeInTheDocument()
    expect(screen.getByText('Dr. Maya Chen · 2026-09-18')).toBeInTheDocument()
  })

  it('is a concise summary: never duplicates the detailed subject grades, trend, or full goal list that Academic Progress shows', () => {
    renderView({ data: sampleData })

    expect(screen.queryByText('Mathematics')).not.toBeInTheDocument()
    expect(screen.queryByText('Improve fraction accuracy')).not.toBeInTheDocument()
    expect(screen.queryByText(/^assignments$/i)).not.toBeInTheDocument()
  })

  it('links clearly to the detailed Academic Progress page', () => {
    renderView({ data: sampleData })

    expect(screen.getByRole('link', { name: /view academic progress/i })).toHaveAttribute(
      'href',
      '/parent/academic-progress'
    )
  })

  it('shows an empty-state message when there is no teacher feedback yet', () => {
    renderView({ data: { ...sampleData, teacherFeedback: null } })

    expect(screen.getByText(/no teacher feedback available yet/i)).toBeInTheDocument()
  })

  it('shows the support plan only when its status is approved or published', () => {
    const { rerender } = renderView({
      data: { ...sampleData, supportPlan: { status: 'draft', activities: [] } },
    })
    expect(screen.queryByText(/approved learning support plan/i)).not.toBeInTheDocument()

    rerender(
      view({
        data: {
          ...sampleData,
          supportPlan: {
            status: 'approved',
            activities: [{ id: 'a1', title: 'Small-group instruction', schedule: 'Tue & Thu' }],
          },
        },
      })
    )
    expect(screen.getByText(/approved learning support plan/i)).toBeInTheDocument()
    expect(screen.getByText('Small-group instruction')).toBeInTheDocument()
  })
})
