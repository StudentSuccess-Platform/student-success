import mongoose from "mongoose";

const { Schema } = mongoose;

const goalUpdateSchema = new Schema(
  {
    goal: { type: Schema.Types.ObjectId, ref: "Goal", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String, required: true, trim: true },
    progressPercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true },
);
goalUpdateSchema.index({ goal: 1, createdAt: 1 });

export default mongoose.models.GoalUpdate ?? mongoose.model("GoalUpdate", goalUpdateSchema);
