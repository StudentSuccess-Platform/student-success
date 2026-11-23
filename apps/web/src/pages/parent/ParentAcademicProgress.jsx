import DashboardCard from '../../components/common/DashboardCard'
import StatCard from '../../components/common/StatCard'
import PerformanceTrendChart from '../../components/common/PerformanceTrendChart'
import GradeList from '../../components/student/GradeList'

import barChartIcon from '../../assets/icons/dashboard/bar-chart.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'
import { formatDate } from '../../utils/formatDate'

/**
 * Grades, attendance, performance trend, academic goals, and teacher feedback for one linked
 * child (SCRUM-147). Extracted from `ParentDashboardView` as a behavior-preserving refactor —
 * same markup, same data shape — so the Support Plan block (SCRUM-148) has a clean seam to work
 * in without touching this section.
 *
 * `data.feedbackHistory` is already scoped server-side to shared, teacher-authored feedback only
 * (`TeacherFeedback.find({ visibility: "shared" })` in `studentViews.js`) — this component has no
 * code path that reads or renders a `TeacherNote` (private note) field, by construction.
 *
 * Shows only fields the real API provides: current grade, attendance, and active-goal count.
 * The Figma design also shows an assignment-completion stat, an assignment-progress panel, and
 * an attendance Present/Absent/Late breakdown, but none of these are computed anywhere in
 * `GET /parent/children/:studentId/dashboard` — they are left out rather than fabricated, and
 * are tracked as backend dependencies (see SCRUM-147 notes).
 */
function ParentAcademicProgress({ data }) {
  return (
    <>
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
                  {item.teacher} · {formatDate(item.date)}
                </small>
              </div>
            ))
          ) : (
            <p className="chart-empty">No teacher feedback available yet.</p>
          )}
        </DashboardCard>
      </div>
    </>
  )
}

export default ParentAcademicProgress
