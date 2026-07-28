FROM node:22-slim AS builder

# Build back-core first. Mirror the monorepo layout so the
# "back-core": "file:../../packages/back-core" dependency in package.json
# resolves to the same relative path here and in the runtime stage below.
WORKDIR /var/www/packages/back-core
COPY --from=back-core . .
RUN npm ci && npm run build

WORKDIR /var/www/components/persist-link

RUN apt-get update && apt-get install -y --no-install-recommends bzip2 && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies including devDependencies for build tools.
COPY package*.json .
RUN npm ci

# Copy source and build TypeScript output.
COPY . .
RUN npm run build

FROM node:22-slim

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl bzip2 && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/packages/back-core
COPY --from=builder /var/www/packages/back-core/package.json .
COPY --from=builder /var/www/packages/back-core/dist ./dist

# Set the working directory
WORKDIR /var/www/components/persist-link

# Copy package files and install dependencies
COPY package*.json .
RUN npm ci --omit=dev

# Copy migration config and files for sequelize CLI compatibility.
COPY --from=builder /var/www/components/persist-link/migrations-config.js ./migrations-config.js
COPY --from=builder /var/www/components/persist-link/migrations ./migrations

# Copy build output.
COPY --from=builder /var/www/components/persist-link/dist ./dist

USER node

EXPOSE 3346

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3346/test/ping || exit 1

CMD ["npm", "run", "start:prod"]
