# Stage 1: transpile TypeScript to JavaScript
FROM node:22 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /build/components/filestorage
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime image
FROM node:22-slim AS runtime

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /var/www/components/filestorage

# Copy package files and install dependencies
COPY package*.json .
RUN npm ci --omit=dev

# Copy the application source code
COPY . .
COPY --from=build /build/components/filestorage/dist ./

USER node

EXPOSE 8105

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8105/test/ping || exit 1

CMD ["npm", "start"]
