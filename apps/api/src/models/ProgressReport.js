import mongoose from "mongoose";

const { Schema } = mongoose;

// Progress/academic report. Like remediation plans, it is shared only after teacher review.
const progressReportSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    section: { type: Schema.Types.ObjectId, ref: "Section" },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    summary: { type: String, required: true, trim: true },
    status: { type: String, enum: ["draft", "pending_review", "published"], default: "draft" },
    source: { type: String, enum: ["teacher", "ai"], default: "teacher" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "TeacherProfile" },
    reviewedAt: Date,
    publishedAt: Date,
    aiAudit: { type: Schema.Types.ObjectId, ref: "AiAuditLog" },
  },
  { timestamps: true },
);
progressReportSchema.index({ student: 1, periodEnd: -1 });

progressReportSchema.pre("validate", function () {
  if (this.status === "published" && (!this.reviewedBy || !this.reviewedAt || !this.publishedAt)) {
    this.invalidate("reviewedBy", "A teacher must review a report before it is published.");
  }
  if (this.periodEnd && this.periodStart && this.periodEnd < this.periodStart) {
    this.invalidate("periodEnd", "periodEnd must not be before periodStart.");
  }
  if (this.source === "ai" && !this.aiAudit) {
    this.invalidate("aiAudit", "An AI-generated report needs an AI audit record.");
  }
});

export default mongoose.models.ProgressReport ?? mongoose.model("ProgressReport", progressReportSchema);
