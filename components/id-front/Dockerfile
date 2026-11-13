# Stage 1: Build the frontend
FROM node:24@sha256:925de64a85319052d6971ae81ef2417da956e8a3a2c4a0fac732327970f017f5 AS frontend
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /var/www/app

# Install dependencies
COPY package*.json /var/www/app/
RUN npm ci

# Build the frontend with production configuration
COPY . /var/www/app

# Update the version and build the application
RUN VERSION="$(npm pkg get version)" && \
    sed -ri "s|\"SETVERSION\"|$VERSION|" public/version.json && \
    npm run build

# Stage 2: Serve the frontend with nginx
FROM nginxinc/nginx-unprivileged:1-alpine-slim@sha256:a8cb0f33d51fa107c96fd2bd3a71aaf564ec131e9d2bdf8700944f0ed8b170d7 AS runtime

# Image metadata
LABEL tech.liquio.app="liquio" \
      tech.liquio.tier="front" \
      tech.liquio.public="yes" \
      org.opencontainers.image.source="https://github.com/liquio/liquio" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.vendor="Kitsoft"

# Strip the package manager, drop setuid/setgid bits and hand nginx's config back to root:
# the nginx user (101) can read its config and site but never rewrite them.
# /lib/apk/db is kept so image scanners still see the OS packages.
USER root
RUN rm -rf /sbin/apk /etc/apk /lib/apk/exec /var/cache/apk /usr/share/apk \
    && find / -xdev -perm /6000 -type f -exec chmod a-s {} + \
    && chown -R root:root /etc/nginx \
    && chmod -R go-w /etc/nginx

# Asset the built frontend files
COPY --chown=root:root --from=frontend /var/www/app/build/ /usr/share/nginx/html
COPY --chown=root:root nginx.conf /etc/nginx/conf.d/default.conf

# Run as the nginx user
USER 101:101

# Setup the health check
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]

# Build metadata, declared last so per-build values don't invalidate cached layers
ARG VERSION
ARG REVISION
ARG CREATED
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}"
