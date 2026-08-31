# Stage 1: transpile TypeScript to JavaScript
FROM node:24 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /build/components/register

# Copy package.json and package-lock.json
COPY package*.json .

# Install all dependencies
RUN npm ci

# Copy repository files
COPY . .

# Build the project
RUN npm run build

# Stage 2: create a new image with the build artifacts
FROM node:24-slim AS runtime

ENV CONFIG_PATH=/var/www/config

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Declare working directory
WORKDIR /var/www/components/register

# Add dependency config first
ADD package*.json .

# Add runtime dependencies only
RUN npm ci --omit=dev

COPY . .

# Copy the build artifacts from the build stage
COPY --from=build /build/components/register/dist ./

# Expose the default listening port
EXPOSE 8103

# Switch to the node user
USER node

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8103/test/ping || exit 1

# Start the application
CMD ["npm", "start"]
