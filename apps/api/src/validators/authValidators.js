const httpError = (status, message) => Object.assign(new Error(message), { status });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(body) {
  const { email, password, role, firstName, lastName } = body;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    throw httpError(400, "Invalid email format");
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    throw httpError(400, "Password must be at least 8 characters");
  }

  if (!role || typeof role !== "string" || !["teacher", "student", "parent"].includes(role)) {
    throw httpError(400, "Role must be teacher, student, or parent");
  }

  if (!firstName || typeof firstName !== "string" || firstName.trim() === "") {
    throw httpError(400, "First name must be a non-empty string");
  }

  if (!lastName || typeof lastName !== "string" || lastName.trim() === "") {
    throw httpError(400, "Last name must be a non-empty string");
  }
}

export function validateLogin(body) {
  const { email, password } = body;

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    throw httpError(400, "Invalid email format");
  }

  if (!password || typeof password !== "string") {
    throw httpError(400, "Password is required");
  }
}
