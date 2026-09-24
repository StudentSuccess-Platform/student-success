import mongoose from "mongoose";

const { Schema } = mongoose;

// Communication between users (for example teacher and guardian) about a specific student.
const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    student: { type: Schema.Types.ObjectId, ref: "StudentProfile" },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    readAt: Date,
  },
  { timestamps: true },
);
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.models.Message ?? mongoose.model("Message", messageSchema);
