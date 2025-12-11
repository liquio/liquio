# Stage 1: transpile TypeScript to JavaScript
FROM node:22 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /build

# Copy package.json and package-lock.json
COPY package*.json /build

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

# Declare working directory
WORKDIR /var/www/app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Add dependency config first
COPY *.json /var/www/app
COPY migrations-config.js /var/www/app
COPY migrations/ /var/www/app/migrations

# Add runtime dependencies only
RUN npm ci --omit=dev

# Copy the build artifacts from the build stage
COPY --from=build /build/dist /var/www/app/dist

USER node

# Expose the default listening port
EXPOSE 8100

# Switch to the node user
USER node

# Setup the healthcheck
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8100/test/ping || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
