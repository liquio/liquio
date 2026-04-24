# Build the frontend application
FROM node:22 AS frontend
ARG NODE_MAX_OLD_SPACE_SIZE=2048
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}"
ENV CI=true GENERATE_SOURCEMAP=false

# Prepare the build environment
WORKDIR /app
COPY package*.json /app
RUN npm ci --omit=dev

# Prepare the source code
COPY . /app
COPY --from=core . /app/src/core

# Update the version and build the application
RUN VERSION="$(npm pkg get version)" && \
    sed -ri "s|\"SETVERSION\"|$VERSION|" public/version.json && \
    npm run build && \
    WORKER_SRC=$(find /app/node_modules -path "*/pdfjs-dist/build/pdf.worker.min.js" | head -1) && \
    echo "Using pdfjs worker: $WORKER_SRC" && \
    cp "$WORKER_SRC" /app/build/js/pdfjs/pdf.worker.min.js

# Serve the built application with Nginx
FROM nginxinc/nginx-unprivileged:1-alpine-slim

# Deploy the built application files
COPY --from=frontend /app/build/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root user
USER nginx

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1
