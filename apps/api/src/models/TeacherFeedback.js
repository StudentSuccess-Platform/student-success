import mongoose from "mongoose";

const { Schema } = mongoose;

// Feedback the teacher intends to share with the student (and their guardians).
// Private observations belong in TeacherNote, never here.
const teacherFeedbackSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment" },
    body: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["shared"], default: "shared", immutable: true },
  },
  { timestamps: true },
);
teacherFeedbackSchema.index({ student: 1, createdAt: -1 });

export default mongoose.models.TeacherFeedback ?? mongoose.model("TeacherFeedback", teacherFeedbackSchema);
