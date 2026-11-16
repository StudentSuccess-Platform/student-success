import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ClassTabs from '../../../src/components/teacher/ClassTabs'

const classId = '507f1f77bcf86cd799439011'

function renderTabs(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ClassTabs classId={classId} />
    </MemoryRouter>
  )
}

describe('ClassTabs', () => {
  it('marks Overview active on the class detail route', () => {
    renderTabs(`/teacher/classes/${classId}`)

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveClass('is-active')
    expect(screen.getByRole('link', { name: 'Roster' })).not.toHaveClass('is-active')
  })

  it('marks Roster active on the roster route, and links to the real roster path', () => {
    renderTabs(`/teacher/classes/${classId}/roster`)

    expect(screen.getByRole('link', { name: 'Roster' })).toHaveClass('is-active')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveClass('is-active')
    expect(screen.getByRole('link', { name: 'Roster' })).toHaveAttribute(
      'href',
      `/teacher/classes/${classId}/roster`
    )
  })

  it('renders Assignments & Grades and Attendance as non-interactive, not fabricated links', () => {
    renderTabs(`/teacher/classes/${classId}`)

    expect(screen.queryByRole('link', { name: /assignments & grades/i })).not.toBeInTheDocument()
    expect(screen.getByText('Assignments & Grades')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('link', { name: /attendance/i })).not.toBeInTheDocument()
    expect(screen.getByText('Attendance')).toHaveAttribute('aria-disabled', 'true')
  })
})
