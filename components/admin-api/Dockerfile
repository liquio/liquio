# Stage 1: transpile TypeScript to JavaScript
FROM node:22 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

# Build back-core first. Mirror the monorepo layout so the
# "back-core": "file:../../packages/back-core" dependency in package.json
# resolves to the same relative path here and in the runtime stage below.
WORKDIR /build/packages/back-core
COPY --from=back-core . .
RUN npm ci && npm run build

WORKDIR /build/components/admin-api
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime image
FROM node:22-slim AS runtime
ENV CONFIG_PATH=/var/www/config

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/packages/back-core
COPY --from=build /build/packages/back-core/package.json .
COPY --from=build /build/packages/back-core/dist ./dist

WORKDIR /var/www/components/admin-api
ADD package*.json .
RUN npm ci --omit=dev

COPY . .
COPY --from=build /build/components/admin-api/dist ./

EXPOSE 8102
USER node

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8102/test/ping || exit 1

CMD ["npm", "start"]
