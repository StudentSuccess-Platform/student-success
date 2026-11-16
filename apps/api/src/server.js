import dotenv from "dotenv";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { resolveLlmProvider, describeResolution } from "./services/ai/resolveProvider.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`StudentSuccess API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});

// Connect in the background so the API (and its health check) is available even if
// the database is not ready yet.
connectDatabase();

// Pick the AI provider in the background: OpenAI when it is configured and reachable, otherwise Ollama.
resolveLlmProvider()
  .then((result) => console.log(describeResolution(result)))
  .catch((error) => console.error("AI provider check failed:", error.message));

const shutdown = () => {
  console.log("Shutting down StudentSuccess API...");

  server.close(async () => {
    await disconnectDatabase();
    console.log("Server stopped.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
