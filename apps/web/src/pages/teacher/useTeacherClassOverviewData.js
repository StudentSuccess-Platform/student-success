import useApiResource from '../../hooks/useApiResource'
import { getClasses } from '../../services/teacherApi'
import { classOverviewTemplates } from './classOverviewMockData'

// Matched against the real class name so a math class doesn't get handed
// English Literature assignments, etc. First match wins; unmatched names
// fall back to the full template pool.
const SUBJECT_PATTERNS = [
  { subject: 'math', pattern: /algebra|geometry|calculus|trigonometry|math/i },
  { subject: 'science', pattern: /biology|chemistry|physics|science/i },
  { subject: 'english', pattern: /english|literature|writing/i },
  { subject: 'history', pattern: /history|social studies|government/i },
]

function subjectFor(className) {
  return SUBJECT_PATTERNS.find(({ pattern }) => pattern.test(className))?.subject ?? null
}

// Deterministic pick so the same class id always gets the same demo
// template (stable across renders and reloads), scoped to templates whose
// subject matches the real class name when one does.
function templateFor(classId, className) {
  const subject = subjectFor(className)
  const matching = subject
    ? classOverviewTemplates.filter((template) => template.subject === subject)
    : []
  const candidates = matching.length > 0 ? matching : classOverviewTemplates

  let hash = 0
  for (let i = 0; i < classId.length; i += 1) {
    hash = (hash * 31 + classId.charCodeAt(i)) % candidates.length
  }
  return candidates[hash]
}

/**
 * Supplies data for the Teacher Class Overview page.
 *
 * The class header (`classInfo`: name, period, room, enrollment) comes from
 * the real `GET /api/v1/teacher/classes` response — the same request
 * useTeacherClassesData makes for My Classes, so the overview page only ever
 * shows a class that is actually this signed-in teacher's own (the API never
 * returns another teacher's classes, so an invalid or unauthorized classId
 * simply won't be found here).
 *
 * The academic sections (stats, trend, interventions, assignments, recent
 * activity) are still demonstration data — see classOverviewMockData.js —
 * until a real `GET /api/teacher/classes/:classId/overview` endpoint exists.
 * `isDemoData: true` flags this so the view can label it as such. The demo
 * template is chosen to match the real class's subject (so an Algebra or
 * Geometry class gets math-flavored assignments, not a Literature essay),
 * and each intervention entry's `className` is relabeled with the real
 * class name. Swap this hook's template lookup for a real fetch once that
 * endpoint ships; the `{ data, isLoading, error }` contract and `classInfo`
 * shape stay the same.
 *
 * Resolves with `data: null` when no class matches the given id, so the
 * view can render a dedicated "class not found" state.
 *
 * @param {string} classId
 * @returns {{ data: ({ classInfo: import('./classesMockData').TeacherClass, isDemoData: boolean, stats: object, performanceTrend: object[], interventions: object[], assignments: object[], recentActivity: object[] }|null), isLoading: boolean, error: Error|null }}
 */
function useTeacherClassOverviewData(classId) {
  const { data, isLoading, error } = useApiResource(getClasses)

  if (isLoading || error) {
    return { data: null, isLoading, error }
  }

  const classInfo = data?.classes.find((item) => item.id === classId)
  if (!classInfo) {
    return { data: null, isLoading: false, error: null }
  }

  const template = templateFor(classId, classInfo.name)

  return {
    data: {
      classInfo,
      isDemoData: true,
      stats: template.stats,
      performanceTrend: template.performanceTrend,
      // The template's own intervention entries are demo-authored for a
      // differently-named sample class; relabel with this class's real name
      // so a student's listed class always matches the page they're on.
      interventions: template.interventions.map((student) => ({
        ...student,
        className: classInfo.name,
      })),
      assignments: template.assignments,
      recentActivity: template.recentActivity,
    },
    isLoading: false,
    error: null,
  }
}

export default useTeacherClassOverviewData
