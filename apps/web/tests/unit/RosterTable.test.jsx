import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RosterTable from '../../src/components/teacher/RosterTable'

const students = [
  { id: 's1', name: 'Ada Strong', averageGrade: 95, attendanceRate: 100 },
  { id: 's2', name: 'Ben Behind', averageGrade: 50, attendanceRate: 0 },
]

describe('RosterTable', () => {
  it('renders one row per student with their real grade and attendance', () => {
    render(<RosterTable students={students} />)

    expect(screen.getByRole('columnheader', { name: 'Student Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Average Grade' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Attendance Rate' })).toBeInTheDocument()

    expect(screen.getByText('Ada Strong')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('Ben Behind')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('never renders a Student ID or Status column, since the API does not provide either', () => {
    render(<RosterTable students={students} />)

    expect(screen.queryByText(/student id/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^status$/i)).not.toBeInTheDocument()
  })
})
