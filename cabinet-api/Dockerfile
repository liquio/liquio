# Stage 1: transpile TypeScript to JavaScript
FROM node:22 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /build
COPY package*.json /build
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime image
FROM node:22-slim AS runtime
ENV CONFIG_PATH=/var/www/config
WORKDIR /var/www/app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ADD package*.json /var/www/app
RUN npm ci --omit=dev

COPY . /var/www/app
COPY --from=build /build/dist /var/www/app/

EXPOSE 8101
USER node

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8101/test/ping || exit 1

CMD ["npm", "start"]
