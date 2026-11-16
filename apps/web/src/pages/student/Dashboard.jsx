import { useEffect, useState } from 'react'
import DashboardCard from '../../components/common/DashboardCard'
import StatCard from '../../components/common/StatCard'
import PerformanceTrendChart from '../../components/common/PerformanceTrendChart'
import GradeList from '../../components/student/GradeList'

import barChartIcon from '../../assets/icons/dashboard/bar-chart.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'

import '../../styles/student-dashboard.css'
import { getStudentDashboard } from '../../services/studentApi'
import { useAuth } from '../../state/AuthContext'

function Dashboard() {
  const { token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    getStudentDashboard(token)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  if (loading) return <p>Loading student dashboard...</p>
  if (error) return <p role="alert">{error}</p>
  if (!data) return <p>No student information available.</p>

  // Full history when the API sends it; older responses only carry the latest note.
  const feedbackItems = data.feedbackHistory ?? (data.teacherFeedback ? [data.teacherFeedback] : [])

  return (
    <div className="student-dashboard">
      <header className="dashboard-page-header">
        <h1>Good morning, {data.student.firstName}</h1>
        <p>
          You're building momentum. Here's your academic progress
          and what to focus on next.
        </p>
      </header>

      <div className="stat-card-grid">
        <StatCard
          icon={barChartIcon}
          label="Current grade"
          value={data.summary.currentGrade == null ? '—' : `${data.summary.currentGrade}%`}
        />

        <StatCard
          icon={calendarCheckIcon}
          label="Attendance"
          value={data.summary.attendance == null ? '—' : `${data.summary.attendance}%`}
        />

        <StatCard
          icon={bookOpenIcon}
          label="Active goals"
          value={data.goals.length}
        />
      </div>

      <div className="dashboard-grid-row">
        <DashboardCard title="Performance trend">
          <PerformanceTrendChart 
          data={data.performanceTrend}
          tooltipLabel="Quarterly Grade Trend"
          tooltipUnit="%" />
        </DashboardCard>

        <DashboardCard title="Current grades">
          <GradeList grades={data.grades} />
        </DashboardCard>
      </div>

      <div className="dashboard-grid-row">
        <DashboardCard title="Academic goals">
          {data.goals.map((goal) => (
            <div key={goal.id}>
              <strong>{goal.title}</strong>
              <p>{goal.progress}% complete</p>
            </div>
          ))}
        </DashboardCard>

        <DashboardCard title="Teacher feedback">
          {feedbackItems.length > 0 ? (
            feedbackItems.map((item, index) => (
              <div key={item.id ?? index}>
                <p>{item.message}</p>
                <small>
                  {item.teacher} · {item.date}
                </small>
              </div>
            ))
          ) : (
            <p>No teacher feedback available yet.</p>
          )}
        </DashboardCard>
      </div>

      {['approved', 'published'].includes(data.supportPlan?.status) && (
        <DashboardCard title="Your learning support plan">
          {data.supportPlan.activities.map((activity) => (
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
