import { useId, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import ReportCard from '../../components/teacher/reports/ReportCard'
import ReportForm from '../../components/teacher/reports/ReportForm'
import { STATUS_FILTERS } from '../../components/teacher/reports/reportStatus'
import '../../styles/teacher-reports.css'

/**
 * Progress reports written by the signed-in teacher. A report is a draft until the teacher publishes it;
 * only published reports are visible to the student and their linked parents.
 */
function ReportsView({ data, isLoading, error, onChanged }) {
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const filterId = useId()

  const reports = data?.reports ?? []
  const counts = data?.counts ?? { draft: 0, pending_review: 0, published: 0 }
  const visible = filter === 'all' ? reports : reports.filter((report) => report.status === filter)

  function handleSaved() {
    setShowForm(false)
    onChanged()
  }

  return (
    <div className="reports-page">
      <PageHeader
        title="Reports"
        subtitle="Progress reports for your students. Students and parents see a report only after you publish it."
      />

      {isLoading && <p className="dashboard-status">Loading reports…</p>}

      {!isLoading && error && !data && (
        <p className="dashboard-status dashboard-status--error">Couldn&apos;t load reports. Please try again.</p>
      )}

      {!isLoading && data && (
        <section className="teacher-section reports-section">
          <div className="reports-toolbar">
            <p className="reports-counts" aria-label="Report counts">
              {counts.draft} {counts.draft === 1 ? 'draft' : 'drafts'} · {counts.published} published
              {counts.pending_review > 0 ? ` · ${counts.pending_review} pending review` : ''}
            </p>

            <div className="teacher-field reports-filter">
              <label htmlFor={filterId}>Show</label>
              <select id={filterId} value={filter} onChange={(event) => setFilter(event.target.value)}>
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {!showForm && (
              <button type="button" className="teacher-button teacher-button--primary" onClick={() => setShowForm(true)}>
                New report
              </button>
            )}
          </div>

          {error && <p role="alert" className="teacher-form-error">Couldn&apos;t refresh the list. Showing the last loaded reports.</p>}

          {showForm && (
            <div className="report-card">
              <ReportForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
            </div>
          )}

          {reports.length === 0 && !showForm && (
            <p className="chart-empty">No reports yet. Choose &ldquo;New report&rdquo; to write the first one.</p>
          )}

          {reports.length > 0 && visible.length === 0 && <p className="chart-empty">No reports match this filter.</p>}

          <div className="reports-list">
            {visible.map((report) => (
              <ReportCard key={report.id} report={report} onChanged={onChanged} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default ReportsView
