import mongoose from "mongoose";

const { Schema } = mongoose;

export const ROLES = ["teacher", "student", "parent", "admin"];

// Identity and role assignment. Role-specific data lives in the profile models.
// passwordHash is reserved for the authentication story and is never returned by default.
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    roles: {
      type: [{ type: String, enum: ROLES }],
      validate: { validator: (v) => v.length > 0, message: "A user needs at least one role." },
    },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    passwordHash: { type: String, select: false },
    // Password reset: only a hash of the emailed token is stored, and it expires.
    passwordResetHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.User ?? mongoose.model("User", userSchema);
