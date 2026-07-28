# Stage 1: build back-core. Event itself is plain JS and needs no build step,
# but its "back-core": "file:../../packages/back-core" dependency is TypeScript
# and must be compiled before it can be required.
FROM node:22 AS build
WORKDIR /build/packages/back-core
COPY --from=back-core . .
RUN npm ci && npm run build

# Stage 2: runtime image
FROM node:22-slim

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

# Mirror the monorepo layout so the "back-core": "file:../../packages/back-core"
# dependency in package.json resolves to the same relative path as on disk.
WORKDIR /var/www/packages/back-core
COPY --from=build /build/packages/back-core/package.json .
COPY --from=build /build/packages/back-core/dist ./dist

# Set the working directory
WORKDIR /var/www/components/event

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json .
RUN npm ci --omit=dev

# Copy the application source code
COPY . .

USER node

EXPOSE 3000

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:7004/test/ping || exit 1

CMD ["npm", "start"]
