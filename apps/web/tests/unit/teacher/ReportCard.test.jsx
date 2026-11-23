import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportCard from '../../../src/components/teacher/reports/ReportCard'
import { deleteReport, publishReport } from '../../../src/services/teacherReportsApi'

vi.mock('../../../src/services/teacherReportsApi', () => ({
  deleteReport: vi.fn(),
  publishReport: vi.fn(),
  editReport: vi.fn(),
  createReport: vi.fn(),
  getStudentClasses: vi.fn(),
  getSummarySuggestion: vi.fn(),
}))

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(() => Promise.resolve({ students: [] })),
}))

const draft = {
  id: 'r1',
  studentId: 's1',
  studentName: 'Ada Strong',
  sectionId: 'c1',
  className: 'Algebra I',
  periodStart: '2025-10-01',
  periodEnd: '2025-10-31',
  summary: 'Ada is doing well.',
  status: 'draft',
  updatedAt: '2025-11-02T15:00:00.000Z',
  publishedAt: null,
}

const published = { ...draft, id: 'r2', status: 'published', publishedAt: '2025-11-05T15:00:00.000Z' }

describe('ReportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    publishReport.mockResolvedValue({ report: published })
    deleteReport.mockResolvedValue({ deleted: true, id: 'r1' })
  })

  it('shows the student, class, period, status and summary of a draft, with Edit, Publish and Delete', () => {
    render(<ReportCard report={draft} onChanged={vi.fn()} />)

    const card = screen.getByRole('article', { name: 'Ada Strong, Algebra I report' })
    expect(within(card).getByRole('heading', { name: 'Ada Strong' })).toBeInTheDocument()
    expect(within(card).getByText(/Algebra I · Oct 1, 2025 to Oct 31, 2025/)).toBeInTheDocument()
    expect(within(card).getByText('Draft')).toBeInTheDocument()
    expect(within(card).getByText('Ada is doing well.')).toBeInTheDocument()
    expect(within(card).getByText(/Last saved Nov 2, 2025/)).toBeInTheDocument()
    for (const name of ['Edit', 'Publish', 'Delete']) {
      expect(within(card).getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('a published report is read only and says when it was published', () => {
    render(<ReportCard report={published} onChanged={vi.fn()} />)

    expect(screen.getByText('Published', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText(/Published Nov 5, 2025/)).toBeInTheDocument()
    for (const name of ['Edit', 'Publish', 'Delete']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('asks before publishing, and says who will see it', async () => {
    const user = userEvent.setup()
    render(<ReportCard report={draft} onChanged={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Publish' }))

    const confirm = screen.getByRole('group', { name: 'Confirm publish' })
    expect(within(confirm).getByText(/Ada Strong and their linked parents will be able to read it/)).toBeInTheDocument()
    expect(publishReport).not.toHaveBeenCalled()
  })

  it('publishes after the teacher confirms, then refreshes the list', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(<ReportCard report={draft} onChanged={onChanged} />)

    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await user.click(screen.getByRole('button', { name: 'Confirm publish' }))

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(publishReport).toHaveBeenCalledWith('s1', 'r1')
  })

  it('cancelling the publish confirmation changes nothing', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(<ReportCard report={draft} onChanged={onChanged} />)

    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('group', { name: 'Confirm publish' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
    expect(publishReport).not.toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('shows the server’s message when publishing fails, and stays on the report', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    publishReport.mockRejectedValueOnce(new Error('A published report cannot be published again'))
    render(<ReportCard report={draft} onChanged={onChanged} />)

    await user.click(screen.getByRole('button', { name: 'Publish' }))
    await user.click(screen.getByRole('button', { name: 'Confirm publish' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A published report cannot be published again')
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('deletes a draft only after confirming', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(<ReportCard report={draft} onChanged={onChanged} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleteReport).not.toHaveBeenCalled()
    expect(screen.getByText('Delete this draft? This cannot be undone.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(deleteReport).toHaveBeenCalledWith('s1', 'r1')
  })

  it('Edit opens the form for that report, and Cancel returns to the card', async () => {
    const user = userEvent.setup()
    render(<ReportCard report={draft} onChanged={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('form', { name: 'Edit report' })).toBeInTheDocument()
    expect(screen.getByLabelText('Summary')).toHaveValue('Ada is doing well.')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('form', { name: 'Edit report' })).not.toBeInTheDocument()
    expect(screen.getByText('Ada is doing well.')).toBeInTheDocument()
  })
})
