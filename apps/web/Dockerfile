# The web app: built with Vite, served by nginx. Build from the repository root (the npm workspaces lock file lives there):
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=http://localhost:3000 .
# VITE_API_URL is the address the BROWSER uses to reach the API, so it is baked in at build time.
FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
RUN npm ci --workspace apps/web --ignore-scripts
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace apps/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
