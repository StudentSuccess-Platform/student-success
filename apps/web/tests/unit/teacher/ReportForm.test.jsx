import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportForm from '../../../src/components/teacher/reports/ReportForm'
import { createReport, editReport, getStudentClasses, getSummarySuggestion } from '../../../src/services/teacherReportsApi'
import { getStudents } from '../../../src/services/teacherStudentsApi'

vi.mock('../../../src/services/teacherReportsApi', () => ({
  createReport: vi.fn(),
  editReport: vi.fn(),
  getStudentClasses: vi.fn(),
  getSummarySuggestion: vi.fn(),
}))

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(),
}))

const students = { students: [{ id: 's1', name: 'Ada Strong' }, { id: 's2', name: 'Ben Behind' }] }

async function fillPeriod(user) {
  await user.type(screen.getByLabelText('Period start'), '2025-10-01')
  await user.type(screen.getByLabelText('Period end'), '2025-10-31')
}

describe('ReportForm (new report)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getStudents.mockResolvedValue(students)
    getStudentClasses.mockResolvedValue([{ id: 'c1', name: 'Algebra I' }])
    getSummarySuggestion.mockResolvedValue({ summary: 'Suggested text.' })
    createReport.mockResolvedValue({ report: { id: 'r1' } })
  })

  it('lists the teacher’s students and loads the classes of the one chosen, selecting a single class', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSaved={vi.fn()} onCancel={vi.fn()} />)

    expect(await screen.findByRole('option', { name: 'Ada Strong' })).toBeInTheDocument()
    expect(screen.getByLabelText('Class')).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Student'), 's1')

    expect(getStudentClasses).toHaveBeenCalledWith('s1')
    expect(await screen.findByRole('option', { name: 'Algebra I' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Class')).toHaveValue('c1'))
  })

  it('names every missing field and saves nothing', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    await screen.findByRole('option', { name: 'Ada Strong' })

    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(screen.getByText('Student is required')).toBeInTheDocument()
    expect(screen.getByText('Class is required')).toBeInTheDocument()
    expect(screen.getByText('Start date is required')).toBeInTheDocument()
    expect(screen.getByText('End date is required')).toBeInTheDocument()
    expect(screen.getByText('Summary is required')).toBeInTheDocument()
    expect(createReport).not.toHaveBeenCalled()
  })

  it('suggests a summary from the chosen class and period, which the teacher can then edit', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    await screen.findByRole('option', { name: 'Ada Strong' })
    await user.selectOptions(screen.getByLabelText('Student'), 's1')
    await waitFor(() => expect(screen.getByLabelText('Class')).toHaveValue('c1'))
    await fillPeriod(user)

    await user.click(screen.getByRole('button', { name: 'Suggest summary' }))

    expect(getSummarySuggestion).toHaveBeenCalledWith('s1', { sectionId: 'c1', periodStart: '2025-10-01', periodEnd: '2025-10-31' })
    const summary = screen.getByLabelText('Summary')
    await waitFor(() => expect(summary).toHaveValue('Suggested text.'))
    await user.type(summary, ' Plus my own note.')
    expect(summary).toHaveValue('Suggested text. Plus my own note.')
  })

  it('asks for the student, class and dates before suggesting', async () => {
    const user = userEvent.setup()
    render(<ReportForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    await screen.findByRole('option', { name: 'Ada Strong' })

    await user.click(screen.getByRole('button', { name: 'Suggest summary' }))

    expect(screen.getByText(/choose the student, class and dates first/i)).toBeInTheDocument()
    expect(getSummarySuggestion).not.toHaveBeenCalled()
  })

  it('saves a draft with the class, period and summary, then tells its parent', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<ReportForm onSaved={onSaved} onCancel={vi.fn()} />)
    await screen.findByRole('option', { name: 'Ada Strong' })
    await user.selectOptions(screen.getByLabelText('Student'), 's1')
    await waitFor(() => expect(screen.getByLabelText('Class')).toHaveValue('c1'))
    await fillPeriod(user)
    await user.type(screen.getByLabelText('Summary'), 'Doing well.')

    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(createReport).toHaveBeenCalledWith('s1', { sectionId: 'c1', periodStart: '2025-10-01', periodEnd: '2025-10-31', summary: 'Doing well.' })
  })

  it('shows the server’s field errors and keeps what was typed', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    createReport.mockRejectedValueOnce(Object.assign(new Error('Please fix the highlighted fields'), { fields: { periodEnd: 'Must not be before the start date' } }))
    render(<ReportForm onSaved={onSaved} onCancel={vi.fn()} />)
    await screen.findByRole('option', { name: 'Ada Strong' })
    await user.selectOptions(screen.getByLabelText('Student'), 's1')
    await waitFor(() => expect(screen.getByLabelText('Class')).toHaveValue('c1'))
    await user.type(screen.getByLabelText('Period start'), '2025-10-31')
    await user.type(screen.getByLabelText('Period end'), '2025-10-01')
    await user.type(screen.getByLabelText('Summary'), 'Keep me.')

    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(await screen.findByText('Must not be before the start date')).toBeInTheDocument()
    expect(screen.getByText('Please fix the highlighted fields')).toBeInTheDocument()
    expect(screen.getByLabelText('Summary')).toHaveValue('Keep me.')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('cancel calls onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ReportForm onSaved={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
  })
})

describe('ReportForm (edit a draft)', () => {
  const report = {
    id: 'r1',
    studentId: 's1',
    studentName: 'Ada Strong',
    sectionId: 'c1',
    className: 'Algebra I',
    periodStart: '2025-10-01',
    periodEnd: '2025-10-31',
    summary: 'First draft.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    editReport.mockResolvedValue({ report })
    getSummarySuggestion.mockResolvedValue({ summary: 'New suggestion.' })
  })

  it('shows the student and class as fixed text, prefilled, without loading the student list', async () => {
    render(<ReportForm report={report} onSaved={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Ada Strong')).toBeInTheDocument()
    expect(screen.getByText(/Algebra I/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Student')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Period start')).toHaveValue('2025-10-01')
    expect(screen.getByLabelText('Summary')).toHaveValue('First draft.')
    expect(getStudents).not.toHaveBeenCalled()
  })

  it('saves the changes for that report', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<ReportForm report={report} onSaved={onSaved} onCancel={vi.fn()} />)
    const summary = screen.getByLabelText('Summary')
    await user.clear(summary)
    await user.type(summary, 'Revised.')

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(editReport).toHaveBeenCalledWith('s1', 'r1', { periodStart: '2025-10-01', periodEnd: '2025-10-31', summary: 'Revised.' })
  })

  it('can suggest a summary for the report’s class without choosing anything again', async () => {
    const user = userEvent.setup()
    render(<ReportForm report={report} onSaved={vi.fn()} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Suggest summary' }))

    expect(getSummarySuggestion).toHaveBeenCalledWith('s1', { sectionId: 'c1', periodStart: '2025-10-01', periodEnd: '2025-10-31' })
    await waitFor(() => expect(screen.getByLabelText('Summary')).toHaveValue('New suggestion.'))
  })
})
