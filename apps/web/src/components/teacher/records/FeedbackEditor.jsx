import { useState } from 'react'
import { updateFeedback } from '../../../services/teacherRecordsApi'
import RecordField from './RecordField'
import RecordFormFooter from './RecordFormFooter'
import { fieldProps, requiredErrors } from './recordFormHelpers'
import useRecordSubmit from './useRecordSubmit'

// Inline editor for one existing feedback item. Only the author teacher can save (server rule).
function FeedbackEditor({ studentId, item, onSaved, onClose }) {
  const [body, setBody] = useState(item.body)
  const { saving, saved, formError, fieldErrors, submit } = useRecordSubmit(onSaved)
  const inputId = `feedback-edit-${item.id}`

  function handleSubmit(event) {
    event.preventDefault()
    const errors = requiredErrors({ body }, { body: 'Feedback' })
    submit({
      errors,
      send: () => updateFeedback(studentId, item.id, { body: body.trim() }),
    })
  }

  return (
    <form className="teacher-form" onSubmit={handleSubmit} noValidate>
      <RecordField id={inputId} label="Edit feedback" error={fieldErrors.body}>
        <textarea
          {...fieldProps(inputId, fieldErrors.body)}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </RecordField>
      <RecordFormFooter saving={saving} saved={saved} formError={formError} submitLabel="Save edited feedback" />
      <div className="teacher-form-actions">
        <button type="button" className="teacher-button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default FeedbackEditor
