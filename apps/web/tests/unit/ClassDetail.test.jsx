import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ClassDetail from '../../src/pages/teacher/ClassDetail'
import { classes } from '../../src/pages/teacher/classesMockData'

function renderAt(classId) {
  return render(
    <MemoryRouter initialEntries={[`/teacher/classes/${classId}`]}>
      <Routes>
        <Route path="/teacher/classes/:classId" element={<ClassDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ClassDetail', () => {
  it("renders the matched class's name as the placeholder title", () => {
    const [firstClass] = classes
    renderAt(firstClass.id)

    expect(
      screen.getByRole('heading', { name: firstClass.name })
    ).toBeInTheDocument()
    expect(screen.getByText(/under construction/i)).toBeInTheDocument()
  })

  it('falls back to a generic title for an unknown class id', () => {
    renderAt('does-not-exist')

    expect(screen.getByRole('heading', { name: 'Class' })).toBeInTheDocument()
  })
})
