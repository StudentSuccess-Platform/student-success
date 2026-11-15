import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import '../../styles/teacher-students.css'

function formatPercent(value) {
  return value === null || value === undefined ? '--' : `${value}%`
}

function StudentsView({ data, isLoading, error }) {
  const [query, setQuery] = useState('')
  const searchId = useId()

  const students = data?.students ?? []
  const normalizedQuery = query.trim().toLowerCase()
  const visibleStudents = students.filter((student) =>
    student.name.toLowerCase().includes(normalizedQuery)
  )

  return (
    <div className="students-page">
      <PageHeader
        title="Students"
        subtitle="Students assigned to your classes, sorted by name."
      />

      {isLoading && <p className="dashboard-status">Loading students…</p>}

      {!isLoading && error && (
        <p className="dashboard-status dashboard-status--error">
          Couldn&apos;t load students. Please try again.
        </p>
      )}

      {!isLoading && !error && data && students.length === 0 && (
        <p className="chart-empty">No students assigned yet.</p>
      )}

      {!isLoading && !error && data && students.length > 0 && (
        <section className="teacher-section students-section">
          <div className="students-search teacher-field">
            <label htmlFor={searchId}>Search students</label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a name"
            />
          </div>

          {visibleStudents.length === 0 ? (
            <p className="chart-empty">No students match your search.</p>
          ) : (
            <div className="students-table-wrap">
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Classes</th>
                    <th scope="col">Average grade</th>
                    <th scope="col">Attendance</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <Link to={`/teacher/students/${student.id}`} className="teacher-link">
                          {student.name}
                        </Link>
                      </td>
                      <td>{student.classNames.length > 0 ? student.classNames.join(', ') : '--'}</td>
                      <td>{formatPercent(student.averageGrade)}</td>
                      <td>{formatPercent(student.attendanceRate)}</td>
                      <td>
                        {student.needsIntervention && (
                          <span className="teacher-badge teacher-badge--warning">
                            Needs intervention
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default StudentsView
