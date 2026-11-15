import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GoalForm from '../../../src/components/teacher/records/GoalForm'
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

beforeEach(() => {
  api.createGoal.mockResolvedValue({ goal: { id: 'g1', title: 'Read 20 minutes' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderForm() {
  const onSaved = vi.fn()
  render(<GoalForm studentId="stu-1" onSaved={onSaved} />)
  return { onSaved, user: userEvent.setup() }
}

describe('GoalForm', () => {
  it('shows the goal title, description and target date fields', () => {
    renderForm()

    expect(screen.getByLabelText('Goal title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Target date')).toHaveAttribute('type', 'date')
    expect(screen.getByRole('button', { name: 'Add goal' })).toBeEnabled()
  })

  it('blocks the call and names Goal title when it is blank', async () => {
    const { user, onSaved } = renderForm()

    await user.type(screen.getByLabelText('Goal title'), '   ')
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(api.createGoal).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText('Goal title is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Goal title')).toHaveAttribute('aria-describedby', 'goal-title-error')
  })

  it('sends the title only when optional fields are empty, then shows Saved and calls onSaved once', async () => {
    const { user, onSaved } = renderForm()

    await user.type(screen.getByLabelText('Goal title'), '  Read 20 minutes  ')
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(api.createGoal).toHaveBeenCalledWith('stu-1', { title: 'Read 20 minutes' })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Goal title')).toHaveValue('')
  })

  it('sends description and target date when they are filled in', async () => {
    const { user } = renderForm()

    await user.type(screen.getByLabelText('Goal title'), 'Finish essay')
    await user.type(screen.getByLabelText('Description'), 'Draft by Friday')
    await user.type(screen.getByLabelText('Target date'), '2025-12-05')
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(api.createGoal).toHaveBeenCalledWith('stu-1', {
      title: 'Finish essay',
      description: 'Draft by Friday',
      targetDate: '2025-12-05',
    })
  })

  it('shows server field errors and the general message on failure', async () => {
    api.createGoal.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { title: 'Title is too long' } },
      })
    )
    const { user, onSaved } = renderForm()

    await user.type(screen.getByLabelText('Goal title'), 'x')
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please fix the highlighted fields')
    expect(screen.getByText('Title is too long')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('disables the button and shows Saving while the request is pending', async () => {
    api.createGoal.mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await user.type(screen.getByLabelText('Goal title'), 'Read more')
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
  })
})
