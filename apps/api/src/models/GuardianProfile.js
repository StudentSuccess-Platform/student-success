import mongoose from "mongoose";

const { Schema } = mongoose;

const guardianProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.models.GuardianProfile ?? mongoose.model("GuardianProfile", guardianProfileSchema);
