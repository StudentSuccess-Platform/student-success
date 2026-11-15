import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RecordsPanel from '../../../src/components/teacher/records/RecordsPanel'
import * as api from '../../../src/services/teacherRecordsApi'

vi.mock('../../../src/services/teacherRecordsApi', () => ({
  saveGrade: vi.fn(),
  saveAttendance: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  addGoalUpdate: vi.fn(),
  createFeedback: vi.fn(),
  updateFeedback: vi.fn(),
}))

// Sample of the GET /api/v1/teacher/students/:id payload (only the fields the panel reads).
const profile = {
  student: { id: 'stu-1', name: 'Judson Greenfelder', gradeLevel: 10, studentNumber: 'S-1' },
  classes: [{ id: 'sec-1', name: 'Algebra II', period: 2, room: '101' }],
  grades: [{ assignmentId: 'a1', sectionId: 'sec-1', className: 'Algebra II', title: 'Quiz 3', pointsPossible: 20 }],
  goals: [{ id: 'g1', title: 'Read 20 minutes', progress: 30, updates: [] }],
  feedback: [{ id: 'f1', sectionId: 'sec-1', className: 'Algebra II', body: 'Shows steady effort' }],
}

beforeEach(() => {
  api.saveGrade.mockResolvedValue({ grade: { assignmentId: 'a1', pointsEarned: 15, status: 'graded' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('RecordsPanel', () => {
  it('renders the heading and every record form from a sample profile', () => {
    render(<RecordsPanel student={profile} onSaved={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Enter Academic Records' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save grade' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save attendance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add goal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save goal progress' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save feedback' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('gives each form its own labelled group', () => {
    render(<RecordsPanel student={profile} onSaved={vi.fn()} />)

    const groups = screen.getAllByRole('group')
    expect(groups.length).toBeGreaterThanOrEqual(6)
    for (const group of groups) {
      expect(group).toHaveAttribute('aria-labelledby')
    }
  })

  it('saves a grade for the profile student and calls onSaved', async () => {
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<RecordsPanel student={profile} onSaved={onSaved} />)

    await user.selectOptions(screen.getByLabelText('Assignment'), 'a1')
    await user.type(screen.getByLabelText('Points earned'), '15')
    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    expect(api.saveGrade).toHaveBeenCalledWith('stu-1', { assignmentId: 'a1', pointsEarned: 15, status: 'graded' })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('handles a profile with no grades, classes, goals or feedback', () => {
    render(
      <RecordsPanel
        student={{ student: { id: 'stu-2', name: 'New Student' }, classes: [], grades: [], goals: [], feedback: [] }}
        onSaved={vi.fn()}
      />
    )

    expect(screen.getByText(/No assignments yet/)).toBeInTheDocument()
    expect(screen.getAllByText(/No classes yet/)).toHaveLength(2)
    expect(screen.getByText(/No goals yet/)).toBeInTheDocument()
    expect(screen.getByText('No feedback yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add goal' })).toBeEnabled()
  })
})
