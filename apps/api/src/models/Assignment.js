import mongoose from "mongoose";

const { Schema } = mongoose;

export const ASSIGNMENT_CATEGORIES = ["homework", "quiz", "test", "project", "participation"];

const assignmentSchema = new Schema(
  {
    section: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ASSIGNMENT_CATEGORIES, required: true },
    pointsPossible: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true },
);
assignmentSchema.index({ section: 1, dueDate: 1 });

export default mongoose.models.Assignment ?? mongoose.model("Assignment", assignmentSchema);
