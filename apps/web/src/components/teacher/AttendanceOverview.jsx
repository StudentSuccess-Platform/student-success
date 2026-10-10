import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const NAVY = '#13233a'
const ORANGE = '#f36c21'
const MUTED = '#5e6c84'
const BORDER = '#dde3ea'
const LOW_ATTENDANCE_THRESHOLD = 90

function AttendanceOverview({ overallRate, classes, animate = true }) {
  if (classes.length === 0) {
    return <p className="chart-empty">No attendance data available yet.</p>
  }

  return (
    <div className="attendance-overview">
      <div className="attendance-overview-headline">
        <span className="attendance-overview-rate">{overallRate}%</span>
        <span className="attendance-overview-label">Overall attendance</span>
      </div>

      <ResponsiveContainer width="100%" height={classes.length * 36 + 16}>
        <BarChart
          data={classes}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          barCategoryGap={10}
        >
          <CartesianGrid stroke={BORDER} horizontal={false} />

          <XAxis
            type="number"
            domain={[0, 100]}
            stroke={MUTED}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            type="category"
            dataKey="name"
            stroke={NAVY}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={88}
            interval={0}
          />

          <Tooltip contentStyle={{ borderRadius: 8, borderColor: BORDER, fontSize: 13 }} />

          <Bar
            dataKey="rate"
            radius={[0, 4, 4, 0]}
            barSize={14}
            isAnimationActive={animate}
          >
            {classes.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.rate < LOW_ATTENDANCE_THRESHOLD ? ORANGE : NAVY}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AttendanceOverview
