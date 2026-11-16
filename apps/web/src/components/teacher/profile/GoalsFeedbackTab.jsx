import FeedbackForm from '../records/FeedbackForm'
import FeedbackList from '../records/FeedbackList'
import GoalEditForm from '../records/GoalEditForm'
import GoalForm from '../records/GoalForm'
import GoalProgressForm from '../records/GoalProgressForm'
import { formatDay, formatLabel } from './format'

const GOAL_BADGE_CLASS = {
  active: 'teacher-badge',
  achieved: 'teacher-badge teacher-badge--success',
  abandoned: 'teacher-badge teacher-badge--danger',
}

function GoalsFeedbackTab({ student, classes, goals, feedback, onSaved }) {
  return (
    <>
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
        <GoalForm studentId={student.id} onSaved={onSaved} />
        <GoalProgressForm studentId={student.id} goals={goals} onSaved={onSaved} />
        <GoalEditForm studentId={student.id} goals={goals} onSaved={onSaved} />
      </section>

      <section className="teacher-section">
        <h2 className="teacher-section-title">Teacher Feedback</h2>
        <FeedbackForm studentId={student.id} classes={classes} onSaved={onSaved} />
        <FeedbackList studentId={student.id} feedback={feedback} onSaved={onSaved} />
      </section>
    </>
  )
}

export default GoalsFeedbackTab
