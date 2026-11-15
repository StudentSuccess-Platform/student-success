import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ManualPlanForm from '../../../src/components/teacher/remediation/ManualPlanForm'
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

describe('ManualPlanForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('requires a plan title and names the field before calling the API', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={onSaved} />)

    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(screen.getByText('Plan title is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Plan title')).toHaveAttribute('aria-invalid', 'true')
    expect(api.createManualPlan).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('saves the trimmed plan with steps split by line and calls onSaved', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    api.createManualPlan.mockResolvedValue({ plan: { id: 'p-1' } })
    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={onSaved} />)

    await user.type(screen.getByLabelText('Plan title'), '  Fractions  ')
    await user.type(screen.getByLabelText('Rationale'), 'Low quiz scores')
    fireEvent.change(screen.getByLabelText('Steps (one per line)'), {
      target: { value: 'Read chapter\n\n  Quiz again  \n' },
    })
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(api.createManualPlan).toHaveBeenCalledWith('stu-1', {
      sectionId: 'sec-1',
      title: 'Fractions',
      rationale: 'Low quiz scores',
      items: [{ title: 'Read chapter' }, { title: 'Quiz again' }],
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })

  it('shows server field errors under the matching inputs', async () => {
    const user = userEvent.setup()
    api.createManualPlan.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: { fields: { title: 'Title is too long', items: 'Too many steps' } },
      })
    )
    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Plan title'), 'Plan')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(await screen.findByText('Title is too long')).toBeInTheDocument()
    expect(screen.getByText('Too many steps')).toBeInTheDocument()
    expect(screen.getByText('Please fix the highlighted fields')).toHaveAttribute('role', 'alert')
  })

  it('shows a generic message when the save fails without details', async () => {
    const user = userEvent.setup()
    api.createManualPlan.mockRejectedValue(new Error(''))
    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Plan title'), 'Plan')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(await screen.findByText('Could not save the plan. Please try again.')).toHaveAttribute(
      'role',
      'alert'
    )
  })

  it('disables the save button while saving', async () => {
    const user = userEvent.setup()
    let finish
    api.createManualPlan.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Plan title'), 'Plan')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(screen.getByRole('button', { name: 'Save plan' })).toBeDisabled()

    finish({ plan: { id: 'p-1' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save plan' })).toBeEnabled())
  })

  it('shows a cancel button only when onCancel is given', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const { unmount } = render(
      <ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={vi.fn()} onCancel={onCancel} />
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    unmount()

    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })
})

describe('ManualPlanForm field errors', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('links a blank title error to its input with aria-invalid and aria-describedby', async () => {
    const user = userEvent.setup()
    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    const title = screen.getByLabelText('Plan title')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    const message = document.getElementById(title.getAttribute('aria-describedby'))
    expect(message).toHaveTextContent('Plan title is required')
    expect(message).toHaveAttribute('role', 'alert')
  })

  it('links server field errors for rationale and steps and shows the section error', async () => {
    const user = userEvent.setup()
    api.createManualPlan.mockRejectedValue(
      new ApiError('Please fix the highlighted fields', {
        status: 400,
        body: {
          fields: {
            rationale: 'Rationale is too long',
            items: 'Add at least one step',
            sectionId: 'Choose a class',
          },
        },
      })
    )
    render(<ManualPlanForm studentId="stu-1" sectionId="sec-1" onSaved={vi.fn()} />)

    await user.type(screen.getByLabelText('Plan title'), 'Plan')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    const rationale = screen.getByLabelText('Rationale')
    expect(rationale).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(rationale.getAttribute('aria-describedby'))).toHaveTextContent(
      'Rationale is too long'
    )
    const steps = screen.getByLabelText('Steps (one per line)')
    expect(steps).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(steps.getAttribute('aria-describedby'))).toHaveTextContent(
      'Add at least one step'
    )
    expect(await screen.findByText('Choose a class')).toHaveAttribute('role', 'alert')
  })
})
