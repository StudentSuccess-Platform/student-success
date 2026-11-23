import { useId, useState } from 'react'
import useApiResource from '../../../hooks/useApiResource'
import { getStudents } from '../../../services/teacherStudentsApi'
import { createReport, editReport, getStudentClasses, getSummarySuggestion } from '../../../services/teacherReportsApi'
import { errorId, fieldProps } from '../records/recordFormHelpers'

/**
 * Create a progress report (choose the student and class) or edit an existing draft (student and class are fixed).
 * "Suggest summary" fills the summary box with a factual text built from the grades, attendance and goals of the
 * period; the teacher edits it before saving. A saved report is a draft until the teacher publishes it.
 */
function ReportForm({ report = null, onSaved, onCancel }) {
  const isEdit = report !== null
  const [studentId, setStudentId] = useState(report?.studentId ?? '')
  const [sectionId, setSectionId] = useState(report?.sectionId ?? '')
  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [periodStart, setPeriodStart] = useState(report?.periodStart ?? '')
  const [periodEnd, setPeriodEnd] = useState(report?.periodEnd ?? '')
  const [summary, setSummary] = useState(report?.summary ?? '')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)

  const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useApiResource(isEdit ? noStudents : getStudents)

  const studentSelectId = useId()
  const classSelectId = useId()
  const startId = useId()
  const endId = useId()
  const summaryId = useId()

  async function handleStudentChange(event) {
    const nextStudentId = event.target.value
    setStudentId(nextStudentId)
    setSectionId('')
    setClasses([])
    setFieldErrors((errors) => ({ ...errors, studentId: undefined, sectionId: undefined }))
    if (!nextStudentId) return

    setClassesLoading(true)
    try {
      const nextClasses = await getStudentClasses(nextStudentId)
      setClasses(nextClasses)
      if (nextClasses.length === 1) setSectionId(nextClasses[0].id)
    } catch (error) {
      setFormError(error?.message || 'Could not load this student’s classes.')
    } finally {
      setClassesLoading(false)
    }
  }

  // Checks what the form can check itself; the server checks everything again.
  function missingFields() {
    const errors = {}
    if (!isEdit && !studentId) errors.studentId = 'Student is required'
    if (!sectionId) errors.sectionId = 'Class is required'
    if (!periodStart) errors.periodStart = 'Start date is required'
    if (!periodEnd) errors.periodEnd = 'End date is required'
    return errors
  }

  async function handleSuggest() {
    const errors = missingFields()
    delete errors.summary
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFormError('Choose the student, class and dates first, then suggest a summary.')
      return
    }
    setFieldErrors({})
    setFormError('')
    setIsSuggesting(true)
    try {
      const result = await getSummarySuggestion(studentId, { sectionId, periodStart, periodEnd })
      setSummary(result.summary)
    } catch (error) {
      setFieldErrors(error?.fields ?? {})
      setFormError(error?.message || 'Could not suggest a summary. You can write one yourself.')
    } finally {
      setIsSuggesting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const errors = missingFields()
    if (!summary.trim()) errors.summary = 'Summary is required'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFormError('')
      return
    }
    setFieldErrors({})
    setFormError('')
    setIsSaving(true)
    try {
      if (isEdit) {
        await editReport(report.studentId, report.id, { periodStart, periodEnd, summary })
      } else {
        await createReport(studentId, { sectionId, periodStart, periodEnd, summary })
      }
      onSaved()
    } catch (error) {
      setFieldErrors(error?.fields ?? {})
      setFormError(error?.message || 'Could not save the report. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const students = studentsData?.students ?? []

  return (
    <form className="teacher-form report-form" onSubmit={handleSubmit} noValidate aria-label={isEdit ? 'Edit report' : 'New report'}>
      {formError && (
        <p role="alert" className="teacher-form-error">
          {formError}
        </p>
      )}

      {isEdit ? (
        <p className="report-form-fixed">
          <strong>{report.studentName}</strong> · {report.className}
        </p>
      ) : (
        <>
          <div className="teacher-field">
            <label htmlFor={studentSelectId}>Student</label>
            <select {...fieldProps(studentSelectId, fieldErrors.studentId)} value={studentId} onChange={handleStudentChange} disabled={studentsLoading}>
              <option value="">{studentsLoading ? 'Loading students…' : 'Choose a student'}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            {studentsError && <p className="teacher-field-error">Couldn&apos;t load your students.</p>}
            {fieldErrors.studentId && (
              <p id={errorId(studentSelectId)} role="alert" className="teacher-field-error">
                {fieldErrors.studentId}
              </p>
            )}
          </div>

          <div className="teacher-field">
            <label htmlFor={classSelectId}>Class</label>
            <select
              {...fieldProps(classSelectId, fieldErrors.sectionId)}
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              disabled={!studentId || classesLoading}
            >
              <option value="">{classesLoading ? 'Loading classes…' : 'Choose a class'}</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {fieldErrors.sectionId && (
              <p id={errorId(classSelectId)} role="alert" className="teacher-field-error">
                {fieldErrors.sectionId}
              </p>
            )}
          </div>
        </>
      )}

      <div className="report-form-dates">
        <div className="teacher-field">
          <label htmlFor={startId}>Period start</label>
          <input {...fieldProps(startId, fieldErrors.periodStart)} type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          {fieldErrors.periodStart && (
            <p id={errorId(startId)} role="alert" className="teacher-field-error">
              {fieldErrors.periodStart}
            </p>
          )}
        </div>
        <div className="teacher-field">
          <label htmlFor={endId}>Period end</label>
          <input {...fieldProps(endId, fieldErrors.periodEnd)} type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          {fieldErrors.periodEnd && (
            <p id={errorId(endId)} role="alert" className="teacher-field-error">
              {fieldErrors.periodEnd}
            </p>
          )}
        </div>
      </div>

      <div className="teacher-field">
        <div className="report-form-summary-header">
          <label htmlFor={summaryId}>Summary</label>
          <button type="button" className="teacher-button" onClick={handleSuggest} disabled={isSuggesting || isSaving}>
            {isSuggesting ? 'Suggesting…' : 'Suggest summary'}
          </button>
        </div>
        <textarea
          {...fieldProps(summaryId, fieldErrors.summary)}
          rows={6}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        {fieldErrors.summary && (
          <p id={errorId(summaryId)} role="alert" className="teacher-field-error">
            {fieldErrors.summary}
          </p>
        )}
      </div>

      <div className="teacher-form-actions">
        <button type="submit" className="teacher-button teacher-button--primary" disabled={isSaving}>
          {isEdit ? 'Save changes' : 'Save draft'}
        </button>
        <button type="button" className="teacher-button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// In edit mode the student list is not needed. A stable module-level fetcher keeps useApiResource from refetching.
function noStudents() {
  return Promise.resolve(null)
}

export default ReportForm
