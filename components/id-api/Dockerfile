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

WORKDIR /build/components/id-api

# Copy package.json and package-lock.json
COPY package*.json .

# Install all dependencies
RUN npm ci

# Copy repository files
COPY . .

# Build the project
RUN npm run build

# Stage 2: create a new image with the build artifacts
FROM node:22-slim AS runtime

# Set up correct timezone
ENV CONFIG_PATH=/var/www/config

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/packages/back-core
COPY --from=build /build/packages/back-core/package.json .
COPY --from=build /build/packages/back-core/dist ./dist

# Declare working directory
WORKDIR /var/www/components/id-api

# Add dependency config first
COPY *.json .
COPY migrations-config.js .
COPY migrations/ ./migrations

# Add runtime dependencies only
RUN npm ci --omit=dev

# Copy the build artifacts from the build stage
COPY --from=build /build/components/id-api/dist ./dist

USER node

# Expose the default listening port
EXPOSE 8100

# Setup the healthcheck
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8100/test/ping || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
