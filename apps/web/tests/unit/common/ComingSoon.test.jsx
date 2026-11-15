import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ComingSoon from '../../../src/components/common/ComingSoon'

describe('ComingSoon', () => {
  it('displays the provided page title', () => {
    render(<ComingSoon title="Reports" />)

    expect(
      screen.getByRole('heading', { name: 'Reports' })
    ).toBeInTheDocument()
    expect(screen.getByText(/under construction/i)).toBeInTheDocument()
  })

  it('renders a different title when given different props', () => {
    render(<ComingSoon title="Settings" />)

    expect(
      screen.getByRole('heading', { name: 'Settings' })
    ).toBeInTheDocument()
  })
})
