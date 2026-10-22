
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GradeList from '../../src/components/student/GradeList'

const mockGrades = [
  { id: 1, subject: 'Mathematics', grade: 78 },
  { id: 2, subject: 'Science', grade: 86 },
]

describe('GradeList', () => {
  it('renders student subjects and grades', () => {
    render(<GradeList grades={mockGrades} />)

    expect(screen.getByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()

    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('86%')).toBeInTheDocument()
  })

  it('renders a progress bar for each subject', () => {
    const { container } = render(<GradeList grades={mockGrades} />)

    const bars = container.querySelectorAll('.grade-progress-fill')

    expect(bars).toHaveLength(2)
    expect(bars[0]).toHaveStyle({ width: '78%' })
    expect(bars[1]).toHaveStyle({ width: '86%' })
  })

  it('displays a message when grades are unavailable', () => {
    render(<GradeList grades={[]} />)

    expect(
      screen.getByText(/no grades available yet/i)
    ).toBeInTheDocument()
  })

  it('does not display grade editing controls', () => {
    render(<GradeList grades={mockGrades} />)

    expect(
      screen.queryByRole('button', { name: /edit|save|delete/i })
    ).not.toBeInTheDocument()
  })
})
