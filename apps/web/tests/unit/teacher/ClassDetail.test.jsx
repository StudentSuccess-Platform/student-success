import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClassDetail from '../../../src/pages/teacher/ClassDetail'
import { getClasses } from '../../../src/services/teacherApi'

vi.mock('../../../src/services/teacherApi', () => ({
  getDashboard: vi.fn(),
  getClasses: vi.fn(),
}))

const realClasses = [
  { id: '507f1f77bcf86cd799439011', name: 'Algebra I', period: 'Period 2', room: 'Room 104', studentCount: 28 },
  { id: '507f1f77bcf86cd799439012', name: 'Geometry', period: 'Period 6', room: 'Room 104', studentCount: 29 },
]

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 240,
    top: 0,
    left: 0,
    bottom: 240,
    right: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  })

  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
    }
    observe(target) {
      this.callback([{ target, contentRect: target.getBoundingClientRect() }])
    }
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
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
  it("renders the matched class's own name, period, room, and enrollment from the API", async () => {
    getClasses.mockResolvedValue({ classes: realClasses })
    const [firstClass] = realClasses
    renderAt(firstClass.id)

    expect(
      await screen.findByRole('heading', { name: firstClass.name })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        `${firstClass.period} · ${firstClass.room} · ${firstClass.studentCount} students enrolled`
      )
    ).toBeInTheDocument()
  })

  it('renders different content for a different real class id, without leaking the other class', async () => {
    getClasses.mockResolvedValue({ classes: realClasses })
    const [firstClass, secondClass] = realClasses
    const { unmount } = renderAt(firstClass.id)
    expect(await screen.findByRole('heading', { name: firstClass.name })).toBeInTheDocument()
    unmount()

    renderAt(secondClass.id)
    expect(await screen.findByRole('heading', { name: secondClass.name })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: firstClass.name })).not.toBeInTheDocument()
  })

  it('shows a not-found message for a class id this teacher does not own, and shows no other class data', async () => {
    getClasses.mockResolvedValue({ classes: realClasses })
    renderAt('507f1f77bcf86cd799439099')

    await waitFor(() => expect(screen.getByText(/class not found/i)).toBeInTheDocument())
    expect(
      screen.getByRole('link', { name: /back to my classes/i })
    ).toBeInTheDocument()
    for (const classItem of realClasses) {
      expect(screen.queryByRole('heading', { name: classItem.name })).not.toBeInTheDocument()
    }
  })

  it('shows a not-found message for a malformed class id', async () => {
    getClasses.mockResolvedValue({ classes: realClasses })
    renderAt('does-not-exist')

    await waitFor(() => expect(screen.getByText(/class not found/i)).toBeInTheDocument())
  })

  it('does not show English Literature demo content for a math class (Algebra I)', async () => {
    getClasses.mockResolvedValue({ classes: realClasses })
    renderAt(realClasses[0].id)

    await screen.findByRole('heading', { name: 'Algebra I' })
    expect(screen.queryByText(/symbolism in the great gatsby/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/reading journal/i)).not.toBeInTheDocument()
  })
})
