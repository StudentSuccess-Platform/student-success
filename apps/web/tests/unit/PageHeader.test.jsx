import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PageHeader from '../../src/components/common/PageHeader'

describe('PageHeader', () => {
  it('renders the title and subtitle', () => {
    render(<PageHeader title="My Classes" subtitle="Manage your roster" />)

    expect(screen.getByRole('heading', { name: 'My Classes' })).toBeInTheDocument()
    expect(screen.getByText('Manage your roster')).toBeInTheDocument()
  })

  it('renders without a subtitle when one is not given', () => {
    render(<PageHeader title="Dashboard" />)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders the action slot', () => {
    render(<PageHeader title="My Classes" action={<button>Add Class</button>} />)

    expect(screen.getByRole('button', { name: 'Add Class' })).toBeInTheDocument()
  })
})
