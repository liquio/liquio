FROM node:22-slim

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

# Set the working directory
WORKDIR /var/www/app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json /var/www/app
RUN npm ci --omit=dev

# Copy the application source code
COPY . /var/www/app

USER node

EXPOSE 3001

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3002/test/ping || exit 1

CMD ["npm", "start"]
