import mongoose from "mongoose";

const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    gradeLevel: { type: Number, min: 1, max: 12 },
  },
  { timestamps: true },
);

export default mongoose.models.Course ?? mongoose.model("Course", courseSchema);
