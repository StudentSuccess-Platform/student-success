import jwt from "jsonwebtoken";

const httpError = (status, message) => Object.assign(new Error(message), { status });

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader); // Debugging line
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw httpError(401, "Unauthorized");
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, roles: payload.roles };
    next();
  } catch {
    throw httpError(401, "Unauthorized");
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles || !req.user.roles.some((r) => roles.includes(r))) {
      throw httpError(403, "Forbidden");
    }
    next();
  };
}
