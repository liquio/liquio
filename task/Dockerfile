FROM node:22-slim

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

USER node

EXPOSE 3000

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3000/test/ping || exit 1

CMD ["npm", "start"]
