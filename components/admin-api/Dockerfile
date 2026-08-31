# Stage 1: transpile TypeScript to JavaScript
FROM node:24 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /build/components/admin-api
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime image
FROM node:24-slim AS runtime
ENV CONFIG_PATH=/var/www/config

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/components/admin-api
ADD package*.json .
RUN npm ci --omit=dev

COPY . .
COPY --from=build /build/components/admin-api/dist ./

EXPOSE 8102
USER node

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8102/test/ping || exit 1

CMD ["npm", "start"]
