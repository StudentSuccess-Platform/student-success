import { useCallback, useId, useState } from 'react'
import useApiResource from '../../../hooks/useApiResource'
import { generateAiPlan, listPlans } from '../../../services/teacherRemediationApi'
import '../../../styles/teacher-remediation.css'
import ManualPlanForm from './ManualPlanForm'
import RemediationPlanCard from './RemediationPlanCard'

const MANUAL_HINT = 'You can create a plan manually.'

// Fallback applies when the AI is unavailable, returned bad output, failed on the server or could not be reached.
const AI_FALLBACK_CODES = ['AI_UNAVAILABLE', 'AI_INVALID_RESPONSE']

function isAiFallbackError(error) {
  const status = error?.status ?? 0
  return (
    AI_FALLBACK_CODES.includes(error?.code) ||
    error?.fallback === 'manual' ||
    status === 0 ||
    status >= 500
  )
}

function newestFirst(plans) {
  return [...plans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

// Workstream W3 (AI and manual remediation plans). Renders no heading: the page supplies it.
// Props: { studentId, classes } where `classes` is the profile payload's classes array.
function RemediationPanel({ studentId, classes }) {
  const classList = classes ?? []

  const fetchPlans = useCallback(() => listPlans(studentId), [studentId])
  const { data, isLoading, error, reload } = useApiResource(fetchPlans)

  const [chosenSectionId, setChosenSectionId] = useState('')
  const sectionId = classList.some((item) => item.id === chosenSectionId)
    ? chosenSectionId
    : (classList[0]?.id ?? '')

  const [showManual, setShowManual] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState(null)
  const selectId = useId()

  async function handleGenerate() {
    setIsGenerating(true)
    setAiError(null)

    try {
      await generateAiPlan(studentId, sectionId ? { sectionId } : {})
      setIsGenerating(false)
      reload()
    } catch (generateError) {
      const message = generateError?.message || 'The AI service is unavailable.'
      const fallback = isAiFallbackError(generateError)
      setAiError({ message, fallback })
      setIsGenerating(false)
      if (fallback) setShowManual(true)
    }
  }

  function handleManualSaved() {
    setShowManual(false)
    reload()
  }

  const plans = newestFirst(data?.plans ?? [])
  const showEmpty = !isLoading && !error && plans.length === 0

  return (
    <div className="remediation-panel">
      {classList.length > 1 && (
        <div className="teacher-field">
          <label htmlFor={selectId}>Class</label>
          <select
            id={selectId}
            value={sectionId}
            onChange={(event) => setChosenSectionId(event.target.value)}
          >
            {classList.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="teacher-form-actions">
        <button
          type="button"
          className="teacher-button teacher-button--primary"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Generate AI recommendation'}
        </button>
        <button type="button" className="teacher-button" onClick={() => setShowManual(true)}>
          Create plan manually
        </button>
      </div>

      {aiError && (
        <p role="alert" className="teacher-form-error">
          {aiError.message}
          {aiError.fallback && !aiError.message.includes(MANUAL_HINT) && (
            <>
              {' '}
              <span>{MANUAL_HINT}</span>
            </>
          )}
        </p>
      )}

      {showManual && (
        <ManualPlanForm
          studentId={studentId}
          sectionId={sectionId}
          onSaved={handleManualSaved}
          onCancel={() => setShowManual(false)}
        />
      )}

      {isLoading && <p className="teacher-muted">Loading remediation plans…</p>}

      {!isLoading && error && (
        <p role="alert" className="teacher-form-error">
          Could not load remediation plans. {error.message}
        </p>
      )}

      {showEmpty && <p className="teacher-muted">No remediation plans yet.</p>}

      {plans.length > 0 && (
        <div className="remediation-list">
          {plans.map((plan) => (
            <RemediationPlanCard
              key={plan.id}
              studentId={studentId}
              plan={plan}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RemediationPanel
