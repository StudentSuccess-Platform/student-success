import mongoose from "mongoose";

const { Schema } = mongoose;

const attendanceSchema = new Schema(
  {
    section: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["present", "absent", "tardy", "excused"], required: true },
  },
  { timestamps: true },
);
attendanceSchema.index({ section: 1, student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ student: 1, date: 1 });

export default mongoose.models.Attendance ?? mongoose.model("Attendance", attendanceSchema);
