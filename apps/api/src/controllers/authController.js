import { registerUser, loginUser, toPublic, getUserById } from "../services/auth/authService.js";
import { validateRegister, validateLogin } from "../validators/authValidators.js";

export async function register(req, res) {
  validateRegister(req.body);
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  validateLogin(req.body);
  const result = await loginUser(req.body);
  res.status(200).json(result);
}

export async function me(req, res) {
  const user = await getUserById(req.user.id);
  res.status(200).json({ user: toPublic(user) });
}
