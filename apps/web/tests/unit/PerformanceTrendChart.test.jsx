import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PerformanceTrendChart from '../../src/components/common/PerformanceTrendChart'

const data = [
  { label: 'Week 1', value: 78 },
  { label: 'Week 2', value: 80 },
]

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240)
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
    observe(target) {
      this.callback([{ target, contentRect: target.getBoundingClientRect() }])
    }
    constructor(callback) {
      this.callback = callback
    }
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PerformanceTrendChart', () => {
  it('renders a line for the provided data', () => {
    const { container } = render(<PerformanceTrendChart data={data} animate={false} />)

    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    expect(container.querySelector('.recharts-line')).toBeInTheDocument()
  })

  it('plots one point per data entry', () => {
    const { container } = render(<PerformanceTrendChart data={data} animate={false} />)

    expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(data.length)
  })

  it('renders the custom x/y keys when provided', () => {
    const scoreData = [
      { week: 'W1', score: 90 },
      { week: 'W2', score: 92 },
    ]

    const { container } = render(
      <PerformanceTrendChart
        data={scoreData}
        xKey="week"
        yKey="score"
        animate={false}
      />
    )

    expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(scoreData.length)
  })

  it('shows an empty state instead of a chart when there is no data', () => {
    const { container } = render(<PerformanceTrendChart data={[]} animate={false} />)

    expect(screen.getByText(/no performance data available yet/i)).toBeInTheDocument()
    expect(container.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
  })

  it('renders normally when a custom tooltip label and unit are provided', () => {
    const { container } = render(
      <PerformanceTrendChart
        data={data}
        animate={false}
        tooltipLabel="Average Grade"
        tooltipUnit="%"
      />
    )

    expect(container.querySelector('.recharts-line')).toBeInTheDocument()
    expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(data.length)
  })
})
