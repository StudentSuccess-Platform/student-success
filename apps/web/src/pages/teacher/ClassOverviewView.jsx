import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import DashboardCard from '../../components/common/DashboardCard'
import StatCard from '../../components/common/StatCard'
import PerformanceTrendChart from '../../components/common/PerformanceTrendChart'
import InterventionList from '../../components/teacher/InterventionList'
import ActivityFeed from '../../components/teacher/ActivityFeed'
import AssignmentsOverview from '../../components/teacher/AssignmentsOverview'

import usersIcon from '../../assets/icons/dashboard/users.svg'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import alertTriangleIcon from '../../assets/icons/dashboard/alert-triangle.svg'

function ClassOverviewView({ data, isLoading, error }) {
  return (
    <div className="class-overview">
      {isLoading && <p className="dashboard-status">Loading class overview…</p>}

      {!isLoading && error && (
        <p className="dashboard-status dashboard-status--error">
          Couldn&apos;t load this class. Please try again.
        </p>
      )}

      {!isLoading && !error && !data && (
        <div className="dashboard-status">
          <p>Class not found.</p>
          <Link to="/teacher/classes" className="class-overview-back-link">
            Back to My Classes
          </Link>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <PageHeader
            title={data.classInfo.name}
            subtitle={`${data.classInfo.period} · ${data.classInfo.room} · ${data.classInfo.studentCount} students enrolled`}
            action={
              <Link to="/teacher/classes" className="class-overview-back-link">
                Back to My Classes
              </Link>
            }
          />

          {data.isDemoData && (
            <p className="demo-data-banner">
              Demo data — grades, attendance, interventions, assignments, and activity below are
              placeholder content until the live class overview endpoint is ready.
            </p>
          )}

          <div className="stat-card-grid">
            <StatCard icon={usersIcon} label="Enrolled Students" value={data.classInfo.studentCount} />
            <StatCard
              icon={bookOpenIcon}
              label="Average Grade"
              value={`${data.stats.averageGrade}%`}
            />
            <StatCard
              icon={calendarCheckIcon}
              label="Attendance Rate"
              value={`${data.stats.attendanceRate}%`}
            />
            <StatCard
              icon={alertTriangleIcon}
              label="Need Intervention"
              value={data.stats.studentsNeedingIntervention}
              accent="warning"
            />
          </div>

          <div className="dashboard-grid-row">
            <DashboardCard title="Performance Trend">
              <PerformanceTrendChart
                data={data.performanceTrend}
                tooltipLabel="Average Grade"
                tooltipUnit="%"
              />
            </DashboardCard>

            <DashboardCard title="Students Needing Intervention">
              <InterventionList students={data.interventions} />
            </DashboardCard>
          </div>

          <div className="dashboard-grid-row">
            <DashboardCard title="Assignments">
              <AssignmentsOverview assignments={data.assignments} />
            </DashboardCard>

            <DashboardCard title="Recent Activity">
              <ActivityFeed items={data.recentActivity} />
            </DashboardCard>
          </div>

          <DashboardCard title="Manage This Class">
            <ul className="class-overview-nav">
              <li className="class-overview-nav-item">
                Roster
                <span className="coming-soon-badge">Coming Soon</span>
              </li>
              <li className="class-overview-nav-item">
                Gradebook
                <span className="coming-soon-badge">Coming Soon</span>
              </li>
              <li className="class-overview-nav-item">
                Attendance
                <span className="coming-soon-badge">Coming Soon</span>
              </li>
            </ul>
          </DashboardCard>
        </>
      )}
    </div>
  )
}

export default ClassOverviewView
