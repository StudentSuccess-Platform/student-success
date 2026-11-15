import { useId, useState } from 'react'
import { createManualPlan } from '../../../services/teacherRemediationApi'
import { errorId, fieldProps } from '../records/recordFormHelpers'
import { stepsToItems } from './planStatus'

function ManualPlanForm({ studentId, sectionId, onSaved, onCancel }) {
  const [title, setTitle] = useState('')
  const [rationale, setRationale] = useState('')
  const [steps, setSteps] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const titleId = useId()
  const rationaleId = useId()
  const stepsId = useId()

  async function handleSubmit(event) {
    event.preventDefault()

    if (!title.trim()) {
      setFieldErrors({ title: 'Plan title is required' })
      setFormError('')
      return
    }

    setFieldErrors({})
    setFormError('')
    setIsSaving(true)

    try {
      await createManualPlan(studentId, {
        sectionId,
        title: title.trim(),
        rationale: rationale.trim(),
        items: stepsToItems(steps),
      })
      onSaved()
    } catch (error) {
      setFieldErrors(error?.fields ?? {})
      setFormError(error?.message || 'Could not save the plan. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="teacher-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p role="alert" className="teacher-form-error">
          {formError}
        </p>
      )}

      {fieldErrors.sectionId && (
        <p role="alert" className="teacher-form-error">
          {fieldErrors.sectionId}
        </p>
      )}

      <div className="teacher-field">
        <label htmlFor={titleId}>Plan title</label>
        <input
          {...fieldProps(titleId, fieldErrors.title)}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {fieldErrors.title && (
          <p id={errorId(titleId)} role="alert" className="teacher-field-error">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="teacher-field">
        <label htmlFor={rationaleId}>Rationale</label>
        <textarea
          {...fieldProps(rationaleId, fieldErrors.rationale)}
          rows={3}
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
        />
        {fieldErrors.rationale && (
          <p id={errorId(rationaleId)} role="alert" className="teacher-field-error">
            {fieldErrors.rationale}
          </p>
        )}
      </div>

      <div className="teacher-field">
        <label htmlFor={stepsId}>Steps (one per line)</label>
        <textarea
          {...fieldProps(stepsId, fieldErrors.items)}
          rows={4}
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
        />
        {fieldErrors.items && (
          <p id={errorId(stepsId)} role="alert" className="teacher-field-error">
            {fieldErrors.items}
          </p>
        )}
      </div>

      <div className="teacher-form-actions">
        <button type="submit" className="teacher-button teacher-button--primary" disabled={isSaving}>
          Save plan
        </button>
        {onCancel && (
          <button type="button" className="teacher-button" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default ManualPlanForm
