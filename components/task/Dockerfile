# Stage 1: transpile TypeScript to JavaScript
FROM node:24 AS build
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS="--max_old_space_size=${NODE_MAX_OLD_SPACE_SIZE}"

WORKDIR /build/components/task

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

# Install base system dependencies
RUN apt-get update && apt-get install -y \
    bzip2 \
    fontconfig \
    libfreetype6 \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /var/www/components/task

# Copy package files and install dependencies
COPY package*.json .
RUN npm ci --omit=dev && npm cache clean --force

# Copy runtime data assets (bin/ TS source is compiled into dist already)
COPY wsdl/ ./wsdl
COPY trembita/ ./trembita

# Copy the compiled application
COPY --from=build /build/components/task/dist ./

# Switch to the node user
USER node

# Expose the default listening port
EXPOSE 3000

# Setup the healthcheck
HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/test/ping', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "run", "start:prod"]
