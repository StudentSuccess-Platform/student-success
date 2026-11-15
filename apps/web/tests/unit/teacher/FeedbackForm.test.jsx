import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackForm from '../../../src/components/teacher/records/FeedbackForm'
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

const classes = [
  { id: 'sec-1', name: 'Algebra II', period: 2, room: '101' },
  { id: 'sec-2', name: 'World History', period: 4, room: '210' },
]

beforeEach(() => {
  api.createFeedback.mockResolvedValue({ feedback: { id: 'f1', sectionId: 'sec-1', body: 'Nice' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderForm(props = {}) {
  const onSaved = vi.fn()
  render(<FeedbackForm studentId="stu-1" classes={classes} onSaved={onSaved} {...props} />)
  return { onSaved, user: userEvent.setup() }
}

describe('FeedbackForm', () => {
  it('shows the class select and the feedback textarea', () => {
    renderForm()

    expect(screen.getByRole('option', { name: 'Algebra II' })).toBeInTheDocument()
    expect(screen.getByLabelText('Feedback').tagName).toBe('TEXTAREA')
    expect(screen.getByRole('button', { name: 'Save feedback' })).toBeEnabled()
  })

  it('blocks the call and names Class and Feedback when they are empty', async () => {
    const { user, onSaved } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Save feedback' }))

    expect(api.createFeedback).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText('Class is required')).toBeInTheDocument()
    expect(screen.getByText('Feedback is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Feedback')).toHaveAttribute('aria-describedby', 'feedback-body-error')
  })

  it('sends the exact payload, shows Saved, clears the form and calls onSaved once', async () => {
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Class'), 'sec-1')
    await user.type(screen.getByLabelText('Feedback'), ' Great work on proofs ')
    await user.click(screen.getByRole('button', { name: 'Save feedback' }))

    expect(api.createFeedback).toHaveBeenCalledTimes(1)
    expect(api.createFeedback).toHaveBeenCalledWith('stu-1', {
      sectionId: 'sec-1',
      body: 'Great work on proofs',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Feedback')).toHaveValue('')
  })

  it('shows server field errors and the general message on failure', async () => {
    api.createFeedback.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { body: 'Feedback is too long' } },
      })
    )
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Class'), 'sec-2')
    await user.type(screen.getByLabelText('Feedback'), 'Long text')
    await user.click(screen.getByRole('button', { name: 'Save feedback' }))

    expect(await screen.findByText('Please fix the highlighted fields')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Feedback is too long')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('disables the button and shows Saving while the request is pending', async () => {
    api.createFeedback.mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Class'), 'sec-1')
    await user.type(screen.getByLabelText('Feedback'), 'Pending')
    await user.click(screen.getByRole('button', { name: 'Save feedback' }))

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('shows a hint instead of a form when the student has no classes', () => {
    renderForm({ classes: [] })

    expect(screen.getByText(/No classes yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save feedback' })).not.toBeInTheDocument()
  })
})
