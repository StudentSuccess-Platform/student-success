import mongoose from "mongoose";

const { Schema } = mongoose;

const studentProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    studentNumber: { type: String, required: true, unique: true },
    gradeLevel: { type: Number, required: true, min: 1, max: 12 },
  },
  { timestamps: true },
);

export default mongoose.models.StudentProfile ?? mongoose.model("StudentProfile", studentProfileSchema);
