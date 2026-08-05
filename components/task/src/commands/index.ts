import { RegenerateCommand } from './pdf/regenerate';

const commands = [RegenerateCommand];

export class Commands {
  private static instance: Commands;

  constructor() {
    if (!Commands.instance) {
      Commands.instance = this;
    }

    return Commands.instance;
  }

  async init(yargs) {
    for (const Command of commands) {
      new Command(yargs);
    }
  }
}
