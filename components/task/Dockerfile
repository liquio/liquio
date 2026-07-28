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

# Install base system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bzip2 \
    fontconfig \
    libfreetype6 \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

# Set the working directory
WORKDIR /var/www/app

# Copy package files and install dependencies
COPY package*.json /var/www/app

# Install npm dependencies
RUN npm ci --omit=dev

# Copy the application source code
COPY . /var/www/app
COPY --from=build /build/dist /var/www/app/

USER node

EXPOSE 3000

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3000/test/ping || exit 1

CMD ["npm", "start"]
