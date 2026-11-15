import { useEffect, useState } from 'react'
import DashboardCard from '../../components/common/DashboardCard'
import PageHeader from '../../components/common/PageHeader'
import { getStudentDashboard } from '../../services/studentApi'
import { useAuth } from '../../state/AuthContext'
import '../../styles/student-support-plan.css'

function SupportPlan() {
  const { token } = useAuth()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    getStudentDashboard(token)
      .then((dashboard) => {
        if (active) setPlan(dashboard.supportPlan)
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

  if (loading) return <p>Loading your support plan...</p>
  if (error) return <p role="alert">{error}</p>
  if (!plan || !['approved', 'published'].includes(plan.status)) {
    return <p>You don't currently have an approved support plan.</p>
  }

  const activities = plan.activities ?? []
  const completedActivities = activities.filter((activity) => activity.status === 'done').length
  const recommendations = plan.recommendations ?? []

  return (
    <div className="student-support-plan">
      <PageHeader
        title="Support Plan"
        subtitle="Your teacher-approved academic support goals and recommendations."
      />

      <DashboardCard title="Remediation goal">
        <h3 className="student-support-plan__goal">{plan.goal ?? plan.focus}</h3>
        {plan.teacher && <p className="student-support-plan__teacher">Recommended by {plan.teacher}</p>}
      </DashboardCard>

      <div className="student-support-plan__sections">
        <DashboardCard title="Activities">
          {activities.length ? (
            <>
              <p className="student-support-plan__progress">
                {completedActivities} of {activities.length} activities completed
              </p>
              <progress
                className="student-support-plan__bar"
                max={activities.length}
                value={completedActivities}
                aria-label="Support plan activities completed"
              />
              <ol className="student-support-plan__activities">
                {activities.map((activity) => (
                  <li key={activity.id} className="student-support-plan__activity">
                    <div>
                      <strong>{activity.title}</strong>
                      {activity.schedule && <p>{activity.schedule}</p>}
                    </div>
                    <span className={`student-support-plan__status student-support-plan__status--${activity.status ?? 'todo'}`}>
                      {(activity.status ?? 'todo').replaceAll('_', ' ')}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p>No activities have been added to this support plan yet.</p>
          )}
        </DashboardCard>

        <DashboardCard title="Support recommendations">
          {recommendations.length ? (
            <ul className="student-support-plan__recommendations">
              {recommendations.map((recommendation, index) => (
                <li key={`${index}-${recommendation}`}>{recommendation}</li>
              ))}
            </ul>
          ) : (
            <p>No additional recommendations are available.</p>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}

export default SupportPlan
