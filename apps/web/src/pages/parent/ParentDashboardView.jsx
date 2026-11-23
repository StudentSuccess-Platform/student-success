import DashboardCard from '../../components/common/DashboardCard'
import ParentAcademicProgress from './ParentAcademicProgress'

/**
 * Renders one linked child's dashboard for a parent. `parentFirstName` is the signed-in parent's
 * own name (for the greeting); everything else comes from the child's dashboard response.
 *
 * Grades/attendance/trend/goals/feedback live in `ParentAcademicProgress` (SCRUM-147). The
 * Support Plan block below stays here untouched (SCRUM-148's territory).
 */
function ParentDashboardView({ data, isLoading, error, parentFirstName }) {
  return (
    <div className="parent-dashboard">
      {isLoading && <p className="dashboard-status">Loading dashboard…</p>}

      {!isLoading && error && (
        <p className="dashboard-status dashboard-status--error">
          Couldn&apos;t load this dashboard. Please try again.
        </p>
      )}

      {!isLoading && !error && !data && (
        <p className="dashboard-status">No linked student found on your account.</p>
      )}

      {!isLoading && !error && data && (
        <>
          <header className="dashboard-page-header">
            <h1>Good morning, {parentFirstName}</h1>
            <p>
              Here&apos;s {data.student.firstName}&apos;s published academic progress and the
              support underway.
            </p>
          </header>

          <ParentAcademicProgress data={data} />

          {['approved', 'published'].includes(data.supportPlan?.status) && (
            <DashboardCard title="Approved learning support plan">
              {data.supportPlan.activities.map((activity) => (
                <div key={activity.id}>
                  <strong>{activity.title}</strong>
                  <p>{activity.schedule}</p>
                </div>
              ))}
            </DashboardCard>
          )}
        </>
      )}
    </div>
  )
}

export default ParentDashboardView
