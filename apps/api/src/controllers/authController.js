import { registerUser, loginUser, toPublic, getUserById } from "../services/auth/authService.js";
import { requestPasswordReset, resetPassword } from "../services/auth/passwordReset.js";
import {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} from "../validators/authValidators.js";
import { assertDatabaseReady } from "../middleware/requireDatabase.js";

export async function register(req, res) {
  validateRegister(req.body);
  await assertDatabaseReady();
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  validateLogin(req.body);
  await assertDatabaseReady();
  const result = await loginUser(req.body);
  res.status(200).json(result);
}

export async function me(req, res) {
  await assertDatabaseReady();
  const user = await getUserById(req.user.id);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.status(200).json({ user: toPublic(user) });
}

export async function forgotPassword(req, res) {
  validateForgotPassword(req.body);
  await assertDatabaseReady();
  await requestPasswordReset(req.body.email);
  res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
}

export async function resetPasswordHandler(req, res) {
  validateResetPassword(req.body);
  await assertDatabaseReady();
  await resetPassword(req.body.token, req.body.password);
  res.status(200).json({ message: "Password updated. You can now sign in." });
}
