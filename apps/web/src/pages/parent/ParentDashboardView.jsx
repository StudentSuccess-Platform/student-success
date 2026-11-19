import DashboardCard from '../../components/common/DashboardCard'
import StatCard from '../../components/common/StatCard'
import PerformanceTrendChart from '../../components/common/PerformanceTrendChart'
import GradeList from '../../components/student/GradeList'

import barChartIcon from '../../assets/icons/dashboard/bar-chart.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'

/**
 * Renders one linked child's dashboard for a parent. `parentFirstName` is the signed-in parent's
 * own name (for the greeting); everything else comes from the child's dashboard response.
 *
 * Shows only fields the real API provides: current grade, attendance, and active-goal count.
 * The Figma design also shows an assignment-completion stat and a support-plan countdown, but
 * neither is computed anywhere in `GET /parent/children/:studentId/dashboard` — they are left out
 * rather than fabricated (see SCRUM-145 notes).
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

          <div className="stat-card-grid">
            <StatCard
              icon={barChartIcon}
              label="Overall grade"
              value={data.summary.currentGrade == null ? '—' : `${data.summary.currentGrade}%`}
            />

            <StatCard
              icon={calendarCheckIcon}
              label="Attendance"
              value={data.summary.attendance == null ? '—' : `${data.summary.attendance}%`}
            />

            <StatCard icon={bookOpenIcon} label="Active goals" value={data.goals.length} />
          </div>

          <div className="dashboard-grid-row">
            <DashboardCard title="Performance trend">
              <PerformanceTrendChart
                data={data.performanceTrend}
                tooltipLabel="Overall Grade"
                tooltipUnit="%"
              />
            </DashboardCard>

            <DashboardCard title="Current grades">
              <GradeList grades={data.grades} />
            </DashboardCard>
          </div>

          <div className="dashboard-grid-row">
            <DashboardCard title="Academic goals">
              {data.goals.length === 0 ? (
                <p className="chart-empty">No active goals yet.</p>
              ) : (
                data.goals.map((goal) => (
                  <div key={goal.id}>
                    <strong>{goal.title}</strong>
                    <p>{goal.progress}% complete</p>
                  </div>
                ))
              )}
            </DashboardCard>

            <DashboardCard title="Teacher feedback">
              {data.feedbackHistory.length > 0 ? (
                data.feedbackHistory.map((item) => (
                  <div key={item.id}>
                    <p>{item.message}</p>
                    <small>
                      {item.teacher} · {item.date}
                    </small>
                  </div>
                ))
              ) : (
                <p className="chart-empty">No teacher feedback available yet.</p>
              )}
            </DashboardCard>
          </div>

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
