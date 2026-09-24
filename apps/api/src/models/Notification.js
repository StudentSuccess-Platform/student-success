import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["grade_posted", "attendance_alert", "feedback_shared", "plan_published", "report_published", "message"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    readAt: Date,
  },
  { timestamps: true },
);
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export default mongoose.models.Notification ?? mongoose.model("Notification", notificationSchema);
