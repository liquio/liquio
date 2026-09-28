# Stage 1: transpile TypeScript to JavaScript
FROM node:24-slim AS build

WORKDIR /build/components/persist-link

# Native deps need a toolchain to unpack (bzip2)
RUN apt-get update && apt-get install -y --no-install-recommends bzip2 && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json .

# Install all dependencies
RUN npm ci

# Copy repository files
COPY . .

# Build the project
RUN npm run build

# Stage 2: runtime image
FROM node:24-slim AS runtime

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

# Native deps need a toolchain to unpack (bzip2)
RUN apt-get update && apt-get install -y --no-install-recommends bzip2 && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /var/www/components/persist-link

# Copy package files and install dependencies
COPY package*.json .
RUN npm ci --omit=dev && npm cache clean --force

# Copy migration tooling needed at runtime (sequelize CLI compatibility)
COPY --from=build /build/components/persist-link/migrations-config.js ./migrations-config.js
COPY --from=build /build/components/persist-link/migrations ./migrations

# Copy the compiled application
COPY --from=build /build/components/persist-link/dist ./dist

# Switch to the node user
USER node

# Expose the default listening port
EXPOSE 3346

# Setup the healthcheck
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3346/test/ping', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "run", "start:prod"]
