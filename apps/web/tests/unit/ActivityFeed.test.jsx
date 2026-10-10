import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ActivityFeed from '../../src/components/teacher/ActivityFeed'

const NOW = new Date('2026-10-10T15:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function isoMinutesAgo(minutes) {
  return new Date(NOW.getTime() - minutes * 60 * 1000).toISOString()
}

describe('ActivityFeed', () => {
  it('renders each item\'s description and a formatted relative timestamp', () => {
    render(
      <ActivityFeed
        items={[
          {
            id: 1,
            description: 'Grade updated for Algebra II',
            timestamp: isoMinutesAgo(60),
          },
        ]}
      />
    )

    expect(screen.getByText('Grade updated for Algebra II')).toBeInTheDocument()
    expect(screen.getByText('1 hour ago')).toBeInTheDocument()
  })

  it('renders an action button only for items with an actionLabel', () => {
    render(
      <ActivityFeed
        items={[
          {
            id: 1,
            description: 'Needs review',
            timestamp: isoMinutesAgo(5),
            actionLabel: 'Review',
          },
          { id: 2, description: 'No action needed', timestamp: isoMinutesAgo(5) },
        ]}
      />
    )

    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('calls onAction when the action button is clicked', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()

    render(
      <ActivityFeed
        items={[
          {
            id: 1,
            description: '5 assignments pending grading',
            timestamp: isoMinutesAgo(24 * 60),
            actionLabel: 'Grade now',
            onAction,
          },
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Grade now' }))

    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when there is no activity', () => {
    render(<ActivityFeed items={[]} />)

    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument()
  })
})
