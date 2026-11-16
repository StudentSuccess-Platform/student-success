import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { getDatabaseStatus } from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import parentRoutes from "./routes/parentRoutes.js";

const app = express();

// Security middleware
app.use(helmet());

// Cross-origin requests
app.use(cors());

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Development request logging
app.use(morgan("dev"));

// Canonical paths live under /api/v1; the unversioned paths remain as aliases for existing callers.
app.use(["/api/v1/auth", "/api/auth"], authRoutes);
app.use(["/api/v1/teacher", "/api/teacher"], teacherRoutes);
app.use(["/api/v1/student", "/api/student"], studentRoutes);
app.use(["/api/v1/parent", "/api/parent"], parentRoutes);

// API root
app.get("/api/v1", (req, res) => {
  res.status(200).json({
    message: "StudentSuccess API",
    status: "running"
  });
});

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "student-success-api",
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString()
  });
});

// Sanity check
app.get("/", (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>StudentSuccess API</title>
      </head>
      <body>
        <h1>StudentSuccess</h1>
        <p>Backend API is running successfully.</p>
      </body>
    </html>
  `);
});

// Route not found
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

// Global error handler. Errors with an explicit status (httpError, body-parser 400s) keep their message
// and `extra`. Anything else is a bug or an outage: the real error is logged, the client gets a generic 500.
export function errorHandler(err, req, res, next) {
  console.error(err);

  if (!err?.status) {
    return res.status(500).json({ error: "Internal server error" });
  }

  // `extra` (see utils/httpError.js) carries machine-readable details such as { fields } or { code }.
  return res.status(err.status).json({
    ...(err.extra ?? {}),
    error: err.message || "Request failed"
  });
}
app.use(errorHandler);

export default app;
