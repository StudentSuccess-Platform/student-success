import { useParams } from 'react-router-dom'
import RosterView from './RosterView'
import useTeacherRosterData from './useTeacherRosterData'

function ClassRoster() {
  const { classId } = useParams()
  const { data, isLoading, error } = useTeacherRosterData(classId)

  return <RosterView data={data} isLoading={isLoading} error={error} />
}

export default ClassRoster
