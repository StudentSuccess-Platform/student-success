import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParentAcademicProgress from '../../../src/pages/parent/ParentAcademicProgress'

const sampleData = {
  student: { id: 's1', firstName: 'Liam', term: 'Fall 2026' },
  summary: { currentGrade: 84, attendance: 94 },
  grades: [{ id: 'c1', subject: 'Mathematics', grade: 78 }],
  performanceTrend: [
    { label: 'Week 1', value: 76 },
    { label: 'Week 2', value: 79 },
  ],
  goals: [{ id: 'g1', title: 'Improve fraction accuracy', progress: 60 }],
  feedbackHistory: [
    { id: 'f1', teacher: 'Dr. Maya Chen', date: '2026-09-18', message: 'Great persistence.' },
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

describe('ParentAcademicProgress', () => {
  it('renders grades, attendance, trend, goals, and feedback from real data', () => {
    render(<ParentAcademicProgress data={sampleData} />)

    expect(screen.getByText('84%')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('Improve fraction accuracy')).toBeInTheDocument()
    expect(screen.getByText('Great persistence.')).toBeInTheDocument()
  })

  it('shows empty-state messages when goals and feedback are both empty', () => {
    render(<ParentAcademicProgress data={{ ...sampleData, goals: [], feedbackHistory: [] }} />)

    expect(screen.getByText(/no active goals yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no teacher feedback available yet/i)).toBeInTheDocument()
  })

  it('never renders an Assignments panel, Attendance breakdown, or progress-report content, since the API provides none of them', () => {
    render(<ParentAcademicProgress data={sampleData} />)

    expect(screen.queryByText(/^assignments$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/present|absent|late/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/progress report/i)).not.toBeInTheDocument()
  })

  // Regression tests for SCRUM-147 AC #2/#4. The server already scopes `feedbackHistory` to
  // `TeacherFeedback.find({ visibility: "shared" })` (never `TeacherNote`) — see
  // apps/api/src/services/students/studentViews.js and the backend integration test
  // "never exposes private teacher notes" in student-views.test.js. These tests prove the
  // frontend side of the same guarantee: this component has no code path that reads or
  // displays anything other than `feedbackHistory`, even if a malformed/legacy response smuggled
  // extra fields in.
  it('renders only the items in feedbackHistory, never a hypothetical private-note field on the same payload', () => {
    const dataWithLeakedField = {
      ...sampleData,
      // Simulates a malformed/legacy API response that accidentally included a private note
      // alongside the real, shared feedback — this component must never read or render it.
      teacherNotes: [{ id: 'tn1', message: 'PRIVATE-NOTE-never-share-with-families' }],
    }

    render(<ParentAcademicProgress data={dataWithLeakedField} />)

    expect(screen.getByText('Great persistence.')).toBeInTheDocument()
    expect(screen.queryByText(/private-note-never-share/i)).not.toBeInTheDocument()
  })

  it('restricts rendered feedback to exactly the shared/published records the API returned, adding and inventing none', () => {
    const sharedOnly = [
      { id: 'f1', teacher: 'Dr. Maya Chen', date: '2026-09-18', message: 'Great persistence.' },
      { id: 'f2', teacher: 'Dr. Maya Chen', date: '2026-09-10', message: 'Keep it up.' },
    ]

    render(<ParentAcademicProgress data={{ ...sampleData, feedbackHistory: sharedOnly }} />)

    const messages = screen.getAllByText(/persistence|keep it up/i)
    expect(messages).toHaveLength(2)
  })
})
