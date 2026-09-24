import mongoose from "mongoose";

const { Schema } = mongoose;

// Which students a parent/guardian may access. Authorization checks this relationship;
// a guardian has no access to a student without an active link.
const guardianStudentLinkSchema = new Schema(
  {
    guardian: { type: Schema.Types.ObjectId, ref: "GuardianProfile", required: true },
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile", required: true },
    relationship: { type: String, enum: ["parent", "guardian", "other"], default: "parent" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
guardianStudentLinkSchema.index({ guardian: 1, student: 1 }, { unique: true });
guardianStudentLinkSchema.index({ student: 1 });

export default mongoose.models.GuardianStudentLink ??
  mongoose.model("GuardianStudentLink", guardianStudentLinkSchema);
