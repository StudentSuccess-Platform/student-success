import DashboardCard from '../../components/common/DashboardCard'
import StatCard from '../../components/common/StatCard'
import PerformanceTrendChart from '../../components/common/PerformanceTrendChart'
import GradeList from '../../components/student/GradeList'

import barChartIcon from '../../assets/icons/dashboard/bar-chart.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'

import { studentDashboardData } from './StudentMockData'
import '../../styles/student-dashboard.css'

function Dashboard({ data = studentDashboardData }) {
  const {
    student,
    summary,
    grades,
    performanceTrend,
    goals,
    teacherFeedback,
    supportPlan,
  } = data

  return (
    <div className="student-dashboard">
      <header className="dashboard-page-header">
        <h1>Good morning, {student.firstName}</h1>
        <p>
          You're building momentum. Here's your academic progress
          and what to focus on next.
        </p>
      </header>

      <div className="stat-card-grid">
        <StatCard
          icon={barChartIcon}
          label="Current grade"
          value={`${summary.currentGrade}%`}
        />

        <StatCard
          icon={calendarCheckIcon}
          label="Attendance"
          value={`${summary.attendance}%`}
        />

        <StatCard
          icon={bookOpenIcon}
          label="Term goal"
          value={`${summary.currentGrade} / ${summary.termGoal}%`}
        />
      </div>

      <div className="dashboard-grid-row">
        <DashboardCard title="Performance trend">
          <PerformanceTrendChart 
          data={performanceTrend}
          tooltipLabel="Quarterly Grade Trend"
          tooltipUnit="%" />
        </DashboardCard>

        <DashboardCard title="Current grades">
          <GradeList grades={grades} />
        </DashboardCard>
      </div>

      <div className="dashboard-grid-row">
        <DashboardCard title="Academic goals">
          {goals.map((goal) => (
            <div key={goal.id}>
              <strong>{goal.title}</strong>
              <p>{goal.progress}% complete</p>
            </div>
          ))}
        </DashboardCard>

        <DashboardCard title="Teacher feedback">
          <p>{teacherFeedback.message}</p>
          <small>
            {teacherFeedback.teacher} · {teacherFeedback.date}
          </small>
        </DashboardCard>
      </div>

      {supportPlan.status === 'approved' && (
        <DashboardCard title="Your approved learning support plan">
          {supportPlan.activities.map((activity) => (
            <div key={activity.id}>
              <strong>{activity.title}</strong>
              <p>{activity.schedule}</p>
            </div>
          ))}
        </DashboardCard>
      )}
    </div>
  )
}

export default Dashboard
