import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Progress from '../../../src/pages/student/Progress'

const { getStudentDashboard } = vi.hoisted(() => ({
  getStudentDashboard: vi.fn(),
}))

vi.mock('../../../src/state/AuthContext', () => ({
  useAuth: () => ({ token: 'student-token' }),
}))

vi.mock('../../../src/services/studentApi', () => ({
  getStudentDashboard,
}))

const dashboard = {
  summary: { currentGrade: 82, attendance: 96 },
  grades: [
    { id: 'math', subject: 'Mathematics', grade: 85 },
    { id: 'science', subject: 'Science', grade: 79 },
  ],
  goals: [
    { id: 'goal-1', title: 'Turn in homework on time', progress: 75, status: 'on-track' },
  ],
}

describe('StudentProgress', () => {
  beforeEach(() => {
    getStudentDashboard.mockReset()
    getStudentDashboard.mockResolvedValue(dashboard)
  })

  it('loads subject grades, attendance, goals, and progress indicators', async () => {
    render(<Progress />)

    expect(await screen.findByRole('heading', { name: 'My Progress' })).toBeInTheDocument()
    expect(getStudentDashboard).toHaveBeenCalledWith('student-token')
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText('96%')).toBeInTheDocument()
    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('Turn in homework on time')).toBeInTheDocument()

    const indicators = screen.getAllByRole('progressbar')
    expect(indicators).toHaveLength(3)
    expect(indicators[0]).toHaveAccessibleName('Mathematics grade')
    expect(indicators[0]).toHaveAttribute('value', '85')
    expect(indicators[2]).toHaveAccessibleName('Turn in homework on time progress')
    expect(indicators[2]).toHaveAttribute('value', '75')
  })

  it('shows empty states when the student has no grades or goals', async () => {
    getStudentDashboard.mockResolvedValueOnce({
      ...dashboard,
      grades: [],
      goals: [],
    })

    render(<Progress />)

    expect(await screen.findByText('No subject grades available yet.')).toBeInTheDocument()
    expect(screen.getByText('No academic goals have been set yet.')).toBeInTheDocument()
  })

  it('shows API errors', async () => {
    getStudentDashboard.mockRejectedValueOnce(new Error('Could not load progress'))

    render(<Progress />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load progress')
  })
})
