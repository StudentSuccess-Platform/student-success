import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { sendMail } from "../../utils/mailer.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });
const RESET_TTL_MS = 60 * 60 * 1000;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

// Always resolves the same way whether or not the email exists, so the endpoint cannot be used to
// discover which accounts are registered. Only a hash of the token is stored.
export async function requestPasswordReset(email, { webUrl = process.env.CORS_ORIGIN ?? "http://localhost:5173" } = {}) {
  const user = await User.findOne({ email: email.toLowerCase(), status: "active" });
  if (!user) return;
  const token = randomBytes(32).toString("hex");
  user.passwordResetHash = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save();
  await sendMail({
    to: user.email,
    subject: "Reset your StudentSuccess password",
    text: `Use this link within one hour to choose a new password:\n${webUrl}/reset-password?token=${token}`,
  });
}

export async function resetPassword(token, password) {
  const user = await User.findOne({
    passwordResetHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetHash +passwordResetExpires");
  if (!user) throw httpError(400, "This reset link is invalid or has expired");
  user.passwordHash = await bcrypt.hash(password, 10);
  user.passwordResetHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
}
