# Environments

| Environment | Purpose | Runs on | Config |
|---|---|---|---|
| Local | Development | Developer machine, Docker Compose for MongoDB/Ollama | `.env` from `.env.example` |
| CI | Automated validation | GitHub Actions runners | workflow `env`, no real secrets |
| Test/Demo | Shared review and demos | Undecided hosting | GitHub Environment `test` |
| Production | Final deployment | Undecided hosting | GitHub Environment `production` |

## Configuration contract (API)
`NODE_ENV`, `PORT`, `MONGODB_URI`, `CORS_ORIGIN`, `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`,
and optional `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`. See `apps/api/.env.example`.
Inside Docker Compose, use service names: `mongo`, `ollama`.

`CORS_ORIGIN` is defined but not yet read by the API (currently unrestricted `cors()`).

## Secrets
Real values are never committed. Local: gitignored `.env`. Deployed: GitHub Environment secrets.

## LLM engine and acceleration
Local and self-hosted: Ollama in Docker (`scripts/setup/ollama-up.sh`), on NVIDIA, AMD ROCm or CPU.
Ollama handles GPU/CPU layer splitting and multi-GPU placement itself. Balancing across separate
instances (for example a GPU host plus a CPU fallback) belongs in the API's LLM provider abstraction
(`LLM_PROVIDER`, built). At startup the API keeps `openai` only when `OPENAI_API_KEY` and `LLM_MODEL` are set and
OpenAI answers; otherwise, and when `LLM_PROVIDER` is unset or unknown, it uses Ollama (`LLM_BASE_URL`, default
`http://127.0.0.1:11434`; model `OLLAMA_MODEL`, default `gemma3:1b`). `mock` is never changed. If Ollama is down, AI
requests return 503 and the teacher writes the plan manually.

## Demo hosting constraints (GitHub)
- GitHub Pages serves static files only; it cannot run the API, MongoDB or Ollama.
- GitHub-hosted Actions runners and Codespaces have no GPU. CPU-only runs work for small models (CI could
  run a tiny model such as `gemma3:1b` for an integration check), but not as a persistent demo host.
- A persistent demo needs an external host (API + MongoDB). For AI, choose one: a small CPU model on that host,
  a cloud `LLM_PROVIDER` with keys stored as GitHub Environment secrets, or a self-hosted GPU runner/server.
This is an open team decision.
