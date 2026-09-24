import mongoose from "mongoose";

const { Schema } = mongoose;

const teacherProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    department: { type: String, trim: true },
    title: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.models.TeacherProfile ?? mongoose.model("TeacherProfile", teacherProfileSchema);
