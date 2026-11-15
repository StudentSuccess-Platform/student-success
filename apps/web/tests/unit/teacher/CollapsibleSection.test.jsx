import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import CollapsibleSection from '../../../src/components/teacher/CollapsibleSection'

describe('CollapsibleSection', () => {
  it('starts open, folds its content away and opens it again', async () => {
    const user = userEvent.setup()
    render(
      <CollapsibleSection title="Grades">
        <p>Grade rows</p>
      </CollapsibleSection>,
    )

    const toggle = screen.getByRole('button', { name: 'Grades' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Grade rows')).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Grade rows')).not.toBeVisible()

    await user.click(toggle)
    expect(screen.getByText('Grade rows')).toBeVisible()
  })

  it('keeps the heading name the same whether open or closed and can start closed', async () => {
    const user = userEvent.setup()
    render(
      <CollapsibleSection title="Attendance" defaultOpen={false}>
        <p>Attendance rows</p>
      </CollapsibleSection>,
    )

    expect(screen.getByRole('heading', { name: 'Attendance' })).toBeInTheDocument()
    expect(screen.getByText('Attendance rows')).not.toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Attendance' }))
    expect(screen.getByRole('heading', { name: 'Attendance' })).toBeInTheDocument()
    expect(screen.getByText('Attendance rows')).toBeVisible()
  })

  it('points the toggle at its content for assistive technology', () => {
    render(
      <CollapsibleSection title="Grades">
        <p>Grade rows</p>
      </CollapsibleSection>,
    )
    const toggle = screen.getByRole('button', { name: 'Grades' })
    expect(document.getElementById(toggle.getAttribute('aria-controls'))).toContainElement(screen.getByText('Grade rows'))
  })
})
