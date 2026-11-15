import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AttendanceEntryForm from '../../../src/components/teacher/records/AttendanceEntryForm'
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
  api.saveAttendance.mockResolvedValue({ attendance: { id: 'att-1', sectionId: 'sec-1', date: '2025-11-14', status: 'tardy' } })
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderForm(props = {}) {
  const onSaved = vi.fn()
  render(<AttendanceEntryForm studentId="stu-1" classes={classes} onSaved={onSaved} {...props} />)
  return { onSaved, user: userEvent.setup() }
}

describe('AttendanceEntryForm', () => {
  it('shows the class, date and status fields with their defaults', () => {
    renderForm()

    expect(screen.getByRole('option', { name: 'Algebra II' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'World History' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Status')).toHaveValue('present')
    expect(screen.getByRole('button', { name: 'Save attendance' })).toBeEnabled()
  })

  it('blocks the call and names the Class and Date fields when they are empty', async () => {
    const { user, onSaved } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Save attendance' }))

    expect(api.saveAttendance).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText('Class is required')).toBeInTheDocument()
    expect(screen.getByText('Date is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-describedby', 'attendance-date-error')
  })

  it('sends the exact payload, shows Saved, clears the form and calls onSaved once', async () => {
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Class'), 'sec-1')
    await user.type(screen.getByLabelText('Date'), '2025-11-14')
    await user.selectOptions(screen.getByLabelText('Status'), 'tardy')
    await user.click(screen.getByRole('button', { name: 'Save attendance' }))

    expect(api.saveAttendance).toHaveBeenCalledTimes(1)
    expect(api.saveAttendance).toHaveBeenCalledWith('stu-1', {
      sectionId: 'sec-1',
      date: '2025-11-14',
      status: 'tardy',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Saved')
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Class')).toHaveValue('')
    expect(screen.getByLabelText('Date')).toHaveValue('')
  })

  it('shows server field errors and the general message on failure', async () => {
    api.saveAttendance.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { date: 'Date is outside the term' } },
      })
    )
    const { user, onSaved } = renderForm()

    await user.selectOptions(screen.getByLabelText('Class'), 'sec-1')
    await user.type(screen.getByLabelText('Date'), '2030-01-01')
    await user.click(screen.getByRole('button', { name: 'Save attendance' }))

    expect(await screen.findByText('Please fix the highlighted fields')).toHaveAttribute('role', 'alert')
    expect(screen.getByText('Date is outside the term')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('disables the button and shows Saving while the request is pending', async () => {
    api.saveAttendance.mockReturnValue(new Promise(() => {}))
    const { user } = renderForm()

    await user.selectOptions(screen.getByLabelText('Class'), 'sec-2')
    await user.type(screen.getByLabelText('Date'), '2025-11-14')
    await user.click(screen.getByRole('button', { name: 'Save attendance' }))

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('shows a hint instead of a form when the student has no classes', () => {
    renderForm({ classes: [] })

    expect(screen.getByText(/No classes yet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save attendance' })).not.toBeInTheDocument()
  })
})
