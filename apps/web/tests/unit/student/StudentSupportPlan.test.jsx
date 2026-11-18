import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SupportPlan from '../../../src/pages/student/SupportPlan'

const { getStudentSupportPlans } = vi.hoisted(() => ({
  getStudentSupportPlans: vi.fn(),
}))

vi.mock('../../../src/state/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-student-token' }),
}))

vi.mock('../../../src/services/studentApi', () => ({
  getStudentSupportPlans,
}))

const plan = (overrides = {}) => ({
  id: 'p1',
  classId: 'c1',
  className: 'Algebra I',
  title: 'Strengthen fraction skills',
  rationale: 'Practice fraction models with a teacher twice each week.',
  source: 'teacher',
  teacher: 'Dr. Maya Chen',
  publishedAt: '2025-11-12T18:00:00.000Z',
  active: true,
  items: [
    { id: 'i1', title: 'Fraction drills', description: 'Ten problems daily', status: 'done' },
    { id: 'i2', title: 'Ask a question in class', description: null, status: 'todo' },
    { id: 'i3', title: 'Retake the quiz', description: null, status: 'todo' },
  ],
  ...overrides,
})

describe('StudentSupportPlan', () => {
  beforeEach(() => {
    getStudentSupportPlans.mockReset()
    getStudentSupportPlans.mockResolvedValue({ plans: [plan()] })
  })

  it('shows the current plan with its class, publish date, teacher, goal, progress and recommendation', async () => {
    render(<SupportPlan />)

    const card = await screen.findByRole('article', { name: 'Algebra I support plan' })
    expect(getStudentSupportPlans).toHaveBeenCalledWith('mock-student-token')
    expect(within(card).getByRole('heading', { name: 'Algebra I' })).toBeInTheDocument()
    expect(within(card).getByText('Published on Nov 12, 2025')).toBeInTheDocument()
    expect(within(card).getByText('Recommended by Dr. Maya Chen')).toBeInTheDocument()
    expect(within(card).getByText('Strengthen fraction skills')).toBeInTheDocument()
    expect(within(card).getByText('Fraction drills')).toBeInTheDocument()
    expect(within(card).getByText('Ten problems daily')).toBeInTheDocument()
    expect(within(card).getByText('1 of 3 activities completed')).toBeInTheDocument()
    expect(within(card).getByRole('progressbar', { name: 'Algebra I support plan activities completed' }))
      .toHaveAttribute('value', '1')
    expect(within(card).getByText('Practice fraction models with a teacher twice each week.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /earlier plans/i })).not.toBeInTheDocument()
  })

  it('shows one card per class for the current plans', async () => {
    getStudentSupportPlans.mockResolvedValueOnce({
      plans: [plan(), plan({ id: 'p2', classId: 'c2', className: 'Geometry', title: 'Learn proofs' })],
    })

    render(<SupportPlan />)

    expect(await screen.findByRole('article', { name: 'Algebra I support plan' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Geometry support plan' })).toBeInTheDocument()
  })

  it('keeps earlier plans out of sight until the student asks, then labels them', async () => {
    const user = userEvent.setup()
    getStudentSupportPlans.mockResolvedValueOnce({
      plans: [
        plan(),
        plan({ id: 'old', title: 'Old goal', publishedAt: '2025-10-01T18:00:00.000Z', active: false }),
      ],
    })

    render(<SupportPlan />)

    await screen.findByText('Strengthen fraction skills')
    expect(screen.queryByText('Old goal')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Show earlier plans (1)' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)

    expect(screen.getByText('Old goal')).toBeInTheDocument()
    expect(screen.getByText('Earlier plan')).toBeInTheDocument()
    expect(screen.getByText('Published on Oct 1, 2025')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide earlier plans' })).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('button', { name: 'Hide earlier plans' }))
    expect(screen.queryByText('Old goal')).not.toBeInTheDocument()
  })

  it('displays a message when there are no plans', async () => {
    getStudentSupportPlans.mockResolvedValueOnce({ plans: [] })

    render(<SupportPlan />)

    expect(await screen.findByText(/don't currently have an approved support plan/i)).toBeInTheDocument()
  })

  it('still lists earlier plans when no plan is current', async () => {
    getStudentSupportPlans.mockResolvedValueOnce({ plans: [plan({ active: false })] })

    render(<SupportPlan />)

    expect(await screen.findByText(/don't currently have an approved support plan/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show earlier plans (1)' })).toBeInTheDocument()
  })

  it('says so when a plan has no activities or recommendation', async () => {
    getStudentSupportPlans.mockResolvedValueOnce({ plans: [plan({ items: [], rationale: '' })] })

    render(<SupportPlan />)

    expect(await screen.findByText('No activities have been added to this support plan yet.')).toBeInTheDocument()
    expect(screen.getByText('No additional recommendations are available.')).toBeInTheDocument()
  })

  it('displays a request error', async () => {
    getStudentSupportPlans.mockRejectedValueOnce(new Error('Unable to load your support plans (500)'))

    render(<SupportPlan />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your support plans (500)')
  })
})
