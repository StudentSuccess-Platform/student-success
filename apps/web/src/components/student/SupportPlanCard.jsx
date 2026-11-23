import DashboardCard from '../common/DashboardCard'

// A published date as the student sees it, in their own time zone.
function formatPublished(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// One published support plan: who and when (class, teacher, publish date), the goal, the activities with
// progress, and the recommendation. `earlier` marks a plan that a newer plan of the same class replaced.
function SupportPlanCard({ plan, earlier = false }) {
  const activities = plan.items ?? []
  const completed = activities.filter((activity) => activity.status === 'done').length
  const published = formatPublished(plan.publishedAt)

  return (
    <article className="student-support-plan__plan" aria-label={`${plan.className} support plan`}>
      <header className="student-support-plan__plan-header">
        <h2 className="student-support-plan__class">{plan.className}</h2>
        <p className="student-support-plan__meta">
          {earlier && <span className="student-support-plan__earlier">Earlier plan</span>}
          {published && <span>Published on {published}</span>}
          {plan.teacher && <span>Recommended by {plan.teacher}</span>}
        </p>
      </header>

      <DashboardCard title="Remediation goal">
        <h3 className="student-support-plan__goal">{plan.title}</h3>
      </DashboardCard>

      <div>
        <DashboardCard title="Activities">
          {activities.length ? (
            <>
              <p className="student-support-plan__progress">
                {completed} of {activities.length} activities completed
              </p>
              <progress
                className="student-support-plan__bar"
                max={activities.length}
                value={completed}
                aria-label={`${plan.className} support plan activities completed`}
              />
              <ol className="student-support-plan__activities">
                {activities.map((activity) => (
                  <li key={activity.id} className="student-support-plan__activity">
                    <div>
                      <strong>{activity.title}</strong>
                      {activity.description && <p>{activity.description}</p>}
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
          {plan.rationale ? <p>{plan.rationale}</p> : <p>No additional recommendations are available.</p>}
        </DashboardCard>
      </div>
    </article>
  )
}

export default SupportPlanCard
