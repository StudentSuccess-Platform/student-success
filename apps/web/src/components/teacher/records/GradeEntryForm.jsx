import { useState } from 'react'
import { saveGrade } from '../../../services/teacherRecordsApi'
import RecordField from './RecordField'
import RecordFormFooter from './RecordFormFooter'
import { fieldProps, isBlank, requiredErrors } from './recordFormHelpers'
import useRecordSubmit from './useRecordSubmit'

const EMPTY = { assignmentId: '', pointsEarned: '', status: 'graded' }
const STATUSES = [
  { value: 'graded', label: 'Graded' },
  { value: 'missing', label: 'Missing' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
]

function validate(values) {
  const needsPoints = values.status === 'graded' || values.status === 'late'
  const errors = requiredErrors(values, {
    assignmentId: 'Assignment',
    ...(needsPoints ? { pointsEarned: 'Points earned' } : {}),
  })
  if (!errors.pointsEarned && !isBlank(values.pointsEarned) && Number.isNaN(Number(values.pointsEarned))) {
    errors.pointsEarned = 'Points earned must be a number'
  }
  return errors
}

function toPayload(values) {
  const payload = { assignmentId: values.assignmentId, status: values.status }
  if (!isBlank(values.pointsEarned)) payload.pointsEarned = Number(values.pointsEarned)
  return payload
}

function GradeEntryForm({ studentId, grades, onSaved }) {
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
      send: () => saveGrade(studentId, toPayload(values)),
      onSuccess: () => setValues(EMPTY),
    })
  }

  return (
    <div className="teacher-records-group" role="group" aria-labelledby="records-grade-title">
      <h3 id="records-grade-title" className="teacher-records-group-title">
        Enter a grade
      </h3>
      {grades.length === 0 ? (
        <p className="teacher-muted">No assignments yet. Assignments appear here once this student has coursework.</p>
      ) : (
        <form className="teacher-form" onSubmit={handleSubmit} noValidate>
          <RecordField id="grade-assignment" label="Assignment" error={fieldErrors.assignmentId}>
            <select
              {...fieldProps('grade-assignment', fieldErrors.assignmentId)}
              value={values.assignmentId}
              onChange={(event) => update('assignmentId', event.target.value)}
            >
              <option value="">Select an assignment</option>
              {grades.map((grade) => (
                <option key={grade.assignmentId} value={grade.assignmentId}>
                  {`${grade.className} - ${grade.title}`}
                </option>
              ))}
            </select>
          </RecordField>
          <RecordField id="grade-points" label="Points earned" error={fieldErrors.pointsEarned}>
            <input
              {...fieldProps('grade-points', fieldErrors.pointsEarned)}
              type="number"
              min="0"
              step="any"
              value={values.pointsEarned}
              onChange={(event) => update('pointsEarned', event.target.value)}
            />
          </RecordField>
          <RecordField id="grade-status" label="Status" error={fieldErrors.status}>
            <select
              {...fieldProps('grade-status', fieldErrors.status)}
              value={values.status}
              onChange={(event) => update('status', event.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </RecordField>
          <RecordFormFooter saving={saving} saved={saved} formError={formError} submitLabel="Save grade" />
        </form>
      )}
    </div>
  )
}

export default GradeEntryForm
