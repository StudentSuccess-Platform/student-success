import { useParams } from 'react-router-dom'
import ComingSoon from '../../components/common/ComingSoon'
import { classes } from './classesMockData'

function ClassDetail() {
  const { classId } = useParams()
  const classItem = classes.find((item) => item.id === classId)

  return <ComingSoon title={classItem ? classItem.name : 'Class'} />
}

export default ClassDetail
