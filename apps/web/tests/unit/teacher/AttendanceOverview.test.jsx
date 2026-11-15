import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AttendanceOverview from '../../../src/components/teacher/AttendanceOverview'

const classes = [
  { name: 'Algebra II', rate: 96 },
  { name: 'World History', rate: 89 },
]

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 200,
    top: 0,
    left: 0,
    bottom: 200,
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
  vi.restoreAllMocks()
})

describe('AttendanceOverview', () => {
  it('displays the overall attendance rate', () => {
    render(<AttendanceOverview overallRate={94} classes={classes} animate={false} />)

    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('Overall attendance')).toBeInTheDocument()
  })

  it('renders one bar per class, coloring rates below the threshold differently', () => {
    const { container } = render(
      <AttendanceOverview overallRate={94} classes={classes} animate={false} />
    )

    const bars = container.querySelectorAll('.recharts-bar-rectangle')
    expect(bars).toHaveLength(classes.length)

    const fills = Array.from(bars).map((bar) =>
      bar.querySelector('path').getAttribute('fill')
    )
    expect(fills[0]).toBe('#13233a')
    expect(fills[1]).toBe('#f36c21')
  })

  it('shows an empty state instead of a chart when there are no classes', () => {
    const { container } = render(
      <AttendanceOverview overallRate={0} classes={[]} animate={false} />
    )

    expect(screen.getByText(/no attendance data available yet/i)).toBeInTheDocument()
    expect(container.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
  })
})
