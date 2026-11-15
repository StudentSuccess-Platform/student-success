import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackList from '../../../src/components/teacher/records/FeedbackList'
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

const feedback = [
  { id: 'f1', sectionId: 'sec-1', className: 'Algebra II', body: 'Shows steady effort', createdAt: '2025-11-01T10:00:00.000Z', updatedAt: '2025-11-01T10:00:00.000Z' },
  { id: 'f2', sectionId: 'sec-2', className: 'World History', body: 'Needs to cite sources', createdAt: '2025-11-02T10:00:00.000Z', updatedAt: '2025-11-02T10:00:00.000Z' },
]

beforeEach(() => {
  api.updateFeedback.mockResolvedValue({ feedback: { id: 'f1', body: 'Revised' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderList(props = {}) {
  const onSaved = vi.fn()
  render(<FeedbackList studentId="stu-1" feedback={feedback} onSaved={onSaved} {...props} />)
  return { onSaved, user: userEvent.setup() }
}

describe('FeedbackList', () => {
  it('shows each feedback item with its class and an Edit button', () => {
    renderList()

    expect(screen.getByText('Shows steady effort')).toBeInTheDocument()
    expect(screen.getByText('Needs to cite sources')).toBeInTheDocument()
    expect(screen.getByText('Algebra II')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Save feedback' })).not.toBeInTheDocument()
  })

  it('shows an empty message when there is no feedback', () => {
    renderList({ feedback: [] })

    expect(screen.getByText('No feedback yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('opens an inline editor prefilled with the body, saves the change and calls onSaved once', async () => {
    const { user, onSaved } = renderList()

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    const editor = screen.getByLabelText('Edit feedback')
    expect(editor).toHaveValue('Shows steady effort')

    await user.clear(editor)
    await user.type(editor, ' Revised ')
    await user.click(screen.getByRole('button', { name: 'Save edited feedback' }))

    expect(api.updateFeedback).toHaveBeenCalledTimes(1)
    expect(api.updateFeedback).toHaveBeenCalledWith('stu-1', 'f1', { body: 'Revised' })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('blocks the save and names Feedback when the edited body is blank', async () => {
    const { user, onSaved } = renderList()

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    await user.clear(screen.getByLabelText('Edit feedback'))
    await user.click(screen.getByRole('button', { name: 'Save edited feedback' }))

    expect(api.updateFeedback).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText('Feedback is required')).toBeInTheDocument()
  })

  it('shows server errors inside the open editor', async () => {
    api.updateFeedback.mockRejectedValue(
      new ApiError('Only the teacher who wrote this feedback can change it', { status: 403 })
    )
    const { user, onSaved } = renderList()

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await user.click(screen.getByRole('button', { name: 'Save edited feedback' }))

    expect(await screen.findByText('Only the teacher who wrote this feedback can change it')).toHaveAttribute('role', 'alert')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('closes the editor with Cancel without calling the API', async () => {
    const { user } = renderList()

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(api.updateFeedback).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Edit feedback')).not.toBeInTheDocument()
    expect(screen.getByText('Shows steady effort')).toBeInTheDocument()
  })
})
