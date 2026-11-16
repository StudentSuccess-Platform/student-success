/**
 * Roster table for one class. Only renders the fields the real
 * `GET /api/v1/teacher/classes/:classId` response provides — no Student ID
 * or status column, since the API doesn't return either yet (SCRUM-144).
 */
function RosterTable({ students }) {
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
            <td>{name}</td>
            <td>{averageGrade}%</td>
            <td>{attendanceRate}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default RosterTable
