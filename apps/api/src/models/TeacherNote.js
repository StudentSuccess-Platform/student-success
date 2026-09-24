import mongoose from "mongoose";

const { Schema } = mongoose;

// Private teacher progress notes. Kept in their own collection with a fixed, immutable
// "teacher_only" classification so they cannot be exposed to students or parents by
// accident: student and parent queries never touch this collection.
const teacherNoteSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section" },
    body: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["teacher_only"], default: "teacher_only", immutable: true },
  },
  { timestamps: true },
);
teacherNoteSchema.index({ student: 1, teacher: 1, createdAt: -1 });

export default mongoose.models.TeacherNote ?? mongoose.model("TeacherNote", teacherNoteSchema);
