import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import InterventionList from '../../src/components/teacher/InterventionList'

const students = [
  {
    id: 1,
    name: 'Marcus Lee',
    className: 'Algebra II',
    reason: 'Grade below 65%',
    severity: 'high',
  },
  {
    id: 2,
    name: 'Noah Patel',
    className: 'World History',
    reason: 'Missing 3 assignments',
    severity: 'medium',
  },
]

describe('InterventionList', () => {
  it('renders a row for every student with their reason, class, and severity', () => {
    render(<InterventionList students={students} />)

    expect(screen.getByText('Marcus Lee')).toBeInTheDocument()
    expect(screen.getByText('Grade below 65%')).toBeInTheDocument()
    expect(screen.getByText('Algebra II')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()

    expect(screen.getByText('Noah Patel')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('shows an empty state when there are no flagged students', () => {
    render(<InterventionList students={[]} />)

    expect(
      screen.getByText(/no students currently need intervention/i)
    ).toBeInTheDocument()
  })
})
