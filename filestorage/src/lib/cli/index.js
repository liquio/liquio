const handlers = require('./handlers/index');

class Cli {
  constructor(config, models) {
    this.config = config;
    this.models = models;
  }

  async init() {
    const [command, ...args] = process.argv.slice(2);

    const handler = handlers.getHandler(command);
    if (!handler) {
      return;
    }

    try {
      await handler.run(...args);
    } catch (error) {
      console.error(error);
    }
    process.exit(1);
  }
}

module.exports = Cli;
