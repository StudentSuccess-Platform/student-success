import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/User.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

export async function registerUser({ email, password, role, firstName, lastName }) {
  if (await User.exists({ email: email.toLowerCase() })) throw httpError(409, "Email already registered");
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, firstName, lastName, roles: [role], passwordHash });
  return { token: signToken(user), user: toPublic(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  const ok = user && user.status === "active" && (await bcrypt.compare(password, user.passwordHash ?? ""));
  if (!ok) throw httpError(401, "Invalid email or password");
  return { token: signToken(user), user: toPublic(user) };
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw httpError(500, "JWT_SECRET is not configured");
  }
  return jwt.sign({ roles: user.roles }, process.env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  });
}

export const toPublic = (u) => ({ id: u._id, email: u.email, firstName: u.firstName, lastName: u.lastName, roles: u.roles });

export async function getUserById(id) {
  return User.findById(id);
}
