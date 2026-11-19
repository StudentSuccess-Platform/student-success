import { useState } from 'react'
import ParentDashboardView from './ParentDashboardView'
import ParentChildSelector from './ParentChildSelector'
import useParentChildrenData from './useParentChildrenData'
import useParentDashboardData from './useParentDashboardData'
import { useAuth } from '../../state/AuthContext'

/**
 * Resolves which child to show and renders that child's dashboard. `ParentChildSelector` only
 * renders (and only ever offers) ids from the real `GET /api/v1/parent/children` response, never
 * a constructed or guessed id.
 *
 * `ParentDashboardView` is remounted via `key={effectiveChildId}` on every switch, so a child
 * change always starts that subtree fresh (loading state, no data) instead of showing the
 * previous child's data while the new one loads. `useApiResource`'s own unmount-cancellation
 * guard means a rapid switch (A→B→C before A or B resolve) only ever lets the last-mounted
 * child's response reach the screen — earlier in-flight responses are ignored once their
 * component has unmounted.
 */
function ParentDashboard() {
  const { user } = useAuth()
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

      <DashboardForChild key={effectiveChildId} studentId={effectiveChildId} parentFirstName={user.firstName} />
    </>
  )
}

function DashboardForChild({ studentId, parentFirstName }) {
  const { data, isLoading, error } = useParentDashboardData(studentId)

  return (
    <ParentDashboardView data={data} isLoading={isLoading} error={error} parentFirstName={parentFirstName} />
  )
}

export default ParentDashboard
