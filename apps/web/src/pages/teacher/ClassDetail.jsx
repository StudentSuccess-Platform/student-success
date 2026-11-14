import { useParams } from 'react-router-dom'
import ClassOverviewView from './ClassOverviewView'
import useTeacherClassOverviewData from './useTeacherClassOverviewData'

function ClassDetail() {
  const { classId } = useParams()
  const { data, isLoading, error } = useTeacherClassOverviewData(classId)

  return <ClassOverviewView data={data} isLoading={isLoading} error={error} />
}

export default ClassDetail
