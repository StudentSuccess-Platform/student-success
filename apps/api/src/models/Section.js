import mongoose from "mongoose";

const { Schema } = mongoose;

// A class/section: one course taught by one teacher in a term. A teacher's access to
// students is derived from the enrollments of the sections they teach.
const sectionSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    teacher: { type: Schema.Types.ObjectId, ref: "TeacherProfile", required: true },
    term: { type: String, required: true, trim: true },
    period: { type: Number, min: 1 },
  },
  { timestamps: true },
);
sectionSchema.index({ teacher: 1 });
sectionSchema.index({ course: 1, term: 1, period: 1 });

export default mongoose.models.Section ?? mongoose.model("Section", sectionSchema);
