import { useState } from 'react'
import { createFeedback } from '../../../services/teacherRecordsApi'
import RecordField from './RecordField'
import RecordFormFooter from './RecordFormFooter'
import { fieldProps, requiredErrors } from './recordFormHelpers'
import useRecordSubmit from './useRecordSubmit'

const EMPTY = { sectionId: '', body: '' }

function FeedbackForm({ studentId, classes, onSaved }) {
  const [values, setValues] = useState(EMPTY)
  const { saving, saved, formError, fieldErrors, submit } = useRecordSubmit(onSaved)

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const errors = requiredErrors(values, { sectionId: 'Class', body: 'Feedback' })
    submit({
      errors,
      send: () => createFeedback(studentId, { sectionId: values.sectionId, body: values.body.trim() }),
      onSuccess: () => setValues(EMPTY),
    })
  }

  return (
    <div className="teacher-records-group" role="group" aria-labelledby="records-feedback-title">
      <h3 id="records-feedback-title" className="teacher-records-group-title">
        Write feedback
      </h3>
      {classes.length === 0 ? (
        <p className="teacher-muted">No classes yet. Feedback can be written once this student is in one of your classes.</p>
      ) : (
        <form className="teacher-form" onSubmit={handleSubmit} noValidate>
          <RecordField id="feedback-class" label="Class" error={fieldErrors.sectionId}>
            <select
              {...fieldProps('feedback-class', fieldErrors.sectionId)}
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
          <RecordField id="feedback-body" label="Feedback" error={fieldErrors.body}>
            <textarea
              {...fieldProps('feedback-body', fieldErrors.body)}
              rows={4}
              value={values.body}
              onChange={(event) => update('body', event.target.value)}
            />
          </RecordField>
          <RecordFormFooter saving={saving} saved={saved} formError={formError} submitLabel="Save feedback" />
        </form>
      )}
    </div>
  )
}

export default FeedbackForm
