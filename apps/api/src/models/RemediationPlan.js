import mongoose from "mongoose";

const { Schema } = mongoose;

export const PLAN_STATUSES = ["draft", "pending_review", "approved", "published", "rejected", "archived"];

// AI output is advisory: a plan (AI-suggested or teacher-written) reaches students and
// parents only after a teacher approves it. Approved, published and rejected states require a reviewer.
const remediationPlanSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true },
    title: { type: String, required: true, trim: true },
    rationale: { type: String, trim: true },
    status: { type: String, enum: PLAN_STATUSES, default: "draft" },
    source: { type: String, enum: ["teacher", "ai"], default: "teacher" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "TeacherProfile" },
    reviewedAt: Date,
    publishedAt: Date,
    aiAudit: { type: Schema.Types.ObjectId, ref: "AiAuditLog" },
  },
  { timestamps: true },
);
remediationPlanSchema.index({ student: 1, status: 1 });

remediationPlanSchema.pre("validate", function () {
  if (["approved", "published", "rejected"].includes(this.status) && (!this.reviewedBy || !this.reviewedAt)) {
    this.invalidate("reviewedBy", "A teacher must review a plan before it is approved, published or rejected.");
  }
  if (this.status === "published" && !this.publishedAt) {
    this.invalidate("publishedAt", "A published plan needs publishedAt.");
  }
  if (this.source === "ai" && !this.aiAudit) {
    this.invalidate("aiAudit", "An AI-generated plan needs an AI audit record.");
  }
});

export default mongoose.models.RemediationPlan ?? mongoose.model("RemediationPlan", remediationPlanSchema);
