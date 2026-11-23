import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsView from '../../../src/pages/teacher/ReportsView'

vi.mock('../../../src/services/teacherReportsApi', () => ({
  deleteReport: vi.fn(),
  publishReport: vi.fn(),
  editReport: vi.fn(),
  createReport: vi.fn(),
  getStudentClasses: vi.fn(() => Promise.resolve([])),
  getSummarySuggestion: vi.fn(),
}))

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(() => Promise.resolve({ students: [{ id: 's1', name: 'Ada Strong' }] })),
}))

const report = (overrides) => ({
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
  ...overrides,
})

const data = {
  reports: [
    report({ id: 'r1', summary: 'A draft summary.' }),
    report({ id: 'r2', studentName: 'Ben Behind', summary: 'A published summary.', status: 'published', publishedAt: '2025-11-05T15:00:00.000Z' }),
  ],
  counts: { draft: 1, pending_review: 0, published: 1 },
}

describe('ReportsView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows a loading message, then nothing else', () => {
    render(<ReportsView data={null} isLoading error={null} onChanged={vi.fn()} />)

    expect(screen.getByText('Loading reports…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New report' })).not.toBeInTheDocument()
  })

  it('shows an error when the first load fails', () => {
    render(<ReportsView data={null} isLoading={false} error={new Error('x')} onChanged={vi.fn()} />)

    expect(screen.getByText(/couldn.t load reports/i)).toBeInTheDocument()
  })

  it('explains that families only see published reports', () => {
    render(<ReportsView data={data} isLoading={false} error={null} onChanged={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByText(/only after you publish it/i)).toBeInTheDocument()
  })

  it('lists every report with the counts of each status', () => {
    render(<ReportsView data={data} isLoading={false} error={null} onChanged={vi.fn()} />)

    expect(screen.getByLabelText('Report counts')).toHaveTextContent('1 draft · 1 published')
    expect(screen.getByRole('article', { name: 'Ada Strong, Algebra I report' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Ben Behind, Algebra I report' })).toBeInTheDocument()
    expect(screen.getByText('A draft summary.')).toBeInTheDocument()
  })

  it('mentions reports pending review only when there are some', () => {
    const { rerender } = render(<ReportsView data={data} isLoading={false} error={null} onChanged={vi.fn()} />)
    expect(screen.getByLabelText('Report counts')).not.toHaveTextContent('pending review')

    rerender(<ReportsView data={{ ...data, counts: { draft: 1, pending_review: 2, published: 1 } }} isLoading={false} error={null} onChanged={vi.fn()} />)
    expect(screen.getByLabelText('Report counts')).toHaveTextContent('2 pending review')
  })

  it('filters by status', async () => {
    const user = userEvent.setup()
    render(<ReportsView data={data} isLoading={false} error={null} onChanged={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('Show'), 'published')
    expect(screen.queryByText('A draft summary.')).not.toBeInTheDocument()
    expect(screen.getByText('A published summary.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Show'), 'draft')
    expect(screen.getByText('A draft summary.')).toBeInTheDocument()
    expect(screen.queryByText('A published summary.')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Show'), 'pending_review')
    expect(screen.getByText('No reports match this filter.')).toBeInTheDocument()
  })

  it('invites the teacher to write the first report when there are none', () => {
    render(<ReportsView data={{ reports: [], counts: { draft: 0, pending_review: 0, published: 0 } }} isLoading={false} error={null} onChanged={vi.fn()} />)

    expect(screen.getByText(/No reports yet/)).toBeInTheDocument()
    expect(screen.getByLabelText('Report counts')).toHaveTextContent('0 drafts · 0 published')
  })

  it('opens the new report form, and Cancel closes it', async () => {
    const user = userEvent.setup()
    render(<ReportsView data={data} isLoading={false} error={null} onChanged={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'New report' }))

    const form = screen.getByRole('form', { name: 'New report' })
    expect(within(form).getByLabelText('Summary')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New report' })).not.toBeInTheDocument()

    await user.click(within(form).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('form', { name: 'New report' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New report' })).toBeInTheDocument()
  })

  it('keeps showing the loaded reports with a notice when a refresh fails', () => {
    render(<ReportsView data={data} isLoading={false} error={new Error('x')} onChanged={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t refresh the list/i)
    expect(screen.getByText('A draft summary.')).toBeInTheDocument()
  })
})
