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
8. Start the full local stack from the repo root: `docker compose up -d --build`
   (MongoDB on 27017, API on 3000). Stop with `docker compose down`.
9. Optional local LLM (Ollama, the engine for AI features): `sh scripts/setup/ollama-up.sh`
   - It auto-detects acceleration (NVIDIA, then AMD ROCm, then CPU-only). Force one with `OLLAMA_ACCEL=cpu|nvidia|amd`.
   - CPU-only machines need nothing extra; use a small model. Ollama splits a model across GPU and CPU automatically when it does not fit in VRAM.
   - Apple Silicon and Intel GPUs cannot be used from Docker: run Ollama on the host, stop the container (both use port 11434), and set `LLM_BASE_URL=http://localhost:11434`.
   - Pull a model: `docker compose exec ollama ollama pull qwen2.5:0.5b` (small test model; the real model is not chosen yet), then set `LLM_MODEL` locally.
   - Verify: `curl localhost:11434/api/tags`, and `docker compose exec ollama ollama ps` (PROCESSOR shows GPU/CPU split). Inside compose the API reaches it at `http://ollama:11434`.
   - Tuning (env, optional): `OLLAMA_KEEP_ALIVE`, `OLLAMA_NUM_PARALLEL`, `OLLAMA_MAX_LOADED_MODELS`.
   - Status: NVIDIA and CPU verified. AMD ROCm config validates but is untested.
10. Seed data: **pending SCRUM-11**. No seed command exists yet.

## Notes
- The API does not connect to MongoDB yet (SCRUM-11); the container is provisioned for it.
- The web app (`apps/web`) is not scaffolded yet, so compose has no `web` service.
- Ports: API 3000, Web 5173, MongoDB 27017, Ollama 11434.
