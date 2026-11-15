import { useState } from 'react'
import { formatDay } from '../profile/format'
import FeedbackEditor from './FeedbackEditor'

// Existing shared feedback for the student. Each item opens an inline editor on "Edit".
function FeedbackList({ studentId, feedback, onSaved }) {
  const [editingId, setEditingId] = useState(null)

  return (
    <div className="teacher-records-group" role="group" aria-labelledby="records-feedback-list-title">
      <h3 id="records-feedback-list-title" className="teacher-records-group-title">
        Existing feedback
      </h3>
      {feedback.length === 0 ? (
        <p className="teacher-muted">No feedback yet.</p>
      ) : (
        <ul className="teacher-records-feedback-list">
          {feedback.map((item) => (
            <li key={item.id} className="teacher-records-feedback-item">
              <p className="teacher-records-feedback-meta">{item.className}</p>
              {item.createdAt && <p className="teacher-muted">{formatDay(item.createdAt)}</p>}
              {editingId === item.id ? (
                <FeedbackEditor
                  studentId={studentId}
                  item={item}
                  onSaved={onSaved}
                  onClose={() => setEditingId(null)}
                />
              ) : (
                <>
                  <p className="teacher-records-feedback-body">{item.body}</p>
                  <button type="button" className="teacher-button" onClick={() => setEditingId(item.id)}>
                    Edit
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FeedbackList
