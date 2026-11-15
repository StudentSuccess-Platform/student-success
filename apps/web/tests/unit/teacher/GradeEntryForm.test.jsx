import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GradeEntryForm from '../../../src/components/teacher/records/GradeEntryForm'
import * as api from '../../../src/services/teacherRecordsApi'
import { ApiError } from '../../../src/services/http'

vi.mock('../../../src/services/teacherRecordsApi', () => ({
  saveGrade: vi.fn(),
  saveAttendance: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  addGoalUpdate: vi.fn(),
  createFeedback: vi.fn(),
  updateFeedback: vi.fn(),
}))

const grades = [
  { assignmentId: 'a1', sectionId: 'sec-1', className: 'Algebra II', title: 'Quiz 3', pointsPossible: 20 },
  { assignmentId: 'a2', sectionId: 'sec-2', className: 'World History', title: 'Essay', pointsPossible: 50 },
]

beforeEach(() => {
  api.saveGrade.mockResolvedValue({ grade: { assignmentId: 'a1', pointsEarned: 18, status: 'graded' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderForm(props = {}) {
  const onSaved = vi.fn()
  render(<GradeEntryForm studentId="stu-1" grades={grades} onSaved={onSaved} {...props} />)
  return { onSaved, user: userEvent.setup() }
}

describe('GradeEntryForm', () => {
  it('lists assignments as "Class - Assignment" and shows the three fields', () => {
    renderForm()

    const assignment = screen.getByLabelText('Assignment')
    expect(screen.getByRole('option', { name: 'Algebra II - Quiz 3' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'World History - Essay' })).toBeInTheDocument()
    expect(assignment).toBeInTheDocument()
    expect(screen.getByLabelText('Points earned')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Status')).toHaveValue('graded')
    expect(screen.getByRole('button', { name: 'Save grade' })).toBeEnabled()
  })

  it('blocks the call and names the missing fields when a graded entry is empty', async () => {
    const { user, onSaved } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    expect(api.saveGrade).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText('Assignment is required')).toBeInTheDocument()
    expect(screen.getByText('Points earned is required')).toBeInTheDocument()

    const assignment = screen.getByLabelText('Assignment')
    expect(assignment).toHaveAttribute('aria-invalid', 'true')
    expect(assignment).toHaveAttribute('aria-describedby', 'grade-assignment-error')
    expect(screen.getByLabelText('Points earned')).toHaveAttribute('aria-describedby', 'grade-points-error')
  })

  it('does not require points for a missing assignment', async () => {
    api.saveGrade.mockResolvedValue({})
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Assignment'), 'a2')
    await user.selectOptions(screen.getByLabelText('Status'), 'missing')
    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    expect(api.saveGrade).toHaveBeenCalledWith('stu-1', { assignmentId: 'a2', status: 'missing' })
  })

  it('sends the exact payload, shows Saved, clears the form and calls onSaved once', async () => {
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Assignment'), 'a1')
    await user.type(screen.getByLabelText('Points earned'), '18')
    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    expect(api.saveGrade).toHaveBeenCalledTimes(1)
    expect(api.saveGrade).toHaveBeenCalledWith('stu-1', { assignmentId: 'a1', pointsEarned: 18, status: 'graded' })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Assignment')).toHaveValue('')
    expect(screen.getByLabelText('Points earned')).toHaveValue(null)
  })

  it('shows server field errors under the matching inputs and the general message in an alert', async () => {
    api.saveGrade.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { pointsEarned: 'Points earned must be 0 or more' } },
      })
    )
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Assignment'), 'a1')
    await user.type(screen.getByLabelText('Points earned'), '-4')
    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    expect(await screen.findByText('Please fix the highlighted fields')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Points earned must be 0 or more')).toBeInTheDocument()
    expect(screen.getByLabelText('Points earned')).toHaveAttribute('aria-invalid', 'true')
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a general server error that has no field', async () => {
    api.saveGrade.mockRejectedValue(new ApiError('The grade could not be saved', { status: 500 }))
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Assignment'), 'a1')
    await user.type(screen.getByLabelText('Points earned'), '10')
    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    expect(await screen.findByText(/The grade could not be saved/)).toHaveAttribute('role', 'alert')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('disables the button and shows Saving while the request is pending', async () => {
    api.saveGrade.mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Assignment'), 'a1')
    await user.type(screen.getByLabelText('Points earned'), '18')
    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    const savingButton = await screen.findByRole('button', { name: 'Saving…' })
    expect(savingButton).toBeDisabled()
  })

  it('shows a hint instead of a form when the student has no assignments', () => {
    renderForm({ grades: [] })

    expect(screen.getByText(/No assignments yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save grade' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Assignment')).not.toBeInTheDocument()
  })
})
