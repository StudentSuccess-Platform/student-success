import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatTrendTooltip } from '../../utils/formatTrendTooltip'

const NAVY = '#13233a'
const ORANGE = '#f36c21'
const MUTED = '#5e6c84'
const BORDER = '#dde3ea'

function PerformanceTrendChart({
  data,
  xKey = 'label',
  yKey = 'value',
  yDomain = [0, 100],
  animate = true,
  tooltipLabel = 'Value',
  tooltipUnit = '',
}) {
  if (data.length === 0) {
    return <p className="chart-empty">No performance data available yet.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={BORDER} vertical={false} />

        <XAxis
          dataKey={xKey}
          stroke={MUTED}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          stroke={MUTED}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={yDomain}
        />

        <Tooltip
          contentStyle={{ borderRadius: 8, borderColor: BORDER, fontSize: 13 }}
          labelStyle={{ color: NAVY, fontWeight: 600 }}
          formatter={(value) => formatTrendTooltip(value, tooltipLabel, tooltipUnit)}
        />

        <Line
          type="monotone"
          dataKey={yKey}
          stroke={ORANGE}
          strokeWidth={2.5}
          dot={{ r: 4, fill: ORANGE }}
          activeDot={{ r: 6 }}
          isAnimationActive={animate}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default PerformanceTrendChart
