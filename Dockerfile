# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Development server with hot reload
FROM deps AS dev
COPY . .
EXPOSE 4321
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]

# Static production build
FROM deps AS build
COPY . .
RUN pnpm run build

# Serve the static build, mirroring production locally
FROM nginx:1.29-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
