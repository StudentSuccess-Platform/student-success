import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import SupportPlanCard from '../../components/student/SupportPlanCard'
import ParentChildSelector from './ParentChildSelector'
import useParentChildrenData from './useParentChildrenData'
import useParentSupportPlansData from './useParentSupportPlansData'
import '../../styles/student-support-plan.css'

/**
 * Resolves which linked child to show and renders that child's published support plans.
 * `ParentChildSelector` only renders (and only ever offers) ids from the real
 * `GET /api/v1/parent/children` response, never a constructed or guessed id.
 *
 * `PlansForChild` is remounted via `key={effectiveChildId}` on every switch, so a child change
 * always starts that subtree fresh (loading state, no stale plans, "show earlier" collapsed)
 * instead of showing the previous child's plans while the new ones load — same pattern as
 * `ParentDashboard`.
 */
function ParentSupportPlan() {
  const [selectedChildId, setSelectedChildId] = useState(null)
  const { data: childrenData, isLoading: childrenLoading, error: childrenError } =
    useParentChildrenData()

  if (childrenLoading) {
    return <p className="dashboard-status">Loading your dashboard…</p>
  }

  if (childrenError) {
    return (
      <p className="dashboard-status dashboard-status--error">
        Couldn&apos;t load your linked students. Please try again.
      </p>
    )
  }

  if (!childrenData || childrenData.children.length === 0) {
    return <p className="dashboard-status">No students are linked to your account yet.</p>
  }

  const effectiveChildId = selectedChildId ?? childrenData.children[0].id

  return (
    <>
      <ParentChildSelector
        children={childrenData.children}
        selectedId={effectiveChildId}
        onSelect={setSelectedChildId}
      />

      <PlansForChild key={effectiveChildId} studentId={effectiveChildId} />
    </>
  )
}

function PlansForChild({ studentId }) {
  const { data, isLoading, error } = useParentSupportPlansData(studentId)
  const [showEarlier, setShowEarlier] = useState(false)

  const plans = data?.plans ?? []
  const current = plans.filter((plan) => plan.active)
  const earlier = plans.filter((plan) => !plan.active)

  return (
    <div className="student-support-plan">
      <PageHeader
        title="Support Plan"
        subtitle="Your child's teacher-approved academic support goals and recommendations."
      />

      {isLoading && <p>Loading support plans…</p>}

      {!isLoading && error && <p role="alert">{error.message}</p>}

      {!isLoading && !error && (
        <>
          {current.length === 0 && <p>This child doesn&apos;t currently have an approved support plan.</p>}
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
        </>
      )}
    </div>
  )
}

export default ParentSupportPlan
