import '../../../styles/teacher-records.css'
import AttendanceEntryForm from './AttendanceEntryForm'
import FeedbackForm from './FeedbackForm'
import FeedbackList from './FeedbackList'
import GoalEditForm from './GoalEditForm'
import GoalForm from './GoalForm'
import GoalProgressForm from './GoalProgressForm'
import GradeEntryForm from './GradeEntryForm'

// Props: { student, onSaved } where `student` is the GET /api/v1/teacher/students/:id payload
// (docs/design/teacher-portal-mvp.md) and `onSaved()` asks the page to reload that payload.
// `gradeEdit` ({ key, assignmentId, pointsEarned, status }) preloads the grade form for one assignment.
function RecordsPanel({ student, onSaved, gradeEdit = null }) {
  const studentId = student.student.id
  const grades = student.grades ?? []
  const classes = student.classes ?? []
  const goals = student.goals ?? []
  const feedback = student.feedback ?? []

  return (
    <section className="teacher-section">
      <h2 className="teacher-section-title">Enter Academic Records</h2>
      <GradeEntryForm key={gradeEdit?.key ?? 'new'} studentId={studentId} grades={grades} onSaved={onSaved} edit={gradeEdit} />
      <AttendanceEntryForm studentId={studentId} classes={classes} onSaved={onSaved} />
      <GoalForm studentId={studentId} onSaved={onSaved} />
      <GoalProgressForm studentId={studentId} goals={goals} onSaved={onSaved} />
      <GoalEditForm studentId={studentId} goals={goals} onSaved={onSaved} />
      <FeedbackForm studentId={studentId} classes={classes} onSaved={onSaved} />
      <FeedbackList studentId={studentId} feedback={feedback} onSaved={onSaved} />
    </section>
  )
}

export default RecordsPanel
