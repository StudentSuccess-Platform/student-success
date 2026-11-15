import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudentProfile from '../../../src/pages/teacher/StudentProfile'
import { ApiError } from '../../../src/services/http'
import { saveGrade } from '../../../src/services/teacherRecordsApi'
import { getStudentProfile } from '../../../src/services/teacherStudentsApi'

vi.mock('../../../src/services/teacherStudentsApi', () => ({
  getStudents: vi.fn(),
  getStudentProfile: vi.fn(),
}))

vi.mock('../../../src/services/teacherRecordsApi', () => ({
  saveGrade: vi.fn(),
  saveAttendance: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  addGoalUpdate: vi.fn(),
  createFeedback: vi.fn(),
  updateFeedback: vi.fn(),
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

function renderProfile(studentId = 'stu1', tab = null) {
  const query = tab ? `?tab=${tab}` : ''
  return render(
    <MemoryRouter initialEntries={[`/teacher/students/${studentId}${query}`]}>
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

  it('the edit icon and a double-click on a grade row load that assignment into the grade form', async () => {
    getStudentProfile.mockResolvedValue(profile)
    const user = userEvent.setup()
    renderProfile('stu1', 'grades')

    await user.click(await screen.findByRole('button', { name: 'Edit grade: Algebra I Quiz 1' }))
    expect(screen.getByLabelText('Assignment')).toHaveValue('a1')
    expect(screen.getByLabelText('Points earned')).toHaveValue(8)
    expect(screen.getByLabelText('Points earned')).toHaveFocus()

    const row = screen.getByRole('cell', { name: 'Homework 3' }).closest('tr')
    await user.dblClick(row)
    expect(screen.getByLabelText('Assignment')).toHaveValue('a2')
    expect(screen.getByLabelText('Points earned')).toHaveValue(null)
    expect(screen.getByTestId('grade-points-hint')).toHaveTextContent('Out of 20 points')
  })

  it('shows the Overview tab first and swaps the panel when another tab is chosen', async () => {
    getStudentProfile.mockResolvedValue(profile)
    const user = userEvent.setup()
    renderProfile()

    await screen.findByRole('heading', { name: 'Ada Lovelace' })
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(tabs).toEqual(['Overview', 'Grades', 'Attendance', 'Goals & Feedback', 'Support Plans'])
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Performance Trend', level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Grades', level: 2 })).not.toBeInTheDocument()

    const expected = {
      Grades: ['Grades'],
      Attendance: ['Attendance'],
      'Goals & Feedback': ['Goals and Progress', 'Teacher Feedback'],
      'Support Plans': ['Remediation Plans'],
    }
    for (const [tab, headings] of Object.entries(expected)) {
      await user.click(screen.getByRole('tab', { name: tab }))
      expect(screen.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
      for (const heading of headings) {
        expect(screen.getByRole('heading', { name: heading, level: 2 })).toBeInTheDocument()
      }
      expect(screen.queryByRole('heading', { name: 'Performance Trend' })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'profile-tab-plans')
  })

  it('opens the tab named in the URL and falls back to Overview for an unknown one', async () => {
    getStudentProfile.mockResolvedValue(profile)
    const first = renderProfile('stu1', 'attendance')
    expect(await screen.findByRole('heading', { name: 'Attendance', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attendance' })).toHaveAttribute('aria-selected', 'true')
    first.unmount()

    renderProfile('stu1', 'nonsense')
    expect(await screen.findByRole('heading', { name: 'Performance Trend', level: 2 })).toBeInTheDocument()
  })

  it('moves between tabs with the arrow keys, Home and End', async () => {
    getStudentProfile.mockResolvedValue(profile)
    const user = userEvent.setup()
    renderProfile()

    await user.click(await screen.findByRole('tab', { name: 'Overview' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Grades' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Grades' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Support Plans' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Support Plans' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('the Overview summary links open the matching tab', async () => {
    getStudentProfile.mockResolvedValue(profile)
    const user = userEvent.setup()
    renderProfile()

    expect(await screen.findByText('2 assignments, 1 not graded')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Attendance' }))
    expect(screen.getByRole('tab', { name: 'Attendance' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Attendance rate: 90%')).toBeInTheDocument()
  })

  it('renders grades, showing Not graded for ungraded rows', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile('stu1', 'grades')

    const quizRow = (await screen.findByText('Quiz 1')).closest('tr')
    expect(within(quizRow).getByText('8 / 10')).toBeInTheDocument()
    expect(within(quizRow).getByText('Graded')).toBeInTheDocument()

    const homeworkRow = screen.getByText('Homework 3').closest('tr')
    expect(within(homeworkRow).getByText('Not graded')).toBeInTheDocument()
    expect(within(homeworkRow).getByText('--')).toBeInTheDocument()
  })

  it('renders attendance rate and recent records', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile('stu1', 'attendance')

    expect(await screen.findByText('Attendance rate: 90%')).toBeInTheDocument()
    const recordRow = screen.getByText('Nov 10, 2025').closest('tr')
    expect(within(recordRow).getByText('Algebra I')).toBeInTheDocument()
    expect(within(recordRow).getByText('Tardy')).toBeInTheDocument()
  })

  it('renders goals with a progress bar and the latest update note', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile('stu1', 'goals')

    const bar = await screen.findByRole('progressbar', { name: 'Progress for Finish homework' })
    expect(bar).toHaveAttribute('value', '40')
    expect(bar).toHaveAttribute('max', '100')
    expect(screen.getByText('Turn in every homework set')).toBeInTheDocument()
    expect(screen.getAllByText('Active', { selector: 'span.teacher-badge' })).toHaveLength(1)
    expect(screen.getByText(/Latest update \(Nov 1, 2025\): Four of five turned in/)).toBeInTheDocument()
  })

  it('renders teacher feedback with class and date', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile('stu1', 'goals')

    expect(await screen.findByText('Great effort on quiz 1.')).toBeInTheDocument()
    expect(screen.getAllByText('Algebra I').length).toBeGreaterThan(0)
    expect(screen.getByText('Oct 2, 2025')).toBeInTheDocument()
  })

  it('passes the trend data and labels to the chart', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile()

    expect(await screen.findByText('trend-chart:2:Average Grade:%')).toBeInTheDocument()
  })

  it('embeds the remediation panel for this student and classes', async () => {
    getStudentProfile.mockResolvedValue(profile)

    renderProfile('stu1', 'plans')

    expect(await screen.findByText('remediation-panel:stu1:1')).toBeInTheDocument()
  })

  it('saving a grade reloads the profile', async () => {
    getStudentProfile.mockResolvedValue(profile)
    saveGrade.mockResolvedValue({ grade: { assignmentId: 'a1', pointsEarned: 9, status: 'graded' } })
    const user = userEvent.setup()
    renderProfile('stu1', 'grades')

    await screen.findByRole('heading', { name: 'Ada Lovelace' })
    getStudentProfile.mockResolvedValueOnce({
      ...profile,
      student: { ...profile.student, name: 'Ada King' },
    })
    await user.selectOptions(screen.getByLabelText('Assignment'), 'a1')
    await user.type(screen.getByLabelText('Points earned'), '9')
    await user.click(screen.getByRole('button', { name: 'Save grade' }))

    expect(saveGrade).toHaveBeenCalledWith('stu1', { assignmentId: 'a1', pointsEarned: 9, status: 'graded' })
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

    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Ada Lovelace' })
    expect(screen.getAllByText('--')).toHaveLength(2)
    expect(screen.getByText('On track')).toBeInTheDocument()
    expect(screen.queryByText('Needs intervention')).not.toBeInTheDocument()
    expect(screen.getByText('trend-chart:0:Average Grade:%')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Grades' }))
    expect(screen.getByText('No grades yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Attendance' }))
    expect(screen.getByText('Attendance rate: --')).toBeInTheDocument()
    expect(screen.getByText('No attendance records yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Goals & Feedback' }))
    expect(screen.getAllByText('No goals yet.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No feedback yet.').length).toBeGreaterThan(0)
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
    expect(screen.queryByRole('tab', { name: 'Grades' })).not.toBeInTheDocument()
    expect(getStudentProfile.mock.calls.at(-1)[1]).toBe('stu2')
  })
})

describe('Student profile when a refresh fails', () => {
  it('keeps the content and shows a refresh alert above it, and clears the alert after a good reload', async () => {
    saveGrade.mockResolvedValue({ grade: { assignmentId: 'a1', pointsEarned: 9, status: 'graded' } })
    const user = userEvent.setup()
    getStudentProfile.mockResolvedValueOnce(profile)
    renderProfile('stu1', 'grades')
    await screen.findByRole('heading', { name: 'Ada Lovelace' })

    const saveOne = async (points) => {
      await user.selectOptions(screen.getByLabelText('Assignment'), 'a1')
      await user.clear(screen.getByLabelText('Points earned'))
      await user.type(screen.getByLabelText('Points earned'), points)
      await user.click(screen.getByRole('button', { name: 'Save grade' }))
    }

    getStudentProfile.mockRejectedValueOnce(new ApiError('Server is busy', { status: 500 }))
    await saveOne('9')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not refresh this page. Server is busy')
    const heading = screen.getByRole('heading', { name: 'Ada Lovelace' })
    expect(alert.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Grades', level: 2 })).toBeInTheDocument()
    expect(screen.queryByText('Student not found')).not.toBeInTheDocument()

    getStudentProfile.mockResolvedValueOnce(profile)
    await saveOne('8')

    await waitFor(() => expect(screen.queryByText(/Could not refresh this page/)).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
  })
})
