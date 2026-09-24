import mongoose from "mongoose";

const { Schema } = mongoose;

// Assignment-level grade for one student.
const gradeSchema = new Schema(
  {
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    pointsEarned: { type: Number, min: 0 },
    status: { type: String, enum: ["graded", "missing", "late", "excused"], default: "graded" },
    submittedAt: Date,
  },
  { timestamps: true },
);
gradeSchema.index({ assignment: 1, student: 1 }, { unique: true });
gradeSchema.index({ student: 1 });

export default mongoose.models.Grade ?? mongoose.model("Grade", gradeSchema);
