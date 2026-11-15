import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RemediationPlanCard from '../../../src/components/teacher/remediation/RemediationPlanCard'
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
    items: [
      { id: 'i-1', title: 'Watch the video' },
      { id: 'i-2', title: 'Finish practice set' },
    ],
    aiAuditId: null,
    createdAt: '2025-11-01T10:00:00.000Z',
    updatedAt: '2025-11-01T10:00:00.000Z',
    reviewedAt: null,
    publishedAt: null,
    ...overrides,
  }
}

function buttonNames() {
  return screen.queryAllByRole('button').map((button) => button.textContent)
}

describe('RemediationPlanCard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows title, rationale, steps, class and a Draft badge with edit, approve and reject for a draft', () => {
    renderCardAndReturn(makePlan())

    expect(screen.getByRole('heading', { level: 3, name: 'Review fractions' })).toBeInTheDocument()
    expect(screen.getByText('Scores dipped in fractions.')).toBeInTheDocument()
    expect(screen.getByText('Watch the video')).toBeInTheDocument()
    expect(screen.getByText('Finish practice set')).toBeInTheDocument()
    expect(screen.getByText('Algebra II')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toHaveClass('teacher-badge')
    expect(screen.getByText('Source: Teacher')).toBeInTheDocument()
    expect(buttonNames()).toEqual(['Edit', 'Approve', 'Reject'])
    expect(screen.queryByText(/AI draft/)).not.toBeInTheDocument()
  })

  it('marks an AI plan awaiting review as an advisory AI draft with the same actions', () => {
    renderCardAndReturn(makePlan({ source: 'ai', status: 'pending_review' }))

    expect(screen.getByText('Pending review')).toHaveClass('teacher-badge--warning')
    expect(screen.getByText('Source: AI')).toBeInTheDocument()
    expect(screen.getByText('AI draft (advisory, not yet approved)')).toBeInTheDocument()
    expect(buttonNames()).toEqual(['Edit', 'Approve', 'Reject'])
  })

  it('offers publish and reject for an approved plan', () => {
    renderCardAndReturn(makePlan({ status: 'approved' }))

    expect(screen.getByText('Approved')).toHaveClass('teacher-badge--success')
    expect(buttonNames()).toEqual(['Publish', 'Reject'])
  })

  it('is read only when published', () => {
    renderCardAndReturn(makePlan({ status: 'published' }))

    expect(screen.getByText('Published')).toHaveClass('teacher-badge--success')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('is read only when rejected', () => {
    renderCardAndReturn(makePlan({ status: 'rejected' }))

    expect(screen.getByText('Rejected')).toHaveClass('teacher-badge--danger')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('approves a plan and asks the panel to refresh', async () => {
    const user = userEvent.setup()
    api.approvePlan.mockResolvedValue({ plan: { id: 'p-1' } })
    const { onChanged } = renderCardAndReturn(makePlan())

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(api.approvePlan).toHaveBeenCalledWith('stu-1', 'p-1')
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  })

  it('rejects a plan with the reject API', async () => {
    const user = userEvent.setup()
    api.rejectPlan.mockResolvedValue({ plan: { id: 'p-1' } })
    const { onChanged } = renderCardAndReturn(makePlan({ status: 'approved' }))

    await user.click(screen.getByRole('button', { name: 'Reject' }))

    expect(api.rejectPlan).toHaveBeenCalledWith('stu-1', 'p-1', {})
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  })

  it('publishes an approved plan and asks the panel to refresh', async () => {
    const user = userEvent.setup()
    api.publishPlan.mockResolvedValue({ plan: { id: 'p-1' } })
    const { onChanged } = renderCardAndReturn(makePlan({ status: 'approved' }))

    await user.click(screen.getByRole('button', { name: 'Publish' }))

    expect(api.publishPlan).toHaveBeenCalledWith('stu-1', 'p-1')
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  })

  it('saves edits with steps split by line and trimmed', async () => {
    const user = userEvent.setup()
    api.editPlan.mockResolvedValue({ plan: { id: 'p-1' } })
    const { onChanged } = renderCardAndReturn(makePlan())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const title = screen.getByLabelText('Plan title')
    await user.clear(title)
    await user.type(title, '  Fractions review  ')
    await user.clear(screen.getByLabelText('Rationale'))
    await user.type(screen.getByLabelText('Rationale'), 'New reason')
    await user.clear(screen.getByLabelText('Steps (one per line)'))
    await user.type(screen.getByLabelText('Steps (one per line)'), 'Step one{enter}{enter}  Step two  ')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(api.editPlan).toHaveBeenCalledWith('stu-1', 'p-1', {
      title: 'Fractions review',
      rationale: 'New reason',
      items: [{ title: 'Step one' }, { title: 'Step two' }],
    })
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(screen.queryByLabelText('Plan title')).not.toBeInTheDocument()
  })

  it('pre-fills the edit form with the current plan values', async () => {
    const user = userEvent.setup()
    renderCardAndReturn(makePlan())

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Plan title')).toHaveValue('Review fractions')
    expect(screen.getByLabelText('Rationale')).toHaveValue('Scores dipped in fractions.')
    expect(screen.getByLabelText('Steps (one per line)')).toHaveValue(
      'Watch the video\nFinish practice set'
    )
  })

  it('requires a title before saving an edit', async () => {
    const user = userEvent.setup()
    renderCardAndReturn(makePlan())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Plan title'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByText('Plan title is required')).toBeInTheDocument()
    expect(api.editPlan).not.toHaveBeenCalled()
  })

  it('closes the edit form on cancel without calling the API', async () => {
    const user = userEvent.setup()
    renderCardAndReturn(makePlan())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByLabelText('Plan title')).not.toBeInTheDocument()
    expect(api.editPlan).not.toHaveBeenCalled()
  })

  it('disables every action while a request is in flight', async () => {
    const user = userEvent.setup()
    let finish
    api.approvePlan.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    renderCardAndReturn(makePlan())

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled()

    finish({ plan: { id: 'p-1' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled())
  })

  it('shows the server error on the card and does not refresh', async () => {
    const user = userEvent.setup()
    api.publishPlan.mockRejectedValue(
      new ApiError('Approve the plan before publishing', { status: 409 })
    )
    const { onChanged } = renderCardAndReturn(makePlan({ status: 'approved' }))

    await user.click(screen.getByRole('button', { name: 'Publish' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Approve the plan before publishing')
    expect(onChanged).not.toHaveBeenCalled()
  })
})

// Renders the card and returns the onChanged spy so tests can assert refreshes.
function renderCardAndReturn(plan) {
  const onChanged = vi.fn()
  render(<RemediationPlanCard studentId="stu-1" plan={plan} onChanged={onChanged} />)
  return { onChanged }
}

describe('RemediationPlanCard edit form', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('links a blank title error to its input', async () => {
    const user = userEvent.setup()
    render(<RemediationPlanCard studentId="stu-1" plan={makePlan()} onChanged={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Plan title'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const title = screen.getByLabelText('Plan title')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(title.getAttribute('aria-describedby'))).toHaveTextContent(
      'Plan title is required'
    )
    expect(api.editPlan).not.toHaveBeenCalled()
  })

  it('shows server field errors under their inputs and keeps the editor open', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    api.editPlan.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { rationale: 'Rationale is too long' } },
      })
    )
    render(<RemediationPlanCard studentId="stu-1" plan={makePlan()} onChanged={onChanged} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const rationale = screen.getByLabelText('Rationale')
    expect(rationale).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(rationale.getAttribute('aria-describedby'))).toHaveTextContent(
      'Rationale is too long'
    )
    expect(await screen.findByText('Please fix the highlighted fields')).toHaveAttribute('role', 'alert')
    expect(screen.getByLabelText('Plan title')).toBeInTheDocument()
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('renders repeated steps that have no id', () => {
    render(
      <RemediationPlanCard
        studentId="stu-1"
        plan={makePlan({ items: [{ title: 'Same step' }, { title: 'Same step' }] })}
        onChanged={vi.fn()}
      />
    )

    expect(screen.getAllByText('Same step')).toHaveLength(2)
  })
})
