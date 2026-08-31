# Build the frontend application
FROM node:24 AS frontend
ARG NODE_MAX_OLD_SPACE_SIZE=2048
ARG GENERATE_SOURCEMAP=false
ARG DISABLE_ESLINT_PLUGIN=true
ARG INLINE_RUNTIME_CHUNK=false
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}"
ENV CI=true GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP} DISABLE_ESLINT_PLUGIN=${DISABLE_ESLINT_PLUGIN} INLINE_RUNTIME_CHUNK=${INLINE_RUNTIME_CHUNK}

# Mirror the monorepo layout so the "core": "file:../../packages/front-core"
# dependency in package.json resolves to the same relative path it does on disk.
WORKDIR /build/packages/front-core
COPY --from=core . .

WORKDIR /build/components/admin-front
COPY package*.json .
RUN npm ci --omit=dev

# Prepare the source code
COPY . .

# Update the version and build the application
RUN VERSION="$(npm pkg get version)" && \
    sed -ri "s|\"SETVERSION\"|$VERSION|" public/version.json && \
    npm run build && \
    WORKER_SRC=$(find node_modules -path "*/pdfjs-dist/build/pdf.worker.min.js" | head -1) && \
    echo "Using pdfjs worker: $WORKER_SRC" && \
    cp "$WORKER_SRC" build/js/pdfjs/pdf.worker.min.js

# Serve the built application with Nginx
FROM nginxinc/nginx-unprivileged:1-alpine-slim

USER root
RUN apk add --no-cache curl

# Deploy the built application files
COPY --from=frontend /build/components/admin-front/build/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root user
USER nginx

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1
