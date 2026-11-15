import { useId, useState } from 'react'
import {
  approvePlan,
  editPlan,
  publishPlan,
  rejectPlan,
} from '../../../services/teacherRemediationApi'
import {
  allowedActions,
  itemsToStepsText,
  statusBadgeClass,
  statusLabel,
  stepsToItems,
} from './planStatus'

const ACTION_LABELS = {
  edit: 'Edit',
  approve: 'Approve',
  reject: 'Reject',
  publish: 'Publish',
}

function RemediationPlanCard({ studentId, plan, onChanged }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState({ title: '', rationale: '', steps: '' })
  const [editErrors, setEditErrors] = useState({})
  const [isBusy, setIsBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const titleId = useId()
  const rationaleId = useId()
  const stepsId = useId()

  const actions = allowedActions(plan.status)
  const items = plan.items ?? []
  const isAiDraft = plan.source === 'ai' && plan.status === 'pending_review'

  // Runs one API call, then refreshes the list. Resolves true on success.
  async function run(call) {
    setIsBusy(true)
    setActionError('')
    try {
      await call()
      setIsBusy(false)
      onChanged()
      return true
    } catch (error) {
      setActionError(error?.message || 'Something went wrong. Please try again.')
      setIsBusy(false)
      return false
    }
  }

  function openEditor() {
    setDraft({
      title: plan.title ?? '',
      rationale: plan.rationale ?? '',
      steps: itemsToStepsText(items),
    })
    setEditErrors({})
    setActionError('')
    setIsEditing(true)
  }

  function closeEditor() {
    setIsEditing(false)
    setEditErrors({})
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!draft.title.trim()) {
      setEditErrors({ title: 'Plan title is required' })
      return
    }

    setEditErrors({})
    const saved = await run(() =>
      editPlan(studentId, plan.id, {
        title: draft.title.trim(),
        rationale: draft.rationale.trim(),
        items: stepsToItems(draft.steps),
      })
    )
    if (saved) closeEditor()
  }

  const handlers = {
    edit: openEditor,
    approve: () => run(() => approvePlan(studentId, plan.id)),
    reject: () => run(() => rejectPlan(studentId, plan.id, {})),
    publish: () => run(() => publishPlan(studentId, plan.id)),
  }

  return (
    <article className="remediation-card">
      <header className="remediation-card-header">
        <div>
          <h3 className="remediation-card-title">{plan.title}</h3>
          {plan.className && <p className="teacher-muted">{plan.className}</p>}
        </div>
        <span className={statusBadgeClass(plan.status)}>{statusLabel(plan.status)}</span>
      </header>

      <p className="teacher-muted">{plan.source === 'ai' ? 'Source: AI' : 'Source: Teacher'}</p>
      {isAiDraft && <p className="remediation-ai-note">AI draft (advisory, not yet approved)</p>}

      {isEditing ? (
        <form className="teacher-form" onSubmit={handleSave} noValidate>
          <div className="teacher-field">
            <label htmlFor={titleId}>Plan title</label>
            <input
              id={titleId}
              type="text"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              aria-invalid={editErrors.title ? true : undefined}
            />
            {editErrors.title && <p className="teacher-field-error">{editErrors.title}</p>}
          </div>

          <div className="teacher-field">
            <label htmlFor={rationaleId}>Rationale</label>
            <textarea
              id={rationaleId}
              rows={3}
              value={draft.rationale}
              onChange={(event) => setDraft({ ...draft, rationale: event.target.value })}
            />
          </div>

          <div className="teacher-field">
            <label htmlFor={stepsId}>Steps (one per line)</label>
            <textarea
              id={stepsId}
              rows={4}
              value={draft.steps}
              onChange={(event) => setDraft({ ...draft, steps: event.target.value })}
            />
          </div>

          <div className="teacher-form-actions">
            <button
              type="submit"
              className="teacher-button teacher-button--primary"
              disabled={isBusy}
            >
              Save changes
            </button>
            <button type="button" className="teacher-button" onClick={closeEditor} disabled={isBusy}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {plan.rationale && <p className="remediation-rationale">{plan.rationale}</p>}
          {items.length > 0 && (
            <ol className="remediation-steps">
              {items.map((item) => (
                <li key={item.id ?? item.title}>
                  <span>{item.title}</span>
                  {item.description && <span className="teacher-muted"> {item.description}</span>}
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {actionError && (
        <p role="alert" className="teacher-form-error">
          {actionError}
        </p>
      )}

      {!isEditing && actions.length > 0 && (
        <div className="teacher-form-actions">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className={`teacher-button${action === 'reject' ? ' teacher-button--danger' : ''}${
                action === 'publish' ? ' teacher-button--primary' : ''
              }`}
              onClick={handlers[action]}
              disabled={isBusy}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

export default RemediationPlanCard
