# Stage 1: Build the frontend
FROM node:24 AS frontend
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /var/www/app

# Install dependencies
ADD package*.json /var/www/app
RUN npm ci

# Build the frontend with production configuration
COPY . /var/www/app

# Update the version and build the application
RUN VERSION="$(npm pkg get version)" && \
    sed -ri "s|\"SETVERSION\"|$VERSION|" public/version.json && \
    npm run build

# Stage 2: Serve the frontend with nginx
FROM nginxinc/nginx-unprivileged:1-alpine-slim

# Image metadata
LABEL tech.liquio.app="liquio" \
      tech.liquio.tier="front" \
      tech.liquio.public="yes" \
      org.opencontainers.image.source="https://github.com/liquio/liquio" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.vendor="Kitsoft"

USER root
RUN apk add --no-cache curl

# Asset the built frontend files
COPY --from=frontend /var/www/app/build/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root user
USER nginx

# Setup the health check
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

# Build metadata, declared last so per-build values don't invalidate cached layers
ARG VERSION
ARG REVISION
ARG CREATED
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}"
