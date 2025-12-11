# Stage 1: Build the frontend
FROM node:22 AS frontend
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
FROM nginx:1-alpine

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

# Asset the built frontend files
COPY --from=frontend /var/www/app/build/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root user
USER nginx

# Setup the health check
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1
