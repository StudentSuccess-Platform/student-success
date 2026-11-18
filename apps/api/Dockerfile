# The API image. Build from the repository root: the npm workspaces lock file lives there (apps/api/package-lock.json is
# stale and not used).
#   docker build -f apps/api/Dockerfile .
# Production dependencies only (the runtime image below).
FROM node:22-alpine AS deps
WORKDIR /repo
COPY . .
RUN npm ci --workspace apps/api --omit=dev --ignore-scripts && mkdir -p apps/api/node_modules

# One-shot seed image (docker compose service "seed"): all dependencies (the seed needs Faker) plus the seed scripts.
# It never ships to production; the default build target is the last stage below.
FROM node:22-alpine AS seed
WORKDIR /repo
COPY . .
RUN npm ci --workspace apps/api --ignore-scripts
WORKDIR /repo/apps/api
USER node
CMD ["node", "seed/run.js", "--if-empty"]

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/src ./apps/api/src
WORKDIR /repo/apps/api
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
