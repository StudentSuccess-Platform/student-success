import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Students from '../../../src/pages/teacher/Students'
import { getStudents } from '../../../src/services/teacherStudentsApi'

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(),
  getStudentProfile: vi.fn(),
}))

const students = [
  {
    id: '507f1f77bcf86cd799439011',
    name: 'Ada Lovelace',
    gradeLevel: 10,
    classNames: ['Algebra I', 'Geometry'],
    averageGrade: 72,
    attendanceRate: 90,
    needsIntervention: true,
  },
  {
    id: '507f1f77bcf86cd799439012',
    name: 'Grace Hopper',
    gradeLevel: 11,
    classNames: ['Biology'],
    averageGrade: 91,
    attendanceRate: 100,
    needsIntervention: false,
  },
  {
    id: '507f1f77bcf86cd799439013',
    name: 'Alan Turing',
    gradeLevel: 10,
    classNames: [],
    averageGrade: null,
    attendanceRate: null,
    needsIntervention: false,
  },
]

function renderStudents() {
  return render(
    <MemoryRouter>
      <Students />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Students page', () => {
  it('shows a loading message while the roster is fetched', () => {
    getStudents.mockReturnValue(new Promise(() => {}))

    renderStudents()

    expect(screen.getByRole('heading', { name: 'Students' })).toBeInTheDocument()
    expect(screen.getByText('Loading students…')).toBeInTheDocument()
  })

  it('renders every student in the order the API returns them', async () => {
    getStudents.mockResolvedValue({ students })

    renderStudents()

    await screen.findByRole('link', { name: 'Ada Lovelace' })
    const names = screen.getAllByRole('link').map((link) => link.textContent)
    expect(names).toEqual(['Ada Lovelace', 'Grace Hopper', 'Alan Turing'])
  })

  it('links each student to their profile', async () => {
    getStudents.mockResolvedValue({ students })

    renderStudents()

    const link = await screen.findByRole('link', { name: 'Grace Hopper' })
    expect(link).toHaveAttribute('href', '/teacher/students/507f1f77bcf86cd799439012')
  })

  it('shows classes, average grade, attendance and dashes for missing values', async () => {
    getStudents.mockResolvedValue({ students })

    renderStudents()

    const row = (await screen.findByRole('link', { name: 'Ada Lovelace' })).closest('tr')
    expect(within(row).getByText('Algebra I, Geometry')).toBeInTheDocument()
    expect(within(row).getByText('72%')).toBeInTheDocument()
    expect(within(row).getByText('90%')).toBeInTheDocument()

    const emptyRow = screen.getByRole('link', { name: 'Alan Turing' }).closest('tr')
    expect(within(emptyRow).getAllByText('--')).toHaveLength(3)
  })

  it('shows the intervention badge only for students who need it', async () => {
    getStudents.mockResolvedValue({ students })

    renderStudents()

    await screen.findByRole('link', { name: 'Ada Lovelace' })
    const badges = screen.getAllByText('Needs intervention')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveClass('teacher-badge--warning')
    expect(screen.getByRole('link', { name: 'Ada Lovelace' }).closest('tr')).toContainElement(
      badges[0]
    )
  })

  it('filters students by name, ignoring case', async () => {
    const user = userEvent.setup()
    getStudents.mockResolvedValue({ students })

    renderStudents()

    const search = await screen.findByLabelText('Search students')
    await user.type(search, 'HOP')

    expect(screen.getByRole('link', { name: 'Grace Hopper' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ada Lovelace' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Alan Turing' })).not.toBeInTheDocument()

    await user.clear(search)
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('shows a message when no student matches the search', async () => {
    const user = userEvent.setup()
    getStudents.mockResolvedValue({ students })

    renderStudents()

    await user.type(await screen.findByLabelText('Search students'), 'zzz')

    expect(screen.getByText('No students match your search.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows an empty state when no students are assigned', async () => {
    getStudents.mockResolvedValue({ students: [] })

    renderStudents()

    expect(await screen.findByText('No students assigned yet.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Search students')).not.toBeInTheDocument()
  })

  it('shows an error message when the roster cannot be loaded', async () => {
    getStudents.mockRejectedValue(new Error('boom'))

    renderStudents()

    await waitFor(() =>
      expect(screen.getByText(/couldn't load students\. please try again\./i)).toBeInTheDocument()
    )
  })
})
