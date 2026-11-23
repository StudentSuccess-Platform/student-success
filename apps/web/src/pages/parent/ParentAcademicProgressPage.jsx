import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import ParentAcademicProgress from './ParentAcademicProgress'
import ParentChildSelector from './ParentChildSelector'
import useParentChildrenData from './useParentChildrenData'
import useParentDashboardData from './useParentDashboardData'

/**
 * Resolves which linked child to show and renders that child's Academic Progress section —
 * grades, attendance, performance trend, goals, and shared teacher feedback. Reuses the exact
 * `ParentAcademicProgress` component and `useParentDashboardData` hook already used by the
 * Overview page (SCRUM-147); this is a second entry point to the same real data, not a
 * duplicate implementation (SCRUM-153).
 *
 * `ParentChildSelector` only renders (and only ever offers) ids from the real
 * `GET /api/v1/parent/children` response, never a constructed or guessed id.
 *
 * `AcademicProgressForChild` is remounted via `key={effectiveChildId}` on every switch, so a
 * child change always starts that subtree fresh (loading state, no data) instead of showing the
 * previous child's data while the new one loads — same pattern as `ParentDashboard`.
 */
function ParentAcademicProgressPage() {
  const [selectedChildId, setSelectedChildId] = useState(null)
  const { data: childrenData, isLoading: childrenLoading, error: childrenError } =
    useParentChildrenData()

  if (childrenLoading) {
    return <p className="dashboard-status">Loading your dashboard…</p>
  }

  if (childrenError) {
    return (
      <p className="dashboard-status dashboard-status--error">
        Couldn&apos;t load your linked students. Please try again.
      </p>
    )
  }

  if (!childrenData || childrenData.children.length === 0) {
    return <p className="dashboard-status">No students are linked to your account yet.</p>
  }

  const effectiveChildId = selectedChildId ?? childrenData.children[0].id

  return (
    <>
      <ParentChildSelector
        children={childrenData.children}
        selectedId={effectiveChildId}
        onSelect={setSelectedChildId}
      />

      <AcademicProgressForChild key={effectiveChildId} studentId={effectiveChildId} />
    </>
  )
}

function AcademicProgressForChild({ studentId }) {
  const { data, isLoading, error } = useParentDashboardData(studentId)

  return (
    <div className="parent-dashboard">
      <PageHeader
        title="Academic Progress"
        subtitle="Grades, attendance, performance trend, goals, and teacher feedback."
      />

      {isLoading && <p className="dashboard-status">Loading academic progress…</p>}

      {!isLoading && error && (
        <p className="dashboard-status dashboard-status--error">
          Couldn&apos;t load this child&apos;s academic progress. Please try again.
        </p>
      )}

      {!isLoading && !error && !data && (
        <p className="dashboard-status">No linked student found on your account.</p>
      )}

      {!isLoading && !error && data && <ParentAcademicProgress data={data} />}
    </div>
  )
}

export default ParentAcademicProgressPage
