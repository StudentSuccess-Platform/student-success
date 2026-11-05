import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import DashboardCard from '../../components/common/DashboardCard'
import { getStudentDashboard } from '../../services/studentApi'
import { useAuth } from '../../state/AuthContext'

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

  return (
    <div className="support-plan">
      <PageHeader
        title="Support Plan"
        subtitle="Your teacher-approved academic support plan."
      />

      <DashboardCard title={plan.focus}>
        {plan.activities.map((activity, index) => (
          <div key={activity.id}>
            <span>{index + 1}</span>
            <div>
              <strong>{activity.title}</strong>
              <p>{activity.schedule}</p>
            </div>
          </div>
        ))}
      </DashboardCard>
    </div>
  )
}

export default SupportPlan