import { useEffect, useState } from 'react'
import DashboardCard from '../../components/common/DashboardCard'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import barChartIcon from '../../assets/icons/dashboard/bar-chart.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'
import { getStudentDashboard } from '../../services/studentApi'
import { useAuth } from '../../state/AuthContext'
import '../../styles/student-progress.css'

function percentageLabel(value) {
  return value == null ? '—' : `${value}%`
}

function Progress() {
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
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  if (loading) return <p>Loading your progress...</p>
  if (error) return <p role="alert">{error}</p>
  if (!data) return <p>No progress information available.</p>

  return (
    <div className="student-progress">
      <PageHeader
        title="My Progress"
        subtitle="Track your grades, attendance, and academic goals."
      />

      <div className="student-progress__summary">
        <StatCard
          icon={barChartIcon}
          label="Overall grade"
          value={percentageLabel(data.summary.currentGrade)}
        />
        <StatCard
          icon={calendarCheckIcon}
          label="Attendance"
          value={percentageLabel(data.summary.attendance)}
        />
        <StatCard
          icon={bookOpenIcon}
          label="Academic goals"
          value={data.goals.length}
        />
      </div>

      <div className="student-progress__sections">
        <DashboardCard title="Grades by subject">
          {data.grades.length ? (
            <div className="student-progress__list">
              {data.grades.map((grade) => (
                <div className="student-progress__item" key={grade.id}>
                  <div className="student-progress__item-heading">
                    <span>{grade.subject}</span>
                    <strong>{percentageLabel(grade.grade)}</strong>
                  </div>
                  <progress
                    className="student-progress__bar"
                    max="100"
                    value={Math.min(100, Math.max(0, grade.grade ?? 0))}
                    aria-label={`${grade.subject} grade`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p>No subject grades available yet.</p>
          )}
        </DashboardCard>

        <DashboardCard title="Academic goals">
          {data.goals.length ? (
            <div className="student-progress__list">
              {data.goals.map((goal) => {
                const progress = Math.min(100, Math.max(0, goal.progress ?? 0))
                return (
                  <div className="student-progress__item" key={goal.id}>
                    <div className="student-progress__item-heading">
                      <strong>{goal.title}</strong>
                      <span>{progress}%</span>
                    </div>
                    <progress
                      className="student-progress__bar"
                      max="100"
                      value={progress}
                      aria-label={`${goal.title} progress`}
                    />
                    <small className="student-progress__status">
                      {goal.status.replaceAll('-', ' ')}
                    </small>
                  </div>
                )
              })}
            </div>
          ) : (
            <p>No academic goals have been set yet.</p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}

export default Progress