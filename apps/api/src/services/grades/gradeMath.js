// Pure grade and attendance calculations shared by the teacher, student and parent views.
// Rows are plain objects so these functions need no database.

const round = (n) => Math.round(n);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// rows: [{ pointsEarned, pointsPossible, status }]. Missing work counts as zero, excused work is
// ignored. Returns a whole-number percent, or null when nothing is gradable yet.
export function gradePercent(rows) {
  let earned = 0;
  let possible = 0;
  for (const row of rows) {
    if (row.status === "excused") continue;
    if (row.status === "missing") {
      possible += row.pointsPossible;
    } else if (typeof row.pointsEarned === "number") {
      earned += row.pointsEarned;
      possible += row.pointsPossible;
    }
  }
  return possible > 0 ? round((earned / possible) * 100) : null;
}

// records: [{ status }]. Present and tardy count as attended, excused days are left out.
// Returns a whole-number percent, or null when there are no countable days.
export function attendancePercent(records) {
  const counted = records.filter((r) => r.status !== "excused");
  if (counted.length === 0) return null;
  const attended = counted.filter((r) => r.status === "present" || r.status === "tardy").length;
  return round((attended / counted.length) * 100);
}

// rows: [{ date, pointsEarned, pointsPossible, status }] -> [{ label: "Sep", value }] in calendar
// order, one point per month that has gradable work, limited to the most recent `limit` months.
export function monthlyTrend(rows, limit = 6) {
  const byMonth = new Map();
  for (const row of rows) {
    const d = new Date(row.date);
    const key = d.getUTCFullYear() * 12 + d.getUTCMonth();
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(row);
  }
  return [...byMonth.keys()]
    .sort((a, b) => a - b)
    .map((key) => ({ label: MONTHS[key % 12], value: gradePercent(byMonth.get(key)) }))
    .filter((point) => point.value !== null)
    .slice(-limit);
}

export const INTERVENTION_GRADE = 70;
export const INTERVENTION_ATTENDANCE = 85;

// Returns null when the student is on track, otherwise { reason, severity }.
export function interventionFor({ average, attendance }) {
  const lowGrade = average !== null && average < INTERVENTION_GRADE;
  const lowAttendance = attendance !== null && attendance < INTERVENTION_ATTENDANCE;
  if (!lowGrade && !lowAttendance) return null;
  const reasons = [];
  if (lowGrade) reasons.push(`Average grade ${average}%`);
  if (lowAttendance) reasons.push(`Attendance ${attendance}%`);
  const severe = (average !== null && average < 60) || (attendance !== null && attendance < 75);
  return { reason: reasons.join(", "), severity: severe ? "high" : "medium" };
}

export const mean = (values) => {
  const present = values.filter((v) => typeof v === "number");
  return present.length ? round(present.reduce((a, b) => a + b, 0) / present.length) : null;
};
