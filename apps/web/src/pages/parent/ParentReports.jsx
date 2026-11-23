import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import ProgressReportList from '../../components/student/ProgressReportList'
import ParentChildSelector from './ParentChildSelector'
import useParentChildrenData from './useParentChildrenData'
import useParentReportsData from './useParentReportsData'
import '../../styles/student-reports.css'

/**
 * Resolves which linked child to show and renders that child's published progress reports.
 * `ParentChildSelector` only offers ids from the real `GET /api/v1/parent/children` response.
 * `ReportsForChild` is remounted via `key` on every switch, so a child change never shows the previous
 * child's reports while the new ones load (same pattern as the other parent pages).
 */
function ParentReports() {
  const [selectedChildId, setSelectedChildId] = useState(null)
  const { data: childrenData, isLoading: childrenLoading, error: childrenError } = useParentChildrenData()

  if (childrenLoading) {
    return <p className="dashboard-status">Loading your dashboard…</p>
  }

  if (childrenError) {
    return <p className="dashboard-status dashboard-status--error">Couldn&apos;t load your linked students. Please try again.</p>
  }

  if (!childrenData || childrenData.children.length === 0) {
    return <p className="dashboard-status">No students are linked to your account yet.</p>
  }

  const effectiveChildId = selectedChildId ?? childrenData.children[0].id

  return (
    <>
      <ParentChildSelector children={childrenData.children} selectedId={effectiveChildId} onSelect={setSelectedChildId} />
      <ReportsForChild key={effectiveChildId} studentId={effectiveChildId} />
    </>
  )
}

function ReportsForChild({ studentId }) {
  const { data, isLoading, error } = useParentReportsData(studentId)

  return (
    <div className="progress-reports-page">
      <PageHeader title="Progress Reports" subtitle="Reports your child's teachers have published about their progress." />

      {isLoading && <p>Loading progress reports…</p>}
      {!isLoading && error && <p role="alert">{error.message}</p>}
      {!isLoading && !error && (
        <ProgressReportList reports={data?.reports ?? []} emptyMessage="No progress reports have been published for this child yet." />
      )}
    </div>
  )
}

export default ParentReports
