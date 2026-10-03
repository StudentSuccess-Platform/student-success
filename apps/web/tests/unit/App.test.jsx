import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../../src/App.jsx'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /get started/i })
    ).toBeInTheDocument()
  })

  it('tracks the counter as it increments after each click', async () => {
    const user = userEvent.setup()

    render(<App />)

    const counterButton = screen.getByRole('button', {
      name: /count is 0/i,
    })

    await user.click(counterButton)
    expect(counterButton).toHaveTextContent('Count is 1')

    await user.click(counterButton)
    expect(counterButton).toHaveTextContent('Count is 2')
  })
})