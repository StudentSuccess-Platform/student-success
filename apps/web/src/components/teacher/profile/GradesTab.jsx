import { useRef, useState } from 'react'
import GradeEntryForm from '../records/GradeEntryForm'
import { formatLabel } from './format'

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

// Grades table with the grade form under it. The pencil (or a double-click on a row) loads that
// assignment into the form, which scrolls into view with its points field focused.
function GradesTab({ student, grades, onSaved }) {
  const [gradeEdit, setGradeEdit] = useState(null)
  const editCount = useRef(0)

  function editGrade(grade) {
    setGradeEdit({
      key: `${grade.assignmentId}-${++editCount.current}`,
      assignmentId: grade.assignmentId,
      pointsEarned: grade.pointsEarned,
      status: grade.status,
    })
  }

  return (
    <section className="teacher-section">
      <h2 className="teacher-section-title">Grades</h2>
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
      <GradeEntryForm
        key={gradeEdit?.key ?? 'new'}
        studentId={student.id}
        grades={grades}
        onSaved={onSaved}
        edit={gradeEdit}
      />
    </section>
  )
}

export default GradesTab
