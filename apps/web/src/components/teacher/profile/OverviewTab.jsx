import PerformanceTrendChart from '../../common/PerformanceTrendChart'

// Trend chart plus a short "at a glance" list. Each line jumps to the tab that holds the details.
function OverviewTab({ data, onOpenTab }) {
  const { grades, attendance, goals, feedback, performanceTrend } = data
  const ungraded = grades.filter((grade) => grade.pointsEarned === null).length
  const activeGoals = goals.filter((goal) => goal.status === 'active').length

  const rows = [
    ['grades', 'Grades', `${grades.length} assignments, ${ungraded} not graded`],
    ['attendance', 'Attendance', `${attendance.records.length} records`],
    ['goals', 'Goals & Feedback', `${activeGoals} active goals, ${feedback.length} feedback notes`],
    ['plans', 'Support Plans', 'AI draft, review, approve and publish'],
  ]

  return (
    <>
      <section className="teacher-section">
        <h2 className="teacher-section-title">Performance Trend</h2>
        <PerformanceTrendChart data={performanceTrend} tooltipLabel="Average Grade" tooltipUnit="%" />
      </section>

      <section className="teacher-section">
        <h2 className="teacher-section-title">At a glance</h2>
        <ul className="profile-glance">
          {rows.map(([tab, label, detail]) => (
            <li key={tab}>
              <button type="button" className="profile-glance-link" onClick={() => onOpenTab(tab)}>
                {label}
              </button>
              <span className="teacher-muted">{detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default OverviewTab
