import { useParams } from 'react-router-dom'
import ComingSoon from '../../components/common/ComingSoon'
import useTeacherClassesData from './useTeacherClassesData'

function ClassDetail() {
  const { classId } = useParams()
  const { data } = useTeacherClassesData()
  const classItem = data?.classes.find((item) => item.id === classId)

  return <ComingSoon title={classItem ? classItem.name : 'Class'} />
}

export default ClassDetail
