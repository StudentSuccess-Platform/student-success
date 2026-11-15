import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RemediationPanel from '../../../src/components/teacher/remediation/RemediationPanel'
import { ApiError } from '../../../src/services/http'
import * as api from '../../../src/services/teacherRemediationApi'

vi.mock('../../../src/services/teacherRemediationApi', () => ({
  listPlans: vi.fn(),
  generateAiPlan: vi.fn(),
  createManualPlan: vi.fn(),
  editPlan: vi.fn(),
  approvePlan: vi.fn(),
  rejectPlan: vi.fn(),
  publishPlan: vi.fn(),
}))

const CLASS_ONE = { id: 'sec-1', name: 'Algebra II', period: 1, room: '101' }
const CLASS_TWO = { id: 'sec-2', name: 'Geometry', period: 3, room: '204' }

function makePlan(overrides = {}) {
  return {
    id: 'p-1',
    studentId: 'stu-1',
    sectionId: 'sec-1',
    className: 'Algebra II',
    title: 'Review fractions',
    rationale: 'Scores dipped in fractions.',
    status: 'draft',
    source: 'teacher',
    items: [{ id: 'i-1', title: 'Watch the video' }],
    aiAuditId: null,
    createdAt: '2025-11-01T10:00:00.000Z',
    updatedAt: '2025-11-01T10:00:00.000Z',
    reviewedAt: null,
    publishedAt: null,
    ...overrides,
  }
}

function renderPanel(props = {}) {
  return render(<RemediationPanel studentId="stu-1" classes={[CLASS_ONE]} {...props} />)
}

describe('RemediationPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.listPlans.mockResolvedValue({ plans: [] })
  })

  it('shows a loading line, then the empty state when there are no plans', async () => {
    api.listPlans.mockReturnValue(new Promise(() => {}))
    const { unmount } = renderPanel()
    expect(screen.getByText('Loading remediation plans…')).toBeInTheDocument()
    unmount()

    api.listPlans.mockResolvedValue({ plans: [] })
    renderPanel()
    expect(await screen.findByText('No remediation plans yet.')).toBeInTheDocument()
    expect(api.listPlans).toHaveBeenCalledWith('stu-1')
  })

  it('lists plans newest first with their status badges', async () => {
    api.listPlans.mockResolvedValue({
      plans: [
        makePlan({ id: 'old', title: 'Older plan', createdAt: '2025-10-01T00:00:00.000Z' }),
        makePlan({
          id: 'new',
          title: 'Newer plan',
          status: 'approved',
          createdAt: '2025-11-05T00:00:00.000Z',
        }),
      ],
    })

    renderPanel()

    const titles = await screen.findAllByRole('heading', { level: 3 })
    expect(titles.map((node) => node.textContent)).toEqual(['Newer plan', 'Older plan'])
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.queryByText('No remediation plans yet.')).not.toBeInTheDocument()
  })

  it('shows a load error while keeping the panel buttons', async () => {
    api.listPlans.mockRejectedValue(new ApiError('Student not found', { status: 404 }))

    renderPanel()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load remediation plans.')
    expect(screen.getByRole('button', { name: 'Generate AI recommendation' })).toBeInTheDocument()
  })

  it('generates an AI plan and shows it in the list', async () => {
    const user = userEvent.setup()
    api.listPlans.mockResolvedValueOnce({ plans: [] }).mockResolvedValueOnce({
      plans: [
        makePlan({
          id: 'ai-1',
          title: 'AI suggested plan',
          source: 'ai',
          status: 'pending_review',
        }),
      ],
    })
    api.generateAiPlan.mockResolvedValue({ plan: { id: 'ai-1' } })

    renderPanel()
    await screen.findByText('No remediation plans yet.')
    await user.click(screen.getByRole('button', { name: 'Generate AI recommendation' }))

    expect(api.generateAiPlan).toHaveBeenCalledWith('stu-1', { sectionId: 'sec-1' })
    expect(await screen.findByText('AI suggested plan')).toBeInTheDocument()
    expect(screen.getByText('AI draft (advisory, not yet approved)')).toBeInTheDocument()
  })

  it('disables the generate button and shows Generating… while waiting', async () => {
    const user = userEvent.setup()
    let resolveGenerate
    api.generateAiPlan.mockReturnValue(new Promise((resolve) => (resolveGenerate = resolve)))

    renderPanel()
    await screen.findByText('No remediation plans yet.')
    await user.click(screen.getByRole('button', { name: 'Generate AI recommendation' }))

    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled()

    resolveGenerate({ plan: { id: 'ai-1' } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Generate AI recommendation' })).toBeEnabled()
    )
  })

  it.each([
    [
      'AI_UNAVAILABLE',
      new ApiError('The AI service is unavailable. You can create a plan manually.', {
        status: 503,
        body: { code: 'AI_UNAVAILABLE', fallback: 'manual' },
      }),
      'The AI service is unavailable.',
    ],
    [
      'AI_INVALID_RESPONSE',
      new ApiError('The AI response was not usable.', {
        status: 502,
        body: { code: 'AI_INVALID_RESPONSE', fallback: 'manual' },
      }),
      'The AI response was not usable.',
    ],
    ['server error (500)', new ApiError('Something broke.', { status: 500 }), 'Something broke.'],
    [
      'network error',
      new ApiError('Network error. Please check your connection.', { status: 0 }),
      'Network error. Please check your connection.',
    ],
  ])(
    'falls back to a manual plan on %s and keeps existing plans',
    async (_label, error, message) => {
      const user = userEvent.setup()
      api.listPlans.mockResolvedValue({ plans: [makePlan({ title: 'Existing plan' })] })
      api.generateAiPlan.mockRejectedValue(error)

      renderPanel()
      await screen.findByText('Existing plan')
      await user.click(screen.getByRole('button', { name: 'Generate AI recommendation' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(message)
      expect(alert).toHaveTextContent('You can create a plan manually.')
      expect(screen.getByLabelText('Plan title')).toBeInTheDocument()
      expect(screen.getByText('Existing plan')).toBeInTheDocument()
      expect(api.listPlans).toHaveBeenCalledTimes(1)
    }
  )

  it('shows only the server message for errors that are not fallback cases', async () => {
    const user = userEvent.setup()
    api.generateAiPlan.mockRejectedValue(
      new ApiError('You cannot request a plan for this student.', { status: 403 })
    )

    renderPanel()
    await screen.findByText('No remediation plans yet.')
    await user.click(screen.getByRole('button', { name: 'Generate AI recommendation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot request a plan for this student.'
    )
    expect(screen.queryByText(/You can create a plan manually/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Plan title')).not.toBeInTheDocument()
  })

  it('opens the manual form from the button and validates the title before saving', async () => {
    const user = userEvent.setup()
    renderPanel()
    await screen.findByText('No remediation plans yet.')

    await user.click(screen.getByRole('button', { name: 'Create plan manually' }))
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(screen.getByText('Plan title is required')).toBeInTheDocument()
    expect(api.createManualPlan).not.toHaveBeenCalled()
  })

  it('creates a manual plan with steps split by line, then refreshes and closes the form', async () => {
    const user = userEvent.setup()
    api.listPlans
      .mockResolvedValueOnce({ plans: [] })
      .mockResolvedValueOnce({ plans: [makePlan({ title: 'Manual plan' })] })
    api.createManualPlan.mockResolvedValue({ plan: { id: 'p-1' } })

    renderPanel()
    await screen.findByText('No remediation plans yet.')
    await user.click(screen.getByRole('button', { name: 'Create plan manually' }))

    await user.type(screen.getByLabelText('Plan title'), 'Manual plan')
    await user.type(screen.getByLabelText('Rationale'), 'Needs practice')
    fireEvent.change(screen.getByLabelText('Steps (one per line)'), {
      target: { value: 'Step one\n\nStep two' },
    })
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(api.createManualPlan).toHaveBeenCalledWith('stu-1', {
      sectionId: 'sec-1',
      title: 'Manual plan',
      rationale: 'Needs practice',
      items: [{ title: 'Step one' }, { title: 'Step two' }],
    })
    expect(await screen.findByText('Manual plan')).toBeInTheDocument()
    expect(screen.queryByLabelText('Plan title')).not.toBeInTheDocument()
  })

  it('shows server field errors under the manual form inputs', async () => {
    const user = userEvent.setup()
    api.createManualPlan.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { title: 'Title is too long' } },
      })
    )

    renderPanel()
    await screen.findByText('No remediation plans yet.')
    await user.click(screen.getByRole('button', { name: 'Create plan manually' }))
    await user.type(screen.getByLabelText('Plan title'), 'Something')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(await screen.findByText('Title is too long')).toBeInTheDocument()
    expect(screen.getByText('Please fix the highlighted fields')).toHaveAttribute('role', 'alert')
  })

  it('offers a class select with several classes and generates for the chosen one', async () => {
    const user = userEvent.setup()
    api.generateAiPlan.mockResolvedValue({ plan: { id: 'ai-2' } })

    renderPanel({ classes: [CLASS_ONE, CLASS_TWO] })
    await screen.findByText('No remediation plans yet.')

    await user.selectOptions(screen.getByLabelText('Class'), 'sec-2')
    await user.click(screen.getByRole('button', { name: 'Generate AI recommendation' }))

    expect(api.generateAiPlan).toHaveBeenCalledWith('stu-1', { sectionId: 'sec-2' })
  })

  it('hides the class select when the student has a single class', async () => {
    renderPanel({ classes: [CLASS_ONE] })
    await screen.findByText('No remediation plans yet.')

    expect(screen.queryByLabelText('Class')).not.toBeInTheDocument()
  })

  it('refreshes the list after approving a plan from the panel', async () => {
    const user = userEvent.setup()
    api.listPlans
      .mockResolvedValueOnce({ plans: [makePlan({ status: 'draft' })] })
      .mockResolvedValueOnce({ plans: [makePlan({ status: 'approved' })] })
    api.approvePlan.mockResolvedValue({ plan: { id: 'p-1' } })

    renderPanel()
    const heading = await screen.findByRole('heading', { level: 3, name: 'Review fractions' })
    const card = heading.closest('article')
    await user.click(within(card).getByRole('button', { name: 'Approve' }))

    expect(api.approvePlan).toHaveBeenCalledWith('stu-1', 'p-1')
    await waitFor(() => expect(api.listPlans).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Approved')).toBeInTheDocument()
  })
})
