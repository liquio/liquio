FROM node:22

# Set the configuration path
ENV CONFIG_PATH=/var/www/config

# Set the working directory
WORKDIR /var/www/app

# Copy package files and install dependencies
COPY package*.json /var/www/app
RUN npm ci --omit=dev

# Copy the application source code
COPY . /var/www/app

USER node

EXPOSE 3003

HEALTHCHECK --start-period=10s --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3003/test/ping || exit 1

CMD ["npm", "start"]
