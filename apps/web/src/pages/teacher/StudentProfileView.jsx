import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import RemediationPanel from '../../components/teacher/remediation/RemediationPanel'
import AttendanceTab from '../../components/teacher/profile/AttendanceTab'
import GoalsFeedbackTab from '../../components/teacher/profile/GoalsFeedbackTab'
import GradesTab from '../../components/teacher/profile/GradesTab'
import OverviewTab from '../../components/teacher/profile/OverviewTab'
import ProfileTabs from '../../components/teacher/profile/ProfileTabs'
import { PROFILE_TABS, panelId, tabId } from '../../components/teacher/profile/tabDefinitions'
import { formatPercent } from '../../components/teacher/profile/format'
import bookOpenIcon from '../../assets/icons/dashboard/book-open.svg'
import calendarCheckIcon from '../../assets/icons/dashboard/calendar-check.svg'
import alertTriangleIcon from '../../assets/icons/dashboard/alert-triangle.svg'
import '../../styles/teacher-students.css'

// The open tab lives in the URL (?tab=grades) so refresh, back and shared links keep the view.
// Only `tab` is touched here: any other param (e.g. `from`, SCRUM-152) must survive a tab switch.
function useActiveTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const active = PROFILE_TABS.some((tab) => tab.id === requested) ? requested : 'overview'

  function setActive(id) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (id === 'overview') next.delete('tab')
      else next.set('tab', id)
      return next
    })
  }

  return [active, setActive]
}

// When reached from a class's Roster tab (?from=<classId>, SCRUM-152), "back" returns there
// instead of the full Students list, so the teacher doesn't lose their class context.
function useBackToRoster() {
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('from')
  return classId
    ? { to: `/teacher/classes/${classId}/roster`, label: 'Back to roster' }
    : { to: '/teacher/students', label: 'Back to students' }
}

function StudentProfileView({ data, isLoading, error, reload }) {
  const [activeTab, setActiveTab] = useActiveTab()
  const back = useBackToRoster()

  if (isLoading) {
    return <p className="dashboard-status">Loading student…</p>
  }

  if (error?.status === 404) {
    return (
      <div className="student-profile">
        <div className="dashboard-status">
          <p>Student not found</p>
          <Link to={back.to} className="teacher-link">
            {back.label}
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

  const { student, summary, grades, attendance, goals, feedback, classes } = data

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
          <Link to={back.to} className="teacher-link">
            {back.label}
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

      <ProfileTabs active={activeTab} onChange={setActiveTab} />

      <div
        role="tabpanel"
        id={panelId(activeTab)}
        aria-labelledby={tabId(activeTab)}
        className="profile-panel"
      >
        {activeTab === 'overview' && <OverviewTab data={data} onOpenTab={setActiveTab} />}
        {activeTab === 'grades' && <GradesTab student={student} grades={grades} onSaved={reload} />}
        {activeTab === 'attendance' && (
          <AttendanceTab student={student} classes={classes} attendance={attendance} onSaved={reload} />
        )}
        {activeTab === 'goals' && (
          <GoalsFeedbackTab
            student={student}
            classes={classes}
            goals={goals}
            feedback={feedback}
            onSaved={reload}
          />
        )}
        {activeTab === 'plans' && (
          <section className="teacher-section">
            <h2 className="teacher-section-title">Remediation Plans</h2>
            <RemediationPanel studentId={student.id} classes={classes} />
          </section>
        )}
      </div>
    </div>
  )
}

export default StudentProfileView
