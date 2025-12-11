# Build the frontend application
FROM node:22 AS frontend
ARG NODE_MAX_OLD_SPACE_SIZE=2048
ENV NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}"
ENV CI=true GENERATE_SOURCEMAP=false

# Prepare the build environment
WORKDIR /app
COPY package*.json /app
RUN npm ci

# Prepare the source code
COPY . /app
COPY --from=core . /app/src/core

# Update the version and build the application
RUN VERSION="$(npm pkg get version)" && \
    sed -ri "s|\"SETVERSION\"|$VERSION|" public/version.json && \
    npm run build

# Serve the built application with Nginx
FROM nginx:1.19-alpine

# Clean the default nginx html directory
RUN rm -rf /usr/share/nginx/html/*

# Create nginx cache directories and set ownership
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx && \
    chown -R nginx:nginx /var/run && \
    chown -R nginx:nginx /var/log/nginx && \
    sed -i 's|pid.*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf

# Deploy the built application files
COPY --from=frontend /app/build/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root user
USER nginx

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1
