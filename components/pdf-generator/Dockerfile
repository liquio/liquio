# Stage 1: transpile TypeScript to JavaScript
FROM node:24 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# This stage only compiles TypeScript, no browser needed here
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /build/components/pdf-generator

# Copy package.json and package-lock.json
COPY package*.json .

# Install all dependencies
RUN npm ci

# Copy repository files
COPY . .

# Build the project
RUN npm run build

# Stage 2: runtime image
FROM node:24-slim AS runtime

# Set the configuration path
ENV CONFIG_PATH=/var/www/config
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Set the working directory
WORKDIR /var/www/components/pdf-generator

# Copy package files and install dependencies
COPY package*.json .
RUN npm ci --omit=dev && npm cache clean --force && rm -rf /var/lib/apt/lists/*

# Copy the compiled application
COPY --from=build /build/components/pdf-generator/dist ./dist

# Switch to the node user
USER node

# Expose the default listening port
EXPOSE 7007

# Setup the healthcheck
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7007/test/ping', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "run", "start:prod"]

