import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import DashboardCard from '../../components/common/DashboardCard'
import ClassTabs from '../../components/teacher/ClassTabs'
import RosterTable from '../../components/teacher/RosterTable'

function sortByName(students, direction) {
  const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name))
  return direction === 'desc' ? sorted.reverse() : sorted
}

function RosterView({ data, isLoading, error }) {
  const [query, setQuery] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')

  const visibleStudents = useMemo(() => {
    if (!data) return []
    const filtered = query.trim()
      ? data.students.filter((student) =>
          student.name.toLowerCase().includes(query.trim().toLowerCase())
        )
      : data.students
    return sortByName(filtered, sortDirection)
  }, [data, query, sortDirection])

  return (
    <div className="class-roster">
      {isLoading && <p className="dashboard-status">Loading roster…</p>}

      {!isLoading && error && (
        <p className="dashboard-status dashboard-status--error">
          Couldn&apos;t load the roster. Please try again.
        </p>
      )}

      {!isLoading && !error && !data && (
        <div className="dashboard-status">
          <p>Class not found.</p>
          <Link to="/teacher/classes" className="class-overview-back-link">
            Back to My Classes
          </Link>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <PageHeader
            title={data.class.name}
            subtitle={`${data.class.period} · ${data.class.room} · ${data.students.length} students enrolled`}
            action={
              <Link to="/teacher/classes" className="class-overview-back-link">
                Back to My Classes
              </Link>
            }
          />

          <ClassTabs classId={data.class.id} />

          <DashboardCard>
            <div className="roster-controls">
              <input
                type="search"
                className="roster-search-input"
                placeholder="Search students…"
                aria-label="Search students"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />

              <button
                type="button"
                className="roster-sort-button"
                onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
              >
                Student Name {sortDirection === 'asc' ? '▲' : '▼'}
              </button>
            </div>

            {data.students.length === 0 && (
              <p className="chart-empty">No students enrolled in this class yet.</p>
            )}

            {data.students.length > 0 && visibleStudents.length === 0 && (
              <p className="chart-empty">No students match &ldquo;{query}&rdquo;.</p>
            )}

            {visibleStudents.length > 0 && <RosterTable students={visibleStudents} />}
          </DashboardCard>
        </>
      )}
    </div>
  )
}

export default RosterView
