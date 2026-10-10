import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MyClasses from '../../src/pages/teacher/MyClasses'
import { classes } from '../../src/pages/teacher/classesMockData'

describe('MyClasses', () => {
  it('renders a card for every class in the mock data', () => {
    render(
      <MemoryRouter>
        <MyClasses />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'My Classes' })).toBeInTheDocument()

    for (const classItem of classes) {
      expect(screen.getByText(classItem.name)).toBeInTheDocument()
    }

    expect(screen.getAllByRole('link', { name: /view class/i })).toHaveLength(
      classes.length
    )
  })
})
