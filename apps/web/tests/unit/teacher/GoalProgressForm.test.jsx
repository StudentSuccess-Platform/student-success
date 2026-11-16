import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GoalProgressForm from '../../../src/components/teacher/records/GoalProgressForm'
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

const goals = [
  { id: 'g1', title: 'Read 20 minutes', progress: 30, updates: [] },
  { id: 'g2', title: 'Finish essay', progress: 0, updates: [] },
]

beforeEach(() => {
  api.addGoalUpdate.mockResolvedValue({ update: { id: 'u1', progressPercent: 60, note: 'Good pace' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderForm(props = {}) {
  const onSaved = vi.fn()
  render(<GoalProgressForm studentId="stu-1" goals={goals} onSaved={onSaved} {...props} />)
  return { onSaved, user: userEvent.setup() }
}

describe('GoalProgressForm', () => {
  it('lists the student goals and shows the progress and note fields', () => {
    renderForm()

    expect(screen.getByRole('option', { name: 'Read 20 minutes' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Finish essay' })).toBeInTheDocument()
    expect(screen.getByLabelText('Progress (%)')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
  })

  it('blocks the call and names each empty field', async () => {
    const { user, onSaved } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Save goal progress' }))

    expect(api.addGoalUpdate).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText('Goal is required')).toBeInTheDocument()
    expect(screen.getByText('Progress (%) is required')).toBeInTheDocument()
    expect(screen.getByText('Note is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true')
  })

  it('rejects progress outside 0 to 100 before calling the API', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal'), 'g1')
    await user.type(screen.getByLabelText('Progress (%)'), '150')
    await user.type(screen.getByLabelText('Note'), 'Too high')
    await user.click(screen.getByRole('button', { name: 'Save goal progress' }))

    expect(api.addGoalUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Progress (%) must be between 0 and 100')).toBeInTheDocument()
  })

  it('sends the exact payload, shows Saved, clears the form and calls onSaved once', async () => {
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal'), 'g1')
    await user.type(screen.getByLabelText('Progress (%)'), '60')
    await user.type(screen.getByLabelText('Note'), ' Good pace ')
    await user.click(screen.getByRole('button', { name: 'Save goal progress' }))

    expect(api.addGoalUpdate).toHaveBeenCalledTimes(1)
    expect(api.addGoalUpdate).toHaveBeenCalledWith('stu-1', 'g1', { progressPercent: 60, note: 'Good pace' })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Note')).toHaveValue('')
    expect(screen.getByLabelText('Goal')).toHaveValue('')
  })

  it('shows server field errors and the general message on failure', async () => {
    api.addGoalUpdate.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { progressPercent: 'Progress must go up' } },
      })
    )
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal'), 'g2')
    await user.type(screen.getByLabelText('Progress (%)'), '10')
    await user.type(screen.getByLabelText('Note'), 'Hmm')
    await user.click(screen.getByRole('button', { name: 'Save goal progress' }))

    expect(await screen.findByText('Please fix the highlighted fields')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Progress must go up')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('disables the button and shows Saving while the request is pending', async () => {
    api.addGoalUpdate.mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal'), 'g1')
    await user.type(screen.getByLabelText('Progress (%)'), '50')
    await user.type(screen.getByLabelText('Note'), 'Halfway')
    await user.click(screen.getByRole('button', { name: 'Save goal progress' }))

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('shows a hint instead of a form when the student has no goals', () => {
    renderForm({ goals: [] })

    expect(screen.getByText(/No goals yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save goal progress' })).not.toBeInTheDocument()
  })
})

describe('GoalProgressForm progress rules', () => {
  it('rejects a decimal progress value and links the message to the input', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal'), 'g1')
    await user.type(screen.getByLabelText('Progress (%)'), '42.5')
    await user.type(screen.getByLabelText('Note'), 'Halfway')
    await user.click(screen.getByRole('button', { name: 'Save goal progress' }))

    expect(api.addGoalUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Progress (%) must be a whole number')).toBeInTheDocument()
    const progress = screen.getByLabelText('Progress (%)')
    expect(progress).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(progress.getAttribute('aria-describedby'))).toHaveTextContent(
      'Progress (%) must be a whole number'
    )
  })

  it('accepts 100 as a whole number', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal'), 'g2')
    await user.type(screen.getByLabelText('Progress (%)'), '100')
    await user.type(screen.getByLabelText('Note'), 'Done')
    await user.click(screen.getByRole('button', { name: 'Save goal progress' }))

    expect(api.addGoalUpdate).toHaveBeenCalledWith('stu-1', 'g2', { progressPercent: 100, note: 'Done' })
  })
})
