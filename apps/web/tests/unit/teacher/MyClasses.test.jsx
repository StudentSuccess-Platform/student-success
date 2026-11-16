import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import MyClasses from '../../../src/pages/teacher/MyClasses'
import { classes } from '../../../src/pages/teacher/classesMockData'

vi.mock('../../../src/services/teacherApi', async () => {
  const mock = await import('../../../src/pages/teacher/classesMockData')
  return {
    getDashboard: vi.fn(),
    getClasses: vi.fn(() => Promise.resolve({ classes: mock.classes })),
  }
})

describe('MyClasses', () => {
  it('renders a card for every class returned by the API', async () => {
    render(
      <MemoryRouter>
        <MyClasses />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'My Classes' })).toBeInTheDocument()
    await screen.findByText(classes[0].name)

    for (const classItem of classes) {
      expect(screen.getByText(classItem.name)).toBeInTheDocument()
    }

    expect(screen.getAllByRole('link', { name: /view class/i })).toHaveLength(
      classes.length
    )
  })
})
