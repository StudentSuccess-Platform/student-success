import PageHeader from '../../components/common/PageHeader'
import DashboardCard from '../../components/common/DashboardCard'
import { studentDashboardData } from './StudentMockData'

function SupportPlan({ plan = studentDashboardData.supportPlan }) {
  if (!plan || plan.status !== 'approved') {
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