import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import RosterView from '../../../src/pages/teacher/RosterView'

const sampleData = {
  class: { id: '507f1f77bcf86cd799439011', name: 'Algebra II', period: 'Period 2', room: 'Room 104' },
  students: [
    { id: 's1', name: 'Marcus Vance', averageGrade: 94, attendanceRate: 98 },
    { id: 's2', name: 'Aria Thorne', averageGrade: 91, attendanceRate: 96 },
    { id: 's3', name: 'Liam O’Connor', averageGrade: 79, attendanceRate: 88 },
  ],
  classAverage: 88,
}

function renderView(props) {
  return render(
    <MemoryRouter initialEntries={[`/teacher/classes/${sampleData.class.id}/roster`]}>
      <RosterView data={null} isLoading={false} error={null} {...props} />
    </MemoryRouter>
  )
}

describe('RosterView', () => {
  it('shows a loading state and renders no content while isLoading is true', () => {
    renderView({ isLoading: true })

    expect(screen.getByText(/loading roster/i)).toBeInTheDocument()
    expect(screen.queryByText('Algebra II')).not.toBeInTheDocument()
  })

  it('shows an error state and renders no content when error is set', () => {
    renderView({ error: new Error('Network error') })

    expect(screen.getByText(/couldn't load the roster/i)).toBeInTheDocument()
    expect(screen.queryByText('Algebra II')).not.toBeInTheDocument()
  })

  it('shows a not-found state with a link back to My Classes when data is null', () => {
    renderView({ data: null })

    expect(screen.getByText(/class not found/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /back to my classes/i })
    ).toHaveAttribute('href', '/teacher/classes')
  })

  it('renders the class header (derived from real student count) and the full roster', () => {
    renderView({ data: sampleData })

    expect(screen.getByRole('heading', { name: 'Algebra II' })).toBeInTheDocument()
    expect(
      screen.getByText('Period 2 · Room 104 · 3 students enrolled')
    ).toBeInTheDocument()
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument()
    expect(screen.getByText('Aria Thorne')).toBeInTheDocument()
    expect(screen.getByText('Liam O’Connor')).toBeInTheDocument()
  })

  it('marks the Roster tab active', () => {
    renderView({ data: sampleData })

    expect(screen.getByRole('link', { name: 'Roster' })).toHaveClass('is-active')
  })

  it('filters the roster by search text', async () => {
    const user = userEvent.setup()
    renderView({ data: sampleData })

    await user.type(screen.getByLabelText(/search students/i), 'aria')

    expect(screen.getByText('Aria Thorne')).toBeInTheDocument()
    expect(screen.queryByText('Marcus Vance')).not.toBeInTheDocument()
    expect(screen.queryByText('Liam O’Connor')).not.toBeInTheDocument()
  })

  it('shows a no-matches message when the search text matches no student', async () => {
    const user = userEvent.setup()
    renderView({ data: sampleData })

    await user.type(screen.getByLabelText(/search students/i), 'zzz')

    expect(screen.getByText(/no students match/i)).toBeInTheDocument()
  })

  it('toggles sort direction on the Student Name control', async () => {
    const user = userEvent.setup()
    renderView({ data: sampleData })

    const rowsInOrder = () => screen.getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(rowsInOrder()[0]).toMatch(/Aria Thorne/)

    await user.click(screen.getByRole('button', { name: /student name/i }))
    expect(rowsInOrder()[0]).toMatch(/Marcus Vance/)
  })

  it('shows an empty-roster message when the class has no enrolled students', () => {
    renderView({ data: { ...sampleData, students: [] } })

    expect(screen.getByText(/no students enrolled in this class yet/i)).toBeInTheDocument()
  })
})
