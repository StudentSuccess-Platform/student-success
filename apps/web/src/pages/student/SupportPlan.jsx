import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import SupportPlanCard from '../../components/student/SupportPlanCard'
import { getStudentSupportPlans } from '../../services/studentApi'
import { useAuth } from '../../state/AuthContext'
import '../../styles/student-support-plan.css'

// The student's teacher-published plans. The current plan of each class is shown first; plans that a newer plan
// replaced are kept for reference behind "Show earlier plans".
function SupportPlan() {
  const { token } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEarlier, setShowEarlier] = useState(false)

  useEffect(() => {
    let active = true

    getStudentSupportPlans(token)
      .then((result) => {
        if (active) setPlans(result.plans ?? [])
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

  const current = plans.filter((plan) => plan.active)
  const earlier = plans.filter((plan) => !plan.active)

  return (
    <div className="student-support-plan">
      <PageHeader
        title="Support Plan"
        subtitle="Your teacher-approved academic support goals and recommendations."
      />

      {current.length === 0 && <p>You don't currently have an approved support plan.</p>}
      {current.map((plan) => (
        <SupportPlanCard key={plan.id} plan={plan} />
      ))}

      {earlier.length > 0 && (
        <section className="student-support-plan__history">
          <button
            type="button"
            className="student-support-plan__toggle"
            aria-expanded={showEarlier}
            aria-controls="earlier-support-plans"
            onClick={() => setShowEarlier((value) => !value)}
          >
            {showEarlier ? 'Hide earlier plans' : `Show earlier plans (${earlier.length})`}
          </button>
          {showEarlier && (
            <div id="earlier-support-plans">
              {earlier.map((plan) => (
                <SupportPlanCard key={plan.id} plan={plan} earlier />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default SupportPlan
