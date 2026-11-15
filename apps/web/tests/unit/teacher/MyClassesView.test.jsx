import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MyClassesView from '../../../src/pages/teacher/MyClassesView'

const sampleData = {
  classes: [
    {
      id: '1',
      name: 'Algebra II',
      period: 'Period 2',
      room: 'Room 104',
      studentCount: 28,
    },
    {
      id: '2',
      name: 'AP Biology',
      period: 'Period 1',
      room: 'Lab B',
      studentCount: 22,
    },
  ],
}

function renderView(props) {
  return render(
    <MemoryRouter>
      <MyClassesView data={null} isLoading={false} error={null} {...props} />
    </MemoryRouter>
  )
}

describe('MyClassesView', () => {
  it('shows a loading state and renders no classes while isLoading is true', () => {
    renderView({ isLoading: true })

    expect(screen.getByText(/loading classes/i)).toBeInTheDocument()
    expect(screen.queryByText('Algebra II')).not.toBeInTheDocument()
  })

  it('shows an error state and renders no classes when error is set', () => {
    renderView({ error: new Error('Network error') })

    expect(screen.getByText(/couldn't load classes/i)).toBeInTheDocument()
    expect(screen.queryByText('Algebra II')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no classes', () => {
    renderView({ data: { classes: [] } })

    expect(screen.getByText(/no classes yet/i)).toBeInTheDocument()
  })

  it('renders a card for every class in the provided data', () => {
    renderView({ data: sampleData })

    expect(screen.getByRole('heading', { name: 'My Classes' })).toBeInTheDocument()
    expect(screen.getByText('Algebra II')).toBeInTheDocument()
    expect(screen.getByText('AP Biology')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /view class/i })).toHaveLength(2)
  })

  it('shows the "Add Class — Coming Soon" message when the button is clicked', async () => {
    const user = userEvent.setup()
    renderView({ data: sampleData })

    expect(screen.queryByText(/add class.*coming soon/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add class/i }))

    expect(screen.getByText(/add class.*coming soon/i)).toBeInTheDocument()
  })
})
