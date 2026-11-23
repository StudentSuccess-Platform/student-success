import { Link } from 'react-router-dom'

/**
 * Roster table for one class. Only renders the fields the real
 * `GET /api/v1/teacher/classes/:classId` response provides — no Student ID
 * or status column, since the API doesn't return either yet (SCRUM-144).
 *
 * Each student's name links to their real Student Profile, carrying `classId` as a `from`
 * query param (SCRUM-152) so the profile page can send the teacher back to this roster.
 */
function RosterTable({ students, classId }) {
  return (
    <table className="roster-table">
      <thead>
        <tr>
          <th scope="col">Student Name</th>
          <th scope="col">Average Grade</th>
          <th scope="col">Attendance Rate</th>
        </tr>
      </thead>

      <tbody>
        {students.map(({ id, name, averageGrade, attendanceRate }) => (
          <tr key={id}>
            <td>
              <Link to={`/teacher/students/${id}?from=${classId}`} className="teacher-link">
                {name}
              </Link>
            </td>
            <td>{averageGrade}%</td>
            <td>{attendanceRate}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default RosterTable
