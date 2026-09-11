import { getHandler } from './handlers/index';

export class Cli {
  config: any;
  models: any;

  constructor(config?: any, models?: any) {
    this.config = config;
    this.models = models;
  }

  async init() {
    const [command, ...args] = process.argv.slice(2);

    const handler = getHandler(command);
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
