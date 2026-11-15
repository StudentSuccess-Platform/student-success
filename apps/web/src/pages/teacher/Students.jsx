import StudentsView from './StudentsView'
import useTeacherStudentsData from './useTeacherStudentsData'

function Students() {
  const { data, isLoading, error } = useTeacherStudentsData()

  return <StudentsView data={data} isLoading={isLoading} error={error} />
}

export default Students
