import AttendanceEntryForm from '../records/AttendanceEntryForm'
import { formatDay, formatLabel, formatPercent } from './format'

function AttendanceTab({ student, classes, attendance, onSaved }) {
  return (
    <section className="teacher-section">
      <h2 className="teacher-section-title">Attendance</h2>
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
      <AttendanceEntryForm studentId={student.id} classes={classes} onSaved={onSaved} />
    </section>
  )
}

export default AttendanceTab
