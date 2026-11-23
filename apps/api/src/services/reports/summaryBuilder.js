// Builds the suggested text of a progress report from facts the system already holds. It is deterministic
// (no AI) and states only what the data shows, so a teacher can edit it before publishing. Pure: no database.

const fmt = (iso) => new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// grades: [{ pointsEarned, pointsPossible, status }] for assignments due in the period (status null = not graded yet)
// attendance: [{ status }] for the period; goals: [{ title, progress }]
export function buildSummary({ firstName, className, periodStart, periodEnd, averageGrade, grades, attendanceRate, attendance, goals }) {
  const parts = [`${className}, ${fmt(periodStart)} to ${fmt(periodEnd)}.`];

  const graded = grades.filter((g) => ["graded", "late"].includes(g.status) && typeof g.pointsEarned === "number").length;
  const missing = grades.filter((g) => g.status === "missing").length;
  if (averageGrade === null) {
    parts.push("No graded work was recorded in this period.");
  } else {
    const missingNote = missing > 0 ? `, with ${plural(missing, "missing assignment")}` : "";
    parts.push(`${firstName}'s average grade is ${averageGrade}% across ${plural(graded, "graded assignment")}${missingNote}.`);
  }

  if (attendanceRate === null) {
    parts.push("No attendance was recorded in this period.");
  } else {
    const absent = attendance.filter((a) => a.status === "absent").length;
    const tardy = attendance.filter((a) => a.status === "tardy").length;
    parts.push(`Attendance is ${attendanceRate}% (${plural(absent, "absence")}, ${plural(tardy, "tardy", "tardies")}).`);
  }

  if (goals.length > 0) {
    parts.push(`Active goals: ${goals.map((g) => `${g.title} (${g.progress}% complete)`).join(", ")}.`);
  }
  return parts.join(" ");
}
