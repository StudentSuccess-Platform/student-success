import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import PerformanceTrendChart from '../../components/common/PerformanceTrendChart'
import CollapsibleSection from '../../components/teacher/CollapsibleSection'
import RecordsPanel from '../../components/teacher/records/RecordsPanel'
import RemediationPanel from '../../components/teacher/remediation/RemediationPanel'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import alertTriangleIcon from '../../assets/icons/dashboard/alert-triangle.svg'
import '../../styles/teacher-students.css'

const GOAL_BADGE_CLASS = {
  active: 'teacher-badge',
  achieved: 'teacher-badge teacher-badge--success',
  abandoned: 'teacher-badge teacher-badge--danger',
}

function formatPercent(value) {
  return value === null || value === undefined ? '--' : `${value}%`
}

// Calendar days are shown in UTC: attendance dates are stored at noon UTC, so one day stays one date.
function formatDay(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatLabel(value) {
  if (!value) return '--'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StudentProfileView({ data, isLoading, error, reload }) {
  const [gradeEdit, setGradeEdit] = useState(null)
  const editCount = useRef(0)

  // Opens the grade form below for one assignment (edit icon or double-click on its row).
  function editGrade(grade) {
    setGradeEdit({
      key: `${grade.assignmentId}-${++editCount.current}`,
      assignmentId: grade.assignmentId,
      pointsEarned: grade.pointsEarned,
      status: grade.status,
    })
  }

  if (isLoading) {
    return <p className="dashboard-status">Loading student…</p>
  }

  if (error?.status === 404) {
    return (
      <div className="student-profile">
        <div className="dashboard-status">
          <p>Student not found</p>
          <Link to="/teacher/students" className="teacher-link">
            Back to students
          </Link>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <p className="dashboard-status dashboard-status--error">
        Couldn&apos;t load this student. Please try again.
      </p>
    )
  }

  if (!data) {
    return null
  }

  const { student, summary, grades, attendance, goals, feedback, performanceTrend, classes } = data

  return (
    <div className="student-profile">
      {error && (
        <p role="alert" className="dashboard-status dashboard-status--error">
          Could not refresh this page. {error.message}
        </p>
      )}
      <PageHeader
        title={student.name}
        subtitle={`Grade ${student.gradeLevel} · Student #${student.studentNumber}`}
        action={
          <Link to="/teacher/students" className="teacher-link">
            Back to students
          </Link>
        }
      />

      <div className="stat-card-grid">
        <StatCard
          icon={bookOpenIcon}
          label="Average Grade"
          value={formatPercent(summary.averageGrade)}
        />
        <StatCard
          icon={calendarCheckIcon}
          label="Attendance rate"
          value={formatPercent(summary.attendanceRate)}
        />
        <StatCard
          icon={alertTriangleIcon}
          label="Status"
          accent={summary.needsIntervention ? 'warning' : 'default'}
          value={
            summary.needsIntervention ? (
              <span className="teacher-badge teacher-badge--warning">Needs intervention</span>
            ) : (
              <span className="teacher-badge teacher-badge--success">On track</span>
            )
          }
          trend={summary.needsIntervention ? summary.reason : null}
        />
      </div>

      <CollapsibleSection title="Grades">
        {grades.length === 0 ? (
          <p className="chart-empty">No grades yet.</p>
        ) : (
          <div className="student-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Assignment</th>
                  <th scope="col">Category</th>
                  <th scope="col">Points</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="teacher-visually-hidden">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr
                    key={grade.assignmentId}
                    onDoubleClick={() => editGrade(grade)}
                    title="Double-click to edit this grade"
                  >
                    <td>{grade.className}</td>
                    <td>{grade.title}</td>
                    <td>{grade.category}</td>
                    <td>
                      {grade.pointsEarned === null
                        ? 'Not graded'
                        : `${grade.pointsEarned} / ${grade.pointsPossible}`}
                    </td>
                    <td>{formatLabel(grade.status)}</td>
                    <td>
                      <button
                        type="button"
                        className="teacher-icon-button"
                        aria-label={`Edit grade: ${grade.className} ${grade.title}`}
                        onClick={() => editGrade(grade)}
                      >
                        <PencilIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Attendance">
        <p className="teacher-muted">Attendance rate: {formatPercent(attendance.rate)}</p>
        {attendance.records.length === 0 ? (
          <p className="chart-empty">No attendance records yet.</p>
        ) : (
          <div className="student-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.className}</td>
                    <td>{formatDay(record.date)}</td>
                    <td>{formatLabel(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      <section className="teacher-section">
        <h2 className="teacher-section-title">Goals and Progress</h2>
        {goals.length === 0 ? (
          <p className="chart-empty">No goals yet.</p>
        ) : (
          <ul className="student-list">
            {goals.map((goal) => {
              const latestUpdate = goal.updates[goal.updates.length - 1]
              return (
                <li key={goal.id} className="student-list-item">
                  <div className="student-goal-header">
                    <h3 className="student-item-title">{goal.title}</h3>
                    <span className={GOAL_BADGE_CLASS[goal.status] ?? 'teacher-badge'}>
                      {formatLabel(goal.status)}
                    </span>
                  </div>
                  {goal.description && <p className="teacher-muted">{goal.description}</p>}
                  <progress
                    className="student-goal-progress"
                    max={100}
                    value={goal.progress}
                    aria-label={`Progress for ${goal.title}`}
                  />
                  <p className="teacher-muted">
                    {goal.progress}% complete
                    {goal.targetDate && ` · Target ${formatDay(goal.targetDate)}`}
                  </p>
                  {latestUpdate ? (
                    <p className="student-goal-note">
                      Latest update ({formatDay(latestUpdate.createdAt)}): {latestUpdate.note}
                    </p>
                  ) : (
                    <p className="teacher-muted">No progress updates yet.</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="teacher-section">
        <h2 className="teacher-section-title">Teacher Feedback</h2>
        {feedback.length === 0 ? (
          <p className="chart-empty">No feedback yet.</p>
        ) : (
          <ul className="student-list">
            {feedback.map((item) => (
              <li key={item.id} className="student-list-item">
                <p className="teacher-muted">
                  {item.className} · {formatDay(item.createdAt)}
                </p>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="teacher-section">
        <h2 className="teacher-section-title">Performance Trend</h2>
        <PerformanceTrendChart
          data={performanceTrend}
          tooltipLabel="Average Grade"
          tooltipUnit="%"
        />
      </section>

      <section className="teacher-section">
        <h2 className="teacher-section-title">Remediation Plans</h2>
        <RemediationPanel studentId={student.id} classes={classes} />
      </section>

      <RecordsPanel student={data} onSaved={reload} gradeEdit={gradeEdit} />
    </div>
  )
}

export default StudentProfileView
