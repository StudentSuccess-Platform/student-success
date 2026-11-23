import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ParentChildSelector from '../../../src/pages/parent/ParentChildSelector'

const twoChildren = [
  { id: 's1', name: 'Liam Patel', gradeLevel: 8 },
  { id: 's2', name: 'Maya Patel', gradeLevel: 5 },
]

describe('ParentChildSelector', () => {
  it('renders nothing when there are zero linked children', () => {
    const { container } = render(
      <ParentChildSelector children={[]} selectedId={null} onSelect={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when there is exactly one linked child', () => {
    const { container } = render(
      <ParentChildSelector
        children={[twoChildren[0]]}
        selectedId="s1"
        onSelect={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders an option for every linked child, and only those children, when there are 2+', () => {
    render(<ParentChildSelector children={twoChildren} selectedId="s1" onSelect={vi.fn()} />)

    const select = screen.getByLabelText(/viewing/i)
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toEqual(['Liam Patel', 'Maya Patel'])
  })

  it('calls onSelect with the chosen child id when the selection changes', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ParentChildSelector children={twoChildren} selectedId="s1" onSelect={onSelect} />)

    await user.selectOptions(screen.getByLabelText(/viewing/i), 'Maya Patel')

    expect(onSelect).toHaveBeenCalledWith('s2')
  })
})
