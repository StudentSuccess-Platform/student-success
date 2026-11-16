import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ClassRoster from '../../src/pages/teacher/ClassRoster'
import { getClassDetail } from '../../src/services/teacherApi'

vi.mock('../../src/services/teacherApi', () => ({
  getClassDetail: vi.fn(),
}))

const rosterResponse = {
  class: { id: '507f1f77bcf86cd799439011', name: 'Algebra I', period: 'Period 2', room: 'Room 104' },
  students: [{ id: 's1', name: 'Ada Strong', averageGrade: 95, attendanceRate: 100 }],
  classAverage: 95,
}

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

function renderAt(classId) {
  return render(
    <MemoryRouter initialEntries={[`/teacher/classes/${classId}/roster`]}>
      <Routes>
        <Route path="/teacher/classes/:classId/roster" element={<ClassRoster />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ClassRoster', () => {
  it('renders the real roster for the class id in the route', async () => {
    getClassDetail.mockResolvedValue(rosterResponse)
    renderAt(rosterResponse.class.id)

    expect(await screen.findByRole('heading', { name: 'Algebra I' })).toBeInTheDocument()
    expect(screen.getByText('Ada Strong')).toBeInTheDocument()
    expect(getClassDetail).toHaveBeenCalledWith(rosterResponse.class.id, null)
  })

  it('shows the error state for a class that is not this teacher’s own', async () => {
    getClassDetail.mockRejectedValue(new Error('Class not found'))
    renderAt('507f1f77bcf86cd799439099')

    await waitFor(() => expect(screen.getByText(/couldn't load the roster/i)).toBeInTheDocument())
  })
})
