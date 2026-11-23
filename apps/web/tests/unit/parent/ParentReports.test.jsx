import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParentReports from '../../../src/pages/parent/ParentReports'
import { getChildren, getChildReports } from '../../../src/services/parentApi'

vi.mock('../../../src/services/parentApi', () => ({
  getChildren: vi.fn(),
  getChildReports: vi.fn(),
}))

const report = (overrides) => ({
  id: 'r1',
  className: 'Algebra I',
  teacher: 'Tess Teacher',
  periodStart: '2025-09-01',
  periodEnd: '2025-10-31',
  summary: 'Liam is doing well.',
  publishedAt: '2025-11-05T15:00:00.000Z',
  ...overrides,
})

describe('ParentReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('authToken', 'parent-token')
  })

  it('loads the first linked child’s reports using only an id from the children list', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel' }] })
    getChildReports.mockResolvedValue({ reports: [report()] })

    render(<ParentReports />)

    expect(await screen.findByRole('article', { name: 'Algebra I progress report' })).toBeInTheDocument()
    expect(getChildReports).toHaveBeenCalledWith('s1', 'parent-token')
    expect(screen.getByText('Liam is doing well.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/viewing/i)).not.toBeInTheDocument()
  })

  it('says so when no student is linked and never requests reports', async () => {
    getChildren.mockResolvedValue({ children: [] })

    render(<ParentReports />)

    expect(await screen.findByText(/no students are linked to your account/i)).toBeInTheDocument()
    expect(getChildReports).not.toHaveBeenCalled()
  })

  it('shows an error when the linked students cannot be loaded', async () => {
    getChildren.mockRejectedValue(new Error('x'))

    render(<ParentReports />)

    expect(await screen.findByText(/couldn.t load your linked students/i)).toBeInTheDocument()
    expect(getChildReports).not.toHaveBeenCalled()
  })

  it('says so when the child has no published reports', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel' }] })
    getChildReports.mockResolvedValue({ reports: [] })

    render(<ParentReports />)

    expect(await screen.findByText('No progress reports have been published for this child yet.')).toBeInTheDocument()
  })

  it('switching children loads that child’s reports and never shows the previous child’s while loading', async () => {
    const user = userEvent.setup()
    getChildren.mockResolvedValue({
      children: [
        { id: 's1', name: 'Liam Patel' },
        { id: 's2', name: 'Maya Patel' },
      ],
    })
    let resolveMaya
    getChildReports.mockImplementation((id) =>
      id === 's1'
        ? Promise.resolve({ reports: [report({ summary: 'Liam report.' })] })
        : new Promise((resolve) => {
            resolveMaya = resolve
          }),
    )

    render(<ParentReports />)
    expect(await screen.findByText('Liam report.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/viewing/i), 's2')

    await waitFor(() => expect(getChildReports).toHaveBeenCalledWith('s2', 'parent-token'))
    expect(screen.queryByText('Liam report.')).not.toBeInTheDocument()
    expect(screen.getByText('Loading progress reports…')).toBeInTheDocument()

    resolveMaya({ reports: [report({ id: 'r9', summary: 'Maya report.' })] })
    expect(await screen.findByText('Maya report.')).toBeInTheDocument()
  })

  it('shows the request error for the selected child', async () => {
    getChildren.mockResolvedValue({ children: [{ id: 's1', name: 'Liam Patel' }] })
    getChildReports.mockRejectedValue(new Error('Student not found'))

    render(<ParentReports />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Student not found')
  })
})
