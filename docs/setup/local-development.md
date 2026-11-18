# Local development

No production service is needed for any step below.

## Prerequisites
- Node.js 22+, npm 10+
- Docker Desktop (for MongoDB / compose)
- Git

## Onboarding
1. Clone the repo and open it.
2. Copy env files: `cp apps/api/.env.example apps/api/.env`
   (and root `.env.example` to `apps/web/.env` once the web app exists). Never commit `.env`.
3. Install API deps: `cd apps/api && npm ci`
4. Run the API with reload: `npm run dev` (http://localhost:3000)
5. Check it: `curl http://localhost:3000/api/v1/health`
6. Run tests: `npm test` (also `test:smoke`, `test:unit`, `test:integration`, `test:module -- <name>`). See `apps/api/tests/README.md`.
7. Lint: `npm run lint`
8. Or run everything in Docker with no other install (self-contained: database, demo data, API, web app and the local AI):
   `docker compose up -d --build`, then open **http://localhost:8080**. Stop with `docker compose down` (data is kept; `docker compose down -v` wipes it).
   - **First start:** images build and the AI model downloads (`gemma3:1b`, about 0.8 GB), so allow several minutes and an internet connection. Watch it with `docker compose logs -f ollama-pull`. Until it finishes, "Generate AI recommendation" falls back to the manual plan form; everything else works at once.
   - **Services:** `mongo` (27017), `seed` (one-shot: loads the synthetic demo data only when the database is empty, never wipes), `api` (3000), `ollama` (11434), `ollama-pull` (one-shot model download), `web` (8080, nginx).
   - **Sign in** with a seeded user (password `Password123!`), e.g. teacher `carley.beer.2@example.test`.
   - **AI provider:** OpenAI is used only if `OPENAI_API_KEY` and `LLM_MODEL` are set and OpenAI answers; otherwise the API uses the Ollama container. Change the model with `OLLAMA_MODEL` (e.g. `qwen3:1.7b`).
   - **Settings** (environment variables or a `.env` file next to `docker-compose.yml`): `WEB_PORT`, `API_PORT`, `MONGO_PORT`, `OLLAMA_PORT`, `OLLAMA_MODEL`, `JWT_SECRET` (a local development value is used if unset; set your own for anything shared), `OPENAI_API_KEY`.
   - **Already have Ollama on your machine** (port 11434 in use, or Apple Silicon/Intel GPU which Docker cannot use): set `OLLAMA_PORT=11435` for the container, or run `docker compose up -d --build mongo seed api web` and point the API at your host Ollama with `LLM_BASE_URL=http://host.docker.internal:11434`.
   - **GPU:** `sh scripts/setup/ollama-up.sh` detects NVIDIA, then AMD ROCm, then CPU-only (force with `OLLAMA_ACCEL=cpu|nvidia|amd`). Ollama splits a model across GPU and CPU automatically.
   - **Verify:** `curl localhost:3000/api/v1/health`, `curl localhost:11434/api/tags`, `docker compose exec ollama ollama ps`.
   - **Tuning (optional):** `OLLAMA_KEEP_ALIVE`, `OLLAMA_NUM_PARALLEL`, `OLLAMA_MAX_LOADED_MODELS`.
9. Developing against the Docker services instead: `docker compose up -d mongo` (and `ollama ollama-pull` for the AI), then run the API and web app by hand as in steps 3 to 5. Set `MONGODB_URI` in `apps/api/.env` (see `.env.example`).
10. Seed synthetic data (MongoDB must be running: `docker compose up -d mongo`): `cd apps/api && npm run db:reset`. Set `MONGODB_URI` in `apps/api/.env` first (see `.env.example`). Full lifecycle, modules and reset workflow: [docs/database/local-database.md](../database/local-database.md). Data model: [docs/database/data-model.md](../database/data-model.md).

## Notes
- The API connects to MongoDB using `MONGODB_URI`. It still starts (and `/api/v1/health` works) if the database is down; health then reports `database: disconnected`.
- For development the web app runs with `cd apps/web && npm run dev` (http://localhost:5173); in Docker it is served on http://localhost:8080.
- Set `JWT_SECRET` in `apps/api/.env` (the example value works locally). Agent-friendly guide: [AGENTS.md](../../AGENTS.md). Test layout and push rules: [testing-guidelines](../sdlc/testing-guidelines.md).
- Ports: API 3000, Web 5173 (dev server) or 8080 (Docker), MongoDB 27017, Ollama 11434.
