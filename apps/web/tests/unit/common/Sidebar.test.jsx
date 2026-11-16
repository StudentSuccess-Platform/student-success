import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Sidebar from '../../../src/components/common/Sidebar'
import { AuthProvider } from '../../../src/state/AuthContext'

const navItems = [
  { id: 'home', label: 'Home', icon: 'home-icon.svg', path: '/portal/home' },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'reports-icon.svg',
    path: '/portal/reports',
  },
]

const user = {
  name: 'Jane Doe',
  subtitle: 'Math Department',
  avatarUrl: 'avatar.png',
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

function renderSidebar(initialPath) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar portalLabel="Test Portal" navItems={navItems} user={user} />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('Sidebar', () => {
  it('renders the brand, portal label, and user profile', () => {
    renderSidebar('/portal/home')

    expect(screen.getByText('StudentSuccess')).toBeInTheDocument()
    expect(screen.getByText('Test Portal')).toBeInTheDocument()
    expect(screen.getByText(user.name)).toBeInTheDocument()
    expect(screen.getByText(user.subtitle)).toBeInTheDocument()

    const avatar = screen.getByText(user.name)
      .closest('.sidebar-profile')
      .querySelector('img')
    expect(avatar).toHaveAttribute('src', user.avatarUrl)
  })

  it('renders a navigation link for every item in the provided config', () => {
    renderSidebar('/portal/home')

    expect(screen.getAllByRole('link')).toHaveLength(navItems.length)

    for (const item of navItems) {
      expect(
        screen.getByRole('link', { name: item.label })
      ).toHaveAttribute('href', item.path)
    }
  })

  it('marks only the nav item matching the current route as active', () => {
    renderSidebar('/portal/reports')

    const activeLink = screen.getByRole('link', { name: 'Reports' })
    const inactiveLink = screen.getByRole('link', { name: 'Home' })

    expect(activeLink).toHaveClass('is-active')
    expect(activeLink).toHaveAttribute('aria-current', 'page')

    expect(inactiveLink).not.toHaveClass('is-active')
    expect(inactiveLink).not.toHaveAttribute('aria-current')
  })
})
