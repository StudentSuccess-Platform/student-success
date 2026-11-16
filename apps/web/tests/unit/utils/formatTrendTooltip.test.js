import { describe, expect, it } from 'vitest'
import { formatTrendTooltip } from '../../../src/utils/formatTrendTooltip'

describe('formatTrendTooltip', () => {
  it('formats the tooltip as "<value><unit>" / "<label>"', () => {
    expect(formatTrendTooltip(79, 'Average Grade', '%')).toEqual([
      '79%',
      'Average Grade',
    ])
  })

  it('defaults to no unit suffix when one is not given', () => {
    expect(formatTrendTooltip(50, 'Value', '')).toEqual(['50', 'Value'])
  })

  it('reflects the exact value passed in, point by point', () => {
    expect(formatTrendTooltip(0, 'Average Grade', '%')).toEqual(['0%', 'Average Grade'])
    expect(formatTrendTooltip(100, 'Average Grade', '%')).toEqual([
      '100%',
      'Average Grade',
    ])
  })
})
