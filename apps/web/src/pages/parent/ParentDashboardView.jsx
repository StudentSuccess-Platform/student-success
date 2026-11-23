import { Link } from 'react-router-dom'
import DashboardCard from '../../components/common/DashboardCard'
import StatCard from '../../components/common/StatCard'

import barChartIcon from '../../assets/icons/dashboard/bar-chart.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'
import { formatDate } from '../../utils/formatDate'

/**
 * Concise, at-a-glance summary for one linked child: headline stat cards, a one-item teacher
 * feedback preview, and the current support plan. `parentFirstName` is the signed-in parent's
 * own name (for the greeting); everything else comes from the child's dashboard response.
 *
 * Full academic detail — subject grades, performance trend, every academic goal, and the full
 * teacher feedback history — lives on the dedicated Academic Progress page
 * (`ParentAcademicProgressPage`, which reuses `ParentAcademicProgress` from SCRUM-147), linked to
 * below rather than duplicated here (SCRUM-153).
 *
 * `data.teacherFeedback` is already the latest shared note only (`feedback[0]` in
 * `studentViews.js`, scoped server-side to `TeacherFeedback.find({ visibility: "shared" })`) —
 * this preview has no code path that reads a private `TeacherNote` field.
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

          <DashboardCard
            title="Teacher feedback"
            action={
              <Link to="/parent/academic-progress" className="class-overview-back-link">
                View Academic Progress →
              </Link>
            }
          >
            {data.teacherFeedback ? (
              <div>
                <p>{data.teacherFeedback.message}</p>
                <small>
                  {data.teacherFeedback.teacher} · {formatDate(data.teacherFeedback.date)}
                </small>
              </div>
            ) : (
              <p className="chart-empty">No teacher feedback available yet.</p>
            )}
          </DashboardCard>

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
