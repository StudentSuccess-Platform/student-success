import mongoose from "mongoose";

const { Schema } = mongoose;

// Audit trail for AI generation: what was generated, by which model/provider, and who
// reviewed it. It stores references and a prompt version, not raw student data.
const aiAuditLogSchema = new Schema(
  {
    purpose: {
      type: String,
      enum: ["remediation_plan", "progress_summary", "trend_explanation"],
      required: true,
    },
    provider: { type: String, required: true },
    model: { type: String, required: true },
    promptVersion: { type: String, required: true },
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    outputRef: { kind: String, id: Schema.Types.ObjectId },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "TeacherProfile" },
    reviewedAt: Date,
    reviewOutcome: { type: String, enum: ["pending", "approved", "edited", "rejected"], default: "pending" },
  },
  { timestamps: true },
);
aiAuditLogSchema.index({ student: 1, createdAt: -1 });

export default mongoose.models.AiAuditLog ?? mongoose.model("AiAuditLog", aiAuditLogSchema);
