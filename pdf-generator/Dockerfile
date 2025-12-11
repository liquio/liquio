# Stage 1: transpile TypeScript to JavaScript
FROM node:22 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /build

# Install pnpm
RUN npm i -g pnpm

# Copy package.json and package-lock.json
COPY package*.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install

# Copy repository files
COPY . .

# Build the project
RUN pnpm run build

# Stage 2: setup a runtime image with built files
FROM node:22-slim AS runtime

ENV CONFIG_PATH=/var/www/config
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /var/www/app

# Install curl for healthcheck and pnpm
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && npm i -g pnpm

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN pnpm install --production

# Copy built files
COPY --from=build /build/dist ./dist

# Switch to the node user
USER node

# Expose the server listening port
EXPOSE 7007

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:7007/test/ping || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
