import { useParams } from 'react-router-dom'
import StudentProfileView from './StudentProfileView'
import useTeacherStudentProfile from './useTeacherStudentProfile'

// The hook lives in a child keyed by student id, so switching students remounts it and no
// data, form text or error from the previous student is shown while the new profile loads.
function StudentProfileData({ studentId }) {
  const { data, isLoading, error, reload } = useTeacherStudentProfile(studentId)

  return (
    <StudentProfileView data={data} isLoading={isLoading} error={error} reload={reload} />
  )
}

function StudentProfile() {
  const { studentId } = useParams()

  return <StudentProfileData key={studentId} studentId={studentId} />
}

export default StudentProfile
