# Stage 1: transpile TypeScript to JavaScript
FROM node:24@sha256:925de64a85319052d6971ae81ef2417da956e8a3a2c4a0fac732327970f017f5 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /build/components/gateway

# Copy package.json and package-lock.json
COPY package*.json .

# Install all dependencies
RUN npm ci

# Copy repository files
COPY . .

# Build the project
RUN npm run build

# Stage 2: production dependencies, installed on the runtime base so native modules match
FROM node:24-slim@sha256:91acba91b842bec0bf7ea6f5e09c644c7ccad72c4996ed9616d861d1c7cd60d4 AS deps

WORKDIR /var/www/components/gateway

COPY package*.json .
RUN npm ci --omit=dev && npm cache clean --force

# Stage 3: runtime image - node only, non-root, read-only friendly
FROM node:24-slim@sha256:91acba91b842bec0bf7ea6f5e09c644c7ccad72c4996ed9616d861d1c7cd60d4 AS runtime

# Image metadata
LABEL tech.liquio.app="liquio" \
      tech.liquio.tier="backend" \
      tech.liquio.public="no" \
      org.opencontainers.image.source="https://github.com/liquio/liquio" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.vendor="Kitsoft"

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

# Run in production mode
ENV NODE_ENV=production

# Strip package managers (npm, corepack, yarn, apt, dpkg) and setuid/setgid bits:
# the runtime only needs node. /var/lib/dpkg is kept so image scanners still see the OS packages
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-* \
    && rm -rf /usr/bin/apt* /usr/bin/dpkg* /usr/bin/debconf* /usr/sbin/dpkg* /usr/lib/apt /usr/lib/dpkg \
        /usr/share/debconf /etc/apt /var/lib/apt /var/cache/apt /var/cache/debconf /var/log/apt /var/log/dpkg.log \
    && find / -xdev -perm /6000 -type f -exec chmod a-s {} +

# Set the working directory
WORKDIR /var/www/components/gateway

# Copy package files and production dependencies
COPY --chown=root:root package*.json .
COPY --chown=root:root --from=deps /var/www/components/gateway/node_modules ./node_modules

# Copy the compiled application
COPY --chown=root:root --from=build /build/components/gateway/dist ./dist

# Switch to the node user
USER 1000:1000

# Expose the default listening port
EXPOSE 8080

# Setup the healthcheck
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD ["node", "-e", "require('http').get('http://localhost:8080/healthz', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

# Start the application
CMD ["node", "dist/index.js"]

# Build metadata, declared last so per-build values don't invalidate cached layers
ARG VERSION
ARG REVISION
ARG CREATED
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}"
