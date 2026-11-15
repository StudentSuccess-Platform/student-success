import { Assignment, Grade, Attendance, Goal, GoalUpdate } from "../../models/index.js";

// Gathers the only data sent to the AI, straight from the database. Client-sent grades, goals and
// progress are never used. The result holds no ids, names, emails or teacher notes. See
// docs/ai/ai-request-fields.md.
// access: result of getAssignedStudent. sectionId: an ObjectId already checked against access.
export async function buildAiInput(access, sectionId) {
  const studentId = access.student._id;

  const assignments = await Assignment.find({ section: sectionId }).sort({ dueDate: 1 }).lean();
  const grades = await Grade.find({
    student: studentId,
    assignment: { $in: assignments.map((a) => a._id) },
  }).lean();
  const gradeByAssignment = new Map(grades.map((g) => [String(g.assignment), g]));
  const gradeRows = assignments
    .filter((a) => gradeByAssignment.has(String(a._id)))
    .map((a) => {
      const grade = gradeByAssignment.get(String(a._id));
      return {
        title: a.title,
        category: a.category,
        pointsEarned: typeof grade.pointsEarned === "number" ? grade.pointsEarned : null,
        pointsPossible: a.pointsPossible,
        status: grade.status,
      };
    });

  const attendanceCounts = { present: 0, absent: 0, tardy: 0, excused: 0 };
  const records = await Attendance.find({ student: studentId, section: sectionId }).select("status").lean();
  for (const record of records) attendanceCounts[record.status] += 1;

  const goal = await Goal.findOne({ student: studentId, status: "active" }).sort({ createdAt: -1 }).lean();
  let progress = null;
  if (goal) {
    const latest = await GoalUpdate.findOne({ goal: goal._id }).sort({ createdAt: -1 }).select("progressPercent").lean();
    progress = latest ? latest.progressPercent : null;
  }

  return {
    grades: gradeRows,
    attendance: attendanceCounts,
    goal: goal ? goal.title : null,
    progress,
  };
}
