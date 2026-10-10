/**
 * Formats a chart data point's value for a Recharts tooltip as
 * `[formattedValue, label]`, e.g. formatTrendTooltip(79, 'Average Grade', '%')
 * -> ['79%', 'Average Grade'].
 *
 * @param {number} value
 * @param {string} tooltipLabel
 * @param {string} tooltipUnit
 * @returns {[string, string]}
 */
export function formatTrendTooltip(value, tooltipLabel, tooltipUnit) {
  return [`${value}${tooltipUnit}`, tooltipLabel]
}
