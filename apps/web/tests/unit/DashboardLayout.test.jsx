import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import DashboardLayout from '../../src/layouts/DashboardLayout'

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard-icon.svg',
    path: '/teacher/dashboard',
  },
  {
    id: 'classes',
    label: 'My Classes',
    icon: 'classes-icon.svg',
    path: '/teacher/classes',
  },
]

const user = {
  name: 'Mrs. Test',
  subtitle: 'Science Department',
  avatarUrl: 'avatar.png',
}

function renderDashboard(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/teacher"
          element={
            <DashboardLayout
              portalLabel="Teacher Portal"
              navItems={navItems}
              user={user}
            />
          }
        >
          <Route path="dashboard" element={<div>Dashboard page content</div>} />
          <Route path="classes" element={<div>Classes page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardLayout', () => {
  it('renders the sidebar alongside the matched child route content', () => {
    renderDashboard('/teacher/dashboard')

    expect(screen.getByText('Teacher Portal')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Classes' })).toBeInTheDocument()
    expect(screen.getByText('Dashboard page content')).toBeInTheDocument()
    expect(screen.queryByText('Classes page content')).not.toBeInTheDocument()
  })

  it('updates the active nav item and swaps page content when navigating', async () => {
    const testUser = userEvent.setup()
    renderDashboard('/teacher/dashboard')

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })
    const classesLink = screen.getByRole('link', { name: 'My Classes' })

    expect(dashboardLink).toHaveClass('is-active')
    expect(classesLink).not.toHaveClass('is-active')

    await testUser.click(classesLink)

    expect(screen.getByText('Classes page content')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard page content')).not.toBeInTheDocument()
    expect(classesLink).toHaveClass('is-active')
    expect(dashboardLink).not.toHaveClass('is-active')
  })
})
