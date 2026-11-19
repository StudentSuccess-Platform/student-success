import ParentDashboardView from './ParentDashboardView'
import useParentChildrenData from './useParentChildrenData'
import useParentDashboardData from './useParentDashboardData'
import { useAuth } from '../../state/AuthContext'

/**
 * Resolves which child to show (the first linked child, until SCRUM-146 adds a real
 * selector) and renders that child's dashboard. Splitting "which child" from "render this
 * child's dashboard" here is what SCRUM-146 extends — it swaps in a real selector without
 * touching `ParentDashboardView`.
 */
function ParentDashboard() {
  const { user } = useAuth()
  const { data: childrenData, isLoading: childrenLoading, error: childrenError } =
    useParentChildrenData()

  const firstChildId = childrenData?.children[0]?.id ?? null

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useParentDashboardData(firstChildId)

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

  return (
    <ParentDashboardView
      data={dashboardData}
      isLoading={dashboardLoading}
      error={dashboardError}
      parentFirstName={user.firstName}
    />
  )
}

export default ParentDashboard
