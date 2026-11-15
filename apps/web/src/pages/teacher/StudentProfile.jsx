import { useParams } from 'react-router-dom'
import StudentProfileView from './StudentProfileView'
import useTeacherStudentProfile from './useTeacherStudentProfile'

function StudentProfile() {
  const { studentId } = useParams()
  const { data, isLoading, error, reload } = useTeacherStudentProfile(studentId)

  return (
    <StudentProfileView data={data} isLoading={isLoading} error={error} reload={reload} />
  )
}

export default StudentProfile
