import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GoalEditForm from '../../../src/components/teacher/records/GoalEditForm'
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
  {
    id: 'g1',
    title: 'Read 20 minutes',
    description: '',
    targetDate: '2025-12-15T12:00:00.000Z',
    status: 'active',
    progress: 30,
    updates: [],
  },
  { id: 'g2', title: 'Finish essay', description: '', targetDate: null, status: 'achieved', progress: 100, updates: [] },
]

beforeEach(() => {
  api.updateGoal.mockResolvedValue({ goal: { id: 'g1' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderForm(props = {}) {
  const onSaved = vi.fn()
  render(<GoalEditForm studentId="stu-1" goals={goals} onSaved={onSaved} {...props} />)
  return { onSaved, user: userEvent.setup() }
}

function saveButton() {
  return screen.getByRole('button', { name: 'Save goal changes' })
}

describe('GoalEditForm', () => {
  it('shows the heading, the goal select and the editable fields', () => {
    renderForm()

    expect(screen.getByRole('heading', { name: 'Edit a goal', level: 3 })).toBeInTheDocument()
    expect(screen.getByLabelText('Goal to edit')).toBeInTheDocument()
    expect(screen.getByLabelText('Updated title')).toHaveValue('')
    expect(screen.getByLabelText('Updated target date')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Goal status')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
  })

  it('pre-fills the other fields when a goal is picked', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')

    expect(screen.getByLabelText('Updated title')).toHaveValue('Read 20 minutes')
    expect(screen.getByLabelText('Updated target date')).toHaveValue('2025-12-15')
    expect(screen.getByLabelText('Goal status')).toHaveValue('active')
  })

  it('requires a goal to be picked before calling the API', async () => {
    const { user, onSaved } = renderForm()

    await user.click(saveButton())

    expect(api.updateGoal).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText('Goal to edit is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Goal to edit')).toHaveAttribute('aria-invalid', 'true')
  })

  it('requires a title when the title is cleared', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')
    await user.clear(screen.getByLabelText('Updated title'))
    await user.click(saveButton())

    expect(api.updateGoal).not.toHaveBeenCalled()
    expect(screen.getByText('Updated title is required')).toBeInTheDocument()
  })

  it('asks for at least one change when nothing differs from the goal', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')
    await user.click(saveButton())

    expect(api.updateGoal).not.toHaveBeenCalled()
    expect(screen.getByText('Change at least one field')).toHaveAttribute('role', 'alert')
  })

  it('sends only the changed title, trimmed, and shows Saved once', async () => {
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')
    await user.clear(screen.getByLabelText('Updated title'))
    await user.type(screen.getByLabelText('Updated title'), '  Read 30 minutes  ')
    await user.click(saveButton())

    expect(api.updateGoal).toHaveBeenCalledTimes(1)
    expect(api.updateGoal).toHaveBeenCalledWith('stu-1', 'g1', { title: 'Read 30 minutes' })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('sends only the status when only the status changes', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g2')
    await user.selectOptions(screen.getByLabelText('Goal status'), 'abandoned')
    await user.click(saveButton())

    expect(api.updateGoal).toHaveBeenCalledWith('stu-1', 'g2', { status: 'abandoned' })
  })

  it('clears a previously set target date by sending null', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')
    fireEvent.change(screen.getByLabelText('Updated target date'), { target: { value: '' } })
    await user.click(saveButton())

    expect(api.updateGoal).toHaveBeenCalledWith('stu-1', 'g1', { targetDate: null })
  })

  it('sends a target date that was set on a goal without one', async () => {
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g2')
    fireEvent.change(screen.getByLabelText('Updated target date'), { target: { value: '2026-01-10' } })
    await user.click(saveButton())

    expect(api.updateGoal).toHaveBeenCalledWith('stu-1', 'g2', { targetDate: '2026-01-10' })
  })

  it('shows a general server error and keeps the typed values', async () => {
    api.updateGoal.mockRejectedValue(new ApiError('Goal not found', { status: 404 }))
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')
    await user.clear(screen.getByLabelText('Updated title'))
    await user.type(screen.getByLabelText('Updated title'), 'Renamed')
    await user.click(saveButton())

    expect(await screen.findByText('Goal not found')).toHaveAttribute('role', 'alert')
    expect(screen.getByLabelText('Updated title')).toHaveValue('Renamed')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('links server field errors to their inputs', async () => {
    api.updateGoal.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { title: 'Title is too long' } },
      })
    )
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')
    await user.type(screen.getByLabelText('Updated title'), ' more')
    await user.click(saveButton())

    const title = screen.getByLabelText('Updated title')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(title.getAttribute('aria-describedby'))).toHaveTextContent(
      'Title is too long'
    )
  })

  it('disables the save button while saving', async () => {
    api.updateGoal.mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Goal to edit'), 'g1')
    await user.type(screen.getByLabelText('Updated title'), ' more')
    await user.click(saveButton())

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('shows an empty hint and no fields when there are no goals', () => {
    renderForm({ goals: [] })

    expect(screen.getByText('No goals yet. Add a goal first, then edit it here.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Goal to edit')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save goal changes' })).not.toBeInTheDocument()
  })
})
