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
8. Or run the app in Docker with no other install (database, demo data, API and web app; about 1.6 GB of images):
   `docker compose up -d --build`, then open **http://localhost:8080**. Stop with `docker compose down` (data is kept; `docker compose down -v` wipes it).
   - **Services:** `mongo` (27017), `seed` (one-shot: loads the synthetic demo data only when the database is empty, never wipes), `api` (3000), `web` (8080, nginx).
   - The API uses the local Compose MongoDB by default. To connect it to an external database, set `MONGODB_URI` in a gitignored root `.env` or in the shell before starting Compose; the seed container still targets local MongoDB and does not seed the external database.
   - **Sign in** with a seeded user (password `Password123!`), e.g. teacher `carley.beer.2@example.test`.
   - **AI is not bundled** (the Ollama image alone is about 8 GB). Without it, "Generate AI recommendation" falls back to the manual plan form and everything else works. To get AI plans:
     - **Recommended:** install [Ollama](https://ollama.com) on your machine and run `ollama pull gemma3:1b` (about 0.8 GB). The API container reaches it through `host.docker.internal:11434`, no other setup.
     - **Or run Ollama in Docker too** (about 8 GB image plus the model, downloaded on first start): `docker compose -f docker-compose.yml -f docker-compose.ai.yml up -d --build`. Watch the download with `docker compose -f docker-compose.yml -f docker-compose.ai.yml logs -f ollama-pull`. GPU: `sh scripts/setup/ollama-up.sh` detects NVIDIA, then AMD ROCm, then CPU-only (force with `OLLAMA_ACCEL=cpu|nvidia|amd`). Apple Silicon and Intel GPUs cannot be used from Docker, so use the host install there. If Ollama already runs on your machine, stop it or set `OLLAMA_PORT`, because both use port 11434.
   - **AI provider:** OpenAI is used only if `OPENAI_API_KEY` and `LLM_MODEL` are set and OpenAI answers; otherwise the API uses Ollama. Change the model with `OLLAMA_MODEL` (e.g. `qwen3:1.7b`).
   - **Settings** (environment variables or a `.env` file next to `docker-compose.yml`): `WEB_PORT`, `API_PORT`, `MONGO_PORT`, `OLLAMA_PORT`, `OLLAMA_MODEL`, `LLM_BASE_URL`, `JWT_SECRET` (a local development value is used if unset; set your own for anything shared), `OPENAI_API_KEY`, `BIND_ADDRESS` (default `127.0.0.1`).
   - **Verify:** `curl http://127.0.0.1:3000/api/v1/health`; with Ollama, `curl http://127.0.0.1:11434/api/tags`.
   - **Tuning (Ollama container, optional):** `OLLAMA_KEEP_ALIVE`, `OLLAMA_NUM_PARALLEL`, `OLLAMA_MAX_LOADED_MODELS`.
9. Developing against the Docker services instead: `docker compose up -d mongo` (AI: Ollama on your machine, or the ai compose file), then run the API and web app by hand as in steps 3 to 5. Set `MONGODB_URI` in `apps/api/.env` (see `.env.example`).
10. Seed synthetic data (MongoDB must be running: `docker compose up -d mongo`): `cd apps/api && npm run db:reset`. Set `MONGODB_URI` in `apps/api/.env` first (see `.env.example`). Full lifecycle, modules and reset workflow: [docs/database/local-database.md](../database/local-database.md). Data model: [docs/database/data-model.md](../database/data-model.md).

## Notes
- The API connects to MongoDB using `MONGODB_URI`. It still starts (and `/api/v1/health` works) if the database is down; health then reports `database: disconnected`.
- For development the web app runs with `cd apps/web && npm run dev` (http://localhost:5173); in Docker it is served on http://localhost:8080.
- Set `JWT_SECRET` in `apps/api/.env` (the example value works locally). Agent-friendly guide: [AGENTS.md](../../AGENTS.md). Test layout and push rules: [testing-guidelines](../sdlc/testing-guidelines.md).
- Ports: API 3000, Web 5173 (dev server) or 8080 (Docker), MongoDB 27017, Ollama 11434.
