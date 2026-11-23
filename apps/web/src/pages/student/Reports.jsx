import { useCallback } from 'react'
import PageHeader from '../../components/common/PageHeader'
import ProgressReportList from '../../components/student/ProgressReportList'
import useApiResource from '../../hooks/useApiResource'
import { getStudentReports } from '../../services/studentApi'
import '../../styles/student-reports.css'

// The student's own published progress reports. A report appears only after its teacher publishes it.
function Reports() {
  const fetcher = useCallback((token) => getStudentReports(token), [])
  const { data, isLoading, error } = useApiResource(fetcher)

  return (
    <div className="progress-reports-page">
      <PageHeader title="Progress Reports" subtitle="Reports your teachers have published about your progress." />

      {isLoading && <p>Loading your reports…</p>}
      {!isLoading && error && <p role="alert">{error.message}</p>}
      {!isLoading && !error && (
        <ProgressReportList reports={data?.reports ?? []} emptyMessage="No progress reports have been published yet." />
      )}
    </div>
  )
}

export default Reports
