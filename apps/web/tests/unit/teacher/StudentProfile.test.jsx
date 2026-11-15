import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudentProfile from '../../../src/pages/teacher/StudentProfile'
import { ApiError } from '../../../src/services/http'
import { getStudentProfile } from '../../../src/services/teacherStudentsApi'

const { recordsPanelSpy } = vi.hoisted(() => ({ recordsPanelSpy: vi.fn() }))

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(),
  getStudentProfile: vi.fn(),
}))

vi.mock('../../../src/components/teacher/records/RecordsPanel', () => ({
  default: (props) => {
    recordsPanelSpy(props)
    return <div>records-panel</div>
  },
}))

vi.mock('../../../src/components/teacher/remediation/RemediationPanel', () => ({
  default: ({ studentId, classes }) => (
    <div>
      remediation-panel:{studentId}:{classes.length}
    </div>
  ),
}))

vi.mock('../../../src/components/common/PerformanceTrendChart', () => ({
  default: ({ data, tooltipLabel, tooltipUnit }) => (
    <div>
      trend-chart:{data.length}:{tooltipLabel}:{tooltipUnit}
    </div>
  ),
}))

const profile = {
  student: { id: 'stu1', name: 'Ada Lovelace', gradeLevel: 10, studentNumber: 'S-1001' },
  classes: [{ id: 'sec1', name: 'Algebra I', period: 'Period 2', room: 'Room 104' }],
  summary: {
    averageGrade: 72,
    attendanceRate: 90,
    needsIntervention: true,
    reason: 'Average grade below 75%',
  },
  grades: [
    {
      assignmentId: 'a1',
      sectionId: 'sec1',
      className: 'Algebra I',
      title: 'Quiz 1',
      category: 'Quizzes',
      pointsPossible: 10,
      pointsEarned: 8,
      status: 'graded',
      dueDate: '2025-10-01T12:00:00.000Z',
    },
    {
      assignmentId: 'a2',
      sectionId: 'sec1',
      className: 'Algebra I',
      title: 'Homework 3',
      category: 'Homework',
      pointsPossible: 20,
      pointsEarned: null,
      status: null,
      dueDate: '2025-10-08T12:00:00.000Z',
    },
  ],
  attendance: {
    rate: 90,
    records: [
      {
        id: 'r1',
        sectionId: 'sec1',
        className: 'Algebra I',
        date: '2025-11-10T12:00:00.000Z',
        status: 'tardy',
      },
    ],
  },
  goals: [
    {
      id: 'g1',
      title: 'Finish homework',
      description: 'Turn in every homework set',
      targetDate: '2025-12-15T12:00:00.000Z',
      status: 'active',
      progress: 40,
      updates: [
        {
          id: 'u1',
          note: 'Two of five turned in',
          progressPercent: 20,
          createdAt: '2025-10-20T12:00:00.000Z',
        },
        {
          id: 'u2',
          note: 'Four of five turned in',
          progressPercent: 40,
          createdAt: '2025-11-01T12:00:00.000Z',
        },
      ],
    },
  ],
  feedback: [
    {
      id: 'f1',
      sectionId: 'sec1',
      className: 'Algebra I',
      body: 'Great effort on quiz 1.',
      createdAt: '2025-10-02T12:00:00.000Z',
      updatedAt: '2025-10-02T12:00:00.000Z',
    },
  ],
  performanceTrend: [
    { label: 'Sep', value: 70 },
    { label: 'Oct', value: 74 },
  ],
}

function renderProfile(studentId = 'stu1') {
  return render(
    <MemoryRouter initialEntries={[`/teacher/students/${studentId}`]}>
      <Routes>
        <Route path="/teacher/students/:studentId" element={<StudentProfile />} />
        <Route path="/teacher/students" element={<p>students-list-page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Student profile page', () => {
  it('shows a loading message while the profile is fetched', () => {
    getStudentProfile.mockReturnValue(new Promise(() => {}))

    renderProfile()

    expect(screen.getByText('Loading student…')).toBeInTheDocument()
  })

  it('fetches the profile for the id in the URL', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile('stu1')

    await screen.findByRole('heading', { name: 'Ada Lovelace' })
    expect(getStudentProfile.mock.calls[0][1]).toBe('stu1')
  })

  it('renders the header and summary cards', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByText('Grade 10 · Student #S-1001')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('Attendance rate')).toBeInTheDocument()
    expect(screen.getByText('Needs intervention')).toHaveClass('teacher-badge--warning')
    expect(screen.getByText('Average grade below 75%')).toBeInTheDocument()
  })

  it('the edit icon and a double-click on a grade row ask the records form to load that assignment', async () => {
    getStudentProfile.mockResolvedValue(profile)
    const user = userEvent.setup()
    renderProfile()

    await user.click(await screen.findByRole('button', { name: 'Edit grade: Algebra I Quiz 1' }))
    let edit = recordsPanelSpy.mock.lastCall[0].gradeEdit
    expect(edit).toMatchObject({ assignmentId: 'a1', pointsEarned: 8, status: 'graded' })

    const row = screen.getByRole('cell', { name: 'Homework 3' }).closest('tr')
    await user.dblClick(row)
    edit = recordsPanelSpy.mock.lastCall[0].gradeEdit
    expect(edit).toMatchObject({ assignmentId: 'a2', pointsEarned: null })
  })

  it('renders every section heading', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    await screen.findByRole('heading', { name: 'Ada Lovelace' })
    for (const title of [
      'Grades',
      'Attendance',
      'Goals and Progress',
      'Teacher Feedback',
      'Performance Trend',
      'Remediation Plans',
    ]) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument()
    }
  })

  it('renders grades, showing Not graded for ungraded rows', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    const quizRow = (await screen.findByText('Quiz 1')).closest('tr')
    expect(within(quizRow).getByText('8 / 10')).toBeInTheDocument()
    expect(within(quizRow).getByText('Graded')).toBeInTheDocument()

    const homeworkRow = screen.getByText('Homework 3').closest('tr')
    expect(within(homeworkRow).getByText('Not graded')).toBeInTheDocument()
    expect(within(homeworkRow).getByText('--')).toBeInTheDocument()
  })

  it('renders attendance rate and recent records', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    expect(await screen.findByText('Attendance rate: 90%')).toBeInTheDocument()
    const recordRow = screen.getByText('Nov 10, 2025').closest('tr')
    expect(within(recordRow).getByText('Algebra I')).toBeInTheDocument()
    expect(within(recordRow).getByText('Tardy')).toBeInTheDocument()
  })

  it('renders goals with a progress bar and the latest update note', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    const bar = await screen.findByRole('progressbar', { name: 'Progress for Finish homework' })
    expect(bar).toHaveAttribute('value', '40')
    expect(bar).toHaveAttribute('max', '100')
    expect(screen.getByText('Turn in every homework set')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText(/Latest update \(Nov 1, 2025\): Four of five turned in/)).toBeInTheDocument()
  })

  it('renders teacher feedback with class and date', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    expect(await screen.findByText('Great effort on quiz 1.')).toBeInTheDocument()
    expect(screen.getByText('Algebra I · Oct 2, 2025')).toBeInTheDocument()
  })

  it('passes the trend data and labels to the chart', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    expect(await screen.findByText('trend-chart:2:Average Grade:%')).toBeInTheDocument()
  })

  it('embeds the remediation panel for this student and classes', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    expect(await screen.findByText('remediation-panel:stu1:1')).toBeInTheDocument()
  })

  it('renders the records panel and passes reload as onSaved', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    expect(await screen.findByText('records-panel')).toBeInTheDocument()
    const props = recordsPanelSpy.mock.lastCall[0]
    expect(props.student).toEqual(profile)
    expect(typeof props.onSaved).toBe('function')

    // Calling onSaved reloads the profile.
    getStudentProfile.mockResolvedValueOnce({
      ...profile,
      student: { ...profile.student, name: 'Ada King' },
    })
    props.onSaved()

    expect(await screen.findByRole('heading', { name: 'Ada King' })).toBeInTheDocument()
    expect(getStudentProfile).toHaveBeenCalledTimes(2)
  })

  it('shows dashes and empty messages when there are no values yet', async () => {
    getStudentProfile.mockResolvedValue({
      ...profile,
      summary: { averageGrade: null, attendanceRate: null, needsIntervention: false, reason: null },
      attendance: { rate: null, records: [] },
      grades: [],
      goals: [],
      feedback: [],
      performanceTrend: [],
    })

    renderProfile()

    await screen.findByRole('heading', { name: 'Ada Lovelace' })
    expect(screen.getAllByText('--')).toHaveLength(2)
    expect(screen.getByText('On track')).toBeInTheDocument()
    expect(screen.queryByText('Needs intervention')).not.toBeInTheDocument()
    expect(screen.getByText('Attendance rate: --')).toBeInTheDocument()
    expect(screen.getByText('No grades yet.')).toBeInTheDocument()
    expect(screen.getByText('No attendance records yet.')).toBeInTheDocument()
    expect(screen.getByText('No goals yet.')).toBeInTheDocument()
    expect(screen.getByText('No feedback yet.')).toBeInTheDocument()
    expect(screen.getByText('trend-chart:0:Average Grade:%')).toBeInTheDocument()
  })

  it('shows Student not found with a link back when the API returns 404', async () => {
    getStudentProfile.mockRejectedValue(new ApiError('Student not found', { status: 404 }))

    renderProfile('missing')

    expect(await screen.findByText('Student not found')).toBeInTheDocument()
    const back = screen.getByRole('link', { name: 'Back to students' })
    expect(back).toHaveAttribute('href', '/teacher/students')
    expect(screen.queryByRole('heading', { name: 'Grades' })).not.toBeInTheDocument()
  })

  it('shows a generic error message for other failures', async () => {
    getStudentProfile.mockRejectedValue(new ApiError('boom', { status: 500 }))

    renderProfile()

    expect(
      await screen.findByText(/couldn't load this student\. please try again\./i)
    ).toBeInTheDocument()
    expect(screen.queryByText('Student not found')).not.toBeInTheDocument()
  })
})


function SwitchStudentButton() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate('/teacher/students/stu2')}>
      Open second student
    </button>
  )
}

describe('Student profile when switching students', () => {
  it('does not show the previous student while the next profile loads', async () => {
    const user = userEvent.setup()
    getStudentProfile.mockImplementation((_token, id) =>
      id === 'stu1' ? Promise.resolve(profile) : new Promise(() => {})
    )

    render(
      <MemoryRouter initialEntries={['/teacher/students/stu1']}>
        <SwitchStudentButton />
        <Routes>
          <Route path="/teacher/students/:studentId" element={<StudentProfile />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Ada Lovelace' })
    await user.click(screen.getByRole('button', { name: 'Open second student' }))

    expect(await screen.findByText('Loading student…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ada Lovelace' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Grades' })).not.toBeInTheDocument()
    expect(getStudentProfile.mock.calls.at(-1)[1]).toBe('stu2')
  })
})

describe('Student profile when a refresh fails', () => {
  it('keeps the content and shows a refresh alert above it, and clears the alert after a good reload', async () => {
    getStudentProfile.mockResolvedValueOnce(profile)
    renderProfile()
    await screen.findByRole('heading', { name: 'Ada Lovelace' })

    getStudentProfile.mockRejectedValueOnce(new ApiError('Server is busy', { status: 500 }))
    act(() => recordsPanelSpy.mock.lastCall[0].onSaved())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not refresh this page. Server is busy')
    const heading = screen.getByRole('heading', { name: 'Ada Lovelace' })
    expect(alert.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('records-panel')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Grades' })).toBeInTheDocument()
    expect(screen.queryByText('Student not found')).not.toBeInTheDocument()

    getStudentProfile.mockResolvedValueOnce(profile)
    act(() => recordsPanelSpy.mock.lastCall[0].onSaved())

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
  })
})
