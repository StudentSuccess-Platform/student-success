import mongoose from "mongoose";

const { Schema } = mongoose;

const enrollmentSchema = new Schema(
  {
    section: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    status: { type: String, enum: ["active", "dropped", "completed"], default: "active" },
  },
  { timestamps: true },
);
enrollmentSchema.index({ section: 1, student: 1 }, { unique: true });
enrollmentSchema.index({ student: 1 });

export default mongoose.models.Enrollment ?? mongoose.model("Enrollment", enrollmentSchema);
