import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ClassCard from '../../src/components/teacher/ClassCard'

const classItem = {
  id: '1',
  name: 'Algebra II',
  period: 'Period 2',
  room: 'Room 104',
  studentCount: 28,
}

function renderClassCard(props = {}) {
  return render(
    <MemoryRouter>
      <ClassCard {...classItem} {...props} />
    </MemoryRouter>
  )
}

describe('ClassCard', () => {
  it('renders the class name, period, room, and student count', () => {
    renderClassCard()

    expect(screen.getByText('Algebra II')).toBeInTheDocument()
    expect(screen.getByText('Period 2')).toBeInTheDocument()
    expect(screen.getByText('Room 104')).toBeInTheDocument()
    expect(screen.getByText('28 Students Enrolled')).toBeInTheDocument()
  })

  it('links "View Class" to the class detail route', () => {
    renderClassCard()

    expect(screen.getByRole('link', { name: /view class/i })).toHaveAttribute(
      'href',
      '/teacher/classes/1'
    )
  })

  it('links to the correct route for a different class id', () => {
    renderClassCard({ id: '42' })

    expect(screen.getByRole('link', { name: /view class/i })).toHaveAttribute(
      'href',
      '/teacher/classes/42'
    )
  })
})
