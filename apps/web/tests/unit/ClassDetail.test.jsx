import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ClassDetail from '../../src/pages/teacher/ClassDetail'
import { classes } from '../../src/pages/teacher/classesMockData'

vi.mock('../../src/services/teacherApi', async () => {
  const mock = await import('../../src/pages/teacher/classesMockData')
  return {
    getDashboard: vi.fn(),
    getClasses: vi.fn(() => Promise.resolve({ classes: mock.classes })),
  }
})

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
  it("renders the matched class's name as the placeholder title", async () => {
    const [firstClass] = classes
    renderAt(firstClass.id)

    expect(
      await screen.findByRole('heading', { name: firstClass.name })
    ).toBeInTheDocument()
    expect(screen.getByText(/under construction/i)).toBeInTheDocument()
  })

  it('falls back to a generic title for an unknown class id', async () => {
    renderAt('does-not-exist')

    expect(await screen.findByRole('heading', { name: 'Class' })).toBeInTheDocument()
  })
})
