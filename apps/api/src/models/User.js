import mongoose from "mongoose";

const { Schema } = mongoose;

export const ROLES = ["teacher", "student", "parent", "admin"];

// Identity and role assignment. Role-specific data lives in the profile models.
// passwordHash is reserved for the authentication story and is never returned by default.
const userSchema = new Schema(
  {
    // Optional: a student added to a roster has no email until they are invited. Uniqueness only applies when
    // an email is set (partial index below), so any number of students can have none.
    email: { type: String, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    roles: {
      type: [{ type: String, enum: ROLES }],
      validate: { validator: (v) => v.length > 0, message: "A user needs at least one role." },
    },
    // invited = created by a teacher (roster) and not yet activated; it cannot sign in or reset a password.
    status: { type: String, enum: ["active", "disabled", "invited"], default: "active" },
    passwordHash: { type: String, select: false },
    // Password reset: only a hash of the emailed token is stored, and it expires.
    passwordResetHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// A new name (not email_1) so an old unique index never conflicts; run User.syncIndexes() on older databases.
userSchema.index(
  { email: 1 },
  { unique: true, name: "email_unique_when_set", partialFilterExpression: { email: { $type: "string" } } },
);

export default mongoose.models.User ?? mongoose.model("User", userSchema);
