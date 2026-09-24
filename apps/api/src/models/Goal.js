import mongoose from "mongoose";

const { Schema } = mongoose;

const goalSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    targetDate: Date,
    status: { type: String, enum: ["active", "achieved", "abandoned"], default: "active" },
  },
  { timestamps: true },
);
goalSchema.index({ student: 1, status: 1 });

export default mongoose.models.Goal ?? mongoose.model("Goal", goalSchema);
