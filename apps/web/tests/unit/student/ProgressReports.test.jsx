import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgressReportList from '../../../src/components/student/ProgressReportList'
import StudentReports from '../../../src/pages/student/Reports'
import { getStudentReports } from '../../../src/services/studentApi'

vi.mock('../../../src/services/studentApi', () => ({
  getStudentReports: vi.fn(),
}))

const report = (overrides) => ({
  id: 'r1',
  className: 'Algebra I',
  teacher: 'Tess Teacher',
  periodStart: '2025-09-01',
  periodEnd: '2025-10-31',
  summary: 'Strong term.',
  publishedAt: '2025-11-05T15:00:00.000Z',
  ...overrides,
})

describe('ProgressReportList', () => {
  it('shows the class, period, teacher, publish date and summary of each report', () => {
    render(<ProgressReportList reports={[report()]} emptyMessage="Nothing yet." />)

    const card = screen.getByRole('article', { name: 'Algebra I progress report' })
    expect(within(card).getByRole('heading', { name: 'Algebra I' })).toBeInTheDocument()
    expect(within(card).getByText('Sep 1, 2025 to Oct 31, 2025')).toBeInTheDocument()
    expect(within(card).getByText('By Tess Teacher')).toBeInTheDocument()
    expect(within(card).getByText('Published Nov 5, 2025')).toBeInTheDocument()
    expect(within(card).getByText('Strong term.')).toBeInTheDocument()
  })

  it('keeps the order it is given and shows one card per report', () => {
    render(
      <ProgressReportList
        reports={[report({ id: 'a', className: 'Geometry', summary: 'Newest.' }), report({ id: 'b', summary: 'Older.' })]}
        emptyMessage="Nothing yet."
      />,
    )

    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByText('Newest.')).toBeInTheDocument()
    expect(within(cards[1]).getByText('Older.')).toBeInTheDocument()
  })

  it('leaves out the teacher when there is none', () => {
    render(<ProgressReportList reports={[report({ teacher: '' })]} emptyMessage="Nothing yet." />)

    expect(screen.queryByText(/^By /)).not.toBeInTheDocument()
  })

  it('shows the empty message when there are no reports', () => {
    render(<ProgressReportList reports={[]} emptyMessage="Nothing yet." />)

    expect(screen.getByText('Nothing yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})

describe('student Progress Reports page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('authToken', 'student-token')
  })

  it('loads the student’s published reports with their token', async () => {
    getStudentReports.mockResolvedValue({ reports: [report()] })

    render(<StudentReports />)

    expect(screen.getByText('Loading your reports…')).toBeInTheDocument()
    expect(await screen.findByRole('article', { name: 'Algebra I progress report' })).toBeInTheDocument()
    expect(getStudentReports).toHaveBeenCalledWith('student-token')
    expect(screen.getByRole('heading', { name: 'Progress Reports' })).toBeInTheDocument()
  })

  it('says so when nothing has been published', async () => {
    getStudentReports.mockResolvedValue({ reports: [] })

    render(<StudentReports />)

    expect(await screen.findByText('No progress reports have been published yet.')).toBeInTheDocument()
  })

  it('shows the error when the request fails', async () => {
    getStudentReports.mockRejectedValue(new Error('Server unavailable'))

    render(<StudentReports />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable')
  })
})
