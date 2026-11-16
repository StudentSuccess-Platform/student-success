import { useState } from 'react'
import { createGoal } from '../../../services/teacherRecordsApi'
import RecordField from './RecordField'
import RecordFormFooter from './RecordFormFooter'
import { fieldProps, isBlank, requiredErrors } from './recordFormHelpers'
import useRecordSubmit from './useRecordSubmit'

const EMPTY = { title: '', description: '', targetDate: '' }

// Optional fields are sent only when filled in.
function toPayload(values) {
  const payload = { title: values.title.trim() }
  if (!isBlank(values.description)) payload.description = values.description.trim()
  if (!isBlank(values.targetDate)) payload.targetDate = values.targetDate
  return payload
}

function GoalForm({ studentId, onSaved }) {
  const [values, setValues] = useState(EMPTY)
  const { saving, saved, formError, fieldErrors, submit } = useRecordSubmit(onSaved)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const errors = requiredErrors(values, { title: 'Goal title' })
    submit({
      errors,
      send: () => createGoal(studentId, toPayload(values)),
      onSuccess: () => setValues(EMPTY),
    })
  }

  return (
    <div className="teacher-records-group" role="group" aria-labelledby="records-goal-title">
      <h3 id="records-goal-title" className="teacher-records-group-title">
        Add a goal
      </h3>
      <form className="teacher-form" onSubmit={handleSubmit} noValidate>
        <RecordField id="goal-title" label="Goal title" error={fieldErrors.title}>
          <input
            {...fieldProps('goal-title', fieldErrors.title)}
            type="text"
            value={values.title}
            onChange={(event) => update('title', event.target.value)}
          />
        </RecordField>
        <RecordField id="goal-description" label="Description" error={fieldErrors.description}>
          <textarea
            {...fieldProps('goal-description', fieldErrors.description)}
            rows={3}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </RecordField>
        <RecordField id="goal-target-date" label="Target date" error={fieldErrors.targetDate}>
          <input
            {...fieldProps('goal-target-date', fieldErrors.targetDate)}
            type="date"
            value={values.targetDate}
            onChange={(event) => update('targetDate', event.target.value)}
          />
        </RecordField>
        <RecordFormFooter saving={saving} saved={saved} formError={formError} submitLabel="Add goal" />
      </form>
    </div>
  )
}

export default GoalForm
