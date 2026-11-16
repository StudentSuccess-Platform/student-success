import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AssignmentsOverview from '../../../src/components/teacher/AssignmentsOverview'

const sampleAssignments = [
  { id: '1', title: 'Chapter 4 Quiz', dueDate: 'Nov 6', status: 'upcoming' },
  { id: '2', title: 'Factoring Worksheet', dueDate: 'Nov 3', status: 'in-progress' },
  { id: '3', title: 'Chapter 3 Test', dueDate: 'Oct 28', status: 'graded' },
]

describe('AssignmentsOverview', () => {
  it('shows the empty state when there are no assignments', () => {
    render(<AssignmentsOverview assignments={[]} />)

    expect(screen.getByText(/no assignments yet/i)).toBeInTheDocument()
  })

  it('renders each assignment with its title, due date, and status', () => {
    render(<AssignmentsOverview assignments={sampleAssignments} />)

    expect(screen.getByText('Chapter 4 Quiz')).toBeInTheDocument()
    expect(screen.getByText('Due Nov 6')).toBeInTheDocument()
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Graded')).toBeInTheDocument()
  })
})
