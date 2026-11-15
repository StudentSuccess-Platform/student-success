// Submit button plus the form-level messages: `role="alert"` for errors, `role="status"` for success.
function RecordFormFooter({ saving, saved, formError, submitLabel }) {
  return (
    <>
      {formError && (
        <p role="alert" className="teacher-form-error">
          {formError}
        </p>
      )}
      {saved && (
        <p role="status" className="teacher-form-success">
          Saved
        </p>
      )}
      <div className="teacher-form-actions">
        <button type="submit" className="teacher-button teacher-button--primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </>
  )
}

export default RecordFormFooter
