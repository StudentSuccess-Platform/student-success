import { useState } from 'react'
import { addGoalUpdate } from '../../../services/teacherRecordsApi'
import RecordField from './RecordField'
import RecordFormFooter from './RecordFormFooter'
import { fieldProps, requiredErrors } from './recordFormHelpers'
import useRecordSubmit from './useRecordSubmit'

const EMPTY = { goalId: '', progressPercent: '', note: '' }

function validate(values) {
  const errors = requiredErrors(values, {
    goalId: 'Goal',
    progressPercent: 'Progress (%)',
    note: 'Note',
  })
  if (!errors.progressPercent) {
    const progress = Number(values.progressPercent)
    if (Number.isNaN(progress)) errors.progressPercent = 'Progress (%) must be a number'
    else if (progress < 0 || progress > 100) errors.progressPercent = 'Progress (%) must be between 0 and 100'
  }
  return errors
}

function GoalProgressForm({ studentId, goals, onSaved }) {
  const [values, setValues] = useState(EMPTY)
  const { saving, saved, formError, fieldErrors, submit } = useRecordSubmit(onSaved)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const errors = validate(values)
    submit({
      errors,
      send: () =>
        addGoalUpdate(studentId, values.goalId, {
          progressPercent: Number(values.progressPercent),
          note: values.note.trim(),
        }),
      onSuccess: () => setValues(EMPTY),
    })
  }

  return (
    <div className="teacher-records-group" role="group" aria-labelledby="records-progress-title">
      <h3 id="records-progress-title" className="teacher-records-group-title">
        Update goal progress
      </h3>
      {goals.length === 0 ? (
        <p className="teacher-muted">No goals yet. Add a goal first, then record its progress here.</p>
      ) : (
        <form className="teacher-form" onSubmit={handleSubmit} noValidate>
          <RecordField id="progress-goal" label="Goal" error={fieldErrors.goalId}>
            <select
              {...fieldProps('progress-goal', fieldErrors.goalId)}
              value={values.goalId}
              onChange={(event) => update('goalId', event.target.value)}
            >
              <option value="">Select a goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </RecordField>
          <RecordField id="progress-percent" label="Progress (%)" error={fieldErrors.progressPercent}>
            <input
              {...fieldProps('progress-percent', fieldErrors.progressPercent)}
              type="number"
              min="0"
              max="100"
              step="1"
              value={values.progressPercent}
              onChange={(event) => update('progressPercent', event.target.value)}
            />
          </RecordField>
          <RecordField id="progress-note" label="Note" error={fieldErrors.note}>
            <textarea
              {...fieldProps('progress-note', fieldErrors.note)}
              rows={3}
              value={values.note}
              onChange={(event) => update('note', event.target.value)}
            />
          </RecordField>
          <RecordFormFooter saving={saving} saved={saved} formError={formError} submitLabel="Save goal progress" />
        </form>
      )}
    </div>
  )
}

export default GoalProgressForm
