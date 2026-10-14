import DashboardCard from '../../components/common/DashboardCard'
import StatCard from '../../components/teacher/StatCard'
import PerformanceTrendChart from '../../components/teacher/PerformanceTrendChart'
import AttendanceOverview from '../../components/teacher/AttendanceOverview'
import InterventionList from '../../components/teacher/InterventionList'
import ActivityFeed from '../../components/teacher/ActivityFeed'

import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'
import usersIcon from '../../assets/icons/dashboard/users.svg'
import alertTriangleIcon from '../../assets/icons/dashboard/alert-triangle.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'

function DashboardView({ data, isLoading, error, onActivityAction }) {
  return (
    <div className="teacher-dashboard">
      <div className="dashboard-page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, Mrs. Jenkins. Here&apos;s what&apos;s happening across your classes.</p>
      </div>

      {isLoading && <p className="dashboard-status">Loading dashboard…</p>}

      {!isLoading && error && (
        <p className="dashboard-status dashboard-status--error">
          Couldn&apos;t load dashboard data. Please try again.
        </p>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="stat-card-grid">
            <StatCard
              icon={bookOpenIcon}
              label="Total Classes"
              value={data.summary.totalClasses}
            />
            <StatCard
              icon={usersIcon}
              label="Total Students"
              value={data.summary.totalStudents}
            />
            <StatCard
              icon={alertTriangleIcon}
              label="Need Intervention"
              value={data.summary.studentsNeedingIntervention}
              accent="warning"
            />
            <StatCard
              icon={calendarCheckIcon}
              label="Avg. Attendance"
              value={`${data.summary.averageAttendance}%`}
            />
          </div>

          <div className="dashboard-grid-row">
            <DashboardCard title="Academic Performance Trends">
              <PerformanceTrendChart
                data={data.performanceTrend}
                tooltipLabel="Average Grade"
                tooltipUnit="%"
              />
            </DashboardCard>

            <DashboardCard title="Attendance Overview">
              <AttendanceOverview
                overallRate={data.attendanceOverview.overallRate}
                classes={data.attendanceOverview.classes}
              />
            </DashboardCard>
          </div>

          <div className="dashboard-grid-row">
            <DashboardCard title="Students Needing Intervention">
              <InterventionList students={data.interventions} />
            </DashboardCard>

            <DashboardCard title="Recent Activity & Pending Actions">
              <ActivityFeed
                items={data.recentActivity.map((item) => ({
                  ...item,
                  onAction: item.actionLabel
                    ? () => onActivityAction(item.id)
                    : undefined,
                }))}
              />
            </DashboardCard>
          </div>
        </>
      )}
    </div>
  )
}

export default DashboardView
