import { useState } from 'react'
import { deleteReport, publishReport } from '../../../services/teacherReportsApi'
import { formatDate } from '../../../utils/formatDate'
import ReportForm from './ReportForm'
import { isEditable, statusBadgeClass, statusLabel } from './reportStatus'

/**
 * One progress report. A report that is not published can be edited, published or deleted; publishing and
 * deleting ask for a confirmation first because students and parents see a published report. A published
 * report is read only.
 */
function ReportCard({ report, onChanged }) {
  // 'view' | 'edit' | 'confirm-publish' | 'confirm-delete'
  const [mode, setMode] = useState('view')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action) {
    setIsBusy(true)
    setError('')
    try {
      await action()
      setMode('view')
      onChanged()
    } catch (actionError) {
      setError(actionError?.message || 'Something went wrong. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  const label = `${report.studentName}, ${report.className} report`

  if (mode === 'edit') {
    return (
      <article className="report-card" aria-label={label}>
        <ReportForm
          report={report}
          onSaved={() => {
            setMode('view')
            onChanged()
          }}
          onCancel={() => setMode('view')}
        />
      </article>
    )
  }

  return (
    <article className="report-card" aria-label={label}>
      <header className="report-card-header">
        <div>
          <h3 className="report-card-title">{report.studentName}</h3>
          <p className="report-card-meta">
            {report.className} · {formatDate(report.periodStart)} to {formatDate(report.periodEnd)}
          </p>
        </div>
        <span className={statusBadgeClass(report.status)}>{statusLabel(report.status)}</span>
      </header>

      <p className="report-card-summary">{report.summary}</p>

      <p className="report-card-meta">
        {report.status === 'published' ? `Published ${formatDate(report.publishedAt)}` : `Last saved ${formatDate(report.updatedAt)}`}
      </p>

      {error && (
        <p role="alert" className="teacher-form-error">
          {error}
        </p>
      )}

      {isEditable(report.status) && mode === 'view' && (
        <div className="teacher-form-actions">
          <button type="button" className="teacher-button" onClick={() => setMode('edit')}>
            Edit
          </button>
          <button type="button" className="teacher-button teacher-button--primary" onClick={() => setMode('confirm-publish')}>
            Publish
          </button>
          <button type="button" className="teacher-button teacher-button--danger" onClick={() => setMode('confirm-delete')}>
            Delete
          </button>
        </div>
      )}

      {mode === 'confirm-publish' && (
        <div className="report-confirm" role="group" aria-label="Confirm publish">
          <p>Publish this report? {report.studentName} and their linked parents will be able to read it, and it can no longer be changed.</p>
          <div className="teacher-form-actions">
            <button
              type="button"
              className="teacher-button teacher-button--primary"
              disabled={isBusy}
              onClick={() => run(() => publishReport(report.studentId, report.id))}
            >
              Confirm publish
            </button>
            <button type="button" className="teacher-button" disabled={isBusy} onClick={() => setMode('view')}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div className="report-confirm" role="group" aria-label="Confirm delete">
          <p>Delete this draft? This cannot be undone.</p>
          <div className="teacher-form-actions">
            <button
              type="button"
              className="teacher-button teacher-button--danger"
              disabled={isBusy}
              onClick={() => run(() => deleteReport(report.studentId, report.id))}
            >
              Confirm delete
            </button>
            <button type="button" className="teacher-button" disabled={isBusy} onClick={() => setMode('view')}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export default ReportCard
