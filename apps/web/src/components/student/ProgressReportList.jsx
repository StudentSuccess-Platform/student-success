import { formatDate } from '../../utils/formatDate'

/**
 * Published progress reports, newest period first, shared by the student and parent pages. Each report shows the
 * class, the period it covers, who wrote it and when it was published, then the teacher's summary.
 */
function ProgressReportList({ reports, emptyMessage }) {
  if (reports.length === 0) {
    return <p className="progress-reports-empty">{emptyMessage}</p>
  }

  return (
    <div className="progress-reports">
      {reports.map((report) => (
        <article key={report.id} className="progress-report" aria-label={`${report.className} progress report`}>
          <h2 className="progress-report-class">{report.className}</h2>
          <p className="progress-report-meta">
            <span>
              {formatDate(report.periodStart)} to {formatDate(report.periodEnd)}
            </span>
            {report.teacher && <span>By {report.teacher}</span>}
            <span>Published {formatDate(report.publishedAt)}</span>
          </p>
          <p className="progress-report-summary">{report.summary}</p>
        </article>
      ))}
    </div>
  )
}

export default ProgressReportList
