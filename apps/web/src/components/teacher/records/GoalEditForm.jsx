import { useState } from 'react'
import { updateGoal } from '../../../services/teacherRecordsApi'
import RecordField from './RecordField'
import RecordFormFooter from './RecordFormFooter'
import { fieldProps, requiredErrors } from './recordFormHelpers'
import useRecordSubmit from './useRecordSubmit'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'achieved', label: 'Achieved' },
  { value: 'abandoned', label: 'Abandoned' },
]

const EMPTY = { goalId: '', title: '', targetDate: '', status: '' }

// Goal dates are stored at noon UTC, so the first ten characters of the ISO string are the calendar day.
function dateOf(iso) {
  return iso ? String(iso).slice(0, 10) : ''
}

function findGoal(goals, goalId) {
  return goals.find((goal) => goal.id === goalId)
}

// Only the fields the user actually changed are sent. Clearing a set target date sends null.
function buildChanges(goal, values) {
  const changes = {}
  const title = values.title.trim()
  if (title !== goal.title) changes.title = title
  if (values.targetDate !== dateOf(goal.targetDate)) changes.targetDate = values.targetDate || null
  if (values.status !== goal.status) changes.status = values.status
  return changes
}

function validate(goal, values) {
  if (!values.goalId) return { goalId: 'Goal to edit is required' }

  const errors = requiredErrors(values, { title: 'Updated title' })
  if (Object.keys(errors).length > 0) return errors

  if (Object.keys(buildChanges(goal, values)).length === 0) {
    return { changes: 'Change at least one field' }
  }
  return {}
}

function GoalEditForm({ studentId, goals, onSaved }) {
  const [values, setValues] = useState(EMPTY)
  const { saving, saved, formError, fieldErrors, submit } = useRecordSubmit(onSaved)

  // Picking a goal pre-fills the other fields with its current values.
  function selectGoal(goalId) {
    const goal = findGoal(goals, goalId)
    setValues(
      goal
        ? { goalId, title: goal.title, targetDate: dateOf(goal.targetDate), status: goal.status }
        : EMPTY
    )
  }

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const goal = findGoal(goals, values.goalId)
    const errors = validate(goal, values)
    submit({
      errors,
      send: () => updateGoal(studentId, values.goalId, buildChanges(goal, values)),
    })
  }

  return (
    <div className="teacher-records-group" role="group" aria-labelledby="records-goal-edit-title">
      <h3 id="records-goal-edit-title" className="teacher-records-group-title">
        Edit a goal
      </h3>
      {goals.length === 0 ? (
        <p className="teacher-muted">No goals yet. Add a goal first, then edit it here.</p>
      ) : (
        <form className="teacher-form" onSubmit={handleSubmit} noValidate>
          <RecordField id="edit-goal-select" label="Goal to edit" error={fieldErrors.goalId}>
            <select
              {...fieldProps('edit-goal-select', fieldErrors.goalId)}
              value={values.goalId}
              onChange={(event) => selectGoal(event.target.value)}
            >
              <option value="">Select a goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </RecordField>
          <RecordField id="edit-goal-title" label="Updated title" error={fieldErrors.title}>
            <input
              {...fieldProps('edit-goal-title', fieldErrors.title)}
              type="text"
              value={values.title}
              onChange={(event) => update('title', event.target.value)}
            />
          </RecordField>
          <RecordField id="edit-goal-target-date" label="Updated target date" error={fieldErrors.targetDate}>
            <input
              {...fieldProps('edit-goal-target-date', fieldErrors.targetDate)}
              type="date"
              value={values.targetDate}
              onChange={(event) => update('targetDate', event.target.value)}
            />
          </RecordField>
          <RecordField id="edit-goal-status" label="Goal status" error={fieldErrors.status}>
            <select
              {...fieldProps('edit-goal-status', fieldErrors.status)}
              value={values.status}
              onChange={(event) => update('status', event.target.value)}
            >
              {!values.goalId && <option value="">Select a goal first</option>}
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </RecordField>
          {fieldErrors.changes && (
            <p role="alert" className="teacher-form-error">
              {fieldErrors.changes}
            </p>
          )}
          <RecordFormFooter
            saving={saving}
            saved={saved}
            formError={formError}
            submitLabel="Save goal changes"
          />
        </form>
      )}
    </div>
  )
}

export default GoalEditForm
