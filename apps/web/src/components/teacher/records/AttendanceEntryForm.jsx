import { useState } from 'react'
import { saveAttendance } from '../../../services/teacherRecordsApi'
import RecordField from './RecordField'
import RecordFormFooter from './RecordFormFooter'
import { fieldProps, requiredErrors } from './recordFormHelpers'
import useRecordSubmit from './useRecordSubmit'

const EMPTY = { sectionId: '', date: '', status: 'present' }
const STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'tardy', label: 'Tardy' },
  { value: 'excused', label: 'Excused' },
]

function AttendanceEntryForm({ studentId, classes, onSaved }) {
  const [values, setValues] = useState(EMPTY)
  const { saving, saved, formError, fieldErrors, submit } = useRecordSubmit(onSaved)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const errors = requiredErrors(values, { sectionId: 'Class', date: 'Date' })
    submit({
      errors,
      send: () => saveAttendance(studentId, { ...values }),
      onSuccess: () => setValues(EMPTY),
    })
  }

  return (
    <div className="teacher-records-group" role="group" aria-labelledby="records-attendance-title">
      <h3 id="records-attendance-title" className="teacher-records-group-title">
        Record attendance
      </h3>
      {classes.length === 0 ? (
        <p className="teacher-muted">No classes yet. Attendance can be recorded once this student is in one of your classes.</p>
      ) : (
        <form className="teacher-form" onSubmit={handleSubmit} noValidate>
          <RecordField id="attendance-class" label="Class" error={fieldErrors.sectionId}>
            <select
              {...fieldProps('attendance-class', fieldErrors.sectionId)}
              value={values.sectionId}
              onChange={(event) => update('sectionId', event.target.value)}
            >
              <option value="">Select a class</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </RecordField>
          <RecordField id="attendance-date" label="Date" error={fieldErrors.date}>
            <input
              {...fieldProps('attendance-date', fieldErrors.date)}
              type="date"
              value={values.date}
              onChange={(event) => update('date', event.target.value)}
            />
          </RecordField>
          <RecordField id="attendance-status" label="Status" error={fieldErrors.status}>
            <select
              {...fieldProps('attendance-status', fieldErrors.status)}
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
          <RecordFormFooter saving={saving} saved={saved} formError={formError} submitLabel="Save attendance" />
        </form>
      )}
    </div>
  )
}

export default AttendanceEntryForm
