import { errorId } from './recordFormHelpers'

// Labelled field wrapper. The input itself gets `fieldProps(id, error)` from the form.
function RecordField({ id, label, error, children }) {
  return (
    <div className="teacher-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p id={errorId(id)} className="teacher-field-error">
          {error}
        </p>
      )}
    </div>
  )
}

export default RecordField
