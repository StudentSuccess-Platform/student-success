import mongoose from "mongoose";

const { Schema } = mongoose;

const remediationItemSchema = new Schema(
  {
    plan: { type: Schema.Types.ObjectId, ref: "RemediationPlan", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dueDate: Date,
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo" },
  },
  { timestamps: true },
);
remediationItemSchema.index({ plan: 1 });

export default mongoose.models.RemediationItem ?? mongoose.model("RemediationItem", remediationItemSchema);
